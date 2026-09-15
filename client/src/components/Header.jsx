import React from 'react';
import { ShieldCheck, Cpu, RefreshCw } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, health, onRefresh }) {
  const navItems = [
    { id: 'pos', label: 'Verification Gate', icon: '⚡' },
    { id: 'doctor', label: 'Doctor', icon: '🩺' },
    { id: 'patient', label: 'Patient', icon: '📱' },
    { id: 'manufacturer', label: 'Manufacturer', icon: '🏭' },
    { id: 'distributor', label: 'Distributor', icon: '🚚' },
    { id: 'dra', label: 'DRA Command', icon: '🏛️' },
    { id: 'benchmark', label: 'Benchmarks', icon: '📊' },
    { id: 'ledger', label: 'Ledger', icon: '⛓️' },
  ];

  return (
    <header className="header-container">
      <div className="header-top">
        <div className="brand-group">
          <div className="brand-badge-icon">
            <ShieldCheck size={22} className="text-emerald" />
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">MedTrust</h1>
              <span className="version-pill">v2.0</span>
            </div>
            <p className="brand-subtitle">
              Dual-Layer Blockchain Verification — Prescription Authenticity & Drug Provenance
            </p>
          </div>
        </div>

        <div className="telemetry-group">
          <div className="telemetry-pill">
            <span className="status-dot-pulse"></span>
            <span className="telemetry-value mono">medtrust-channel</span>
          </div>
          <div className="telemetry-pill">
            <Cpu size={12} className="text-cyan" />
            <span className="telemetry-value mono">ECDSA P-256</span>
          </div>
          <button className="icon-btn-refresh" onClick={onRefresh} title="Sync State">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <nav className="header-nav">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-tab-btn ${isActive ? 'nav-tab-active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span className="nav-item-text">{item.label}</span>
              {isActive && <div className="nav-active-indicator" />}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
