import axios from 'axios';

// API 基底設定
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  headers: {
    'X-API-KEY': import.meta.env.VITE_API_KEY || 'default-dev-secret-key',
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// === 投資組合 API ===
export const portfolioApi = {
  /** 查詢所有交易明細 */
  getHoldings: (owner) => api.get('/portfolio/holdings', { params: { owner } }),

  /** 查詢投資組合總覽 */
  getSummary: (owner) => api.get('/portfolio/summary', { params: { owner } }),

  /** 新增一筆買入紀錄 */
  addHolding: (data) => api.post('/portfolio/holdings', data),

  /** 刪除指定持倉紀錄 */
  deleteHolding: (portfolioId) => api.delete(`/portfolio/holdings/${portfolioId}`),

  /** 獲取現有擁有人清單 */
  getOwners: () => api.get('/portfolio/owners'),
};

// === ETF / 股票 API ===
export const etfApi = {
  /** 查詢所有 ETF / 股票清單 */
  getList: () => api.get('/etfs'),

  /** 查詢指定標的的歷史股價 */
  getPrices: (ticker, startDate, endDate) => api.get(`/etfs/${ticker}/prices`, { params: { startDate, endDate } }),
};

// === 回測 API ===
export const backtestApi = {
  /**
   * DCA 定期定額歷史回測
   * @param {Object} params - { ticker, startDate, endDate, investmentAmount, investmentDays, reinvestDividends }
   */
  runBacktest: (params) => api.get('/backtest', { params }),

  /**
   * 未來資產增值模擬
   * @param {Object} params - { ticker, startDate, endDate, investmentAmount, investmentDays, reinvestDividends, projectionYears }
   */
  runProjection: (params) => api.get('/backtest/projection', { params }),
};

// === 同步工作 API ===
export const jobsApi = {
  /** 手動同步今日收盤價 */
  syncDailyPrices: () => api.post('/jobs/sync-twse-data'),
  /** 補齊指定標的之歷史股價 */
  syncHistoryPrices: (tickers, startYearMonth) => 
    api.post('/jobs/sync-history', null, { params: { tickers: tickers.join(','), startYearMonth } }),
};

export default api;
