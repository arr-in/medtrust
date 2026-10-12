import React, { useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { registerBatch } from '../services/api';

export default function ManufacturerPortal({ batches = [], onBatchCreated, onNavigate }) {
  const [formData, setFormData] = useState(() => ({
    batchId: `BATCH-CIPLA-${Math.floor(1000 + Math.random() * 9000)}`,
    drugName: 'Azithromycin IP',
    dosage: '500mg',
    ndc: '0378-0012-05',
    plantLocation: 'Verna Industrial Estate, Goa (Plant 3)',
    manufacturerId: 'MFG-CIPLA-GOA',
    expiryMonths: 18,
  }));

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const isFormValid =
    formData.batchId.trim().length > 0 &&
    formData.drugName.trim().length > 0 &&
    formData.dosage.trim().length > 0 &&
    Number(formData.expiryMonths) >= 1;

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setLoading(true);
    setErrorMsg('');
    setResult(null);

    try {
      const res = await registerBatch(formData);
      setResult(res);
      if (onBatchCreated) onBatchCreated();
      setFormData((prev) => ({
        ...prev,
        batchId: `BATCH-CIPLA-${Math.floor(1000 + Math.random() * 9000)}`,
      }));
    } catch (err) {
      setErrorMsg(err.message || 'Could not register drug batch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h2 className="page-title">Manufacturer Portal</h2>
          <p className="page-subtitle">
            Register new physical drug batches on the ledger • Cipla Ltd., Verna Goa (`MFG-CIPLA-GOA`)
          </p>
        </div>
      </div>

      {/* Primary Action Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Register New Drug Batch</h3>
        </div>

        <form onSubmit={handleRegister} className="form-stack">
          <div className="form-row">
            <div className="form-group">
              <label className="field-label" htmlFor="mfg-batch-id">Batch Serial ID</label>
              <input
                id="mfg-batch-id"
                type="text"
                className="text-input font-mono"
                value={formData.batchId}
                onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="mfg-drug-name">Medication Name</label>
              <input
                id="mfg-drug-name"
                type="text"
                className="text-input"
                value={formData.drugName}
                onChange={(e) => setFormData({ ...formData, drugName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="field-label" htmlFor="mfg-dosage">Dosage / Strength</label>
              <input
                id="mfg-dosage"
                type="text"
                className="text-input"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="mfg-expiry">Shelf Life (Months)</label>
              <input
                id="mfg-expiry"
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

          <details className="tech-details">
            <summary>Facility & barcode details</summary>
            <div className="tech-details-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="field-label" htmlFor="mfg-ndc">NDC / Barcode</label>
                  <input
                    id="mfg-ndc"
                    type="text"
                    className="text-input font-mono"
                    value={formData.ndc}
                    onChange={(e) => setFormData({ ...formData, ndc: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="field-label" htmlFor="mfg-plant">Plant Location</label>
                  <input
                    id="mfg-plant"
                    type="text"
                    className="text-input"
                    value={formData.plantLocation}
                    onChange={(e) => setFormData({ ...formData, plantLocation: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </details>

          <div className="flex-between">
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !isFormValid}
            >
              {loading ? 'Registering Batch...' : 'Register Drug Batch'}
            </button>
          </div>
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
                Batch <strong>{result.batch?.batchId}</strong> registered in Block #{result.blockHeight}
              </span>
            </div>
            {onNavigate && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onNavigate('distributor')}
              >
                <span>Next: Transfer Custody</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Batches Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Registered Drug Batches ({batches.length})</h3>
        </div>

        <div className="table-wrap">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Medication</th>
                <th>Current Holder</th>
                <th>Expiry Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.batchId}>
                  <td className="font-mono font-semibold">{b.batchId}</td>
                  <td>
                    {b.drugName} <span className="text-muted">{b.dosage}</span>
                  </td>
                  <td>
                    <span className="font-mono text-xs">{b.currentCustodianId}</span>{' '}
                    <span className="text-xs text-muted">({b.currentCustodianRole})</span>
                  </td>
                  <td className="text-xs text-muted">
                    {new Date(b.expiryTimestamp).toLocaleDateString()}
                  </td>
                  <td>
                    {b.isRecalled ? (
                      <span className="badge badge-recalled">Recalled</span>
                    ) : b.isDispensed ? (
                      <span className="badge badge-dispensed">Dispensed</span>
                    ) : (
                      <span className="badge badge-active">In Supply Chain</span>
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
