import './MobileTopbar.css';

export default function MobileTopbar() {
  const handleLock = () => {
    sessionStorage.removeItem('site_unlocked');
    window.location.reload();
  };

  return (
    <header className="mobile-topbar">
      <div className="mobile-logo">
        <span className="mobile-logo-icon">📈</span>
        <div className="mobile-logo-text">
          <span className="mobile-logo-name">ETF Tracker</span>
          <span className="mobile-logo-sub">理財分析</span>
        </div>
      </div>
      <button className="mobile-lock-btn" onClick={handleLock} title="安全鎖定">
        <span className="lock-icon">🔒</span>
        <span className="lock-text">鎖定</span>
      </button>
    </header>
  );
}
