import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Camera,
  ArrowRight
} from 'lucide-react';
import { previewGatewayCheck, dispenseGateway } from '../services/api';
import WebcamScannerModal from './WebcamScannerModal';

const FRIENDLY_REASONS = {
  REPLAY_FRAUD_DETECTED: 'This prescription has already been used and cannot be filled again.',
  EXPIRED_PRESCRIPTION: 'This prescription has passed its expiration date.',
  PRESCRIPTION_NOT_FOUND: 'No matching prescription was found on the ledger.',
  INVALID_DOCTOR_SIGNATURE: 'The doctor’s digital signature on this prescription is invalid.',
  COUNTERFEIT_BATCH_DETECTED: 'This drug batch serial is not registered on the ledger (possible counterfeit).',
  BATCH_ALREADY_DISPENSED: 'This physical drug package has already been dispensed.',
  RECALLED_DRUG_BATCH: 'This drug batch has been recalled by the Drug Regulatory Authority (CDSCO).',
  EXPIRED_DRUG_BATCH: 'This physical drug batch has passed its shelf-life expiry date.',
  BROKEN_CUSTODY_CHAIN: 'This batch has not been transferred to Apollo Pharmacy (#104) yet.',
  DRUG_MISMATCH_DETECTED: 'The scanned drug batch does not match the medication on the prescription.',
};

function getFriendlyReason(breachCode, fallbackReason) {
  return FRIENDLY_REASONS[breachCode] || fallbackReason || 'Verification checks did not pass.';
}

