import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import EtfSearch from './pages/EtfSearch';
import Backtest from './pages/Backtest';
import Projection from './pages/Projection';
import Portfolio from './pages/Portfolio';
import SitePasswordGate from './components/SitePasswordGate';
import MobileTopbar from './components/MobileTopbar';
import MobileBottomNav from './components/MobileBottomNav';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        {/* 桌機版側邊欄 */}
        <Sidebar />
        
        <div className="app-main-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* 行動端頂部狀態列 */}
          <MobileTopbar />
          
          {/* 主內容區 */}
          <main className="main-content">
            <Routes>
              <Route path="/"           element={<SitePasswordGate><Dashboard /></SitePasswordGate>} />
              <Route path="/etf"        element={<SitePasswordGate><EtfSearch /></SitePasswordGate>} />
              <Route path="/backtest"   element={<SitePasswordGate><Backtest /></SitePasswordGate>} />
              <Route path="/projection" element={<SitePasswordGate><Projection /></SitePasswordGate>} />
              <Route path="/portfolio"  element={<SitePasswordGate><Portfolio /></SitePasswordGate>} />
            </Routes>
          </main>
          
          {/* 行動端底部導覽列 */}
          <MobileBottomNav />
        </div>
      </div>
    </BrowserRouter>
  );
}
