import { db } from '../ledger_db.js';
import { seedConsortiumData } from '../seed_data.js';
import { verifyECDSA } from '../crypto_engine.js';

console.log('🧪 Starting MedTrust 6 Fraud Scenarios Verification Test Suite...\n');

// Seed clean data
seedConsortiumData();

const tests = [
  {
    id: 1,
    name: 'Clean Legitimate Dispense',
    rxId: 'RX-2026-001-ACTIVE',
    batchId: 'BATCH-CIPLA-AZI-2026-01',
    pharmacyId: 'PHARM-APOLLO-104',
    expectedPass: true,
    expectedBreach: null,
  },
  {
    id: 2,
    name: 'Replay / Double-Spend Fraud',
    rxId: 'RX-2026-002-REPLAY',
    batchId: 'BATCH-CIPLA-AZI-2026-01',
    pharmacyId: 'PHARM-APOLLO-104',
    expectedPass: false,
    expectedBreach: 'REPLAY_FRAUD_DETECTED',
  },
  {
    id: 3,
    name: 'Counterfeit / Bogus Physical Drug',
    rxId: 'RX-2026-001-ACTIVE',
    batchId: 'BATCH-BOGUS-GREYMARKET-999',
    pharmacyId: 'PHARM-APOLLO-104',
    expectedPass: false,
    expectedBreach: 'COUNTERFEIT_BATCH_DETECTED',
  },
  {
    id: 4,
    name: 'Broken Supply Chain Custody',
    rxId: 'RX-2026-001-ACTIVE',
    batchId: 'BATCH-SUN-PCM-2026-99',
    pharmacyId: 'PHARM-APOLLO-104',
    expectedPass: false,
    expectedBreach: 'BROKEN_CUSTODY_CHAIN',
  },
  {
    id: 5,
    name: 'Regulatory Recall Enforcement',
    rxId: 'RX-2026-001-ACTIVE',
    batchId: 'BATCH-CIPLA-AMX-RECALLED',
    pharmacyId: 'PHARM-APOLLO-104',
    expectedPass: false,
    expectedBreach: 'RECALLED_DRUG_BATCH',
  },
  {
    id: 6,
    name: 'Expired E-Prescription',
    rxId: 'RX-2026-003-EXPIRED',
    batchId: 'BATCH-CIPLA-AZI-2026-01',
    pharmacyId: 'PHARM-APOLLO-104',
    expectedPass: false,
    expectedBreach: 'EXPIRED_PRESCRIPTION',
  },
];

function evaluateCondition(rxId, batchId, pharmacyId) {
  const rx = db.getPrescription(rxId);
  const batch = db.getBatch(batchId);

  let doctorSigValid = false;
  if (rx) {
    doctorSigValid = verifyECDSA(rx.doctorPublicKeyPEM, rx.saltedHash, rx.doctorEcdsaSignature);
  }

  if (!rx) return { pass: false, breachCode: 'PRESCRIPTION_NOT_FOUND' };
  if (rx.state !== 'Active') return { pass: false, breachCode: rx.state === 'Fulfilled' ? 'REPLAY_FRAUD_DETECTED' : 'EXPIRED_PRESCRIPTION' };
  if (!doctorSigValid) return { pass: false, breachCode: 'INVALID_DOCTOR_SIGNATURE' };
  if (!batch) return { pass: false, breachCode: 'COUNTERFEIT_BATCH_DETECTED' };
  if (batch.isDispensed) return { pass: false, breachCode: 'BATCH_ALREADY_DISPENSED' };
  if (batch.isRecalled) return { pass: false, breachCode: 'RECALLED_DRUG_BATCH' };
  if (Date.now() > batch.expiryTimestamp) return { pass: false, breachCode: 'EXPIRED_DRUG_BATCH' };
  if (batch.currentCustodianId !== pharmacyId) return { pass: false, breachCode: 'BROKEN_CUSTODY_CHAIN' };

  return { pass: true, breachCode: null };
}

let passedCount = 0;
let totalCount = tests.length;

console.log('| ID | Scenario Name | Expected | Result | Breach Code | Status |');
console.log('|---|---|---|---|---|---|');

for (const t of tests) {
  const res = evaluateCondition(t.rxId, t.batchId, t.pharmacyId);
  const isCorrect = (res.pass === t.expectedPass) && (t.expectedBreach === null || res.breachCode === t.expectedBreach);
  
  if (isCorrect) passedCount++;

  console.log(`| ${t.id} | ${t.name} | ${t.expectedPass ? 'PASS' : 'BLOCK'} | ${res.pass ? 'PASS' : 'BLOCK'} | ${res.breachCode || 'NONE'} | ${isCorrect ? '✅ PASS' : '❌ FAIL'} |`);
}

console.log(`\n📊 Final Result: ${passedCount}/${totalCount} tests passed (${((passedCount / totalCount) * 100).toFixed(0)}% Accuracy)\n`);

if (passedCount !== totalCount) {
  process.exit(1);
}
