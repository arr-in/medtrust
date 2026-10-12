import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateECDSAKeyPair, generateSalt, computePrescriptionHash, signECDSA } from './crypto_engine.js';
import { db } from './ledger_db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const KEYS_FILE = path.join(DATA_DIR, 'stakeholders_keys.json');

function loadOrCreateStakeholderKeys() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(KEYS_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8'));
      if (saved && saved.doctor1 && saved.doctor1.publicKey) {
        return saved;
      }
    } catch {
      // regenerate if unreadable
    }
  }
  const generated = {
    dra: generateECDSAKeyPair(),
    doctor1: generateECDSAKeyPair(),
    doctor2: generateECDSAKeyPair(),
    manufacturer1: generateECDSAKeyPair(),
    manufacturer2: generateECDSAKeyPair(),
    distributor1: generateECDSAKeyPair(),
    distributor2: generateECDSAKeyPair(),
    pharmacy1: generateECDSAKeyPair(),
    pharmacy2: generateECDSAKeyPair(),
  };
  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(generated, null, 2), 'utf-8');
  } catch {
    // ignore write errors
  }
  return generated;
}

const persistedKeys = loadOrCreateStakeholderKeys();

// Pre-generate stable stakeholder identities for the consortium
export const STAKEHOLDERS = {
  dra: {
    id: "DRA-CDSCO-HQ",
    name: "Central Drugs Standard Control Organisation (CDSCO)",
    role: "Drug Regulatory Authority",
    jurisdiction: "Govt of India / State FDA",
    keys: persistedKeys.dra,
  },
  doctor1: {
    id: "DOC-99412",
    name: "Dr. Ananya Sharma, M.D.",
    license: "MCI-2018-99412",
    hospital: "Apollo Hospital, Indore",
    role: "Doctor",
    keys: persistedKeys.doctor1,
  },
  doctor2: {
    id: "DOC-44129",
    name: "Dr. Vikram Malhotra, M.B.B.S.",
    license: "MCI-2015-44129",
    hospital: "CHL Hospital, Indore",
    role: "Doctor",
    keys: persistedKeys.doctor2,
  },
  manufacturer1: {
    id: "MFG-CIPLA-GOA",
    name: "Cipla Ltd. - Plant 3",
    location: "Verna Industrial Estate, Goa",
    license: "GOA-PH-882",
    role: "Manufacturer",
    keys: persistedKeys.manufacturer1,
  },
  manufacturer2: {
    id: "MFG-SUN-GUJ",
    name: "Sun Pharmaceutical Industries",
    location: "Halol, Gujarat",
    license: "GUJ-DR-419",
    role: "Manufacturer",
    keys: persistedKeys.manufacturer2,
  },
  distributor1: {
    id: "DIST-BLUEDART-IND",
    name: "Blue Dart LifeSciences Cold Chain",
    location: "Indore Central Logistics Hub, M.P.",
    license: "MP-LOG-2022-019",
    role: "Distributor",
    keys: persistedKeys.distributor1,
  },
  distributor2: {
    id: "DIST-ALLKEM-BHO",
    name: "Allkem Pharma Wholesalers",
    location: "Transport Nagar, Bhopal, M.P.",
    license: "MP-LOG-2020-044",
    role: "Distributor",
    keys: persistedKeys.distributor2,
  },
  pharmacy1: {
    id: "PHARM-APOLLO-104",
    name: "Apollo Pharmacy Store #104",
    location: "Bhawarkua Main Road, Indore",
    license: "MP-PH-9021-RT",
    role: "Pharmacist",
    keys: persistedKeys.pharmacy1,
  },
  pharmacy2: {
    id: "PHARM-MEDPLUS-77",
    name: "MedPlus Chemist & Druggist",
    location: "Vijay Nagar Square, Indore",
    license: "MP-PH-7714-RT",
    role: "Pharmacist",
    keys: persistedKeys.pharmacy2,
  }
};

