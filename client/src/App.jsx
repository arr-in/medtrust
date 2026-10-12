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
  const [health, setHealth] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [batches, setBatches] = useState([]);

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
    // Auto sync state every 6 seconds
    const interval = setInterval(loadData, 6000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="app-shell">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        onRefresh={loadData}
      />

      <main className="main-content-container">
        {isOffline && (
          <div className="offline-gateway-banner" role="alert">
            <span>⚠️ <strong>Gateway Node Disconnected:</strong> Unable to reach MedTrust backend server. Displaying cached consortium state — auto-reconnecting every 6s...</span>
            <button type="button" className="offline-retry-btn" onClick={loadData}>
              Reconnect Now
            </button>
          </div>
        )}
        {activeTab === 'pos' && (
          <PharmacistPOS
            prescriptions={prescriptions}
            batches={batches}
            onUpdate={loadData}
          />
        )}

        {activeTab === 'doctor' && (
          <DoctorPortal
            prescriptions={prescriptions}
            onPrescriptionCreated={loadData}
          />
        )}

        {activeTab === 'patient' && (
          <PatientPass prescriptions={prescriptions} />
        )}

        {activeTab === 'manufacturer' && (
          <ManufacturerPortal
            batches={batches}
            onBatchCreated={loadData}
          />
        )}

        {activeTab === 'distributor' && (
          <DistributorPortal
            batches={batches}
            onCustodyTransferred={loadData}
          />
        )}

        {activeTab === 'dra' && (
          <DRAPanel onRecallIssued={loadData} />
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
          <div className="footer-left">
            <span className="font-semibold text-emerald">MedTrust Consortium</span>
            <span className="footer-divider">•</span>
            <span>7th Sem Capstone Project</span>
            <span className="footer-divider">•</span>
            <span>Department of Computer Engineering, NMIMS Indore</span>
          </div>
          <div className="footer-right font-mono text-xs text-muted">
            Authors: Abhishek Soni • Arin Jain • Neelansh Dosi
          </div>
        </div>
      </footer>
    </div>
  );
}
