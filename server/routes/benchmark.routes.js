import express from 'express';
import { db } from '../ledger_db.js';
import { verifyECDSA } from '../crypto_engine.js';
import { recordBenchmarkRun, getAggregateBenchmarkStats } from '../benchmark_store.js';

const router = express.Router();

function runSingleSimulation(prescriptionId, batchId, pharmacyId, scenarioId = 'custom_check', scenarioName = 'Verification Check') {
  const t0 = process.hrtime.bigint();
  
  // Step 1: Query world state
  const tQueryStart = process.hrtime.bigint();
  const rx = db.getPrescription(prescriptionId);
  const batch = db.getBatch(batchId);
  const tQueryEnd = process.hrtime.bigint();

  let doctorSigValid = false;
  let tCryptoMs = 0;

  if (rx) {
    const tCryptoStart = process.hrtime.bigint();
    doctorSigValid = verifyECDSA(rx.doctorPublicKeyPEM, rx.saltedHash, rx.doctorEcdsaSignature);
    const tCryptoEnd = process.hrtime.bigint();
    tCryptoMs = Number(tCryptoEnd - tCryptoStart) / 1000000;
  }

  // Verification checks
  let isAuthorized = true;
  let breachCode = null;

  if (!rx) {
    isAuthorized = false;
    breachCode = 'PRESCRIPTION_NOT_FOUND';
  } else if (rx.state !== 'Active') {
    isAuthorized = false;
    breachCode = rx.state === 'Fulfilled' ? 'REPLAY_FRAUD_DETECTED' : 'EXPIRED_PRESCRIPTION';
  } else if (!doctorSigValid) {
    isAuthorized = false;
    breachCode = 'INVALID_DOCTOR_SIGNATURE';
  } else if (!batch) {
    isAuthorized = false;
    breachCode = 'COUNTERFEIT_BATCH_DETECTED';
  } else if (batch.isDispensed) {
    isAuthorized = false;
    breachCode = 'BATCH_ALREADY_DISPENSED';
  } else if (batch.isRecalled) {
    isAuthorized = false;
    breachCode = 'RECALLED_DRUG_BATCH';
  } else if (Date.now() > batch.expiryTimestamp) {
    isAuthorized = false;
    breachCode = 'EXPIRED_DRUG_BATCH';
  } else if (batch.currentCustodianId !== pharmacyId) {
    isAuthorized = false;
    breachCode = 'BROKEN_CUSTODY_CHAIN';
  } else if (rx.drugName && batch.drugName && rx.drugName.trim().toLowerCase() !== batch.drugName.trim().toLowerCase()) {
    isAuthorized = false;
    breachCode = 'DRUG_MISMATCH_DETECTED';
  }

  const tEnd = process.hrtime.bigint();
  const totalMs = Number(tEnd - t0) / 1000000;
  const queryMs = Number(tQueryEnd - tQueryStart) / 1000000;

  const outcome = {
    isAuthorized,
    breachCode,
    latency: {
      totalMs,
      queryMs,
      cryptoMs: tCryptoMs,
      evaluationMs: Math.max(0.01, totalMs - queryMs - tCryptoMs),
    }
  };

  recordBenchmarkRun({
    scenarioId,
    scenarioName,
    isAuthorized: outcome.isAuthorized,
    breachCode: outcome.breachCode,
    expectedOutcome: (scenarioId === 'clean' || scenarioId === 'clean_dispense') ? 'AUTHORIZED' : 'BLOCKED',
    latency: outcome.latency,
  });

  return outcome;
}

// GET persistent aggregate benchmark statistics
router.get('/stats', (req, res) => {
  const stats = getAggregateBenchmarkStats();
  res.json({ success: true, ...stats });
});

