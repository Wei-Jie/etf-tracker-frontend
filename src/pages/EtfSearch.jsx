import { useState } from 'react';
import { etfApi } from '../api/client';
import { formatCurrency, formatDate } from '../utils/formatters';
import { parseAndFormatDate } from '../utils/dateParser';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13,
      }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
          {formatCurrency(payload[0].value, 2)}
        </div>
      </div>
    );
  }
  return null;
};

export default function EtfSearch() {
  const [ticker, setTicker] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [searched, setSearched] = useState(false);

  const validateDates = () => {
    const errors = {};
    let standardStart = null;
    let standardEnd = null;

    if (startDate.trim()) {
      const res = parseAndFormatDate(startDate);
      if (!res.valid) {
        errors.startDate = res.error;
      } else {
        standardStart = res.formatted;
      }
    }

    if (endDate.trim()) {
      const res = parseAndFormatDate(endDate);
      if (!res.valid) {
        errors.endDate = res.error;
      } else {
        standardEnd = res.formatted;
      }
    }

    if (!errors.startDate && !errors.endDate && standardStart && standardEnd) {
      if (new Date(standardStart) > new Date(standardEnd)) {
        errors.endDate = '結束日期必須晚於或等於開始日期';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSearch = async () => {
    if (!ticker.trim()) return;
    if (!validateDates()) return;

    const startParsed = startDate.trim() ? parseAndFormatDate(startDate).formatted : null;
    const endParsed = endDate.trim() ? parseAndFormatDate(endDate).formatted : null;

    setLoading(true);
    setError(null);
    setPrices([]);
    setSearched(true);
    try {
      const res = await etfApi.getPrices(
        ticker.trim().toUpperCase(),
        startParsed,
        endParsed
      );
      setPrices(res.data || []);
    } catch (e) {
      setError(`查無「${ticker.toUpperCase()}」的歷史股價資料，請確認代號是否正確並已同步資料`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const chartData = prices.map(p => ({
    date: p.tradeDate,
    price: parseFloat(p.closingPrice),
  }));

  const latestPrice = prices.length > 0 ? parseFloat(prices[prices.length - 1].closingPrice) : null;
  const firstPrice = prices.length > 0 ? parseFloat(prices[0].closingPrice) : null;
  const priceChange = latestPrice && firstPrice ? latestPrice - firstPrice : null;
  const priceChangeRate = priceChange && firstPrice ? priceChange / firstPrice : null;

  return (
    <div>
      <div className="page-header">
         <h1 className="page-title">🔍 ETF 查詢</h1>
        <p className="page-subtitle">查詢 ETF 或個股的歷史收盤價走勢</p>
      </div>

      {/* 搜尋列 */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '2 1 200px' }}>
            <label className="form-label">標的代號</label>
            <input
              className="form-input"
              placeholder="例如：0050、2330、006208"
              value={ticker}
              onChange={e => setTicker(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="form-group" style={{ flex: '1.2 1 150px' }}>
            <label className="form-label">開始日期 (選填)</label>
            <input
              className="form-input"
              placeholder="例如：2026/5/21"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setValidationErrors(prev => ({ ...prev, startDate: null }));
              }}
              onKeyDown={handleKeyDown}
            />
            {validationErrors.startDate && (
              <div style={{ color: 'var(--accent-danger)', fontSize: 11, marginTop: 4 }}>
                ⚠️ {validationErrors.startDate}
              </div>
            )}
          </div>
          <div className="form-group" style={{ flex: '1.2 1 150px' }}>
            <label className="form-label">結束日期 (選填)</label>
            <input
              className="form-input"
              placeholder="例如：2026/5/21"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setValidationErrors(prev => ({ ...prev, endDate: null }));
              }}
              onKeyDown={handleKeyDown}
            />
            {validationErrors.endDate && (
              <div style={{ color: 'var(--accent-danger)', fontSize: 11, marginTop: 4 }}>
                ⚠️ {validationErrors.endDate}
              </div>
            )}
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading || !ticker.trim()}
            style={{ height: 42 }}
          >
            {loading ? '查詢中...' : '🔍 查詢'}
          </button>
        </div>
      </div>

      {/* 載入中 */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          查詢中...
        </div>
      )}

      {/* 錯誤 */}
      {error && !loading && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--space-lg)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 結果 */}
      {!loading && searched && prices.length > 0 && (
        <>
          {/* 摘要指標 */}
          <div className="grid grid-cols-3" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="metric-card">
              <div className="metric-label">最新收盤價</div>
              <div className="metric-value">{formatCurrency(latestPrice, 2)}</div>
              <div className="metric-sub">{formatDate(prices[prices.length - 1]?.tradeDate)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">區間漲跌</div>
              <div className={`metric-value ${priceChange >= 0 ? 'profit' : 'loss'}`}>
                {priceChange >= 0 ? '+' : ''}{formatCurrency(priceChange, 2)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">區間報酬率</div>
              <div className={`metric-value ${priceChangeRate >= 0 ? 'profit' : 'loss'}`}>
                {priceChangeRate >= 0 ? '+' : ''}{(priceChangeRate * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* 折線圖 */}
          <div className="card">
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
              {ticker.toUpperCase()} 歷史收盤價走勢（{prices.length} 筆資料）
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="url(#lineGradient)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: 'var(--accent-primary)' }}
                />
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6C63FF" />
                    <stop offset="100%" stopColor="#00D9A5" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* 無資料但已搜尋 */}
      {!loading && searched && prices.length === 0 && !error && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">查無歷史股價資料</div>
            <div className="empty-state-desc">資料庫中尚未有此標的的歷史資料，請先同步 TWSE 資料</div>
          </div>
        </div>
      )}
    </div>
  );
}
