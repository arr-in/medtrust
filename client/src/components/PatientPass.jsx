import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, ShieldCheck, FileCheck, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';

export default function PatientPass({ prescriptions = [] }) {
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
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!selectedRx) {
    return (
      <div className="portal-container">
        <div className="empty-placeholder">No prescriptions available yet.</div>
      </div>
    );
  }

  return (
    <div className="portal-container">
      <div className="portal-banner">
        <div className="banner-profile">
          <div className="avatar-box avatar-patient">
            <Smartphone size={24} />
          </div>
          <div>
            <div className="banner-title-row">
              <h2 className="banner-title">Patient Digital Prescription Pass</h2>
              <span className="badge-patient">Patient Wallet</span>
            </div>
            <p className="banner-sub">
              Present this QR pass at any certified MedTrust pharmacy counter for dual-layer verification.
            </p>
          </div>
        </div>

        <div className="selector-group">
          <span className="text-muted text-xs">Switch Prescription:</span>
          <select
            className="select-input font-mono"
            value={selectedRxId}
            onChange={(e) => setSelectedRxId(e.target.value)}
          >
            {prescriptions.map((r) => (
              <option key={r.prescriptionId} value={r.prescriptionId}>
                {r.prescriptionId} — {r.patientName} [{r.state}]
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="patient-pass-card">
        {/* Pass Top Banner */}
        <div className="pass-top-band">
          <div className="pass-brand">
            <ShieldCheck size={20} className="text-emerald" />
            <span className="pass-brand-title">MedTrust E-Prescription Pass</span>
          </div>
          <div
            className={`status-tag ${
              selectedRx.state === 'Active'
                ? 'tag-active'
                : selectedRx.state === 'Fulfilled'
                ? 'tag-fulfilled'
                : 'tag-expired'
            }`}
          >
            {selectedRx.state === 'Active' && '● Active & Valid for Dispensing'}
            {selectedRx.state === 'Fulfilled' && '✓ Fulfilled by Pharmacy'}
            {selectedRx.state === 'Expired' && '✕ Expired'}
          </div>
        </div>

        {/* Pass Body */}
        <div className="pass-body-grid">
          {/* QR Code Presentation Box */}
          <div className="pass-qr-section">
            <div className="qr-wrapper">
              <QRCodeSVG
                value={selectedRx.prescriptionId}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>
            <div className="pass-qr-id font-mono text-cyan font-bold">{selectedRx.prescriptionId}</div>
            <p className="pass-qr-hint">Scan at Pharmacist POS Terminal</p>
          </div>

          {/* Clinical & Pharmacological Details */}
          <div className="pass-details-section">
            <div className="patient-meta-header">
              <div>
                <span className="text-xs text-muted uppercase">Patient Name (Off-Chain)</span>
                <div className="text-lg font-bold">{selectedRx.patientName}</div>
              </div>
              <div>
                <span className="text-xs text-muted uppercase">Prescribing Physician</span>
                <div className="font-semibold text-emerald">{selectedRx.doctorName}</div>
                <div className="text-xs text-muted font-mono">{selectedRx.doctorLicense}</div>
              </div>
            </div>

            <div className="pass-drug-card">
              <div className="drug-headline-row">
                <div>
                  <div className="drug-name-text">{selectedRx.drugName}</div>
                  <div className="drug-dosage-text">{selectedRx.dosage}</div>
                </div>
                <div className="rx-badge">Rx Only</div>
              </div>
              {selectedRx.instructions && (
                <div className="drug-instructions-row">
                  <span className="text-xs text-muted">Instructions: </span>
                  <span className="text-sm font-medium">{selectedRx.instructions}</span>
                </div>
              )}
            </div>

            <div className="pass-timeline-row">
              <div>
                <span className="text-xs text-muted">Issued:</span>
                <div className="text-sm">
                  {new Date(selectedRx.issueTimestamp).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted">Expires:</span>
                <div className="text-sm">
                  {new Date(selectedRx.expiryTimestamp).toLocaleDateString()}
                </div>
              </div>
              {selectedRx.dispensedPharmacyId && (
                <div>
                  <span className="text-xs text-muted">Dispensed By:</span>
                  <div className="text-sm font-mono text-emerald">{selectedRx.dispensedPharmacyId}</div>
                </div>
              )}
            </div>

            {/* Cryptographic Proof & DPDP Act Callout */}
            <div className="proof-box">
              <div className="proof-header">
                <span className="text-xs font-mono text-muted">256-bit SHA-256 On-Chain Commitment:</span>
                <button className="copy-btn" onClick={handleCopyHash} title="Copy Hash">
                  {copied ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="proof-hash font-mono text-xs text-cyan">{selectedRx.saltedHash}</div>
            </div>

            <div className="dpdp-badge">
              <ShieldCheck size={14} className="text-emerald" />
              <span>
                <strong>Privacy Guaranteed:</strong> Complies with India's Digital Personal Data Protection Act (2023). Plaintext identity remains local to your device and clinic; zero health data is public on-chain.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
