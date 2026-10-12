import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ArrowRight } from 'lucide-react';

export default function PatientPass({ prescriptions = [], onNavigate }) {
  const [selectedRxId, setSelectedRxId] = useState(
    prescriptions[0]?.prescriptionId || 'RX-2026-001-ACTIVE'
  );
  const [copied, setCopied] = useState(false);

  const selectedRx =
    prescriptions.find((r) => r.prescriptionId === selectedRxId) || prescriptions[0];

  const handleCopyHash = () => {
    if (selectedRx?.saltedHash) {
      navigator.clipboard.writeText(selectedRx.saltedHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  if (!selectedRx) {
    return (
      <div className="page-stack">
        <div className="empty-state">No prescriptions available yet.</div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h2 className="page-title">Patient Digital Pass</h2>
          <p className="page-subtitle">
            Present this QR code at the pharmacy counter to verify and pick up medication
          </p>
        </div>

        <div className="flex-row">
          <label className="text-xs text-muted" htmlFor="patient-rx-select">Prescription:</label>
          <select
            id="patient-rx-select"
            className="select-input font-mono"
            style={{ width: 'auto' }}
            value={selectedRx.prescriptionId}
            onChange={(e) => setSelectedRxId(e.target.value)}
          >
            {prescriptions.map((r) => (
              <option key={r.prescriptionId} value={r.prescriptionId}>
                {r.prescriptionId} — {r.patientName} ({r.state})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>{selectedRx.patientName}</span>
            <span
              className={`badge ${
                selectedRx.state === 'Active'
                  ? 'badge-active'
                  : selectedRx.state === 'Fulfilled'
                  ? 'badge-fulfilled'
                  : 'badge-expired'
              }`}
            >
              {selectedRx.state === 'Active'
                ? 'Active • Ready to Use'
                : selectedRx.state === 'Fulfilled'
                ? 'Fulfilled • Already Used'
                : 'Expired'}
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

        <div className="pass-layout">
          <div className="qr-box">
            <QRCodeSVG
              value={selectedRx.prescriptionId}
              size={168}
              level="H"
              includeMargin={true}
            />
            <div className="font-mono font-bold text-sm" style={{ color: '#0F172A' }}>
              {selectedRx.prescriptionId}
            </div>
            <span className="text-xs text-muted">Scan at Pharmacist POS</span>
          </div>

          <div className="form-stack">
            <div className="meta-list">
              <div className="meta-item">
                <span className="meta-label">Prescribed Medication</span>
                <span className="meta-value">
                  {selectedRx.drugName} ({selectedRx.dosage})
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Prescribing Doctor</span>
                <span className="meta-value">{selectedRx.doctorName}</span>
                <span className="text-xs text-muted font-mono">{selectedRx.doctorLicense}</span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Issued Date</span>
                <span className="text-sm">{new Date(selectedRx.issueTimestamp).toLocaleDateString()}</span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Valid Until</span>
                <span className="text-sm">{new Date(selectedRx.expiryTimestamp).toLocaleDateString()}</span>
              </div>
            </div>

            {selectedRx.instructions && (
              <div>
                <span className="meta-label">Dosage Instructions</span>
                <p className="text-sm" style={{ marginTop: '2px' }}>{selectedRx.instructions}</p>
              </div>
            )}

            <div className="flex-row">
              <span className="text-xs text-muted">On-Chain Hash:</span>
              <span className="short-hash-pill">
                <span>{selectedRx.saltedHash?.slice(0, 8)}...</span>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: '2px 4px' }}
                  onClick={handleCopyHash}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span style={{ marginLeft: '4px' }}>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </span>
            </div>

            <details className="tech-details">
              <summary>Technical details (Full SHA-256 hash & privacy note)</summary>
              <div className="tech-details-body">
                <div>
                  <strong>Full Salted SHA-256 Hash:</strong>
                  <div className="font-mono" style={{ wordBreak: 'break-all', marginTop: '2px' }}>
                    {selectedRx.saltedHash}
                  </div>
                </div>
                <div>
                  <strong>Privacy Protection (DPDP Act 2023):</strong> Patient name and diagnosis are stored off-chain only. The blockchain stores only this salted SHA-256 hash and the doctor’s ECDSA signature.
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
