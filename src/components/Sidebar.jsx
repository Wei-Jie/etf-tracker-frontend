import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { to: '/',          icon: '📊', label: '儀表板' },
  { to: '/etf',       icon: '🔍', label: 'ETF 查詢' },
  { to: '/backtest',  icon: '📈', label: 'DCA 回測' },
  { to: '/projection',icon: '🔮', label: '未來模擬' },
  { to: '/portfolio', icon: '💼', label: '持倉管理' },
];

export default function Sidebar() {
  const handleLock = () => {
    sessionStorage.removeItem('site_unlocked');
    window.location.reload();
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">📈</div>
        <div className="logo-text">
          <div className="logo-name">ETF Tracker</div>
          <div className="logo-sub">定期定額分析</div>
        </div>
      </div>

      {/* 導覽連結 */}
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 安全鎖定按鈕 */}
      <div className="sidebar-lock">
        <button className="sidebar-lock-btn" onClick={handleLock}>
          <span className="nav-icon">🔒</span>
          <span className="nav-label">安全鎖定</span>
        </button>
      </div>

      {/* 底部版本 */}
      <div className="sidebar-footer">
        <div className="sidebar-version">v1.0.0</div>
        <div className="sidebar-version-sub">WeiJie Agent</div>
      </div>
    </aside>
  );
}
