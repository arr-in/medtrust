import React, { useState, useEffect } from 'react';
import { Landmark, ShieldAlert, AlertTriangle, Radio } from 'lucide-react';
import { getDRAIncidents, getDRAStats, issueDRARecall } from '../services/api';

export default function DRAPanel({ onRecallIssued }) {
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [recallBatchId, setRecallBatchId] = useState('BATCH-CIPLA-AZI-2026-01');
  const [recallReason, setRecallReason] = useState('Substandard Active Pharmaceutical Ingredient purity test failure (CDSCO Alert)');
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

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
    const interval = setInterval(loadDRAData, 3000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleBroadcastRecall = async (e) => {
    e.preventDefault();
    setLoading(true);
    setActionMsg('');

    try {
      const res = await issueDRARecall({
        batchId: recallBatchId.trim(),
        reason: recallReason.trim(),
        authority: 'CDSCO Central Drug Controller',
      });
      setActionMsg(`✅ Recall broadcast committed to block #${res.blockHeight}. Any dispensing of ${recallBatchId} will be blocked across the consortium.`);
      loadDRAData();
      if (onRecallIssued) onRecallIssued();
    } catch (err) {
      setActionMsg(`❌ Failed to issue recall: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-container">
      {/* DRA Banner */}
      <div className="portal-banner">
        <div className="banner-profile">
          <div className="avatar-box avatar-dra">
            <Landmark size={24} />
          </div>
          <div>
            <div className="banner-title-row">
              <h2 className="banner-title">Drug Regulatory Authority (DRA) Command Panel</h2>
              <span className="badge-dra">Apex Regulatory Oversight</span>
            </div>
            <p className="banner-sub">
              Central Drugs Standard Control Organisation (CDSCO) • Root Certificate Authority Node
            </p>
          </div>
        </div>
        <div className="crypto-assurance-pill">
          <Radio size={14} className="text-rose animate-pulse" />
          <span>Real-Time Recall & Fraud Interception Network</span>
        </div>
      </div>

      {/* Network Stats Cards */}
      {stats && (
        <div className="stats-grid-4">
          <div className="stat-card">
            <span className="stat-label">Total Prescriptions</span>
            <div className="stat-value text-emerald">{stats.totalPrescriptions}</div>
            <span className="stat-sub">Active: {stats.activePrescriptions} | Fulfilled: {stats.fulfilledPrescriptions}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Batches Tracked</span>
            <div className="stat-value text-cyan">{stats.totalBatches}</div>
            <span className="stat-sub">Dispensed: {stats.dispensedBatches} | Recalled: {stats.recalledBatches}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Blocked Fraud Incidents</span>
            <div className="stat-value text-rose">{stats.blockedIncidents}</div>
            <span className="stat-sub">Interception Rate: 100%</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Fabric Block Height</span>
            <div className="stat-value text-purple font-mono">#{stats.blockHeight}</div>
            <span className="stat-sub">Immutable Ledgers Synced</span>
          </div>
        </div>
      )}

      <div className="two-column-grid mt-6">
        {/* Broadcast Recall Action Card */}
        <div className="panel-card">
          <div className="panel-header">
            <ShieldAlert size={18} className="text-rose" />
            <h3 className="panel-title">Broadcast Instant Drug Batch Recall</h3>
          </div>

          <form onSubmit={handleBroadcastRecall} className="form-layout">
            <p className="text-sm text-muted">
              Broadcasting a recall commits an immediate cryptographic recall flag across all consortium peers. Pharmacist terminals will atomically reject any attempted dispense of this batch with zero delay.
            </p>

            <div className="form-group">
              <label className="input-field-label">Target Batch Serial ID to Blacklist</label>
              <input
                type="text"
                className="text-input font-mono"
                value={recallBatchId}
                onChange={(e) => setRecallBatchId(e.target.value)}
                placeholder="e.g. BATCH-CIPLA-AZI-2026-01"
                required
              />
            </div>

            <div className="form-group">
              <label className="input-field-label">Regulatory Justification / Recall Notice</label>
              <textarea
                className="text-input"
                rows="3"
                value={recallReason}
                onChange={(e) => setRecallReason(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-danger" disabled={loading}>
              {loading ? 'Broadcasting to Fabric Network...' : 'Commit Regulatory Recall to Blockchain'}
            </button>
          </form>

          {actionMsg && <div className="notification-banner mt-4">{actionMsg}</div>}
        </div>

        {/* Real-time Incident & Breach Feed */}
        <div className="panel-card">
          <div className="panel-header">
            <AlertTriangle size={18} className="text-amber" />
            <h3 className="panel-title">Security Incident & Breach Feed ({incidents.length})</h3>
          </div>

          <div className="incident-feed-scroll">
            {incidents.length === 0 ? (
              <div className="empty-placeholder">No security breaches detected yet. Clean operation.</div>
            ) : (
              incidents.map((inc) => (
                <div key={inc.id} className="incident-feed-item">
                  <div className="incident-header-row">
                    <span className="incident-id font-mono text-xs">{inc.id}</span>
                    <span className={`severity-tag ${inc.severity === 'CRITICAL' ? 'sev-crit' : 'sev-high'}`}>
                      {inc.severity}
                    </span>
                    <span className="incident-time text-xs text-muted">
                      {new Date(inc.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="incident-breach-title font-bold text-rose text-sm">
                    {inc.breachCode}
                  </div>
                  <div className="incident-reason-text text-xs text-muted mt-1">{inc.reason}</div>
                  <div className="incident-meta-tags">
                    {inc.prescriptionId && (
                      <span className="meta-tag font-mono">Rx: {inc.prescriptionId}</span>
                    )}
                    {inc.batchId && (
                      <span className="meta-tag font-mono">Batch: {inc.batchId}</span>
                    )}
                    {inc.pharmacyId && (
                      <span className="meta-tag font-mono">Node: {inc.pharmacyId}</span>
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
