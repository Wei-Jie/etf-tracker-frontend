import { useState, useEffect } from 'react';
import './SitePasswordGate.css';

export default function SitePasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(true);

  const EXPECTED_PASSWORD = import.meta.env.VITE_SITE_PASSWORD || 'loveWinnie';

  useEffect(() => {
    // 檢查瀏覽器 Session 是否已經解鎖過
    const checkUnlock = () => {
      const isUnlocked = sessionStorage.getItem('site_unlocked') === 'true';
      if (isUnlocked) {
        setUnlocked(true);
      }
    };
    
    checkUnlock();
    setChecking(false);

    window.addEventListener('site_unlocked_changed', checkUnlock);

    // 背景默默對後端 API 發出輕量級健康檢查請求，以防範 Cloud Run 冷啟動延遲 (Warm-up API)
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
    fetch(`${baseUrl}/health`)
      .then(res => res.json())
      .then(data => console.log('後端預熱回應:', data.message))
      .catch(err => console.warn('後端預熱請求已送出:', err.message));

    return () => {
      window.removeEventListener('site_unlocked_changed', checkUnlock);
    };
  }, []);

  const handleUnlock = (e) => {
    e?.preventDefault();
    setError(false);

    if (password === EXPECTED_PASSWORD) {
      sessionStorage.setItem('site_unlocked', 'true');
      setUnlocked(true);
      // 觸發全站同步事件，使其他可能已經被渲染但尚未 unlocked 的頁面更新（例如跨元件狀態）
      window.dispatchEvent(new Event('site_unlocked_changed'));
    } else {
      setError(true);
      // 3 秒後自動清除錯誤狀態，方便再次輸入
      setTimeout(() => setError(false), 2000);
    }
  };

  if (checking) {
    return (
      <div className="gate-loading">
        <div className="gate-spinner" />
        <p>安全驗證中...</p>
      </div>
    );
  }

  if (unlocked) {
    return children;
  }

  return (
    <div className="gate-container">
      <div className="gate-bg-gradient" />
      <div className={`gate-card ${error ? 'shake' : ''}`}>
        <div className="gate-icon-wrapper">
          <span className="gate-icon">🛡️</span>
        </div>
        <h2 className="gate-title">系統安全鎖</h2>
        <p className="gate-desc">
          本系統包含敏感持倉明細與財務資產數據，請輸入存取密碼以進行安全驗證。
        </p>

        <form onSubmit={handleUnlock} className="gate-form">
          <div className="gate-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              className="gate-input"
              placeholder="請輸入進入密碼..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              autoFocus
            />
            <button
              type="button"
              className="gate-toggle-pwd"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          {error && <div className="gate-error-msg">⚠️ 密碼錯誤，請重新輸入</div>}

          <button type="submit" className="gate-submit-btn">
            驗證並解鎖
          </button>
        </form>

        <div className="gate-footer">
          🔒 傳輸已進行端到端 SSL 加密防護
        </div>
      </div>
    </div>
  );
}
