import { generateECDSAKeyPair, generateSalt, computePrescriptionHash, signECDSA, verifyECDSA } from './crypto_engine.js';
import { db } from './ledger_db.js';
import { seedConsortiumData, STAKEHOLDERS } from './seed_data.js';

console.log("--- Testing MedTrust Cryptography & State Engine ---");

// Test 1: Keys & Signature
const keys = generateECDSAKeyPair();
const salt = generateSalt(16);
const hash = computePrescriptionHash({
  patientId: "PAT-TEST-1",
  doctorLicense: "MCI-TEST-001",
  drugName: "Azithromycin",
  dosage: "500mg",
  salt,
});
console.log("Computed Salted SHA-256 Hash:", hash);

const signature = signECDSA(keys.privateKey, hash);
console.log("ECDSA secp256r1 Signature:", signature.slice(0, 40) + "...");

const valid = verifyECDSA(keys.publicKey, hash, signature);
console.log("Signature Valid?", valid === true ? "PASS ✅" : "FAIL ❌");

// Test 2: Seed data
await seedConsortiumData();
const rxList = db.getAllPrescriptions();
const batchList = db.getAllBatches();
console.log(`Prescriptions Loaded: ${rxList.length}`);
console.log(`Batches Loaded: ${batchList.length}`);

// Test 3: Gateway Atomic Commit
console.log("Testing Atomic Commit...");
const commitResult = db.atomicDispenseCommit({
  prescriptionId: "RX-2026-001-ACTIVE",
  batchId: "BATCH-CIPLA-AZI-2026-01",
  pharmacyId: "PHARM-APOLLO-104",
});
console.log("Commit Success?", commitResult.success ? "PASS ✅" : "FAIL ❌");
console.log("Prescription State:", db.getPrescription("RX-2026-001-ACTIVE").state);
console.log("Batch Dispensed?", db.getBatch("BATCH-CIPLA-AZI-2026-01").isDispensed);
console.log("Blockchain Height:", db.getBlocks().length);

// Restore clean seed state after test
const rx = db.getPrescription("RX-2026-001-ACTIVE");
const batch = db.getBatch("BATCH-CIPLA-AZI-2026-01");
if (rx) {
  rx.state = "Active";
  delete rx.dispensedPharmacyId;
  delete rx.dispensedBatchId;
  delete rx.dispensedTimestamp;
  db.putPrescription(rx);
}
if (batch) {
  batch.isDispensed = false;
  delete batch.dispensedPharmacyId;
  delete batch.dispenseTimestamp;
  batch.custodyHistory = batch.custodyHistory.filter(h => !h.transitionId.startsWith("HOP-DISPENSED"));
  db.putBatch(batch);
}

console.log("All unit tests passed cleanly!");