// GET pre-configured simulation scenarios
router.get('/scenarios', (req, res) => {
  const scenarios = [
    {
      id: 'clean_dispense',
      name: 'Scenario A: Clean Legitimate Dispense',
      description: 'Valid active prescription signed by Dr. Ananya Sharma with genuine Azithromycin batch verified in Apollo Pharmacy custody.',
      prescriptionId: 'RX-2026-001-ACTIVE',
      batchId: 'BATCH-CIPLA-AZI-2026-01',
      pharmacyId: 'PHARM-APOLLO-104',
      expectedOutcome: 'AUTHORIZED',
      expectedCode: 'SUCCESS',
    },
    {
      id: 'replay_fraud',
      name: 'Scenario B: Replay / Double-Spend Fraud',
      description: 'Attempting to fill a prescription that has already been dispensed at another pharmacy (blocks duplication).',
      prescriptionId: 'RX-2026-002-REPLAY',
      batchId: 'BATCH-CIPLA-AZI-2026-01',
      pharmacyId: 'PHARM-APOLLO-104',
      expectedOutcome: 'BLOCKED',
      expectedCode: 'REPLAY_FRAUD_DETECTED',
    },
    {
      id: 'counterfeit_batch',
      name: 'Scenario C: Counterfeit / Bogus Physical Drug',
      description: 'Legitimate doctor prescription presented alongside a forged drug box barcode not registered on the consortium ledger.',
      prescriptionId: 'RX-2026-001-ACTIVE',
      batchId: 'BATCH-BOGUS-GREYMARKET-999',
      pharmacyId: 'PHARM-APOLLO-104',
      expectedOutcome: 'BLOCKED',
      expectedCode: 'COUNTERFEIT_BATCH_DETECTED',
    },
    {
      id: 'broken_custody',
      name: 'Scenario D: Broken Supply Chain Custody',
      description: 'Genuine Paracetamol batch scanned at pharmacy counter, but blockchain custody record shows it never left the distributor.',
      prescriptionId: 'RX-2026-001-ACTIVE',
      batchId: 'BATCH-SUN-PCM-2026-99',
      pharmacyId: 'PHARM-APOLLO-104',
      expectedOutcome: 'BLOCKED',
      expectedCode: 'BROKEN_CUSTODY_CHAIN',
    },
    {
      id: 'recalled_batch',
      name: 'Scenario E: Regulatory Recall Enforcement',
      description: 'Doctor-prescribed Amoxicillin batch flagged by CDSCO central authority for sub-potent active ingredient.',
      prescriptionId: 'RX-2026-001-ACTIVE',
      batchId: 'BATCH-CIPLA-AMX-RECALLED',
      pharmacyId: 'PHARM-APOLLO-104',
      expectedOutcome: 'BLOCKED',
      expectedCode: 'RECALLED_DRUG_BATCH',
    },
    {
      id: 'expired_prescription',
      name: 'Scenario F: Expired E-Prescription',
      description: 'Attempting to fill an outdated prescription whose validity window has lapsed.',
      prescriptionId: 'RX-2026-003-EXPIRED',
      batchId: 'BATCH-CIPLA-AZI-2026-01',
      pharmacyId: 'PHARM-APOLLO-104',
      expectedOutcome: 'BLOCKED',
      expectedCode: 'EXPIRED_PRESCRIPTION',
    }
  ];

  res.json({ success: true, scenarios });
});

