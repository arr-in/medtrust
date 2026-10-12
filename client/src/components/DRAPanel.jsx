import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { getDRAIncidents, getDRAStats, issueDRARecall } from '../services/api';

const FRIENDLY_BREACH_TITLES = {
  REPLAY_FRAUD_DETECTED: 'Prescription Already Used (Replay Attempt)',
  EXPIRED_PRESCRIPTION: 'Expired Prescription Presented',
  PRESCRIPTION_NOT_FOUND: 'Unregistered Prescription ID',
  COUNTERFEIT_BATCH_DETECTED: 'Unregistered / Counterfeit Drug Batch',
  BROKEN_CUSTODY_CHAIN: 'Batch Not in Pharmacy Custody',
  RECALLED_DRUG_BATCH: 'Attempted Dispense of Recalled Batch',
  DRUG_MISMATCH_DETECTED: 'Medication Mismatch Between Rx & Batch',
  DRA_RECALL_MANDATE: 'Regulatory Recall Issued by CDSCO',
};

export default function DRAPanel({ batches = [], onRecallIssued, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [recallBatchId, setRecallBatchId] = useState('BATCH-CIPLA-AZI-2026-01');
  const [recallReason, setRecallReason] = useState(
    'Substandard Active Pharmaceutical Ingredient purity test failure (CDSCO Alert)'
  );
  const [loading, setLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadDRAData = async () => {
    try {
      const [statsRes, incidentsRes] = await Promise.all([
        getDRAStats(),
        getDRAIncidents(),
      ]);
      setStats(statsRes.stats);
      setIncidents(incidentsRes.incidents);
    } catch (err) {
      console.error('Failed to load DRA data:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadDRAData, 0);
    const interval = setInterval(loadDRAData, 4000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const isFormValid = recallBatchId.trim().length > 0 && recallReason.trim().length > 0;

  const handleBroadcastRecall = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setLoading(true);
    setActionResult(null);
    setErrorMsg('');

    try {
      const res = await issueDRARecall({
        batchId: recallBatchId.trim(),
        reason: recallReason.trim(),
        authority: 'CDSCO Central Drug Controller',
      });
      setActionResult(res);
      loadDRAData();
      if (onRecallIssued) onRecallIssued();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to issue recall.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h2 className="page-title">Regulator Oversight (CDSCO / DRA)</h2>
          <p className="page-subtitle">
            Monitor blocked dispensing attempts and broadcast instant drug batch recalls
          </p>
        </div>
      </div>

      {/* 4 Summary Metrics */}
      {stats && (
        <div className="grid-4">
          <div className="stat-card">
            <span className="stat-label">Total Prescriptions</span>
            <div className="stat-value">{stats.totalPrescriptions}</div>
            <span className="stat-sub">
              {stats.activePrescriptions} active • {stats.fulfilledPrescriptions} fulfilled
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Drug Batches</span>
            <div className="stat-value">{stats.totalBatches}</div>
            <span className="stat-sub">
              {stats.dispensedBatches} dispensed • {stats.recalledBatches} recalled
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Blocked Attempts</span>
            <div className="stat-value text-danger">{stats.blockedIncidents}</div>
            <span className="stat-sub">Logged at point of sale</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Ledger Height</span>
            <div className="stat-value font-mono">#{stats.blockHeight}</div>
            <span className="stat-sub">Total blocks committed</span>
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* Left: Issue Recall Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recall a Drug Batch</h3>
          </div>

          <form onSubmit={handleBroadcastRecall} className="form-stack">
            {batches.length > 0 && (
              <div className="form-group">
                <label className="field-label" htmlFor="dra-batch-select">Select Registered Batch</label>
                <select
                  id="dra-batch-select"
                  className="select-input font-mono"
                  value={batches.some((b) => b.batchId === recallBatchId) ? recallBatchId : ''}
                  onChange={(e) => {
                    if (e.target.value) setRecallBatchId(e.target.value);
                  }}
                >
                  <option value="">-- Custom Batch ID --</option>
                  {batches.map((b) => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.batchId} — {b.drugName} {b.isRecalled ? '[Already Recalled]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="field-label" htmlFor="dra-batch-input">Batch Serial ID</label>
              <input
                id="dra-batch-input"
                type="text"
                className="text-input font-mono"
                value={recallBatchId}
                onChange={(e) => setRecallBatchId(e.target.value)}
                placeholder="e.g. BATCH-CIPLA-AZI-2026-01"
                required
              />
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="dra-reason">Recall Reason</label>
              <textarea
                id="dra-reason"
                className="text-input"
                rows="3"
                value={recallReason}
                onChange={(e) => setRecallReason(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-danger btn-lg"
              disabled={loading || !isFormValid}
            >
              {loading ? 'Broadcasting Recall...' : 'Issue Immediate Recall'}
            </button>
          </form>

          {errorMsg && (
            <div className="feedback-box feedback-error">
              <span>{errorMsg}</span>
            </div>
          )}

          {actionResult && (
            <div className="feedback-box feedback-success">
              <div className="flex-row">
                <CheckCircle2 size={18} />
                <span>
                  Batch <strong>{actionResult.batch?.batchId}</strong> recalled (Block #{actionResult.blockHeight})
                </span>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigate('pos')}
                >
                  <span>Test at Pharmacist POS</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Blocked Attempts & Incident Feed */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Security Alerts ({incidents.length})</h3>
          </div>

          <div className="incident-list">
            {incidents.length === 0 ? (
              <div className="empty-state">
                No blocked attempts or recalls recorded yet.
              </div>
            ) : (
              incidents.map((inc) => (
                <div key={inc.id} className="incident-card">
                  <div className="flex-between">
                    <strong className="text-sm text-danger">
                      {FRIENDLY_BREACH_TITLES[inc.breachCode] || inc.breachCode}
                    </strong>
                    <span className="text-xs text-muted">
                      {new Date(inc.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted">{inc.reason}</div>
                  <div className="flex-row" style={{ marginTop: '4px' }}>
                    <span className="badge badge-neutral font-mono">{inc.breachCode}</span>
                    {inc.prescriptionId && (
                      <span className="text-xs font-mono text-light">Rx: {inc.prescriptionId}</span>
                    )}
                    {inc.batchId && (
                      <span className="text-xs font-mono text-light">Batch: {inc.batchId}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
