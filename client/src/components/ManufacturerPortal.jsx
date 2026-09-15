import React, { useState } from 'react';
import { Factory, Plus, Barcode, CheckCircle2, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import { registerBatch } from '../services/api';

export default function ManufacturerPortal({ batches = [], onBatchCreated }) {
  const [formData, setFormData] = useState({
    batchId: `BATCH-CIPLA-${Math.floor(1000 + Math.random() * 9000)}`,
    drugName: 'Azithromycin IP',
    dosage: '500mg',
    ndc: '0378-0012-05',
    plantLocation: 'Verna Industrial Estate, Goa (Plant 3)',
    manufacturerId: 'MFG-CIPLA-GOA',
    expiryMonths: 18,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setResult(null);

    try {
      const res = await registerBatch(formData);
      setResult(res);
      if (onBatchCreated) onBatchCreated();
      // Generate new batch ID for next registration
      setFormData((prev) => ({
        ...prev,
        batchId: `BATCH-CIPLA-${Math.floor(1000 + Math.random() * 9000)}`,
      }));
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register batch genesis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-banner">
        <div className="banner-profile">
          <div className="avatar-box avatar-mfg">
            <Factory size={24} />
          </div>
          <div>
            <div className="banner-title-row">
              <h2 className="banner-title">Pharmaceutical Manufacturer Portal</h2>
              <span className="badge-mfg">Genesis Authority</span>
            </div>
            <p className="banner-sub">
              Cipla Ltd. • Plant #3, Verna Goa (Lic: <span className="font-mono text-cyan">GOA-PH-882</span>)
            </p>
          </div>
        </div>
        <div className="crypto-assurance-pill">
          <Barcode size={14} className="text-cyan" />
          <span>Serialized Batch Provenance & Genesis Minting</span>
        </div>
      </div>

      <div className="two-column-grid">
        {/* Register Form */}
        <div className="panel-card">
          <div className="panel-header">
            <Plus size={18} className="text-cyan" />
            <h3 className="panel-title">Register Physical Drug Batch Genesis</h3>
          </div>

          <form onSubmit={handleRegister} className="form-layout">
            <div className="form-row-2">
              <div className="form-group">
                <label className="input-field-label">Batch Serial ID</label>
                <input
                  type="text"
                  className="text-input font-mono"
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="input-field-label">National Drug Code (NDC / Barcode)</label>
                <input
                  type="text"
                  className="text-input font-mono"
                  value={formData.ndc}
                  onChange={(e) => setFormData({ ...formData, ndc: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="input-field-label">Drug / Active Ingredient Name</label>
                <input
                  type="text"
                  className="text-input"
                  value={formData.drugName}
                  onChange={(e) => setFormData({ ...formData, drugName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="input-field-label">Strength / Dosage</label>
                <input
                  type="text"
                  className="text-input"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="input-field-label">Manufacturing Plant Location</label>
                <input
                  type="text"
                  className="text-input"
                  value={formData.plantLocation}
                  onChange={(e) => setFormData({ ...formData, plantLocation: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="input-field-label">Shelf Life (Months)</label>
                <input
                  type="number"
                  className="text-input font-mono"
                  value={formData.expiryMonths}
                  onChange={(e) => setFormData({ ...formData, expiryMonths: e.target.value })}
                  min="3"
                  max="60"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Minting Genesis Record on Ledger...' : 'Commit Batch Genesis to Blockchain'}
            </button>
          </form>

          {errorMsg && <div className="error-banner">{errorMsg}</div>}

          {result && (
            <div className="success-banner mt-4">
              <CheckCircle2 size={18} className="text-emerald" />
              <div>
                <strong>Batch Minted:</strong> {result.batch?.batchId} committed in Block #{result.blockHeight} (Tx: {result.txId})
              </div>
            </div>
          )}
        </div>

        {/* Manufacturing Protocol Info */}
        <div className="panel-card">
          <div className="panel-header">
            <ShieldCheck size={18} className="text-emerald" />
            <h3 className="panel-title">Module 2 Provenance Specifications</h3>
          </div>
          <div className="info-body-text">
            <p>
              Each registered batch creates a <strong>Genesis Provenance Block</strong> on the Fabric ledger with immutable cryptographic hashes binding:
            </p>
            <ul className="info-bullets">
              <li>Batch Serial Number & NDC Barcode</li>
              <li>Facility Identity & Manufacturing License</li>
              <li>Production Timestamp & Expiry Threshold</li>
              <li>Initial Custody Assignment to Certified Plant Warehouse</li>
            </ul>
            <p className="mt-3 text-sm text-muted">
              Custody handoffs through India's multi-hop pharma distribution chain (Manufacturer → Regional Distributor → Local Wholesaler → Pharmacy) require cryptographic digital signatures at each waypoint.
            </p>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="panel-card mt-6">
        <div className="panel-header">
          <Barcode size={18} className="text-cyan" />
          <h3 className="panel-title">Active Batches Registered on Consortium Ledger ({batches.length})</h3>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Drug & Dosage</th>
                <th>NDC Barcode</th>
                <th>Plant</th>
                <th>Current Custodian</th>
                <th>Expiry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.batchId}>
                  <td className="font-mono text-cyan font-semibold">{b.batchId}</td>
                  <td>
                    {b.drugName} <span className="text-muted">{b.dosage}</span>
                  </td>
                  <td className="font-mono text-xs">{b.ndc}</td>
                  <td className="text-xs">{b.plantLocation}</td>
                  <td>
                    <span className="font-mono text-xs text-purple">{b.currentCustodianId}</span>
                    <span className="text-xs text-muted block">({b.currentCustodianRole})</span>
                  </td>
                  <td className="text-xs">{new Date(b.expiryTimestamp).toLocaleDateString()}</td>
                  <td>
                    {b.isRecalled ? (
                      <span className="status-tag tag-recalled">DRA Recalled</span>
                    ) : b.isDispensed ? (
                      <span className="status-tag tag-dispensed">Dispensed</span>
                    ) : (
                      <span className="status-tag tag-active">In Supply Chain</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
