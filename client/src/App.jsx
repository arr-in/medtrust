import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import PharmacistPOS from './components/PharmacistPOS';
import DoctorPortal from './components/DoctorPortal';
import PatientPass from './components/PatientPass';
import ManufacturerPortal from './components/ManufacturerPortal';
import DistributorPortal from './components/DistributorPortal';
import DRAPanel from './components/DRAPanel';
import BenchmarkSuite from './components/BenchmarkSuite';
import LedgerExplorer from './components/LedgerExplorer';
import { getHealth, getPrescriptions, getBatches } from './services/api';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [theme, setTheme] = useState('light');
  const [health, setHealth] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const loadData = async () => {
    try {
      const [hRes, rxRes, batchRes] = await Promise.all([
        getHealth(),
        getPrescriptions(),
        getBatches(),
      ]);
      setHealth(hRes);
      setIsOffline(false);
      setPrescriptions(rxRes.prescriptions || []);
      setBatches(batchRes.batches || []);
    } catch (err) {
      setHealth(null);
      setIsOffline(true);
      console.error('Failed to load initial ledger state:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    const interval = setInterval(loadData, 6000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="app-shell">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        onRefresh={loadData}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="main-content-container">
        {isOffline && (
          <div className="offline-gateway-banner" role="alert">
            <span>
              <strong>Offline:</strong> Cannot reach the MedTrust server. Showing last loaded data — retrying automatically every 6 seconds.
            </span>
            <button type="button" className="offline-retry-btn" onClick={loadData}>
              Retry Now
            </button>
          </div>
        )}

        {activeTab === 'pos' && (
          <PharmacistPOS
            prescriptions={prescriptions}
            batches={batches}
            onUpdate={loadData}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'doctor' && (
          <DoctorPortal
            prescriptions={prescriptions}
            onPrescriptionCreated={loadData}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'patient' && (
          <PatientPass
            prescriptions={prescriptions}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'manufacturer' && (
          <ManufacturerPortal
            batches={batches}
            onBatchCreated={loadData}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'distributor' && (
          <DistributorPortal
            batches={batches}
            onCustodyTransferred={loadData}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'dra' && (
          <DRAPanel
            batches={batches}
            onRecallIssued={loadData}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'benchmark' && (
          <BenchmarkSuite />
        )}

        {activeTab === 'ledger' && (
          <LedgerExplorer />
        )}
      </main>

      <footer className="footer-bar">
        <div className="footer-content">
          <div>
            <strong className="text-primary">MedTrust</strong> • Prescription & Drug Verification System • NMIMS Indore
          </div>
          <div className="font-mono">
            Abhishek Soni • Arin Jain • Neelansh Dosi
          </div>
        </div>
      </footer>
    </div>
  );
}
