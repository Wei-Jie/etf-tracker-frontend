import { useState } from 'react';
import { backtestApi } from '../api/client';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { parseAndFormatDate } from '../utils/dateParser';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 13,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>第 {label} 年</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}：{formatCurrency(p.value)}
          </div>
        ))}
        {payload.length === 2 && (
          <div style={{ marginTop: 6, color: 'var(--accent-secondary)', fontWeight: 600 }}>
            預估獲利：{formatCurrency(payload[0].value - payload[1].value)}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function Projection() {
  const [form, setForm] = useState({
    ticker: '',
    startDate: '',
    endDate: '',
    investmentAmount: '',
    investmentDays: '',
    reinvestDividends: true,
    projectionYears: '',
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
      }
    }

    if (!form.projectionYears) {
      errors.projectionYears = '年限不能為空';
    } else {
      const yrs = parseInt(form.projectionYears);
      if (isNaN(yrs) || yrs < 1 || yrs > 30) {
        errors.projectionYears = '年限必須在 1 至 30 之間';
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
        projectionYears: parseInt(form.projectionYears),
      };
      const res = await backtestApi.runProjection(params);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data || '模擬執行失敗，請確認標的歷史價格是否已同步');
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.yearlyProjection?.map(p => ({
    year: p.year,
    '預估資產': parseFloat(p.projectedValue),
    '累計投入': parseFloat(p.cumulativeInvested),
  })) || [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🔮 未來資產增值模擬</h1>
        <p className="page-subtitle">以歷史 CAGR 推算在持續定期定額下，未來 N 年的資產成長軌跡</p>
      </div>

      {/* 雙欄設定與 CAGR 科普 */}
      <div className="grid grid-cols-2" style={{ gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        {/* 參數設定 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>
              ⚙️ 模擬參數設定
            </div>
            <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">標的代號</label>
                <input className="form-input" value={form.ticker}
                  onChange={e => handleChange('ticker', e.target.value)} placeholder="例如：0050" />
                {validationErrors.ticker && (
                  <div style={{ color: 'var(--accent-danger)', fontSize: 11, marginTop: 4 }}>
                    ⚠️ {validationErrors.ticker}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">未來模擬年限（1~30）</label>
                <input className="form-input" type="number" min="1" max="30"
                  value={form.projectionYears}
                  onChange={e => handleChange('projectionYears', e.target.value)}
                  placeholder="例如：10" />
                {validationErrors.projectionYears && (
                  <div style={{ color: 'var(--accent-danger)', fontSize: 11, marginTop: 4 }}>
                    ⚠️ {validationErrors.projectionYears}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">CAGR 起始日</label>
                <input className="form-input" type="text" value={form.startDate}
                  onChange={e => handleChange('startDate', e.target.value)}
                  placeholder="例如：2020/1/1" />
                {validationErrors.startDate && (
                  <div style={{ color: 'var(--accent-danger)', fontSize: 11, marginTop: 4 }}>
                    ⚠️ {validationErrors.startDate}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">CAGR 結束日</label>
                <input className="form-input" type="text" value={form.endDate}
                  onChange={e => handleChange('endDate', e.target.value)}
                  placeholder="例如：2024/12/31" />
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
                <label className="form-label">扣款日（以逗號分隔）</label>
                <input className="form-input" value={form.investmentDays}
                  onChange={e => handleChange('investmentDays', e.target.value)}
                  placeholder="例如：6,16,26" />
                {validationErrors.investmentDays && (
                  <div style={{ color: 'var(--accent-danger)', fontSize: 11, marginTop: 4 }}>
                    ⚠️ {validationErrors.investmentDays}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', marginTop: 'var(--space-md)' }}>
            <button className="btn btn-primary" onClick={handleRun} disabled={loading} style={{ flex: 1 }}>
              {loading ? '模擬中...' : '🔮 開始模擬'}
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
              <input type="checkbox" checked={form.reinvestDividends}
                onChange={e => handleChange('reinvestDividends', e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)', width: 15, height: 15 }} />
              股利再投資
            </label>
          </div>
        </div>

        {/* CAGR 科普引導說明卡片 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '4px solid var(--accent-primary)', background: 'var(--bg-surface)' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 'var(--space-sm)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              📖 什麼是年複合成長率 (CAGR)？
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-md)' }}>
              <strong>年複合成長率 (CAGR, Compound Annual Growth Rate)</strong> 代表一項投資在特定時間內，以複利計算的平均年化報酬率。它能平滑化波動，反映長期的真實成長速度。
            </p>
            <div style={{ background: 'var(--bg-base)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>📊 計算公式</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                CAGR = (期末價值 / 期初價值) ^ (1 / 年數) - 1
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              💡 如何選擇「歷史參考區間」進行模擬？
            </div>
            <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>
                <strong>涵蓋完整牛熊市</strong>：建議挑選至少 <strong>3 至 5 年以上</strong> 的區間（例如：<code>2020/1/1</code> 到 <code>2024/12/31</code>），避開極端波段。
              </li>
              <li>
                <strong>避開極短波動</strong>：若只選擇 2021 年多頭，計算出的 CAGR 會異常高（過度樂觀）；若只選 2022 年熊市，則會偏向過度悲觀。
              </li>
              <li>
                <strong>模擬原理</strong>：系統會先計算該區間的歷史 CAGR，再以此年化成長率對您未來設定的 DCA 持續投資進行複利複寫預估。
              </li>
            </ul>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'var(--space-md)', textAlign: 'right' }}>
            ℹ️ 設定合理的區間，能讓未來的財務規劃更具備參考價值。
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-lg)' }}>⚠️ {error}</div>}
      {loading && <div className="loading-overlay"><div className="spinner" />模擬計算中...</div>}

      {result && !loading && (
        <>
          {/* CAGR 說明橫幅 */}
          <div className="card" style={{
            background: 'rgba(108, 99, 255, 0.08)',
            border: '1px solid rgba(108, 99, 255, 0.2)',
            marginBottom: 'var(--space-xl)',
            display: 'flex', alignItems: 'center', gap: 'var(--space-xl)',
          }}>
            <div>
              <div className="metric-label">歷史 CAGR（年化複合成長率）</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-primary)' }}>
                {formatPercent(result.historicalCagr)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                計算區間：{result.cagrBasePeriod}
              </div>
            </div>
            <div style={{ height: 60, width: 1, background: 'var(--border-glass)' }} />
            <div>
              <div className="metric-label">模擬年限</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{result.projectionYears} 年</div>
            </div>
            <div style={{ height: 60, width: 1, background: 'var(--border-glass)' }} />
            <div>
              <div className="metric-label">每月總投入</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {formatCurrency(result.monthlyInvestmentAmount * result.deductionFrequencyPerMonth)}
              </div>
            </div>
            <div style={{ height: 60, width: 1, background: 'var(--border-glass)' }} />
            <div>
              <div className="metric-label">{result.projectionYears} 年後預估資產</div>
              <div style={{ fontSize: 24, fontWeight: 800, background: 'var(--gradient-profit)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {formatCurrency(result.projectedFinalValue)}
              </div>
            </div>
          </div>

          {/* 指標卡片 */}
          <div className="grid grid-cols-3" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="metric-card">
              <div className="metric-label">{result.projectionYears} 年累計投入本金</div>
              <div className="metric-value">{formatCurrency(result.projectedTotalInvested)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">{result.projectionYears} 年預估資產</div>
              <div className="metric-value profit">{formatCurrency(result.projectedFinalValue)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">預估總獲利</div>
              <div className={`metric-value ${parseFloat(result.projectedTotalReturn) >= 0 ? 'profit' : 'loss'}`}>
                {parseFloat(result.projectedTotalReturn) >= 0 ? '+' : ''}{formatCurrency(result.projectedTotalReturn)}
              </div>
            </div>
          </div>

          {/* 成長曲線圖 */}
          <div className="card">
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
              未來 {result.projectionYears} 年資產增值預測曲線
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <defs>
                  <linearGradient id="projValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="projCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D9A5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#00D9A5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={v => `第${v}年`} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 12 }} />
                <Area type="monotone" dataKey="預估資產" stroke="#6C63FF" strokeWidth={2.5}
                  fill="url(#projValue)" dot={{ fill: '#6C63FF', r: 4 }} />
                <Area type="monotone" dataKey="累計投入" stroke="#00D9A5" strokeWidth={2}
                  fill="url(#projCost)" dot={false} strokeDasharray="5 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 逐年明細表 */}
          <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
              各年度模擬明細
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>年份</th>
                  <th className="text-right">累計投入本金</th>
                  <th className="text-right">預估資產市值</th>
                  <th className="text-right">預估獲利</th>
                  <th className="text-right">資產/本金倍率</th>
                </tr>
              </thead>
              <tbody>
                {result.yearlyProjection.map(p => {
                  const profit = parseFloat(p.projectedValue) - parseFloat(p.cumulativeInvested);
                  const multiplier = parseFloat(p.projectedValue) / parseFloat(p.cumulativeInvested);
                  return (
                    <tr key={p.year}>
                      <td><strong>第 {p.year} 年</strong></td>
                      <td className="text-right">{formatCurrency(p.cumulativeInvested)}</td>
                      <td className="text-right" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                        {formatCurrency(p.projectedValue)}
                      </td>
                      <td className={`text-right ${profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                      </td>
                      <td className="text-right" style={{ color: 'var(--text-secondary)' }}>
                        {multiplier.toFixed(2)}x
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
