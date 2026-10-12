import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { transferCustody } from '../services/api';

export default function DistributorPortal({ batches = [], onCustodyTransferred, onNavigate }) {
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

  const canTransfer =
    Boolean(selectedBatch) &&
    !selectedBatch.isDispensed &&
    !selectedBatch.isRecalled &&
    selectedBatch.currentCustodianId !== recipientId &&
    location.trim().length > 0;

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!selectedBatch || !canTransfer) return;

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
      setErrorMsg(err.message || 'Could not transfer custody.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h2 className="page-title">Distributor & Logistics</h2>
          <p className="page-subtitle">
            Record custody handoffs from manufacturer to wholesaler or pharmacy
          </p>
        </div>
      </div>

      <div className="grid-2">
        {/* Left: Custody Handoff Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Transfer Batch Custody</h3>
          </div>

          <form onSubmit={handleTransfer} className="form-stack">
            <div className="form-group">
              <label className="field-label" htmlFor="dist-batch-select">Drug Batch</label>
              <select
                id="dist-batch-select"
                className="select-input font-mono"
                value={selectedBatch?.batchId || ''}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  setResult(null);
                  setErrorMsg('');
                }}
              >
                {batches.map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.batchId} — {b.drugName} (Holder: {b.currentCustodianId})
                  </option>
                ))}
              </select>
            </div>

            {selectedBatch && (
              <div className="flex-between" style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <div className="text-xs">
                  <span className="text-muted">Current Holder: </span>
                  <strong className="font-mono">{selectedBatch.currentCustodianId}</strong> ({selectedBatch.currentCustodianRole})
                </div>
                {selectedBatch.isDispensed ? (
                  <span className="badge badge-dispensed">Already Dispensed</span>
                ) : selectedBatch.isRecalled ? (
                  <span className="badge badge-recalled">Recalled</span>
                ) : (
                  <span className="badge badge-active">Ready to Transfer</span>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="field-label" htmlFor="dist-recipient">Transfer To (Recipient)</label>
              <select
                id="dist-recipient"
                className="select-input font-mono"
                value={recipientId}
                onChange={(e) => {
                  const val = e.target.value;
                  setRecipientId(val);
                  setRecipientRole(val.startsWith('PHARM') ? 'Pharmacy' : 'Distributor');
                }}
              >
                <option value="PHARM-APOLLO-104">PHARM-APOLLO-104 (Apollo Pharmacy Indore)</option>
                <option value="PHARM-MEDPLUS-77">PHARM-MEDPLUS-77 (MedPlus Chemist Indore)</option>
                <option value="DIST-ALLKEM-BHO">DIST-ALLKEM-BHO (Allkem Wholesalers Bhopal)</option>
                <option value="DIST-BLUEDART-IND">DIST-BLUEDART-IND (Blue Dart Indore Depot)</option>
              </select>
              {selectedBatch?.currentCustodianId === recipientId && (
                <span className="field-hint text-danger">
                  This batch is already held by {recipientId}. Choose a different recipient.
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="dist-location">Checkpoint Location</label>
              <input
                id="dist-location"
                type="text"
                className="text-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !canTransfer}
            >
              {loading ? 'Saving Transfer...' : 'Confirm Custody Transfer'}
            </button>
          </form>

          {errorMsg && (
            <div className="feedback-box feedback-error">
              <span>{errorMsg}</span>
            </div>
          )}

          {result && (
            <div className="feedback-box feedback-success">
              <div className="flex-row">
                <CheckCircle2 size={18} />
                <span>
                  Transferred to <strong>{result.batch?.currentCustodianId}</strong> (Block #{result.blockHeight})
                </span>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigate('pos')}
                >
                  <span>Verify at Pharmacist POS</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Clean Custody Chain Timeline */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              Custody History: <span className="font-mono text-sm">{selectedBatch?.batchId}</span>
            </h3>
          </div>

          {selectedBatch?.custodyHistory?.length ? (
            <div className="step-timeline">
              {selectedBatch.custodyHistory.map((hop, idx) => (
                <div key={idx} className="timeline-card">
                  <span className="step-badge">{idx + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div className="flex-between">
                      <div className="font-mono font-semibold text-sm">
                        {hop.senderId} → {hop.recipientId}
                      </div>
                      <span className="text-xs text-muted">
                        {new Date(hop.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: '2px' }}>
                      {hop.location}
                    </div>
                  </div>
                </div>
              ))}

              <details className="tech-details">
                <summary>Technical details (Hop transition IDs & signatures)</summary>
                <div className="tech-details-body">
                  {selectedBatch.custodyHistory.map((hop, idx) => (
                    <div key={idx} className="font-mono text-xs">
                      {hop.transitionId}: {hop.signatureHex.slice(0, 24)}...
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ) : (
            <div className="empty-state">Select a batch to view its custody chain.</div>
          )}
        </div>
      </div>
    </div>
  );
}
