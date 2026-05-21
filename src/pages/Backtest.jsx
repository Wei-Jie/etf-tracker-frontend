import { useState } from 'react';
import { backtestApi } from '../api/client';
import { formatCurrency, formatPercent, formatDate, getPnLClass } from '../utils/formatters';
import { parseAndFormatDate } from '../utils/dateParser';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 13,
      }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}：{formatCurrency(p.value)}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Backtest() {
  const [form, setForm] = useState({
    ticker: '',
    startDate: '',
    endDate: '',
    investmentAmount: '',
    investmentDays: '',
    reinvestDividends: true,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    setValidationErrors(prev => ({ ...prev, [key]: null }));
  };

  const validateForm = () => {
    const errors = {};
    if (!form.ticker || !form.ticker.trim()) {
      errors.ticker = '標的代號不能為空';
    }

    if (!form.startDate || !form.startDate.trim()) {
      errors.startDate = '開始日期不能為空';
    } else {
      const res = parseAndFormatDate(form.startDate);
      if (!res.valid) {
        errors.startDate = res.error;
      }
    }

    if (!form.endDate || !form.endDate.trim()) {
      errors.endDate = '結束日期不能為空';
    } else {
      const res = parseAndFormatDate(form.endDate);
      if (!res.valid) {
        errors.endDate = res.error;
      }
    }

    if (!errors.startDate && !errors.endDate) {
      const startParsed = parseAndFormatDate(form.startDate).formatted;
      const endParsed = parseAndFormatDate(form.endDate).formatted;
      if (new Date(startParsed) > new Date(endParsed)) {
        errors.endDate = '結束日期必須晚於或等於開始日期';
      }
    }

    if (!form.investmentAmount) {
      errors.investmentAmount = '金額不能為空';
    } else {
      const amt = parseFloat(form.investmentAmount);
      if (isNaN(amt) || amt < 100 || amt > 6000) {
        errors.investmentAmount = '扣款金額必須在 100 至 6000 之間';
      }
    }

    if (!form.investmentDays || !form.investmentDays.trim()) {
      errors.investmentDays = '扣款日不能為空';
    } else {
      const days = form.investmentDays.split(',').map(d => d.trim());
      const invalidDays = days.filter(d => {
        const num = parseInt(d);
        return isNaN(num) || num < 1 || num > 31;
      });
      if (invalidDays.length > 0) {
        errors.investmentDays = '扣款日必須是 1 至 31 之間的數字';
      } else if (days.length > 6) {
        errors.investmentDays = '每月扣款日最多設定 6 個';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRun = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const days = form.investmentDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
      const startParsed = parseAndFormatDate(form.startDate).formatted;
      const endParsed = parseAndFormatDate(form.endDate).formatted;
      const params = {
        ticker: form.ticker.trim().toUpperCase(),
        startDate: startParsed,
        endDate: endParsed,
        investmentAmount: parseFloat(form.investmentAmount),
        investmentDays: days.join(','),
        reinvestDividends: form.reinvestDividends,
      };
      const res = await backtestApi.runBacktest(params);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data || '回測執行失敗，請確認標的歷史價格是否已同步');
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.history?.map(h => ({
    date: h.date,
    '累計投入': parseFloat(h.cumulativeInvestment),
    '資產市值': parseFloat(h.portfolioValue),
  })) || [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📈 DCA 定期定額回測</h1>
        <p className="page-subtitle">模擬歷史期間內的定期定額買入結果與報酬表現</p>
      </div>

      {/* 參數設定卡片 */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 'var(--space-lg)', color: 'var(--text-primary)' }}>
          ⚙️ 回測參數設定
        </div>
        <div className="grid grid-cols-3" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <div className="form-group">
            <label className="form-label">標的代號</label>
            <input className="form-input" value={form.ticker}
              onChange={e => handleChange('ticker', e.target.value)}
              placeholder="例如：0050" />
            {validationErrors.ticker && (
              <div style={{ color: 'var(--accent-danger)', fontSize: 11, marginTop: 4 }}>
                ⚠️ {validationErrors.ticker}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">回測開始日</label>
            <input className="form-input" type="text" value={form.startDate}
              onChange={e => handleChange('startDate', e.target.value)}
              placeholder="例如：2026/5/21" />
            {validationErrors.startDate && (
              <div style={{ color: 'var(--accent-danger)', fontSize: 11, marginTop: 4 }}>
                ⚠️ {validationErrors.startDate}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">回測結束日</label>
            <input className="form-input" type="text" value={form.endDate}
              onChange={e => handleChange('endDate', e.target.value)}
              placeholder="例如：2026/5/21" />
            {validationErrors.endDate && (
              <div style={{ color: 'var(--accent-danger)', fontSize: 11, marginTop: 4 }}>
                ⚠️ {validationErrors.endDate}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">每次扣款金額（100~6000）</label>
            <input className="form-input" type="number" min="100" max="6000"
              value={form.investmentAmount}
              onChange={e => handleChange('investmentAmount', e.target.value)}
              placeholder="例如：3000" />
            {validationErrors.investmentAmount && (
              <div style={{ color: 'var(--accent-danger)', fontSize: 11, marginTop: 4 }}>
                ⚠️ {validationErrors.investmentAmount}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">扣款日（每月扣款日，以逗號分隔）</label>
            <input className="form-input" value={form.investmentDays}
              onChange={e => handleChange('investmentDays', e.target.value)}
              placeholder="例如：6,16,26" />
            {validationErrors.investmentDays && (
              <div style={{ color: 'var(--accent-danger)', fontSize: 11, marginTop: 4 }}>
                ⚠️ {validationErrors.investmentDays}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">股利處理</label>
            <select className="form-input"
              value={form.reinvestDividends}
              onChange={e => handleChange('reinvestDividends', e.target.value === 'true')}>
              <option value="true">📈 股利再投資（複利）</option>
              <option value="false">💵 領取現金</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleRun} disabled={loading}>
          {loading ? '計算中...' : '🚀 開始回測'}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-lg)' }}>⚠️ {error}</div>}

      {loading && <div className="loading-overlay"><div className="spinner" />計算中，請稍候...</div>}

      {result && !loading && (
        <>
          {/* 結果摘要 */}
          <div className="grid grid-cols-4" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="metric-card">
              <div className="metric-label">累計投入本金</div>
              <div className="metric-value">{formatCurrency(result.totalInvested)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">期末總市值</div>
              <div className="metric-value">{formatCurrency(result.currentValue)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">累計損益</div>
              <div className={`metric-value ${getPnLClass(result.totalReturn)}`}>
                {parseFloat(result.totalReturn) >= 0 ? '+' : ''}{formatCurrency(result.totalReturn)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">總報酬率</div>
              <div className={`metric-value ${getPnLClass(result.returnRate)}`}>
                {formatPercent(result.returnRate)}
              </div>
            </div>
          </div>

          {/* 額外資訊 */}
          <div className="grid grid-cols-2" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="card">
              <div className="flex justify-between">
                <div>
                  <div className="metric-label">累計股利收入</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-secondary)' }}>
                    {formatCurrency(result.dividendEarned)}
                  </div>
                </div>
                <div>
                  <div className="metric-label">累計持股數</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {parseFloat(result.totalShares).toFixed(2)} 股
                  </div>
                </div>
              </div>
            </div>
            <div className="card flex items-center gap-md">
              <div>
                <div className="metric-label">回測標的</div>
                <div style={{ fontWeight: 700 }}>{result.ticker} {result.assetName}</div>
              </div>
              <div>
                <div className="metric-label">股利模式</div>
                <div style={{ fontWeight: 600, color: form.reinvestDividends ? 'var(--accent-secondary)' : 'var(--text-secondary)' }}>
                  {form.reinvestDividends ? '再投資' : '領現金'}
                </div>
              </div>
            </div>
          </div>

          {/* 資產走勢圖 */}
          <div className="card">
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
              資產成長走勢
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D9A5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#00D9A5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 12 }} />
                <Area type="monotone" dataKey="資產市值" stroke="#6C63FF" strokeWidth={2.5}
                  fill="url(#colorValue)" dot={false} />
                <Area type="monotone" dataKey="累計投入" stroke="#00D9A5" strokeWidth={2}
                  fill="url(#colorCost)" dot={false} strokeDasharray="5 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
