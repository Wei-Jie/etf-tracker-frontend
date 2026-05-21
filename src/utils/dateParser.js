/**
 * 日期解析與驗證工具 (繁體中文台灣用語註解)
 */

/**
 * 解析手動輸入的日期，支援 YYYY/M/D, YYYY/MM/DD, YYYY-M-D, YYYY-MM-DD
 * 若為合法實體日期，則轉換並回傳 API 專用的 YYYY-MM-DD 標準格式
 * 
 * @param {string} dateStr 使用者輸入的日期字串
 * @returns {{valid: boolean, formatted?: string, error?: string}} 驗證結果與標準化日期
 */
export function parseAndFormatDate(dateStr) {
  if (!dateStr || !dateStr.trim()) {
    return { valid: false, error: '日期不能為空' };
  }

  const trimmed = dateStr.trim();
  
  // 匹配 YYYY-M-D 或 YYYY/M/D 格式 (月份與日期可為一到二位數)
  const dateRegex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
  const match = trimmed.match(dateRegex);

  if (!match) {
    return { valid: false, error: '格式必須為 YYYY/M/D 或 YYYY-M-D（例如：2026/5/21）' };
  }

  const [_, yearStr, monthStr, dayStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // 實體合法日期判定 (排除 2月30日、4月31日等不存在的日期)
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return { valid: false, error: '該日期在曆法上不存在，請輸入合法的日期' };
  }

  // 轉換為標準 API 格式：YYYY-MM-DD (補足十位數的 0)
  const standardFormatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    valid: true,
    formatted: standardFormatted
  };
}

/**
 * 比較兩個日期字串（支援多格式）之大小關係
 * 確保開始日期早於或等於結束日期
 * 
 * @param {string} startStr 開始日期字串
 * @param {string} endStr 結束日期字串
 * @returns {boolean} 開始日期是否小於或等於結束日期
 */
export function isStartBeforeOrEqualEnd(startStr, endStr) {
  const startResult = parseAndFormatDate(startStr);
  const endResult = parseAndFormatDate(endStr);

  if (!startResult.valid || !endResult.valid) {
    return false;
  }

  const startDate = new Date(startResult.formatted);
  const endDate = new Date(endResult.formatted);

  return startDate <= endDate;
}