export async function seedConsortiumData() {
  console.log("⚡ Seeding MedTrust Consortium Ledger Data...");

  const doc = STAKEHOLDERS.doctor1;
  const mfg = STAKEHOLDERS.manufacturer1;
  const dist = STAKEHOLDERS.distributor1;
  const pharm = STAKEHOLDERS.pharmacy1;

  // 1. SEED DRUG BATCH 1: AZITHROMYCIN 500mg (Clean, verified, in Apollo Pharmacy custody)
  const batch1Id = "BATCH-CIPLA-AZI-2026-01";
  if (!db.getBatch(batch1Id)) {
    const batch1 = {
      batchId: batch1Id,
      drugName: "Azithromycin IP",
      dosage: "500mg",
      ndc: "0378-0012-05",
      plantLocation: mfg.location,
      manufacturerId: mfg.id,
      mfgTimestamp: Date.now() - 30 * 86400000,
      expiryTimestamp: Date.now() + 365 * 86400000, // Valid for 1 year
      currentCustodianId: pharm.id,
      currentCustodianRole: "Pharmacy",
      isRecalled: false,
      isDispensed: false,
      custodyHistory: [
        {
          transitionId: "HOP-1-GENESIS",
          senderId: mfg.id,
          recipientId: dist.id,
          location: mfg.location,
          timestamp: Date.now() - 25 * 86400000,
          signatureHex: "CIPLA_GENESIS_AUTH_SIGN",
        },
        {
          transitionId: "HOP-2-TRANSIT",
          senderId: dist.id,
          recipientId: pharm.id,
          location: dist.location,
          timestamp: Date.now() - 5 * 86400000,
          signatureHex: "BLUEDART_DELIVERY_SIGN",
        }
      ]
    };
    db.putBatch(batch1);
    db.commitBlock("BATCH_GENESIS_REGISTRATION", { batchId: batch1Id, drug: "Azithromycin IP 500mg", mfg: mfg.id });
  }

  // 2. SEED DRUG BATCH 2: PARACETAMOL 650mg (In Distributor Custody - Broken Custody test)
  const batch2Id = "BATCH-SUN-PCM-2026-99";
  if (!db.getBatch(batch2Id)) {
    const batch2 = {
      batchId: batch2Id,
      drugName: "Dolo Paracetamol",
      dosage: "650mg",
      ndc: "0378-5541-10",
      plantLocation: STAKEHOLDERS.manufacturer2.location,
      manufacturerId: STAKEHOLDERS.manufacturer2.id,
      mfgTimestamp: Date.now() - 15 * 86400000,
      expiryTimestamp: Date.now() + 180 * 86400000,
      currentCustodianId: STAKEHOLDERS.distributor2.id, // Still with distributor!
      currentCustodianRole: "Distributor",
      isRecalled: false,
      isDispensed: false,
      custodyHistory: [
        {
          transitionId: "HOP-1-GENESIS",
          senderId: STAKEHOLDERS.manufacturer2.id,
          recipientId: STAKEHOLDERS.distributor2.id,
          location: STAKEHOLDERS.manufacturer2.location,
          timestamp: Date.now() - 10 * 86400000,
          signatureHex: "SUN_PHARMA_GENESIS_SIGN",
        }
      ]
    };
    db.putBatch(batch2);
  }

  // 3. SEED DRUG BATCH 3: AMOXICILLIN 250mg (DRA Recalled)
  const batch3Id = "BATCH-CIPLA-AMX-RECALLED";
  if (!db.getBatch(batch3Id)) {
    const batch3 = {
      batchId: batch3Id,
      drugName: "Amoxicillin Trihydrate",
      dosage: "250mg",
      ndc: "0378-9011-20",
      plantLocation: mfg.location,
      manufacturerId: mfg.id,
      mfgTimestamp: Date.now() - 40 * 86400000,
      expiryTimestamp: Date.now() + 200 * 86400000,
      currentCustodianId: pharm.id,
      currentCustodianRole: "Pharmacy",
      isRecalled: true,
      recallReason: "Substandard Active Pharmaceutical Ingredient (API) purity alert issued by CDSCO",
      recallAuthority: STAKEHOLDERS.dra.name,
      isDispensed: false,
      custodyHistory: [
        {
          transitionId: "HOP-1-GENESIS",
          senderId: mfg.id,
          recipientId: pharm.id,
          location: mfg.location,
          timestamp: Date.now() - 35 * 86400000,
          signatureHex: "CIPLA_AMX_SIGN",
        }
      ]
    };
    db.putBatch(batch3);
  }

  // 4. SEED DRUG BATCH 4: EXPIRED BATCH
  const batch4Id = "BATCH-EXPIRED-DOXY-2024";
  if (!db.getBatch(batch4Id)) {
    const batch4 = {
      batchId: batch4Id,
      drugName: "Doxycycline Hyclate",
      dosage: "100mg",
      ndc: "0378-4411-99",
      plantLocation: mfg.location,
      manufacturerId: mfg.id,
      mfgTimestamp: Date.now() - 800 * 86400000,
      expiryTimestamp: Date.now() - 10 * 86400000, // Expired 10 days ago
      currentCustodianId: pharm.id,
      currentCustodianRole: "Pharmacy",
      isRecalled: false,
      isDispensed: false,
      custodyHistory: [
        {
          transitionId: "HOP-1-GENESIS",
          senderId: mfg.id,
          recipientId: pharm.id,
          location: mfg.location,
          timestamp: Date.now() - 700 * 86400000,
          signatureHex: "OLD_DOXY_SIGN",
        }
      ]
    };
    db.putBatch(batch4);
  }

  // 5. SEED PRESCRIPTION 1: CLEAN & ACTIVE (Ready for Azithromycin dispense)
  const rx1Id = "RX-2026-001-ACTIVE";
  const existingOffChain1 = await db.getOffChainPrescription(rx1Id);
  const rx1Salt = existingOffChain1?.salt || generateSalt(16);
  const rx1Metadata = {
    patientId: "PAT-IND-2026-8812",
    patientName: "Rohan Verma",
    patientAge: 29,
    doctorLicense: doc.license,
    drugName: "Azithromycin IP",
    dosage: "500mg",
    salt: rx1Salt,
  };
  const rx1Hash = computePrescriptionHash(rx1Metadata);
  const rx1Signature = signECDSA(doc.keys.privateKey, rx1Hash);

  if (!db.getPrescription(rx1Id)) {
    const rx1OnChain = {
      prescriptionId: rx1Id,
      saltedHash: rx1Hash,
      doctorId: doc.id,
      doctorName: doc.name,
      doctorLicense: doc.license,
      doctorPublicKeyPEM: doc.keys.publicKey,
      doctorEcdsaSignature: rx1Signature,
      drugName: rx1Metadata.drugName,
      dosage: rx1Metadata.dosage,
      issueTimestamp: Date.now() - 2 * 3600000,
      expiryTimestamp: Date.now() + 14 * 86400000, // 14 days validity
      state: "Active",
    };
    db.putPrescription(rx1OnChain);
    db.commitBlock("PRESCRIPTION_ISSUED", { prescriptionId: rx1Id, saltedHash: rx1Hash, doctorLicense: doc.license });
  }
  if (!existingOffChain1) {
    await db.putOffChainPrescription({
      ...rx1Metadata,
      prescriptionId: rx1Id,
      diagnosis: "Acute Bacterial Sinusitis",
      instructions: "1 tablet daily after food for 5 days",
      clinic: doc.hospital,
    });
  }

  // 6. SEED PRESCRIPTION 2: ALREADY FULFILLED (For Replay / Double-Spend testing)
  const rx2Id = "RX-2026-002-REPLAY";
  const existingOffChain2 = await db.getOffChainPrescription(rx2Id);
  const rx2Salt = existingOffChain2?.salt || generateSalt(16);
  const rx2Metadata = {
    patientId: "PAT-IND-2026-4409",
    patientName: "Pooja Mehta",
    patientAge: 34,
    doctorLicense: doc.license,
    drugName: "Azithromycin IP",
    dosage: "500mg",
    salt: rx2Salt,
  };
  const rx2Hash = computePrescriptionHash(rx2Metadata);
  const rx2Signature = signECDSA(doc.keys.privateKey, rx2Hash);

  if (!db.getPrescription(rx2Id)) {
    const rx2OnChain = {
      prescriptionId: rx2Id,
      saltedHash: rx2Hash,
      doctorId: doc.id,
      doctorName: doc.name,
      doctorLicense: doc.license,
      doctorPublicKeyPEM: doc.keys.publicKey,
      doctorEcdsaSignature: rx2Signature,
      drugName: rx2Metadata.drugName,
      dosage: rx2Metadata.dosage,
      issueTimestamp: Date.now() - 86400000,
      expiryTimestamp: Date.now() + 10 * 86400000,
      state: "Fulfilled", // Already fulfilled!
      dispensedPharmacyId: "PHARM-MEDPLUS-77",
      dispensedBatchId: "BATCH-CIPLA-AZI-2026-00",
      dispensedTimestamp: Date.now() - 12 * 3600000,
    };
    db.putPrescription(rx2OnChain);
  }
  if (!existingOffChain2) {
    await db.putOffChainPrescription({
      ...rx2Metadata,
      prescriptionId: rx2Id,
      diagnosis: "Bronchial Infection",
      instructions: "Take with warm water",
      clinic: doc.hospital,
    });
  }

  // 7. SEED PRESCRIPTION 3: EXPIRED PRESCRIPTION
  const rx3Id = "RX-2026-003-EXPIRED";
  const existingOffChain3 = await db.getOffChainPrescription(rx3Id);
  const rx3Salt = existingOffChain3?.salt || generateSalt(16);
  const rx3Metadata = {
    patientId: "PAT-IND-2026-1190",
    patientName: "Sanjay Singhal",
    patientAge: 52,
    doctorLicense: STAKEHOLDERS.doctor2.license,
    drugName: "Dolo Paracetamol",
    dosage: "650mg",
    salt: rx3Salt,
  };
  const rx3Hash = computePrescriptionHash(rx3Metadata);
  const rx3Signature = signECDSA(STAKEHOLDERS.doctor2.keys.privateKey, rx3Hash);

  if (!db.getPrescription(rx3Id)) {
    const rx3OnChain = {
      prescriptionId: rx3Id,
      saltedHash: rx3Hash,
      doctorId: STAKEHOLDERS.doctor2.id,
      doctorName: STAKEHOLDERS.doctor2.name,
      doctorLicense: STAKEHOLDERS.doctor2.license,
      doctorPublicKeyPEM: STAKEHOLDERS.doctor2.keys.publicKey,
      doctorEcdsaSignature: rx3Signature,
      drugName: rx3Metadata.drugName,
      dosage: rx3Metadata.dosage,
      issueTimestamp: Date.now() - 30 * 86400000,
      expiryTimestamp: Date.now() - 5 * 86400000, // Expired 5 days ago
      state: "Expired",
    };
    db.putPrescription(rx3OnChain);
  }
  if (!existingOffChain3) {
    await db.putOffChainPrescription({
      ...rx3Metadata,
      prescriptionId: rx3Id,
      diagnosis: "Viral Pyrexia",
      instructions: "SOS when fever > 100 F",
      clinic: STAKEHOLDERS.doctor2.hospital,
    });
  }

  console.log("✅ MedTrust Consortium Ledger Seeded with 4 Batches and 3 Prescriptions.");
}
