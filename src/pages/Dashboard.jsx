import { useState, useEffect } from 'react';
import { portfolioApi, newsApi } from '../api/client';
import { formatCurrency, formatPercent, formatPnL, getPnLClass } from '../utils/formatters';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#5850EC', '#0D9488', '#FFB547', '#FF6B6B', '#4ECDC4', '#A78BFA', '#34D399'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        fontSize: '13px',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.ticker}</div>
        <div style={{ color: 'var(--text-secondary)' }}>{d.assetName}</div>
        <div style={{ color: 'var(--accent-primary)', marginTop: 4 }}>
          {formatCurrency(d.marketValue)} ({(d.portfolioWeight * 100).toFixed(1)}%)
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // AI 財經晨報狀態
  const [briefing, setBriefing] = useState('');
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [briefingError, setBriefingError] = useState(null);
  const [refreshingBriefing, setRefreshingBriefing] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // 多人持倉管理狀態
  const [owners, setOwners] = useState(['自己']);
  const [selectedOwner, setSelectedOwner] = useState('自己');
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [ownerError, setOwnerError] = useState(null);

  // 獲取今日 AI 晨報
  const fetchDailyBriefing = async () => {
    setBriefingLoading(true);
    try {
      const res = await newsApi.getDailyBriefing();
      if (res.data && res.data.success) {
        setBriefing(res.data.briefingHtml || '');
        setBriefingError(null);
      } else {
        setBriefingError('今日 AI 晨報加載失敗。');
      }
    } catch (e) {
      console.error('無法載入每日財經晨報：', e);
      setBriefingError('暫時無法載入今日 AI 財經焦點。請確認後端服務是否運行。');
    } finally {
      setBriefingLoading(false);
    }
  };

  // 強制重新生成今日 AI 晨報
  const handleRefreshBriefing = async () => {
    if (refreshingBriefing) return;
    setRefreshingBriefing(true);
    try {
      const res = await newsApi.refreshDailyBriefing();
      if (res.data && res.data.success) {
        setBriefing(res.data.briefingHtml || '');
        setBriefingError(null);
      }
    } catch (e) {
      console.error('強制重整財經晨報失敗：', e);
      const errMsg = e.response?.data?.message || '重整今日 AI 晨報失敗，請確認 API 金鑰是否配置，或是否遭遇流控限制。';
      alert(`⚠️ ${errMsg}`);
    } finally {
      setRefreshingBriefing(false);
    }
  };

  // 手動發送測試電子晨報
  const handleSendTestEmail = async () => {
    if (sendingEmail) return;
    setSendingEmail(true);
    try {
      const res = await newsApi.sendTestEmail(selectedOwner);
      if (res.data && res.data.success) {
        alert(`📬 ${res.data.message || '今日 AI 電子晨報已發送！'}`);
      }
    } catch (e) {
      console.error('發送電子晨報失敗：', e);
      const errMsg = e.response?.data?.message || '發送電子晨報失敗，請確認郵件服務配置是否正確（例如密碼或發件人環境變數）。';
      alert(`⚠️ ${errMsg}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const fetchOwners = async () => {
    try {
      const res = await portfolioApi.getOwners();
      if (Array.isArray(res.data) && res.data.length > 0) {
        const list = res.data.includes('自己') ? res.data : ['自己', ...res.data];
        setOwners(list);
      }
    } catch (e) {
      console.error('無法載入成員名單：', e);
    }
  };

  // 當選定擁有人改變時，重載 Summary
  useEffect(() => {
    setLoading(true);
    portfolioApi.getSummary(selectedOwner)
      .then(res => {
        setSummary(res.data);
        setError(null);
      })
      .catch(() => setError('無法取得投資組合資料，請確認後端服務是否運行'))
      .finally(() => setLoading(false));
  }, [selectedOwner]);

  // 初始化載入人員名單與 AI 財經晨報
  useEffect(() => {
    fetchOwners();
    fetchDailyBriefing();
  }, []);

  const handleAddOwner = () => {
    const name = newOwnerName.trim();
    if (!name) {
      setOwnerError('成員姓名不能為空');
      return;
    }
    if (owners.includes(name)) {
      setOwnerError('該成員已存在');
      return;
    }
    if (name.length > 20) {
      setOwnerError('成員姓名不能超過 20 個字');
      return;
    }

    // 前端本地暫存
    const updated = [...owners, name];
    setOwners(updated);
    setSelectedOwner(name);

    setNewOwnerName('');
    setOwnerError(null);
    setShowOwnerModal(false);
  };

  if (loading && !summary) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        載入投資組合儀表板...
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div style={{ padding: 'var(--space-lg)' }}>
        <div className="alert alert-error">⚠️ {error}</div>
      </div>
    );
  }

  const hasHoldings = summary?.holdings?.length > 0;
  const pieData = summary?.holdings?.map(h => ({
    ticker: h.ticker,
    assetName: h.assetName,
    marketValue: parseFloat(h.marketValue),
    portfolioWeight: parseFloat(h.portfolioWeight),
  })) || [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 投資組合儀表板</h1>
        <p className="page-subtitle">即時持倉概況與資產配置分析，支援多人帳戶獨立切換</p>
      </div>

      {/* 今日 AI 財經焦點卡片 */}
      <div className="card ai-briefing-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            📰 今日 AI 3.5 Flash 財經焦點
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleSendTestEmail}
              disabled={briefingLoading || refreshingBriefing || sendingEmail || briefingError}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{sendingEmail ? '✉️' : '📧'}</span>
              {sendingEmail ? '發送中...' : '測試發信'}
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleRefreshBriefing}
              disabled={briefingLoading || refreshingBriefing || sendingEmail}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className={(briefingLoading || refreshingBriefing) ? 'spin' : ''}>🔄</span>
              {(briefingLoading || refreshingBriefing) ? '即時更新' : '即時更新'}
            </button>
          </div>
        </div>
        
        {briefingLoading ? (
          <div className="skeleton-loader">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-item" />
            <div className="skeleton-line skeleton-item" />
          </div>
        ) : briefingError ? (
          <div className="alert alert-error">⚠️ {briefingError}</div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: briefing }} />
        )}
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

      {/* 載入遮罩 (切換 Tab 時使用) */}
      {loading ? (
        <div className="loading-overlay" style={{ minHeight: '300px' }}>
          <div className="spinner" />
          載入【{selectedOwner}】的持倉資料...
        </div>
      ) : (
        <>
          {/* 四個指標卡片 */}
          <div className="grid grid-cols-4" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="metric-card">
              <div className="metric-label">💰 累計投入本金</div>
              <div className="metric-value">{formatCurrency(summary?.totalInvested || 0)}</div>
              <div className="metric-sub">成員：{selectedOwner}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">📈 當前總市值</div>
              <div className="metric-value">{formatCurrency(summary?.totalMarketValue || 0)}</div>
              <div className="metric-sub">按最新收盤價估算</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">💹 未實現損益</div>
              <div className={`metric-value ${getPnLClass(summary?.unrealizedPnL)}`}>
                {formatPnL(summary?.unrealizedPnL || 0)}
              </div>
              <div className="metric-sub">累計資產增值</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">📉 報酬率</div>
              <div className={`metric-value ${getPnLClass(summary?.unrealizedReturnRate)}`}>
                {formatPercent(summary?.unrealizedReturnRate || 0)}
              </div>
              <div className="metric-sub">複利報酬表現</div>
            </div>
          </div>

          {/* 圖表 + 持倉明細 */}
          {!hasHoldings ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">💼</div>
                <div className="empty-state-title">成員【{selectedOwner}】尚無持倉資料</div>
                <div className="empty-state-desc">
                  目前尚未為【{selectedOwner}】建立任何持倉交易紀錄。
                  請前往「持倉管理」頁面新增買入紀錄，開始追蹤該帳戶的資產走勢。
                </div>
                <a href="#/portfolio" className="btn btn-primary mt-md" style={{ textDecoration: 'none' }} onClick={() => window.location.hash = '#/portfolio'}>
                  前往持倉管理頁面
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2" style={{ gap: 'var(--space-xl)' }}>
              {/* 餅圖 */}
              <div className="card">
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
                  【{selectedOwner}】資產配置分布
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="marketValue"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(value, entry) => (
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          {entry.payload.ticker} ({(entry.payload.portfolioWeight * 100).toFixed(1)}%)
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 持倉明細表格 */}
              <div className="card">
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
                  【{selectedOwner}】各資產持倉明細
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>標的</th>
                        <th className="text-right">股數</th>
                        <th className="text-right">市值</th>
                        <th className="text-right">損益</th>
                        <th className="text-right">報酬率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.holdings.map((h, i) => (
                        <tr key={h.ticker}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 10, height: 10, borderRadius: '50%',
                                background: COLORS[i % COLORS.length],
                                flexShrink: 0,
                              }} />
                              <div>
                                <div style={{ fontWeight: 600 }}>{h.ticker}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.assetName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-right">{parseFloat(h.totalShares).toFixed(2)}</td>
                          <td className="text-right">{formatCurrency(h.marketValue)}</td>
                          <td className={`text-right ${getPnLClass(h.unrealizedPnL)}`}>
                            {formatPnL(h.unrealizedPnL)}
                          </td>
                          <td className={`text-right ${getPnLClass(h.unrealizedReturnRate)}`}>
                            {formatPercent(h.unrealizedReturnRate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
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
                  placeholder="請輸入新成員姓名 (例如: 太太、先生)"
                  value={newOwnerName}
                  onChange={e => { setNewOwnerName(e.target.value); setOwnerError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleAddOwner()}
                  autoFocus
                />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                💡 <strong>提示</strong>：在儀表板新增成員後，您可以立刻切換查看其資產配置。請記得到「持倉管理」為新成員新增首筆買入交易，資料庫將會自動永久保存此成員姓名。
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
    </div>
  );
}
