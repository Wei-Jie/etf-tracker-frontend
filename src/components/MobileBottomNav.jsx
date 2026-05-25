import { NavLink } from 'react-router-dom';
import './MobileBottomNav.css';

const navItems = [
  { to: '/',          icon: '📊', label: '儀表板' },
  { to: '/etf',       icon: '🔍', label: '查詢' },
  { to: '/backtest',  icon: '📈', label: '回測' },
  { to: '/projection',icon: '🔮', label: '模擬' },
  { to: '/portfolio', icon: '💼', label: '持倉' },
];

export default function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="mobile-nav-icon">{item.icon}</span>
          <span className="mobile-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
