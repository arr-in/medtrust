import express from 'express';
import { db } from '../ledger_db.js';
import { verifyECDSA } from '../crypto_engine.js';
import { STAKEHOLDERS } from '../seed_data.js';

const router = express.Router();

/**
 * Helper function to run concurrent dual-layer evaluation
 */
function evaluateDualLayerConditions(prescriptionId, batchId, pharmacyId) {
  const startTime = process.hrtime.bigint();
  const checks = {
    // Module 1 checks
    prescriptionExists: false,
    prescriptionActive: false,
    prescriptionNotExpired: false,
    doctorSignatureValid: false,
    // Module 2 checks
    batchExists: false,
    batchNotExpired: false,
    batchNotRecalled: false,
    custodyChainConsistent: false,
    // Overall
    passed: false,
    failureReason: null,
    breachCode: null,
    prescription: null,
    batch: null,
    latencyMs: 0,
  };

  // --- 1. MODULE 1 EVALUATION ---
  const rx = db.getPrescription(prescriptionId);
  if (!rx) {
    checks.failureReason = `Prescription ${prescriptionId} not found on ledger`;
    checks.breachCode = 'PRESCRIPTION_NOT_FOUND';
    return finalizeChecks(checks, startTime);
  }
  checks.prescriptionExists = true;
  checks.prescription = rx;

  if (rx.state === 'Fulfilled') {
    checks.failureReason = `Prescription ${prescriptionId} was ALREADY FULFILLED at pharmacy ${rx.dispensedPharmacyId || 'Unknown'} (Replay Fraud)`;
    checks.breachCode = 'REPLAY_FRAUD_DETECTED';
    return finalizeChecks(checks, startTime);
  } else if (rx.state === 'Expired' || Date.now() > rx.expiryTimestamp) {
    checks.failureReason = `Prescription ${prescriptionId} has EXPIRED`;
    checks.breachCode = 'EXPIRED_PRESCRIPTION';
    return finalizeChecks(checks, startTime);
  } else if (rx.state === 'Active') {
    checks.prescriptionActive = true;
    checks.prescriptionNotExpired = true;
  }

  // Doctor Signature Verification (secp256r1 ECDSA)
  const sigValid = verifyECDSA(rx.doctorPublicKeyPEM, rx.saltedHash, rx.doctorEcdsaSignature);
  if (!sigValid) {
    checks.failureReason = `Doctor signature verification FAILED for ${rx.doctorId} (Forged prescription)`;
    checks.breachCode = 'INVALID_DOCTOR_SIGNATURE';
    return finalizeChecks(checks, startTime);
  }
  checks.doctorSignatureValid = true;

  // --- 2. MODULE 2 EVALUATION ---
  const batch = db.getBatch(batchId);
  if (!batch) {
    checks.failureReason = `Drug batch ${batchId} NOT registered on ledger (Counterfeit / unregistered medication)`;
    checks.breachCode = 'COUNTERFEIT_BATCH_DETECTED';
    return finalizeChecks(checks, startTime);
  }
  checks.batchExists = true;
  checks.batch = batch;

  if (batch.isDispensed) {
    checks.failureReason = `Drug batch ${batchId} is already marked as DISPENSED`;
    checks.breachCode = 'BATCH_ALREADY_DISPENSED';
    return finalizeChecks(checks, startTime);
  }

  if (batch.isRecalled) {
    checks.failureReason = `Drug batch ${batchId} is RECALLED by ${batch.recallAuthority || 'DRA'}: ${batch.recallReason}`;
    checks.breachCode = 'RECALLED_DRUG_BATCH';
    return finalizeChecks(checks, startTime);
  }
  checks.batchNotRecalled = true;

  if (Date.now() > batch.expiryTimestamp) {
    checks.failureReason = `Drug batch ${batchId} has EXPIRED on ${new Date(batch.expiryTimestamp).toLocaleDateString()}`;
    checks.breachCode = 'EXPIRED_DRUG_BATCH';
    return finalizeChecks(checks, startTime);
  }
  checks.batchNotExpired = true;

  // Unbroken Chain-of-Custody Check (G4 & Indian Supply Chain Model)
  if (batch.currentCustodianId !== pharmacyId) {
    checks.failureReason = `Custody Breach: Batch ${batchId} is currently registered with '${batch.currentCustodianId}', but presented at dispensing pharmacy '${pharmacyId}'`;
    checks.breachCode = 'BROKEN_CUSTODY_CHAIN';
    return finalizeChecks(checks, startTime);
  }
  checks.custodyChainConsistent = true;

  // All 8 checks passed!
  checks.passed = true;
  return finalizeChecks(checks, startTime);
}

function finalizeChecks(checks, startTime) {
  const endTime = process.hrtime.bigint();
  checks.latencyMs = Number(endTime - startTime) / 1000000;
  return checks;
}

// POST /preview-check - Pre-flight dual-scan analysis for pharmacist POS
router.post('/preview-check', (req, res) => {
  const { prescriptionId, batchId, pharmacyId = 'PHARM-APOLLO-104' } = req.body;

  if (!prescriptionId || !batchId) {
    return res.status(400).json({ success: false, error: 'Both Prescription ID and Drug Batch ID are required for dual verification' });
  }

  const evaluation = evaluateDualLayerConditions(prescriptionId, batchId, pharmacyId);
  res.json({
    success: true,
    evaluation,
  });
});

// POST /dispense - Atomic Point-of-Sale Execution Gate
router.post('/dispense', (req, res) => {
  const { prescriptionId, batchId, pharmacyId = 'PHARM-APOLLO-104' } = req.body;

  if (!prescriptionId || !batchId) {
    return res.status(400).json({ success: false, error: 'Both Prescription ID and Drug Batch ID are required' });
  }

  const evaluation = evaluateDualLayerConditions(prescriptionId, batchId, pharmacyId);

  // If dual-check fails, trigger atomic reject and log security breach for DRA
  if (!evaluation.passed) {
    const incident = db.addIncident({
      eventType: 'DISPENSE_BLOCKED',
      breachCode: evaluation.breachCode,
      reason: evaluation.failureReason,
      prescriptionId,
      batchId,
      pharmacyId,
      severity: evaluation.breachCode.includes('COUNTERFEIT') || evaluation.breachCode.includes('RECALL') ? 'CRITICAL' : 'HIGH',
    });

    return res.status(403).json({
      success: false,
      authorized: false,
      error: evaluation.failureReason,
      breachCode: evaluation.breachCode,
      incidentId: incident.id,
      evaluation,
    });
  }

  // If dual-check passes, execute single atomic commit
  try {
    const commitResult = db.atomicDispenseCommit({ prescriptionId, batchId, pharmacyId });
    res.json({
      success: true,
      authorized: true,
      message: 'Dual-Layer Verification Succeeded: Prescription Fulfilled and Drug Batch Dispensed Atomically',
      commitResult,
      evaluation,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Atomic commit failed: ' + err.message });
  }
});

export default router;
