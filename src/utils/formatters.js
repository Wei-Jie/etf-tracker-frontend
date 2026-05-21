/**
 * 格式化貨幣（台幣）
 * @param {number|string} value
 * @param {number} decimals
 */
export const formatCurrency = (value, decimals = 0) => {
  const num = parseFloat(value) || 0;
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * 格式化百分比
 * @param {number|string} value - 例如 0.1530 => 15.30%
 */
export const formatPercent = (value) => {
  const num = parseFloat(value) || 0;
  const sign = num >= 0 ? '+' : '';
  return `${sign}${(num * 100).toFixed(2)}%`;
};

/**
 * 格式化數量（股數）
 * @param {number|string} value
 */
export const formatShares = (value) => {
  const num = parseFloat(value) || 0;
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(4);
};

/**
 * 格式化日期
 * @param {string} dateStr - yyyy-MM-dd
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

/**
 * 判斷數值正負，回傳 CSS class
 * @param {number|string} value
 */
export const getPnLClass = (value) => {
  const num = parseFloat(value) || 0;
  if (num > 0) return 'text-profit';
  if (num < 0) return 'text-loss';
  return 'text-secondary';
};

/**
 * 判斷數值正負，回傳帶 + 號的字串
 * @param {number|string} value
 * @param {boolean} isCurrency
 */
export const formatPnL = (value, isCurrency = true) => {
  const num = parseFloat(value) || 0;
  const sign = num >= 0 ? '+' : '';
  if (isCurrency) {
    return `${sign}${formatCurrency(num)}`;
  }
  return `${sign}${num.toFixed(2)}`;
};