export default function PharmacistPOS({ prescriptions = [], batches = [], onUpdate, onNavigate }) {
  const [rxInput, setRxInput] = useState('RX-2026-001-ACTIVE');
  const [batchInput, setBatchInput] = useState('BATCH-CIPLA-AZI-2026-01');
  const pharmacyId = 'PHARM-APOLLO-104';

  const [preview, setPreview] = useState(null);
  const [dispenseResult, setDispenseResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [scannerMode, setScannerMode] = useState(null);

  const presets = [
    {
      label: '✓ Valid Dispense',
      rx: 'RX-2026-001-ACTIVE',
      batch: 'BATCH-CIPLA-AZI-2026-01',
    },
    {
      label: '✕ Already Used (Replay)',
      rx: 'RX-2026-002-REPLAY',
      batch: 'BATCH-CIPLA-AZI-2026-01',
    },
    {
      label: '✕ Counterfeit Batch',
      rx: 'RX-2026-001-ACTIVE',
      batch: 'BATCH-FAKE-GREY-999',
    },
    {
      label: '✕ Wrong Custody',
      rx: 'RX-2026-001-ACTIVE',
      batch: 'BATCH-SUN-PCM-2026-99',
    },
    {
      label: '✕ Recalled Batch',
      rx: 'RX-2026-001-ACTIVE',
      batch: 'BATCH-CIPLA-AMX-RECALLED',
    },
    {
      label: '✕ Expired Prescription',
      rx: 'RX-2026-003-EXPIRED',
      batch: 'BATCH-CIPLA-AZI-2026-01',
    },
  ];

  const handleApplyPreset = (preset) => {
    setRxInput(preset.rx);
    setBatchInput(preset.batch);
    setDispenseResult(null);
    setErrorMsg('');
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!rxInput.trim() || !batchInput.trim()) {
        setPreview(null);
        return;
      }
      try {
        const res = await previewGatewayCheck(rxInput.trim(), batchInput.trim(), pharmacyId);
        setPreview(res.evaluation);
      } catch (err) {
        console.error('Pre-flight check error:', err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [rxInput, batchInput, pharmacyId, prescriptions, batches]);

  const handleDispense = async () => {
    if (!rxInput.trim() || !batchInput.trim()) return;
    setLoading(true);
    setErrorMsg('');
    setDispenseResult(null);

    try {
      const res = await dispenseGateway(rxInput.trim(), batchInput.trim(), pharmacyId);
      setDispenseResult(res);
      if (onUpdate) onUpdate();
    } catch (err) {
      setErrorMsg(err.message || 'Could not complete verification request.');
    } finally {
      setLoading(false);
    }
  };

  const isInputValid = Boolean(rxInput.trim() && batchInput.trim());

  return (
    <div className="page-stack">
      <WebcamScannerModal
        isOpen={scannerMode !== null}
        onClose={() => setScannerMode(null)}
        targetName={scannerMode === 'rx' ? 'Prescription QR Code' : 'Drug Batch Barcode'}
        onScanSuccess={(val) => {
          if (scannerMode === 'rx') setRxInput(val);
          if (scannerMode === 'batch') setBatchInput(val);
          setDispenseResult(null);
        }}
      />

      <div className="page-header">
        <div>
          <h2 className="page-title">Pharmacist Point-of-Sale</h2>
          <p className="page-subtitle">
            Verify a patient’s prescription and drug batch together before dispensing • Apollo Pharmacy (#104)
          </p>
        </div>
      </div>

      {/* Quick Demo Presets */}
      <div className="preset-bar">
        <span className="preset-label">Quick Test Scenarios:</span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            type="button"
            className="preset-chip"
            onClick={() => handleApplyPreset(p)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 3-Step Flow Grid */}
      <div className="grid-3">
        {/* Step 1: Prescription */}
        <div className="card">
          <div className="card-title">
            <span className="step-badge">1</span>
            <span>Prescription</span>
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="pos-rx-select">Choose from ledger</label>
            <select
              id="pos-rx-select"
              className="select-input"
              value={prescriptions.some((r) => r.prescriptionId === rxInput) ? rxInput : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setRxInput(e.target.value);
                  setDispenseResult(null);
                }
              }}
            >
              <option value="">-- Custom / Scanned ID --</option>
              {prescriptions.map((r) => (
                <option key={r.prescriptionId} value={r.prescriptionId}>
                  {r.prescriptionId} • {r.patientName} ({r.drugName}) [{r.state}]
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="pos-rx-input">Or enter / scan ID</label>
            <div className="input-action-row">
              <input
                id="pos-rx-input"
                type="text"
                className="text-input font-mono"
                placeholder="e.g. RX-2026-001-ACTIVE"
                value={rxInput}
                onChange={(e) => {
                  setRxInput(e.target.value);
                  setDispenseResult(null);
                }}
              />
              <button
                type="button"
                onClick={() => setScannerMode('rx')}
                className="btn btn-secondary btn-sm"
                title="Scan Prescription QR"
              >
                <Camera size={15} />
                <span>Scan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Drug Batch */}
        <div className="card">
          <div className="card-title">
            <span className="step-badge">2</span>
            <span>Drug Batch</span>
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="pos-batch-select">Choose from inventory</label>
            <select
              id="pos-batch-select"
              className="select-input"
              value={batches.some((b) => b.batchId === batchInput) ? batchInput : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setBatchInput(e.target.value);
                  setDispenseResult(null);
                }
              }}
            >
              <option value="">-- Custom / Unregistered Serial --</option>
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchId} • {b.drugName} ({b.currentCustodianRole})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="pos-batch-input">Or enter / scan barcode</label>
            <div className="input-action-row">
              <input
                id="pos-batch-input"
                type="text"
                className="text-input font-mono"
                placeholder="e.g. BATCH-CIPLA-AZI-2026-01"
                value={batchInput}
                onChange={(e) => {
                  setBatchInput(e.target.value);
                  setDispenseResult(null);
                }}
              />
              <button
                type="button"
                onClick={() => setScannerMode('batch')}
                className="btn btn-secondary btn-sm"
                title="Scan Drug Barcode"
              >
                <Camera size={15} />
                <span>Scan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Step 3: Verify & Dispense */}
        <div className="card">
          <div className="card-title">
            <span className="step-badge">3</span>
            <span>Verify & Dispense</span>
          </div>

          {preview ? (
            <div className="form-stack">
              <div>
                <span className={`badge ${preview.passed ? 'badge-active' : 'badge-expired'}`}>
                  {preview.passed ? '✓ Ready to Dispense' : '✕ Verification Issue Detected'}
                </span>
                <p className="text-sm text-muted" style={{ marginTop: '8px' }}>
                  {preview.passed
                    ? 'Prescription is active and the matching drug batch is verified at this pharmacy.'
                    : getFriendlyReason(preview.breachCode, preview.failureReason)}
                </p>
              </div>

              <button
                type="button"
                className={`btn btn-lg ${preview.passed ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleDispense}
                disabled={loading || !isInputValid}
              >
                {loading
                  ? 'Verifying...'
                  : preview.passed
                  ? 'Verify & Dispense Medication'
                  : 'Attempt Dispense (Log Alert)'}
              </button>
            </div>
          ) : (
            <div className="empty-state">
              Select a prescription and a drug batch to run verification.
            </div>
          )}
        </div>
      </div>

      {/* Big Clear Result Card after Dispense */}
      {dispenseResult && (
        <div className={`verdict-banner ${dispenseResult.authorized ? 'verdict-approved' : 'verdict-blocked'}`}>
          <div className="verdict-main-row">
            <div className="verdict-headline">
              {dispenseResult.authorized ? <CheckCircle2 size={26} /> : <XCircle size={26} />}
              <div>
                <div className="verdict-title">
                  {dispenseResult.authorized
                    ? 'Approved — Medication Dispensed'
                    : 'Blocked — Dispensing Not Allowed'}
                </div>
                <div className="verdict-reason">
                  {dispenseResult.authorized
                    ? 'Prescription marked as Fulfilled and drug batch marked as Dispensed in a single atomic update.'
                    : getFriendlyReason(dispenseResult.breachCode, dispenseResult.error)}
                </div>
                {!dispenseResult.authorized && dispenseResult.breachCode && (
                  <div className="verdict-code">
                    Code: {dispenseResult.breachCode} • Reported to Regulator (DRA)
                  </div>
                )}
              </div>
            </div>

            {onNavigate && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate(dispenseResult.authorized ? 'ledger' : 'dra')}
              >
                <span>{dispenseResult.authorized ? 'View Block in Ledger' : 'View Alert in Regulator Panel'}</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          {dispenseResult.authorized && dispenseResult.commitResult && (
            <details className="tech-details">
              <summary>Transaction & block details</summary>
              <div className="tech-details-body">
                <div><strong>Block:</strong> #{dispenseResult.commitResult.blockHeight}</div>
                <div><strong>Transaction ID:</strong> <span className="font-mono">{dispenseResult.commitResult.txId}</span></div>
                <div><strong>Block Hash:</strong> <span className="font-mono">{dispenseResult.commitResult.blockHash.slice(0, 16)}...</span></div>
              </div>
            </details>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="feedback-box feedback-error">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Collapsible Technical Verification Details (Closed by Default) */}
      {preview && (
        <details className="tech-details">
          <summary>
            Technical details (9 verification checks • {preview.latencyMs.toFixed(2)} ms)
          </summary>
          <div className="tech-details-body">
            <div className="check-grid-2">
              <div className={`check-row ${preview.prescriptionExists ? 'check-pass' : 'check-fail'}`}>
                {preview.prescriptionExists ? '✓' : '✕'} Prescription exists on ledger
              </div>
              <div className={`check-row ${preview.batchExists ? 'check-pass' : 'check-fail'}`}>
                {preview.batchExists ? '✓' : '✕'} Batch registered by manufacturer
              </div>
              <div className={`check-row ${preview.prescriptionActive ? 'check-pass' : 'check-fail'}`}>
                {preview.prescriptionActive ? '✓' : '✕'} Prescription is unused (Active)
              </div>
              <div className={`check-row ${preview.batchNotRecalled ? 'check-pass' : 'check-fail'}`}>
                {preview.batchNotRecalled ? '✓' : '✕'} Batch has no active recall
              </div>
              <div className={`check-row ${preview.prescriptionNotExpired ? 'check-pass' : 'check-fail'}`}>
                {preview.prescriptionNotExpired ? '✓' : '✕'} Prescription is within valid dates
              </div>
              <div className={`check-row ${preview.batchNotExpired ? 'check-pass' : 'check-fail'}`}>
                {preview.batchNotExpired ? '✓' : '✕'} Drug batch is within shelf life
              </div>
              <div className={`check-row ${preview.doctorSignatureValid ? 'check-pass' : 'check-fail'}`}>
                {preview.doctorSignatureValid ? '✓' : '✕'} Doctor’s ECDSA signature verified
              </div>
              <div className={`check-row ${preview.custodyChainConsistent ? 'check-pass' : 'check-fail'}`}>
                {preview.custodyChainConsistent ? '✓' : '✕'} Batch custody is at this pharmacy
              </div>
              <div className={`check-row ${preview.drugMatchesPrescription ? 'check-pass' : 'check-fail'}`}>
                {preview.drugMatchesPrescription ? '✓' : '✕'} Prescribed drug matches batch drug
              </div>
            </div>
            {preview.breachCode && (
              <div className="font-mono text-xs" style={{ marginTop: '4px' }}>
                Technical status code: {preview.breachCode}
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