// POST /run-all - Run automated capstone benchmark test
router.post('/run-all', (req, res) => {
  const rawIterations = req.body?.iterations !== undefined ? Number(req.body.iterations) : 20;
  if (!Number.isFinite(rawIterations) || rawIterations < 1 || rawIterations > 500) {
    return res.status(400).json({
      success: false,
      error: 'iterations must be a valid number between 1 and 500',
    });
  }
  const iterations = Math.floor(rawIterations);

  const testDefinitions = [
    { id: 'clean_dispense', name: 'Clean Dispense', rx: 'RX-2026-001-ACTIVE', batch: 'BATCH-CIPLA-AZI-2026-01', expectAuth: true },
    { id: 'replay_fraud', name: 'Replay Fraud', rx: 'RX-2026-002-REPLAY', batch: 'BATCH-CIPLA-AZI-2026-01', expectAuth: false },
    { id: 'counterfeit_batch', name: 'Counterfeit Batch', rx: 'RX-2026-001-ACTIVE', batch: 'FAKE-BATCH-999', expectAuth: false },
    { id: 'broken_custody', name: 'Broken Custody', rx: 'RX-2026-001-ACTIVE', batch: 'BATCH-SUN-PCM-2026-99', expectAuth: false },
    { id: 'recalled_batch', name: 'Recalled Drug', rx: 'RX-2026-001-ACTIVE', batch: 'BATCH-CIPLA-AMX-RECALLED', expectAuth: false },
    { id: 'expired_prescription', name: 'Expired Rx', rx: 'RX-2026-003-EXPIRED', batch: 'BATCH-CIPLA-AZI-2026-01', expectAuth: false },
  ];

  // Snapshot live state of seeded records so running benchmarks after live POS dispenses/recalls
  // still evaluates the canonical 6 fraud vectors without mutating live ledger state.
  const rxActive = db.getPrescription('RX-2026-001-ACTIVE');
  const rxReplay = db.getPrescription('RX-2026-002-REPLAY');
  const rxExpired = db.getPrescription('RX-2026-003-EXPIRED');
  const batchClean = db.getBatch('BATCH-CIPLA-AZI-2026-01');
  const batchBroken = db.getBatch('BATCH-SUN-PCM-2026-99');
  const batchRecalled = db.getBatch('BATCH-CIPLA-AMX-RECALLED');

  const snapshot = {
    rxActiveState: rxActive?.state,
    rxReplayState: rxReplay?.state,
    rxExpiredState: rxExpired?.state,
    batchCleanDispensed: batchClean?.isDispensed,
    batchCleanRecalled: batchClean?.isRecalled,
    batchCleanCustodian: batchClean?.currentCustodianId,
    batchBrokenDispensed: batchBroken?.isDispensed,
    batchBrokenRecalled: batchBroken?.isRecalled,
    batchBrokenCustodian: batchBroken?.currentCustodianId,
    batchRecalledFlag: batchRecalled?.isRecalled,
  };

  if (rxActive) rxActive.state = 'Active';
  if (rxReplay) rxReplay.state = 'Fulfilled';
  if (rxExpired) rxExpired.state = 'Expired';
  if (batchClean) {
    batchClean.isDispensed = false;
    batchClean.isRecalled = false;
    batchClean.currentCustodianId = 'PHARM-APOLLO-104';
  }
  if (batchBroken) {
    batchBroken.isDispensed = false;
    batchBroken.isRecalled = false;
    batchBroken.currentCustodianId = 'DIST-BLUEDART-IND';
  }
  if (batchRecalled) {
    batchRecalled.isRecalled = true;
  }

  const results = [];
  let totalSimulations = 0;
  let correctDecisions = 0;

  try {
    for (const test of testDefinitions) {
      const latencies = [];
      const cryptoLatencies = [];
      let correctCount = 0;
      let sampleBreach = null;

      for (let i = 0; i < iterations; i++) {
        const outcome = runSingleSimulation(test.rx, test.batch, 'PHARM-APOLLO-104', test.id, test.name);
        latencies.push(outcome.latency.totalMs);
        cryptoLatencies.push(outcome.latency.cryptoMs);
        totalSimulations++;

        const isCorrect = outcome.isAuthorized === test.expectAuth;
        if (isCorrect) {
          correctCount++;
          correctDecisions++;
        }
        sampleBreach = outcome.breachCode;
      }

      latencies.sort((a, b) => a - b);
      const avgLatency = latencies.reduce((sum, v) => sum + v, 0) / latencies.length;
      const avgCrypto = cryptoLatencies.reduce((sum, v) => sum + v, 0) / cryptoLatencies.length;
      const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1];

      results.push({
        scenarioId: test.id,
        name: test.name,
        iterations,
        accuracyPct: (correctCount / iterations) * 100,
        expected: test.expectAuth ? 'AUTHORIZED' : 'BLOCKED',
        sampleCode: sampleBreach || 'SUCCESS',
        latency: {
          minMs: Number(latencies[0].toFixed(3)),
          avgMs: Number(avgLatency.toFixed(3)),
          p95Ms: Number(p95Latency.toFixed(3)),
          maxMs: Number(latencies[latencies.length - 1].toFixed(3)),
          avgCryptoMs: Number(avgCrypto.toFixed(3)),
        }
      });
    }
  } finally {
    if (rxActive && snapshot.rxActiveState !== undefined) rxActive.state = snapshot.rxActiveState;
    if (rxReplay && snapshot.rxReplayState !== undefined) rxReplay.state = snapshot.rxReplayState;
    if (rxExpired && snapshot.rxExpiredState !== undefined) rxExpired.state = snapshot.rxExpiredState;
    if (batchClean) {
      batchClean.isDispensed = snapshot.batchCleanDispensed;
      batchClean.isRecalled = snapshot.batchCleanRecalled;
      batchClean.currentCustodianId = snapshot.batchCleanCustodian;
    }
    if (batchBroken) {
      batchBroken.isDispensed = snapshot.batchBrokenDispensed;
      batchBroken.isRecalled = snapshot.batchBrokenRecalled;
      batchBroken.currentCustodianId = snapshot.batchBrokenCustodian;
    }
    if (batchRecalled && snapshot.batchRecalledFlag !== undefined) {
      batchRecalled.isRecalled = snapshot.batchRecalledFlag;
    }
  }

  const overallAccuracy = (correctDecisions / totalSimulations) * 100;
  const overallAvgLatency = results.reduce((sum, r) => sum + r.latency.avgMs, 0) / results.length;

  res.json({
    success: true,
    benchmarkTimestamp: Date.now(),
    totalSimulations,
    overallAccuracy: Number(overallAccuracy.toFixed(1)),
    overallAvgLatencyMs: Number(overallAvgLatency.toFixed(3)),
    results,
    aggregateStats: getAggregateBenchmarkStats(),
    comparisonWithPDMP: {
      medTrustPointOfSaleGate: "Point-of-sale Real-Time Cryptographic Gate (0ms false dispense window)",
      traditionalPDMP: "Centralized Retrospective Batch Audit (Hours to Months delay)",
      atomicityGuarantee: "Dual State Update (Fulfilled + Dispensed committed simultaneously)",
      piiPreservation: "Zero PII on-chain (Salted SHA-256 compliant with DPDP Act 2023)"
    }
  });
});

export default router;
