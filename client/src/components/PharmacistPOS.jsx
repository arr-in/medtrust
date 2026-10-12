import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  QrCode,
  Barcode,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Building2,
  FileText,
  AlertTriangle,
  Camera
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { previewGatewayCheck, dispenseGateway } from '../services/api';
import WebcamScannerModal from './WebcamScannerModal';

export default function PharmacistPOS({ prescriptions = [], batches = [], onUpdate }) {
  const [rxInput, setRxInput] = useState('RX-2026-001-ACTIVE');
  const [batchInput, setBatchInput] = useState('BATCH-CIPLA-AZI-2026-01');
  const pharmacyId = 'PHARM-APOLLO-104';
  
  const [preview, setPreview] = useState(null);
  const [dispenseResult, setDispenseResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Scanner modal state
  const [scannerMode, setScannerMode] = useState(null); // 'rx' | 'batch' | null

  // Quick preset test cases
  const presets = [
    {
      label: '🟢 Valid Clean Dispense',
      rx: 'RX-2026-001-ACTIVE',
      batch: 'BATCH-CIPLA-AZI-2026-01',
      desc: 'Active Azithromycin Rx + Genuine batch in Apollo Pharmacy custody',
    },
    {
      label: '🔴 Replay / Double-Spend',
      rx: 'RX-2026-002-REPLAY',
      batch: 'BATCH-CIPLA-AZI-2026-01',
      desc: 'Attempting to reuse an already fulfilled prescription',
    },
    {
      label: '🔴 Counterfeit Drug Batch',
      rx: 'RX-2026-001-ACTIVE',
      batch: 'BATCH-FAKE-GREY-999',
      desc: 'Forged batch barcode unrecorded on consortium ledger',
    },
    {
      label: '🔴 Broken Custody Chain',
      rx: 'RX-2026-001-ACTIVE',
      batch: 'BATCH-SUN-PCM-2026-99',
      desc: 'Genuine batch still recorded with distributor, not delivered to pharmacy',
    },
    {
      label: '🔴 CDSCO Recalled Batch',
      rx: 'RX-2026-001-ACTIVE',
      batch: 'BATCH-CIPLA-AMX-RECALLED',
      desc: 'Sub-potent batch flagged by Drug Regulatory Authority',
    },
    {
      label: '🔴 Expired Prescription',
      rx: 'RX-2026-003-EXPIRED',
      batch: 'BATCH-CIPLA-AZI-2026-01',
      desc: 'Prescription validity date has lapsed',
    }
  ];

  const handleApplyPreset = (preset) => {
    setRxInput(preset.rx);
    setBatchInput(preset.batch);
    setDispenseResult(null);
    setErrorMsg('');
  };

  // Run live pre-flight check when inputs change
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
    }, 250);
    return () => clearTimeout(timer);
  }, [rxInput, batchInput, pharmacyId, prescriptions, batches]);

  // Execute atomic dispense
  const handleDispense = async () => {
    setLoading(true);
    setErrorMsg('');
    setDispenseResult(null);

    try {
      const res = await dispenseGateway(rxInput.trim(), batchInput.trim(), pharmacyId);
      setDispenseResult(res);
      if (res.authorized) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10B981', '#06B6D4', '#34D399', '#38BDF8'],
        });
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      setErrorMsg(err.message || 'Verification & Dispense Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pos-terminal-layout">
      {/* Scanner Modal */}
      <WebcamScannerModal
        isOpen={scannerMode !== null}
        onClose={() => setScannerMode(null)}
        targetName={scannerMode === 'rx' ? 'Prescription QR Code' : 'Physical Drug Barcode'}
        onScanSuccess={(val) => {
          if (scannerMode === 'rx') setRxInput(val);
          if (scannerMode === 'batch') setBatchInput(val);
        }}
      />

      {/* Top Banner: Pharmacy Terminal Identity */}
      <div className="terminal-header-card">
        <div className="terminal-id-badge">
          <div className="pharmacy-icon-box">
            <Building2 size={20} className="text-emerald" />
          </div>
          <div>
            <div className="terminal-title-row">
              <h2 className="terminal-title">Point-of-Sale Dual Verification Gate</h2>
              <span className="badge-pharmacy">Dispensing Terminal #104</span>
            </div>
            <p className="terminal-sub">
              Authenticated Node: <span className="font-mono text-cyan">PHARM-APOLLO-104</span> • Apollo Pharmacy Store #104, Bhawarkua, Indore (Lic: MP-PH-9021-RT)
            </p>
          </div>
        </div>
        <div className="terminal-mode-indicator">
          <span className="live-indicator-dot"></span>
          <span>GATEWAY EVALUATION: ACTIVE</span>
        </div>
      </div>

      {/* Preset Test Scenarios bar */}
      <div className="preset-bar">
        <div className="preset-label">
          <Zap size={14} className="text-amber" />
          <span>Capstone Scenarios:</span>
        </div>
        <div className="preset-buttons-wrap">
          {presets.map((p, idx) => (
            <button
              key={idx}
              className="preset-btn"
              onClick={() => handleApplyPreset(p)}
              title={p.desc}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dual Scanner Input Section */}
      <div className="dual-scan-grid">
        {/* Module 1 Scanner: Prescription QR */}
        <div className="scan-card">
          <div className="scan-card-header">
            <div className="scan-icon-pill icon-pill-emerald">
              <QrCode size={18} />
            </div>
            <div>
              <div className="layer-tag">MODULE 1 GATEWAY INPUT</div>
              <h3 className="scan-card-title">Prescription Authenticity QR</h3>
            </div>
          </div>
          <div className="scan-input-group">
            <label className="input-field-label">Prescription Transaction ID / Hash</label>
            <div className="scan-input-row">
              <div className="input-with-icon scan-input-grow">
                <FileText size={16} className="input-left-icon" />
                <input
                  type="text"
                  className="text-input font-mono"
                  placeholder="e.g. RX-2026-001-ACTIVE"
                  value={rxInput}
                  onChange={(e) => setRxInput(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setScannerMode('rx')}
                className="btn-webcam btn-webcam-emerald"
                title="Scan Prescription QR via Webcam"
              >
                <Camera size={16} />
                <span>Webcam</span>
              </button>
            </div>
          </div>
          {/* Quick Select dropdown from seeded Rx */}
          <div className="quick-select-row">
            <span className="quick-select-label">Available on Ledger:</span>
            <select
              className="select-input font-mono"
              value={rxInput}
              onChange={(e) => setRxInput(e.target.value)}
            >
              <option value="">-- Choose Loaded Prescription --</option>
              {prescriptions.map((r) => (
                <option key={r.prescriptionId} value={r.prescriptionId}>
                  {r.prescriptionId} [{r.state}] {r.drugName ? `- ${r.drugName}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="privacy-badge">
            <ShieldCheck size={12} className="text-emerald" />
            <span>Zero PII On-Chain: Salted SHA-256 + ECDSA secp256r1</span>
          </div>
        </div>

        {/* Module 2 Scanner: Drug Batch Barcode */}
        <div className="scan-card">
          <div className="scan-card-header">
            <div className="scan-icon-pill icon-pill-cyan">
              <Barcode size={18} />
            </div>
            <div>
              <div className="layer-tag">MODULE 2 GATEWAY INPUT</div>
              <h3 className="scan-card-title">Physical Drug Batch Barcode</h3>
            </div>
          </div>
          <div className="scan-input-group">
            <label className="input-field-label">Physical Drug Batch Serial ID</label>
            <div className="scan-input-row">
              <div className="input-with-icon scan-input-grow">
                <Barcode size={16} className="input-left-icon" />
                <input
                  type="text"
                  className="text-input font-mono"
                  placeholder="e.g. BATCH-CIPLA-AZI-2026-01"
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setScannerMode('batch')}
                className="btn-webcam btn-webcam-cyan"
                title="Scan Drug Barcode via Webcam"
              >
                <Camera size={16} />
                <span>Webcam</span>
              </button>
            </div>
          </div>
          {/* Quick Select dropdown from seeded batches */}
          <div className="quick-select-row">
            <span className="quick-select-label">Batches in Network:</span>
            <select
              className="select-input font-mono"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
            >
              <option value="">-- Choose Loaded Batch --</option>
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchId} ({b.drugName} - {b.currentCustodianRole}: {b.currentCustodianId})
                </option>
              ))}
            </select>
          </div>
          <div className="privacy-badge">
            <Building2 size={12} className="text-cyan" />
            <span>Custodian match required: PHARM-APOLLO-104</span>
          </div>
        </div>
      </div>

      {/* Concurrent Gateway Evaluation Breakdown */}
      {preview && (
        <div className="verification-checklist-card">
          <div className="checklist-header">
            <div className="checklist-title-group">
              <h3 className="checklist-title">Dual-Layer Concurrent Evaluation Matrix</h3>
              <span className="latency-badge">
                <Clock size={12} /> Execution Latency: {preview.latencyMs.toFixed(2)} ms
              </span>
            </div>
            <div className={`status-pill-decision ${preview.passed ? 'pill-passed' : 'pill-failed'}`}>
              {preview.passed ? (
                <>
                  <CheckCircle2 size={16} /> GATEWAY AUTHORIZED
                </>
              ) : (
                <>
                  <XCircle size={16} /> GATEWAY BLOCKED
                </>
              )}
            </div>
          </div>

          <div className="checklist-columns-grid">
            {/* Module 1 Checks Column */}
            <div className="checklist-col">
              <h4 className="col-header text-emerald">
                <span>Module 1: Prescription Verification</span>
              </h4>
              <ul className="check-list">
                <li className={`check-item ${preview.prescriptionExists ? 'item-pass' : 'item-fail'}`}>
                  {preview.prescriptionExists ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  <span>Prescription Record Found on Ledger</span>
                </li>
                <li className={`check-item ${preview.prescriptionActive ? 'item-pass' : 'item-fail'}`}>
                  {preview.prescriptionActive ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  <span>State is Active (Replay Protection)</span>
                </li>
                <li className={`check-item ${preview.prescriptionNotExpired ? 'item-pass' : 'item-fail'}`}>
                  {preview.prescriptionNotExpired ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  <span>Prescription Window Not Expired</span>
                </li>
                <li className={`check-item ${preview.doctorSignatureValid ? 'item-pass' : 'item-fail'}`}>
                  {preview.doctorSignatureValid ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  <span>Physician ECDSA Signature Validated</span>
                </li>
              </ul>
            </div>

            {/* Module 2 Checks Column */}
            <div className="checklist-col">
              <h4 className="col-header text-cyan">
                <span>Module 2: Drug Authenticity & Custody</span>
              </h4>
              <ul className="check-list">
                <li className={`check-item ${preview.batchExists ? 'item-pass' : 'item-fail'}`}>
                  {preview.batchExists ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  <span>Batch Genesis Exists (Anti-Counterfeit)</span>
                </li>
                <li className={`check-item ${preview.batchNotRecalled ? 'item-pass' : 'item-fail'}`}>
                  {preview.batchNotRecalled ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  <span>No Active DRA / CDSCO Recalls</span>
                </li>
                <li className={`check-item ${preview.batchNotExpired ? 'item-pass' : 'item-fail'}`}>
                  {preview.batchNotExpired ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  <span>Medication Within Shelf Life</span>
                </li>
                <li className={`check-item ${preview.custodyChainConsistent ? 'item-pass' : 'item-fail'}`}>
                  {preview.custodyChainConsistent ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  <span>Unbroken Custody: Verified at Current Pharmacy</span>
                </li>
                <li className={`check-item ${preview.drugMatchesPrescription ? 'item-pass' : 'item-fail'}`}>
                  {preview.drugMatchesPrescription ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  <span>Prescribed Medication Matches Physical Batch</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Action Row / Execution Trigger */}
          <div className="atomic-action-row">
            {!preview.passed ? (
              <div className="rejection-callout">
                <AlertTriangle size={20} className="text-rose" />
                <div>
                  <div className="rejection-title">Gate Authorization Prohibited: {preview.breachCode}</div>
                  <div className="rejection-reason">{preview.failureReason}</div>
                </div>
              </div>
            ) : (
              <div className="authorization-callout">
                <CheckCircle2 size={20} className="text-emerald" />
                <div>
                  <div className="auth-callout-title">All Dual-Layer Conditions Satisfied</div>
                  <div className="auth-callout-sub">
                    Ready to execute atomic state commit: Prescription → Fulfilled & Drug Batch → Dispensed
                  </div>
                </div>
              </div>
            )}

            <button
              className={`dispense-btn ${preview.passed ? 'btn-authorize' : 'btn-blocked'}`}
              onClick={handleDispense}
              disabled={loading}
            >
              {loading ? (
                'Evaluating on Fabric Peer...'
              ) : preview.passed ? (
                <>
                  <Zap size={18} /> Authorize & Commit Atomic Dispense
                </>
              ) : (
                <>
                  <ShieldAlert size={18} /> Block & Report Breach to DRA
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Final Commit / Result Feedback Card */}
      {dispenseResult && (
        <div className={`result-card ${dispenseResult.authorized ? 'result-success' : 'result-error'}`}>
          <div className="result-header">
            {dispenseResult.authorized ? (
              <ShieldCheck size={28} className="text-emerald" />
            ) : (
              <ShieldAlert size={28} className="text-rose" />
            )}
            <div>
              <h3 className="result-title">
                {dispenseResult.authorized
                  ? 'ATOMIC DISPENSE AUTHORIZED & COMMITTED'
                  : 'DISPENSE REJECTED — SECURITY BREACH FLAGGED'}
              </h3>
              <p className="result-msg">{dispenseResult.message || dispenseResult.error}</p>
            </div>
          </div>

          {dispenseResult.authorized && dispenseResult.commitResult && (
            <div className="result-meta-grid">
              <div className="meta-cell">
                <span className="meta-cell-label">Transaction ID</span>
                <span className="meta-cell-val font-mono text-cyan">
                  {dispenseResult.commitResult.txId}
                </span>
              </div>
              <div className="meta-cell">
                <span className="meta-cell-label">Block Height</span>
                <span className="meta-cell-val font-mono">
                  #{dispenseResult.commitResult.blockHeight}
                </span>
              </div>
              <div className="meta-cell">
                <span className="meta-cell-label">Prescription State</span>
                <span className="meta-cell-val text-emerald font-semibold">
                  Fulfilled (Immutable)
                </span>
              </div>
              <div className="meta-cell">
                <span className="meta-cell-label">Drug Batch State</span>
                <span className="meta-cell-val text-emerald font-semibold">
                  Dispensed to Patient
                </span>
              </div>
              <div className="meta-cell full-width">
                <span className="meta-cell-label">Block Hash</span>
                <span className="meta-cell-val font-mono text-muted">
                  {dispenseResult.commitResult.blockHash}
                </span>
              </div>
            </div>
          )}

          {!dispenseResult.authorized && (
            <div className="breach-alert-box">
              <div className="breach-badge">BREACH CODE: {dispenseResult.breachCode}</div>
              <p className="breach-notice">
                Incident logged to DRA Central Oversight. Pharmacist prevented from releasing medication.
              </p>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="global-error-banner">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
