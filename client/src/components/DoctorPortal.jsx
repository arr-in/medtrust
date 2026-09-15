import React, { useState } from 'react';
import { Stethoscope, Key, FileCheck, Shield, Plus, QrCode, CheckCircle, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { issuePrescription } from '../services/api';

export default function DoctorPortal({ prescriptions = [], onPrescriptionCreated }) {
  const [formData, setFormData] = useState({
    doctorId: 'DOC-99412',
    patientId: 'PAT-IND-2026-7731',
    patientName: 'Kavita Deshmukh',
    patientAge: '32',
    drugName: 'Azithromycin IP',
    dosage: '500mg',
    validDays: 14,
    diagnosis: 'Upper Respiratory Tract Infection',
    instructions: '1 tab daily after meals for 5 days',
  });

  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessResult(null);

    try {
      const res = await issuePrescription(formData);
      setSuccessResult(res);
      if (onPrescriptionCreated) onPrescriptionCreated();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to issue prescription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-container">
      {/* Doctor Header Banner */}
      <div className="portal-banner">
        <div className="banner-profile">
          <div className="avatar-box avatar-doctor">
            <Stethoscope size={24} />
          </div>
          <div>
            <div className="banner-title-row">
              <h2 className="banner-title">Physician E-Prescribing Portal</h2>
              <span className="badge-verified">Verified Prescriber</span>
            </div>
            <p className="banner-sub">
              Dr. Ananya Sharma, M.D. • License: <span className="font-mono text-cyan">MCI-2018-99412</span> • Apollo Hospital, Indore
            </p>
          </div>
        </div>
        <div className="crypto-assurance-pill">
          <Key size={14} className="text-emerald" />
          <span>ECDSA Signature Engine Enabled (secp256r1)</span>
        </div>
      </div>

      <div className="two-column-grid">
        {/* Left Column: Prescription Form */}
        <div className="panel-card">
          <div className="panel-header">
            <Plus size={18} className="text-emerald" />
            <h3 className="panel-title">Issue Authenticated E-Prescription</h3>
          </div>

          <form onSubmit={handleSubmit} className="form-layout">
            <div className="form-row-2">
              <div className="form-group">
                <label className="input-field-label">Patient National / Health ID</label>
                <input
                  type="text"
                  className="text-input font-mono"
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="input-field-label">Patient Full Name (Off-Chain Only)</label>
                <input
                  type="text"
                  className="text-input"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="input-field-label">Drug / Generic Name</label>
                <input
                  type="text"
                  className="text-input"
                  value={formData.drugName}
                  onChange={(e) => setFormData({ ...formData, drugName: e.target.value })}
                  placeholder="e.g. Azithromycin IP"
                  required
                />
              </div>
              <div className="form-group">
                <label className="input-field-label">Strength & Dosage</label>
                <input
                  type="text"
                  className="text-input"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  placeholder="e.g. 500mg"
                  required
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="input-field-label">Diagnosis</label>
                <input
                  type="text"
                  className="text-input"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="input-field-label">Prescription Validity (Days)</label>
                <input
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
              <label className="input-field-label">Dosage Instructions</label>
              <textarea
                className="text-input"
                rows="2"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              />
            </div>

            <div className="privacy-callout">
              <Shield size={16} className="text-cyan" />
              <span>
                <strong>DPDP Act Compliance:</strong> Patient Name & Diagnosis remain strictly off-chain. Only the salted SHA-256 hash & doctor signature are committed to the Hyperledger Fabric ledger.
              </span>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Cryptographically Signing & Committing...' : 'Sign with ECDSA Key & Write to Ledger'}
            </button>
          </form>

          {errorMsg && <div className="error-banner">{errorMsg}</div>}
        </div>

        {/* Right Column: Generated QR & Cryptographic Proof */}
        <div className="panel-card">
          <div className="panel-header">
            <FileCheck size={18} className="text-cyan" />
            <h3 className="panel-title">Cryptographic Output & Patient QR Pass</h3>
          </div>

          {successResult ? (
            <div className="crypto-success-box">
              <div className="success-badge-row">
                <CheckCircle size={18} className="text-emerald" />
                <span className="text-emerald font-semibold">Prescription Committed to Block #{successResult.blockHeight}</span>
              </div>

              <div className="qr-container">
                <div className="qr-paper">
                  <QRCodeSVG
                    value={successResult.prescriptionId}
                    size={150}
                    level="H"
                    includeMargin={true}
                  />
                  <div className="qr-rx-id font-mono">{successResult.prescriptionId}</div>
                  <div className="qr-sub">Scan at verified MedTrust Pharmacy</div>
                </div>
              </div>

              <div className="hash-details-list">
                <div className="hash-detail-item">
                  <span className="hash-label">256-bit Salted Hash (Module 1):</span>
                  <div className="hash-box font-mono">{successResult.saltedHash}</div>
                </div>
                <div className="hash-detail-item">
                  <span className="hash-label">Transaction ID:</span>
                  <div className="hash-box font-mono text-cyan">{successResult.txId}</div>
                </div>
                <div className="hash-detail-item">
                  <span className="hash-label">Random Cryptographic Salt:</span>
                  <div className="hash-box font-mono text-purple">{successResult.prescription.salt}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-crypto-placeholder">
              <QrCode size={48} className="text-muted" />
              <p className="placeholder-text">
                Fill the prescription form on the left and submit. The system will generate the cryptographic salt, compute the 256-bit SHA-256 hash, apply the doctor's ECDSA signature, and generate the QR pass.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Issued Prescriptions Table */}
      <div className="panel-card mt-6">
        <div className="panel-header">
          <FileCheck size={18} className="text-purple" />
          <h3 className="panel-title">Prescriptions Recorded on Fabric Ledger ({prescriptions.length})</h3>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Rx ID</th>
                <th>Patient (Off-Chain)</th>
                <th>Drug & Dosage</th>
                <th>256-bit On-Chain Hash</th>
                <th>Prescriber</th>
                <th>State</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => (
                <tr key={rx.prescriptionId}>
                  <td className="font-mono text-cyan font-semibold">{rx.prescriptionId}</td>
                  <td>{rx.patientName}</td>
                  <td>
                    {rx.drugName} <span className="text-muted">{rx.dosage}</span>
                  </td>
                  <td className="font-mono text-xs text-muted" title={rx.saltedHash}>
                    {rx.saltedHash ? `${rx.saltedHash.slice(0, 10)}...${rx.saltedHash.slice(-8)}` : 'N/A'}
                  </td>
                  <td>{rx.doctorName}</td>
                  <td>
                    <span
                      className={`status-tag ${
                        rx.state === 'Active'
                          ? 'tag-active'
                          : rx.state === 'Fulfilled'
                          ? 'tag-fulfilled'
                          : 'tag-expired'
                      }`}
                    >
                      {rx.state}
                    </span>
                  </td>
                  <td className="text-xs text-muted">
                    {new Date(rx.expiryTimestamp).toLocaleDateString()}
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
