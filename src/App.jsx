import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import EtfSearch from './pages/EtfSearch';
import Backtest from './pages/Backtest';
import Projection from './pages/Projection';
import Portfolio from './pages/Portfolio';
import SitePasswordGate from './components/SitePasswordGate';
import './index.css';

export default function App() {
  return (
    <SitePasswordGate>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/"           element={<Dashboard />} />
              <Route path="/etf"        element={<EtfSearch />} />
              <Route path="/backtest"   element={<Backtest />} />
              <Route path="/projection" element={<Projection />} />
              <Route path="/portfolio"  element={<Portfolio />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </SitePasswordGate>
  );
}
