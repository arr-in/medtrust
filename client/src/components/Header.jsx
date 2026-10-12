import React from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Sun,
  Moon,
  CheckSquare,
  Stethoscope,
  Smartphone,
  Factory,
  Truck,
  ShieldAlert,
  BarChart3,
  Layers
} from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  health,
  onRefresh,
  theme = 'light',
  onToggleTheme,
}) {
  const navItems = [
    { id: 'pos', label: 'Pharmacist POS', Icon: CheckSquare },
    { id: 'doctor', label: 'Doctor', Icon: Stethoscope },
    { id: 'patient', label: 'Patient Pass', Icon: Smartphone },
    { id: 'manufacturer', label: 'Manufacturer', Icon: Factory },
    { id: 'distributor', label: 'Distributor', Icon: Truck },
    { id: 'dra', label: 'Regulator (DRA)', Icon: ShieldAlert },
    { id: 'ledger', label: 'Ledger', Icon: Layers },
    { id: 'benchmark', label: 'Benchmarks', Icon: BarChart3 },
  ];

  const isOnline = health?.status === 'ONLINE';

  return (
    <header className="header-container">
      <div className="header-top">
        <div className="brand-group">
          <div className="brand-badge-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="brand-title">MedTrust</h1>
            <p className="brand-subtitle">Prescription & Drug Authenticity Verification</p>
          </div>
        </div>

        <div className="header-actions">
          <div
            className="status-pill"
            title={isOnline ? `Connected (${health.activePeers || 6} peers)` : 'Server disconnected'}
          >
            <span className={isOnline ? 'status-dot-pulse' : 'status-dot-offline'} />
            <span>{isOnline ? 'Network Online' : 'Offline'}</span>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onRefresh}
            title="Refresh data"
            aria-label="Refresh data"
          >
            <RefreshCw size={15} />
          </button>

          {onToggleTheme && (
            <button
              type="button"
              className="icon-btn"
              onClick={onToggleTheme}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label="Toggle color theme"
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          )}
        </div>
      </div>

      <nav className="header-nav" aria-label="Role navigation">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-tab-btn ${isActive ? 'nav-tab-active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <IconComponent size={15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
