import { useState, useEffect } from 'react';
import { portfolioApi, jobsApi } from '../api/client';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Portfolio() {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // 多人持倉管理狀態
  const [owners, setOwners] = useState(['自己']);
  const [selectedOwner, setSelectedOwner] = useState('自己');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [ownerError, setOwnerError] = useState(null);

  // 篩選與分頁狀態
  const [filterTicker, setFilterTicker] = useState('');
  const [sortBy, setSortBy] = useState('dateDesc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [form, setForm] = useState({
    ticker: '', buyDate: '', quantity: '', unitPrice: '', fee: '', owner: '自己',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // 富邦手續費自動估算 (電子單6折，整股低消20，零股低消1)
  const calculateEstimateFee = (qty, price) => {
    const q = parseFloat(qty);
    const p = parseFloat(price);
    if (isNaN(q) || isNaN(p) || q <= 0 || p <= 0) return '';
    const volume = q * p;
    const calculatedFee = Math.round(volume * 0.001425 * 0.6);
    const isOddShare = q % 1000 !== 0;
    if (isOddShare) {
      return calculatedFee < 1 ? '1' : calculatedFee.toString();
    } else {
      return calculatedFee < 20 ? '20' : calculatedFee.toString();
    }
  };

  const handleFormChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        updated.fee = calculateEstimateFee(updated.quantity, updated.unitPrice);
      }
      return updated;
    });
  };

  // 賣出 Modal 狀態
  const [showSellModal, setShowSellModal] = useState(false);
  const [maxSellQuantity, setMaxSellQuantity] = useState(0);
  const [sellForm, setSellForm] = useState({
    ticker: '', sellDate: '', quantity: '', unitPrice: '', owner: '自己',
  });
  const [realizedHistory, setRealizedHistory] = useState([]);

  // 歷史補檔 Modal 狀態
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyForm, setHistoryForm] = useState({ ticker: '', startYearMonth: '202301' });
  const [historySyncing, setHistorySyncing] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const fetchOwners = async () => {
    try {
      const res = await portfolioApi.getOwners();
      if (Array.isArray(res.data)) {
        let list = [...res.data];
        // 確保預設至少有「自己」
        if (!list.includes('自己')) {
          list = ['自己', ...list];
        }
        // 重要安全修復：確保當前選定的新成員（例如剛新增但無持倉的太太）不會被 API 回傳值無情覆蓋
        if (selectedOwner && !list.includes(selectedOwner)) {
          list = [...list, selectedOwner];
        }
        setOwners(list);
      }
    } catch (e) {
      console.error('無法取得成員名單：', e);
    }
  };

  const fetchHoldings = async (ownerName = selectedOwner) => {
    setLoading(true);
    try {
      const res = await portfolioApi.getHoldings(ownerName);
      setHoldings(Array.isArray(res.data) ? res.data : [res.data].filter(Boolean));
    } catch {
      setError('無法取得持倉明細');
    } finally {
      setLoading(false);
    }
  };

  const fetchRealizedHistory = async (ownerName = selectedOwner) => {
    try {
      const res = await portfolioApi.getRealizedHistory(ownerName);
      setRealizedHistory(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('無法取得已實現損益歷史：', e);
    }
  };

  // 當選定人改變時，重載持倉，並重置篩選與頁碼
  useEffect(() => {
    fetchOwners();
    fetchHoldings(selectedOwner);
    fetchRealizedHistory(selectedOwner);
    setFilterTicker('');
    setCurrentPage(1);
  }, [selectedOwner]);

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setForm({
      ticker: '',
      buyDate: '',
      quantity: '',
      unitPrice: '',
      fee: '',
      owner: selectedOwner, // 預設為目前所在的 Tab 成員
    });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (h) => {
    setIsEditing(true);
    setEditingId(h.portfolioId);
    setForm({
      ticker: h.ticker,
      buyDate: h.buyDate,
      quantity: h.quantity.toString(),
      unitPrice: h.unitPrice.toString(),
      fee: h.fee ? h.fee.toString() : '0',
      owner: h.owner,
    });
    setError(null);
    setShowModal(true);
  };

  const handleAdd = async () => {
    if (!form.ticker || !form.buyDate || !form.quantity || !form.unitPrice || !form.owner) {
      setError('請填寫所有欄位');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await portfolioApi.addHolding({
        ticker: form.ticker.trim().toUpperCase(),
        buyDate: form.buyDate,
        quantity: parseFloat(form.quantity),
        unitPrice: parseFloat(form.unitPrice),
        fee: form.fee ? parseFloat(form.fee) : null,
        owner: form.owner.trim(),
      });
      setSuccess('✅ 新增成功！');
      setShowModal(false);

      // 新增成功後切換至該交易擁有人 Tab
      const addedOwner = form.owner.trim();
      setSelectedOwner(addedOwner);

      setForm({ ticker: '', buyDate: '', quantity: '', unitPrice: '', fee: '', owner: addedOwner });
      await fetchOwners();
      await fetchHoldings(addedOwner);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e.response?.data || '新增失敗，請確認標的代號是否存在於資料庫中');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!form.ticker || !form.buyDate || !form.quantity || !form.unitPrice || !form.owner) {
      setError('請填寫所有欄位');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await portfolioApi.updateHolding(editingId, {
        ticker: form.ticker.trim().toUpperCase(),
        buyDate: form.buyDate,
        quantity: parseFloat(form.quantity),
        unitPrice: parseFloat(form.unitPrice),
        fee: form.fee ? parseFloat(form.fee) : null,
        owner: form.owner.trim(),
      });
      setSuccess('✅ 修改成功！');
      setShowModal(false);
      setIsEditing(false);
      setEditingId(null);

      await fetchOwners();
      await fetchHoldings(selectedOwner);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e.response?.data || '修改失敗，請確認輸入的資料格式。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddOwner = () => {
    const name = newOwnerName.trim();
    if (!name) {
      setOwnerError('成員姓名不能為空');
      return;
    }
    if (owners.includes(name)) {
      setOwnerError('該成員已存在於名單中');
      return;
    }
    if (name.length > 20) {
      setOwnerError('成員姓名不能超過 20 個字');
      return;
    }

    // 前端本地暫存新增
    const updated = [...owners, name];
    setOwners(updated);
    setSelectedOwner(name);

    setNewOwnerName('');
    setOwnerError(null);
    setShowOwnerModal(false);
    setForm(f => ({ ...f, owner: name }));
  };

  const handleDelete = async (portfolioId, ticker) => {
    if (!window.confirm(`確定要刪除 ${ticker} 的這筆持倉紀錄嗎？`)) return;
    try {
      await portfolioApi.deleteHolding(portfolioId);
      setSuccess('✅ 已刪除交易紀錄');
      await fetchHoldings(selectedOwner);
      await fetchOwners(); // 刪除後可能影響 owners 名單，重新獲取
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('刪除失敗');
    }
  };

  const openSellModal = (ticker) => {
    // 計算該 ticker 的總持股數
    const totalShares = holdings
      .filter(h => h.ticker === ticker)
      .reduce((sum, h) => sum + parseFloat(h.quantity || 0), 0);
    
    setMaxSellQuantity(totalShares);
    setSellForm({
      ticker: ticker,
      sellDate: new Date().toLocaleDateString('sv-SE'),
      quantity: '',
      unitPrice: '',
      owner: selectedOwner,
    });
    setError(null);
    setShowSellModal(true);
  };

  const handleSell = async () => {
    if (!sellForm.ticker || !sellForm.sellDate || !sellForm.quantity || !sellForm.unitPrice || !sellForm.owner) {
      setError('請填寫所有欄位');
      return;
    }
    const qty = parseFloat(sellForm.quantity);
    if (qty <= 0) {
      setError('賣出數量必須大於 0');
      return;
    }
    if (qty > maxSellQuantity) {
      setError(`賣出數量 (${qty}) 不能大於目前持有的最大股數 (${maxSellQuantity})`);
      return;
    }
    const price = parseFloat(sellForm.unitPrice);
    if (price <= 0) {
      setError('賣出單價必須大於 0');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    try {
      await portfolioApi.sellHolding({
        ticker: sellForm.ticker.trim().toUpperCase(),
        buyDate: sellForm.sellDate, // 借用 buyDate 當作賣出日期
        quantity: qty,
        unitPrice: price,
        owner: sellForm.owner.trim(),
      });
      setSuccess('✅ 賣出成功！已為您扣減庫存並計算已實現損益。');
      setShowSellModal(false);
      
      await fetchOwners();
      await fetchHoldings(selectedOwner);
      await fetchRealizedHistory(selectedOwner);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e.response?.data || '賣出失敗，請確認後端服務是否正常。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncDaily = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      await jobsApi.syncDailyPrices();
      setSuccess('✅ 今日最新股價同步成功！已為您更新所有持倉市值。');
      await fetchHoldings(selectedOwner);
      await fetchOwners();
      setTimeout(() => setSuccess(null), 5000);
    } catch (e) {
      console.error(e);
      setError(e.response?.data || '股價同步失敗，請確認後端服務是否正常。');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncHistory = async (e) => {
    e?.preventDefault();
    if (!historyForm.ticker.trim()) {
      setHistoryError('請輸入標的代號');
      return;
    }
    if (!/^\d{4,6}$/.test(historyForm.ticker.trim())) {
      setHistoryError('標的代號格式不正確，通常為 4 到 6 碼數字 (例如 0050 或 2330)');
      return;
    }
    if (!/^\d{6}$/.test(historyForm.startYearMonth)) {
      setHistoryError('年月格式必須為 YYYYMM (例如 202301)');
      return;
    }

    setHistorySyncing(true);
    setHistoryError(null);
    try {
      const ticker = historyForm.ticker.trim().toUpperCase();
      await jobsApi.syncHistoryPrices([ticker], historyForm.startYearMonth);
      setSuccess(`✅ 標的 ${ticker} 自 ${historyForm.startYearMonth} 歷史股價已同步補齊！已為您重新整理持倉數據。`);
      setShowHistoryModal(false);
      setHistoryForm({ ticker: '', startYearMonth: '202301' });
      await fetchHoldings(selectedOwner);
      await fetchOwners();
      setTimeout(() => setSuccess(null), 5000);
    } catch (e) {
      console.error(e);
      setHistoryError(e.response?.data || '歷史股價同步失敗，請確認標的代號是否正確。');
    } finally {
      setHistorySyncing(false);
    }
  };

  // 1. 先對 holdings 進行篩選 (標的代號模糊過濾)
  const filteredHoldings = holdings.filter(h => {
    if (!filterTicker.trim()) return true;
    return h.ticker.toLowerCase().includes(filterTicker.trim().toLowerCase());
  });

  // 2. 進行排序 (支援最新買入、最舊買入、金額高低等四種條件)
  const sortedHoldings = [...filteredHoldings].sort((a, b) => {
    if (sortBy === 'dateDesc') {
      return new Date(b.buyDate) - new Date(a.buyDate);
    }
    if (sortBy === 'dateAsc') {
      return new Date(a.buyDate) - new Date(b.buyDate);
    }
    if (sortBy === 'costDesc') {
      return parseFloat(b.totalCost || 0) - parseFloat(a.totalCost || 0);
    }
    if (sortBy === 'costAsc') {
      return parseFloat(a.totalCost || 0) - parseFloat(b.totalCost || 0);
    }
    return 0;
  });

  // 3. 分頁與切片邏輯
  const totalItems = sortedHoldings.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  
  const displayHoldings = sortedHoldings.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize
  );

  const totalCost = filteredHoldings.reduce((s, h) => s + parseFloat(h.totalCost || 0), 0);

  return (
    <div>
      <div className="page-header flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div style={{ minWidth: '250px', flex: 1 }}>
          <h1 className="page-title">💼 持倉管理</h1>
          <p className="page-subtitle">管理您與家人的每一筆交易明細，支援獨立帳戶切換</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleSyncDaily}
            disabled={syncing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span className={syncing ? "spin" : ""}>🔄</span>
            {syncing ? '同步今日股價中...' : '同步今日股價'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => { setShowHistoryModal(true); setHistoryError(null); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📅</span>
            補齊歷史股價
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            ＋ 新增持倉
          </button>
        </div>
      </div>

      {/* 人員切換 Tab */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-glass)',
        marginBottom: 'var(--space-lg)',
        paddingBottom: 'var(--space-sm)',
        flexWrap: 'wrap',
        gap: 'var(--space-md)'
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          {owners.map(owner => (
            <button
              key={owner}
              onClick={() => setSelectedOwner(owner)}
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid transparent',
                transition: 'all var(--transition-fast)',
                background: selectedOwner === owner ? 'var(--accent-primary)' : 'transparent',
                color: selectedOwner === owner ? 'var(--text-inverse)' : 'var(--text-secondary)',
              }}
              onMouseEnter={e => {
                if (selectedOwner !== owner) {
                  e.currentTarget.style.background = 'rgba(88, 80, 236, 0.08)';
                  e.currentTarget.style.color = 'var(--accent-primary)';
                }
              }}
              onMouseLeave={e => {
                if (selectedOwner !== owner) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              👤 {owner}
            </button>
          ))}
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setShowOwnerModal(true); setOwnerError(null); }}
        >
          ➕ 新增成員
        </button>
      </div>

      {success && <div className="alert alert-success" style={{ marginBottom: 'var(--space-md)' }}>{success}</div>}
      {error && !showModal && <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>⚠️ {error}</div>}

      {/* 統計列 */}
      {!loading && holdings.length > 0 && (
        <div className="grid grid-cols-2" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="metric-card">
            <div className="metric-label">【{selectedOwner}】交易筆數</div>
            <div className="metric-value">
              {filteredHoldings.length === holdings.length 
                ? `${holdings.length} 筆` 
                : `${filteredHoldings.length} / ${holdings.length} 筆 (已篩選)`}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">【{selectedOwner}】累計投入本金</div>
            <div className="metric-value">{formatCurrency(totalCost)}</div>
          </div>
        </div>
      )}

      {/* 明細表格 / 篩選列 / 空狀態 */}
      <div className="card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner" />載入持倉中...</div>
        ) : holdings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">成員【{selectedOwner}】尚無任何持倉紀錄</div>
            <div className="empty-state-desc">目前資料庫尚未建立此人員的持倉。您可以點擊下方按鈕新增一筆買入交易。</div>
            <button className="btn btn-primary mt-md" onClick={openAddModal}>
              ＋ 新增【{selectedOwner}】的持倉
            </button>
          </div>
        ) : (
          <>
            {/* 篩選與分頁呈現筆數控制列 */}
            <div style={{
              display: 'flex',
              gap: 'var(--space-md)',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-lg)',
              flexWrap: 'wrap',
              background: 'var(--bg-input)',
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-glass)',
            }}>
              <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                {/* 標的過濾 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>🔎 標的篩選:</span>
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    <input
                      className="form-input"
                      style={{ padding: '6px 12px', width: '130px', background: 'var(--bg-surface)', paddingRight: '24px' }}
                      placeholder="輸入代號..."
                      value={filterTicker}
                      onChange={e => { setFilterTicker(e.target.value); setCurrentPage(1); }}
                    />
                    {filterTicker && (
                      <button
                        onClick={() => { setFilterTicker(''); setCurrentPage(1); }}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* 排序方式 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>⇅ 排序方式:</span>
                  <select
                    className="form-input"
                    style={{ padding: '6px 12px', width: '140px', background: 'var(--bg-surface)' }}
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                  >
                    <option value="dateDesc">📅 最新交易優先</option>
                    <option value="dateAsc">📅 最舊交易優先</option>
                    <option value="costDesc">💰 金額高→低</option>
                    <option value="costAsc">💰 金額低→高</option>
                  </select>
                </div>
              </div>

              {/* 每頁筆數控制 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>每頁顯示:</span>
                <select
                  className="form-input"
                  style={{ padding: '6px 12px', width: '110px', background: 'var(--bg-surface)' }}
                  value={pageSize}
                  onChange={e => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1); }}
                >
                  <option value="10">10 筆 / 頁</option>
                  <option value="20">20 筆 / 頁</option>
                  <option value="50">50 筆 / 頁</option>
                </select>
              </div>
            </div>

            {/* 明細表格 */}
            {displayHoldings.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                <div className="empty-state-icon">🔍</div>
                <div className="empty-state-title">查無符合篩選條件的交易紀錄</div>
                <div className="empty-state-desc">請嘗試修正標的代號或重置篩選。</div>
                <button className="btn btn-secondary btn-sm mt-md" onClick={() => { setFilterTicker(''); setCurrentPage(1); }}>
                  重置篩選
                </button>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>標的</th>
                        <th>買入日期</th>
                        <th className="text-right">買入數量</th>
                        <th className="text-right">買入單價</th>
                        <th className="text-right">小計成本</th>
                        <th className="text-right">手續費</th>
                        <th className="text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayHoldings.map(h => (
                        <tr key={h.portfolioId}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{h.portfolioId}</td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{h.ticker}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.assetName}</div>
                          </td>
                          <td>{formatDate(h.buyDate)}</td>
                          <td className="text-right">{parseFloat(h.quantity).toFixed(4)} 股</td>
                          <td className="text-right">{formatCurrency(h.unitPrice, 2)}</td>
                          <td className="text-right" style={{ fontWeight: 600 }}>
                            {formatCurrency(h.totalCost)}
                          </td>
                          <td className="text-right" style={{ color: 'var(--text-secondary)' }}>
                            {formatCurrency(h.fee || 0)}
                          </td>
                          <td className="text-right" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEditModal(h)}
                              style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-glass)' }}
                            >
                              ✏️ 編輯
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openSellModal(h.ticker)}
                              style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                            >
                              💸 賣出
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(h.portfolioId, h.ticker)}
                            >
                              刪除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 分頁控制器 */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'var(--space-lg)',
                    paddingTop: 'var(--space-md)',
                    borderTop: '1px solid var(--border-glass)',
                    flexWrap: 'wrap',
                    gap: 'var(--space-md)'
                  }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      顯示第 <strong>{(activePage - 1) * pageSize + 1}</strong> 到 <strong>{Math.min(activePage * pageSize, totalItems)}</strong> 筆，共 <strong>{totalItems}</strong> 筆紀錄
                    </div>
                    
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={activePage === 1}
                        style={{ padding: '6px 10px' }}
                      >
                        « 第一頁
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={activePage === 1}
                        style={{ padding: '6px 10px' }}
                      >
                        ‹ 上一頁
                      </button>
                      
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 8px' }}>
                        第 {activePage} / {totalPages} 頁
                      </span>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={activePage === totalPages}
                        style={{ padding: '6px 10px' }}
                      >
                        下一頁 ›
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={activePage === totalPages}
                        style={{ padding: '6px 10px' }}
                      >
                        最末頁 »
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* 新增/編輯交易紀錄 Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">{isEditing ? '✏️ 編輯交易紀錄' : '＋ 新增持倉交易紀錄'}</div>
            {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>⚠️ {error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">持倉所有人</label>
                <select
                  className="form-input"
                  value={form.owner}
                  onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                >
                  {owners.map(owner => (
                    <option key={owner} value={owner}>
                      {owner}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">標的代號</label>
                <input className="form-input" placeholder="例如：0050"
                  value={form.ticker} onChange={e => setForm(f => ({ ...f, ticker: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">買入日期</label>
                <input className="form-input" type="date"
                  value={form.buyDate} onChange={e => setForm(f => ({ ...f, buyDate: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">買入數量（股）</label>
                  <input className="form-input" type="number" step="0.0001" min="0.0001"
                    placeholder="例如：10"
                    value={form.quantity} onChange={e => handleFormChange('quantity', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">買入單價（元）</label>
                  <input className="form-input" type="number" step="0.01" min="0.01"
                    placeholder="例如：94.90"
                    value={form.unitPrice} onChange={e => handleFormChange('unitPrice', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">交易手續費（元）</label>
                <input className="form-input" type="number" step="1" min="0"
                  placeholder="若未填則由系統估算"
                  value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  💡 提示：輸入數量與單價後會自動依富邦證券（電子單 6 折）試算低消，您亦可依實際 APP 帳單金額手動修正（如定期定額 1 元）。
                </span>
              </div>
              {form.quantity && form.unitPrice && (
                <div style={{ background: 'rgba(88,80,236,0.08)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 13 }}>
                  小計成交價金額：{formatCurrency(parseFloat(form.quantity) * parseFloat(form.unitPrice) || 0)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); setError(null); setIsEditing(false); }}>
                取消
              </button>
              <button className="btn btn-primary" onClick={isEditing ? handleUpdate : handleAdd} disabled={submitting}>
                {submitting ? '儲存中...' : (isEditing ? '確認修改' : '確認新增')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增成員 Modal */}
      {showOwnerModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowOwnerModal(false)}>
          <div className="modal">
            <div className="modal-title">👤 自由新增持倉成員</div>
            {ownerError && <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>⚠️ {ownerError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">成員姓名</label>
                <input
                  className="form-input"
                  placeholder="請輸入新成員姓名 (例如: 太太、先生、大兒子)"
                  value={newOwnerName}
                  onChange={e => { setNewOwnerName(e.target.value); setOwnerError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleAddOwner()}
                  autoFocus
                />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                💡 <strong>提示</strong>：新成員在被新增後會暫存於上方的切換 Tab。一旦您為該成員新增了第一筆持倉交易紀錄，系統資料庫就會永久儲存此身分。
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowOwnerModal(false); setOwnerError(null); setNewOwnerName(''); }}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleAddOwner}>
                確認新增成員
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📅 補齊歷史股價 Modal */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !historySyncing && setShowHistoryModal(false)}>
          <div className="modal">
            <div className="modal-title">📅 補齊歷史股價數據</div>
            {historyError && <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>⚠️ {historyError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">標的代號</label>
                <input 
                  className="form-input" 
                  placeholder="例如：0050, 00919, 2330"
                  value={historyForm.ticker} 
                  onChange={e => setHistoryForm(f => ({ ...f, ticker: e.target.value }))}
                  disabled={historySyncing}
                />
              </div>
              <div className="form-group">
                <label className="form-label">補檔起始年月 (格式: YYYYMM)</label>
                <input 
                  className="form-input" 
                  placeholder="例如：202301"
                  value={historyForm.startYearMonth} 
                  onChange={e => setHistoryForm(f => ({ ...f, startYearMonth: e.target.value }))}
                  disabled={historySyncing}
                />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                💡 <strong>防限流機制提示</strong>：<br />
                由於台灣證交所有嚴格的流量限制，補齊歷史股價時，後端會以「每次請求安全間隔 1 秒」的形式逐月抓取。補齊大約需要 3-10 秒鐘，期間請運作耐心等待，勿重複點選或重新整理網頁。
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => { setShowHistoryModal(false); setHistoryError(null); }}
                disabled={historySyncing}
              >
                取消
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSyncHistory} 
                disabled={historySyncing}
              >
                {historySyncing ? '歷史股價同步中...' : '開始同步補檔'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💸 賣出持倉 Modal */}
      {showSellModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !submitting && setShowSellModal(false)}>
          <div className="modal">
            <div className="modal-title">💸 賣出持倉交易</div>
            {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>⚠️ {error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">持倉所有人</label>
                <input className="form-input" value={sellForm.owner} disabled style={{ opacity: 0.7 }} />
              </div>
              <div className="form-group">
                <label className="form-label">標的代號</label>
                <input className="form-input" value={sellForm.ticker} disabled style={{ opacity: 0.7 }} />
              </div>
              <div className="form-group">
                <label className="form-label">賣出日期</label>
                <input className="form-input" type="date"
                  value={sellForm.sellDate} onChange={e => setSellForm(f => ({ ...f, sellDate: e.target.value }))}
                  disabled={submitting} />
              </div>
              <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">賣出數量（股，上限 {maxSellQuantity.toFixed(4)}）</label>
                  <input className="form-input" type="number" step="0.0001" min="0.0001" max={maxSellQuantity}
                    placeholder="輸入股數"
                    value={sellForm.quantity} onChange={e => setSellForm(f => ({ ...f, quantity: e.target.value }))}
                    disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label">賣出單價（元）</label>
                  <input className="form-input" type="number" step="0.01" min="0.01"
                    placeholder="輸入單價"
                    value={sellForm.unitPrice} onChange={e => setSellForm(f => ({ ...f, unitPrice: e.target.value }))}
                    disabled={submitting} />
                </div>
              </div>
              {sellForm.quantity && sellForm.unitPrice && (
                <div style={{ background: 'rgba(88,80,236,0.08)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 13 }}>
                  賣出小計金額：{formatCurrency(parseFloat(sellForm.quantity) * parseFloat(sellForm.unitPrice) || 0)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowSellModal(false); setError(null); }} disabled={submitting}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSell} disabled={submitting}>
                {submitting ? '交易處理中...' : '確認賣出'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💸 已實現損益歷史交易紀錄 */}
      {realizedHistory.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
          <div className="card-title" style={{ fontSize: '18px', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>💸</span> 已實現損益交易紀錄 (歷史賣出戰果)
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>標的</th>
                  <th>賣出日期</th>
                  <th className="text-right">賣出股數</th>
                  <th className="text-right">平均買入價</th>
                  <th className="text-right">賣出成交價</th>
                  <th className="text-right">已實現損益</th>
                </tr>
              </thead>
              <tbody>
                {realizedHistory.map((h, idx) => {
                  const pnl = parseFloat(h.realizedPnL || 0);
                  const isProfit = pnl >= 0;
                  return (
                    <tr key={h.realizedId || idx}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{h.ticker}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.assetName}</div>
                      </td>
                      <td>{formatDate(h.sellDate)}</td>
                      <td className="text-right">{parseFloat(h.quantity).toFixed(4)} 股</td>
                      <td className="text-right">{formatCurrency(h.averageBuyPrice, 2)}</td>
                      <td className="text-right">{formatCurrency(h.sellPrice, 2)}</td>
                      <td className="text-right" style={{ 
                        fontWeight: 700, 
                        color: isProfit ? '#10B981' : '#EF4444' 
                      }}>
                        {isProfit ? '+' : ''}{formatCurrency(pnl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
