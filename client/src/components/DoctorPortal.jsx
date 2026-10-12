import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { issuePrescription } from '../services/api';

export default function DoctorPortal({ prescriptions = [], onPrescriptionCreated, onNavigate }) {
  const [formData, setFormData] = useState({
    doctorId: 'DOC-99412',
    patientId: 'PAT-IND-2026-7731',
    patientName: 'Kavita Deshmukh',
    patientAge: '32',
    drugName: 'Azithromycin IP',
    dosage: '500mg',
    validDays: 14,
    diagnosis: 'Upper Respiratory Tract Infection',
    instructions: '1 tablet daily after meals for 5 days',
  });

  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const isFormValid =
    formData.patientId.trim().length > 0 &&
    formData.patientName.trim().length > 0 &&
    formData.drugName.trim().length > 0 &&
    formData.dosage.trim().length > 0 &&
    Number(formData.validDays) >= 1;

  const handleCopy = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessResult(null);

    try {
      const res = await issuePrescription(formData);
      setSuccessResult(res);
      if (onPrescriptionCreated) onPrescriptionCreated();
    } catch (err) {
      setErrorMsg(err.message || 'Could not issue prescription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h2 className="page-title">Doctor Portal</h2>
          <p className="page-subtitle">
            Issue a digitally signed e-prescription • Dr. Ananya Sharma, M.D. (Apollo Hospital, Indore)
          </p>
        </div>
      </div>

      <div className="grid-2">
        {/* Primary Action: Issue Prescription Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Issue New Prescription</h3>
          </div>

          <form onSubmit={handleSubmit} className="form-stack">
            <div className="form-row">
              <div className="form-group">
                <label className="field-label" htmlFor="doc-patient-name">Patient Name</label>
                <input
                  id="doc-patient-name"
                  type="text"
                  className="text-input"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="field-label" htmlFor="doc-patient-id">Patient ID</label>
                <input
                  id="doc-patient-id"
                  type="text"
                  className="text-input font-mono"
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="field-label" htmlFor="doc-drug-name">Medication Name</label>
                <input
                  id="doc-drug-name"
                  type="text"
                  className="text-input"
                  value={formData.drugName}
                  onChange={(e) => setFormData({ ...formData, drugName: e.target.value })}
                  placeholder="e.g. Azithromycin IP"
                  required
                />
              </div>
              <div className="form-group">
                <label className="field-label" htmlFor="doc-dosage">Dosage</label>
                <input
                  id="doc-dosage"
                  type="text"
                  className="text-input"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  placeholder="e.g. 500mg"
                  required
                />
              </div>
            </div>

            <details className="tech-details">
              <summary>Instructions & validity options</summary>
              <div className="tech-details-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="field-label" htmlFor="doc-diagnosis">Diagnosis</label>
                    <input
                      id="doc-diagnosis"
                      type="text"
                      className="text-input"
                      value={formData.diagnosis}
                      onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label" htmlFor="doc-valid-days">Valid For (Days)</label>
                    <input
                      id="doc-valid-days"
                      type="number"
                      className="text-input font-mono"
                      value={formData.validDays}
                      onChange={(e) => setFormData({ ...formData, validDays: e.target.value })}
                      min="1"
                      max="90"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="field-label" htmlFor="doc-instructions">Dosage Instructions</label>
                  <input
                    id="doc-instructions"
                    type="text"
                    className="text-input"
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  />
                </div>
              </div>
            </details>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !isFormValid}
            >
              {loading ? 'Signing & Saving...' : 'Sign & Issue Prescription'}
            </button>
          </form>

          {errorMsg && (
            <div className="feedback-box feedback-error">
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Right Column: Generated Pass & Next Step */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Issued Prescription Pass</h3>
          </div>

          {successResult ? (
            <div className="form-stack">
              <div className="feedback-box feedback-success">
                <div className="flex-row">
                  <CheckCircle2 size={18} />
                  <span>
                    Prescription <strong>{successResult.prescriptionId}</strong> saved (Block #{successResult.blockHeight})
                  </span>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onNavigate('patient')}
                  >
                    <span>View Patient Pass</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>

              <div className="qr-box">
                <QRCodeSVG
                  value={successResult.prescriptionId}
                  size={140}
                  level="H"
                  includeMargin={true}
                />
                <div className="font-mono font-bold text-sm" style={{ color: '#0F172A' }}>
                  {successResult.prescriptionId}
                </div>
                <span className="text-xs text-muted">Present at pharmacy to dispense</span>
              </div>

              <details className="tech-details">
                <summary>Technical details (Hash, Salt & Transaction ID)</summary>
                <div className="tech-details-body">
                  <div>
                    <strong>Transaction ID:</strong>{' '}
                    <span className="font-mono">{successResult.txId}</span>
                  </div>
                  <div>
                    <strong>Salted SHA-256 Hash:</strong>{' '}
                    <span className="font-mono">{successResult.saltedHash}</span>
                  </div>
                  <div>
                    <strong>Cryptographic Salt:</strong>{' '}
                    <span className="font-mono">{successResult.prescription?.salt}</span>
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <div className="empty-state">
              Submit the form on the left to generate a signed prescription and QR code for the patient.
            </div>
          )}
        </div>
      </div>

      {/* Prescriptions Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Prescriptions ({prescriptions.length})</h3>
        </div>

        <div className="table-wrap">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Prescription ID</th>
                <th>Patient</th>
                <th>Medication</th>
                <th>Doctor</th>
                <th>Status</th>
                <th>Expires</th>
                <th>On-Chain Hash</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => (
                <tr key={rx.prescriptionId}>
                  <td className="font-mono font-semibold">{rx.prescriptionId}</td>
                  <td>{rx.patientName}</td>
                  <td>
                    {rx.drugName} <span className="text-muted">{rx.dosage}</span>
                  </td>
                  <td>{rx.doctorName}</td>
                  <td>
                    <span
                      className={`badge ${
                        rx.state === 'Active'
                          ? 'badge-active'
                          : rx.state === 'Fulfilled'
                          ? 'badge-fulfilled'
                          : 'badge-expired'
                      }`}
                    >
                      {rx.state}
                    </span>
                  </td>
                  <td className="text-xs text-muted">
                    {new Date(rx.expiryTimestamp).toLocaleDateString()}
                  </td>
                  <td>
                    {rx.saltedHash ? (
                      <span className="short-hash-pill" title={rx.saltedHash}>
                        <span>{rx.saltedHash.slice(0, 8)}...</span>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '2px' }}
                          onClick={() => handleCopy(rx.prescriptionId, rx.saltedHash)}
                          title="Copy full hash"
                        >
                          {copiedId === rx.prescriptionId ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </span>
                    ) : (
                      'N/A'
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
