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
    { id: 'pos', index: '01', label: 'Pharmacist POS', Icon: CheckSquare },
    { id: 'doctor', index: '02', label: 'Doctor', Icon: Stethoscope },
    { id: 'patient', index: '03', label: 'Patient Pass', Icon: Smartphone },
    { id: 'manufacturer', index: '04', label: 'Manufacturer', Icon: Factory },
    { id: 'distributor', index: '05', label: 'Distributor', Icon: Truck },
    { id: 'dra', index: '06', label: 'Regulator (DRA)', Icon: ShieldAlert },
    { id: 'ledger', index: '07', label: 'Ledger', Icon: Layers },
  ];

  const isOnline = health?.status === 'ONLINE';

  return (
    <header className="header-container">
      {/* Institutional Telemetry Strip */}
      <div className="institutional-strip">
        <div className="institutional-strip-inner">
          <div className="institutional-left">
            <span className="institutional-tag">CDSCO // INDIA</span>
            <span>NATIONAL PHARMACEUTICAL VERIFICATION LEDGER</span>
          </div>
          <div className="institutional-right">
            <span>CHANNEL: medtrust-channel</span>
            <span className="strip-sep">/</span>
            <span>ECDSA secp256r1</span>
            <span className="strip-sep">/</span>
            <span>DPDP ACT 2023</span>
          </div>
        </div>
      </div>

      <div className="header-top">
        <div className="brand-group">
          <div className="brand-badge-icon">
            <ShieldCheck size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">MedTrust</h1>
              <span className="brand-version-tag">CONSORTIUM v2.4</span>
            </div>
            <p className="brand-subtitle">
              Dual-Layer Prescription Authenticity &amp; Drug Provenance Registry
            </p>
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
            title="Sync ledger state"
            aria-label="Refresh data"
          >
            <RefreshCw size={14} />
          </button>

          {onToggleTheme && (
            <button
              type="button"
              className="icon-btn"
              onClick={onToggleTheme}
              title={theme === 'light' ? 'Switch to dark console' : 'Switch to light paper'}
              aria-label="Toggle color theme"
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
          )}
        </div>
      </div>

      <nav className="header-nav" aria-label="Role navigation">
        <div className="header-nav-inner">
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
                <span className="nav-tab-index">{item.index}</span>
                <IconComponent size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
