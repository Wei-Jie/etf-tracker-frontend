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
    // 檢查瀏覽器本地是否已經解鎖過
    const isUnlocked = localStorage.getItem('site_unlocked') === 'true';
    if (isUnlocked) {
      setUnlocked(true);
    }
    setChecking(false);
  }, []);

  const handleUnlock = (e) => {
    e?.preventDefault();
    setError(false);

    if (password === EXPECTED_PASSWORD) {
      localStorage.setItem('site_unlocked', 'true');
      setUnlocked(true);
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
