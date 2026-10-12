import React, { useState } from 'react';
import { Truck, ArrowRight, MapPin, CheckCircle2, History } from 'lucide-react';
import { transferCustody } from '../services/api';

export default function DistributorPortal({ batches = [], onCustodyTransferred }) {
  const [selectedBatchId, setSelectedBatchId] = useState(
    batches[0]?.batchId || 'BATCH-SUN-PCM-2026-99'
  );
  const [recipientId, setRecipientId] = useState('PHARM-APOLLO-104');
  const [recipientRole, setRecipientRole] = useState('Pharmacy');
  const [location, setLocation] = useState('Indore Pharma Distribution Corridor, M.P.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedBatch = batches.find((b) => b.batchId === selectedBatchId) || batches[0];

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;

    setLoading(true);
    setErrorMsg('');
    setResult(null);

    try {
      const res = await transferCustody({
        batchId: selectedBatch.batchId,
        senderId: selectedBatch.currentCustodianId,
        recipientId,
        recipientRole,
        location,
      });
      setResult(res);
      if (onCustodyTransferred) onCustodyTransferred();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to transfer custody');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-banner">
        <div className="banner-profile">
          <div className="avatar-box avatar-dist">
            <Truck size={24} />
          </div>
          <div>
            <div className="banner-title-row">
              <h2 className="banner-title">Logistics & Wholesaler Custody Terminal</h2>
              <span className="badge-dist">Certified Logistics Hub</span>
            </div>
            <p className="banner-sub">
              Blue Dart LifeSciences Cold Chain • Indore Central Depot (Lic: <span className="font-mono text-cyan">MP-LOG-2022-019</span>)
            </p>
          </div>
        </div>
        <div className="crypto-assurance-pill">
          <MapPin size={14} className="text-cyan" />
          <span>Cryptographic Custody Transition Logging</span>
        </div>
      </div>

      <div className="two-column-grid">
        {/* Handoff Form */}
        <div className="panel-card">
          <div className="panel-header">
            <ArrowRight size={18} className="text-cyan" />
            <h3 className="panel-title">Sign Next Supply Chain Custody Handoff</h3>
          </div>

          <form onSubmit={handleTransfer} className="form-layout">
            <div className="form-group">
              <label className="input-field-label">Select Drug Batch to Route</label>
              <select
                className="select-input font-mono"
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  setResult(null);
                  setErrorMsg('');
                }}
              >
                {batches.map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.batchId} — {b.drugName} (At: {b.currentCustodianId})
                  </option>
                ))}
              </select>
            </div>

            {selectedBatch && (
              <div className="current-custody-summary">
                <div className="summary-row">
                  <span className="text-muted">Current Custodian:</span>
                  <span className="font-mono text-purple font-semibold">
                    {selectedBatch.currentCustodianId} ({selectedBatch.currentCustodianRole})
                  </span>
                </div>
                <div className="summary-row">
                  <span className="text-muted">Batch Status:</span>
                  <span>
                    {selectedBatch.isDispensed ? (
                      <span className="status-tag tag-dispensed">Already Dispensed</span>
                    ) : selectedBatch.isRecalled ? (
                      <span className="status-tag tag-recalled">Recalled</span>
                    ) : (
                      <span className="status-tag tag-active">Eligible for Transfer</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="form-row-2">
              <div className="form-group">
                <label className="input-field-label">Transfer Recipient Node</label>
                <select
                  className="select-input font-mono"
                  value={recipientId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRecipientId(val);
                    if (val.startsWith('PHARM')) {
                      setRecipientRole('Pharmacy');
                    } else if (val.startsWith('DIST')) {
                      setRecipientRole('Distributor');
                    }
                  }}
                >
                  <option value="PHARM-APOLLO-104">PHARM-APOLLO-104 (Apollo Pharmacy Indore)</option>
                  <option value="PHARM-MEDPLUS-77">PHARM-MEDPLUS-77 (MedPlus Chemist Indore)</option>
                  <option value="DIST-ALLKEM-BHO">DIST-ALLKEM-BHO (Allkem Wholesalers Bhopal)</option>
                  <option value="DIST-BLUEDART-IND">DIST-BLUEDART-IND (Blue Dart Indore Depot)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="input-field-label">Recipient Node Role</label>
                <input
                  type="text"
                  className="text-input"
                  value={recipientRole}
                  readOnly
                />
              </div>
            </div>

            <div className="form-group">
              <label className="input-field-label">Geographic Checkpoint / Waypoint Location</label>
              <input
                type="text"
                className="text-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || selectedBatch?.isDispensed || selectedBatch?.isRecalled}
            >
              {loading ? 'Committing Custody Block...' : 'Digitally Sign & Commit Custody Transfer'}
            </button>
          </form>

          {errorMsg && <div className="error-banner">{errorMsg}</div>}

          {result && (
            <div className="success-banner mt-4">
              <CheckCircle2 size={18} className="text-emerald" />
              <div>
                <strong>Custody Transferred:</strong> New custodian is {result.batch?.currentCustodianId} (Block #{result.blockHeight})
              </div>
            </div>
          )}
        </div>

        {/* Custody Timeline Visualization */}
        <div className="panel-card">
          <div className="panel-header">
            <History size={18} className="text-emerald" />
            <h3 className="panel-title">
              Custody Journey Timeline: <span className="font-mono text-cyan">{selectedBatch?.batchId}</span>
            </h3>
          </div>

          {selectedBatch?.custodyHistory && (
            <div className="timeline-container">
              {selectedBatch.custodyHistory.map((hop, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="timeline-marker">
                    <span className="marker-number">{idx + 1}</span>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-title-row">
                      <span className="font-mono text-sm font-bold text-cyan">{hop.transitionId}</span>
                      <span className="timeline-time text-muted text-xs">
                        {new Date(hop.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="timeline-route">
                      <span className="route-node font-mono">{hop.senderId}</span>
                      <ArrowRight size={14} className="text-muted" />
                      <span className="route-node font-mono text-emerald">{hop.recipientId}</span>
                    </div>
                    <div className="timeline-location text-xs text-muted">
                      <MapPin size={11} className="inline-icon" /> {hop.location}
                    </div>
                    <div className="timeline-sig font-mono text-xs text-muted">
                      Sig: {hop.signatureHex.slice(0, 32)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
