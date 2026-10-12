import express from 'express';
import { db } from '../ledger_db.js';
import {
  computePrescriptionHash,
  generateSalt,
  signECDSA,
  verifyECDSA
} from '../crypto_engine.js';
import { STAKEHOLDERS } from '../seed_data.js';

const router = express.Router();

// GET all prescriptions
router.get('/', async (req, res) => {
  const onChainList = db.getAllPrescriptions();
  const enhancedList = await Promise.all(
    onChainList.map(async (rx) => {
      const offChain = (await db.getOffChainPrescription(rx.prescriptionId)) || {};
      return {
        ...rx,
        patientName: offChain.patientName || "Restricted (On-Chain Hash Only)",
        drugName: offChain.drugName || rx.drugName || "Redacted",
        dosage: offChain.dosage || rx.dosage || "",
        diagnosis: offChain.diagnosis || "",
        instructions: offChain.instructions || "",
        clinic: offChain.clinic || "Certified Health Clinic",
        salt: offChain.salt || "",
      };
    })
  );
  res.json({ success: true, count: enhancedList.length, prescriptions: enhancedList });
});

// GET single prescription by ID with cryptographic proof validation
router.get('/:id', async (req, res) => {
  const rx = db.getPrescription(req.params.id);
  if (!rx) {
    return res.status(404).json({ success: false, error: 'Prescription not found on ledger' });
  }

  const offChain = (await db.getOffChainPrescription(rx.prescriptionId)) || {};
  
  // Verify ECDSA signature on-the-fly
  const isSignatureValid = verifyECDSA(rx.doctorPublicKeyPEM, rx.saltedHash, rx.doctorEcdsaSignature);

  res.json({
    success: true,
    prescription: {
      ...rx,
      patientName: offChain.patientName || "Encrypted / Off-Chain",
      patientAge: offChain.patientAge || null,
      patientId: offChain.patientId || null,
      drugName: offChain.drugName || rx.drugName || null,
      dosage: offChain.dosage || rx.dosage || null,
      diagnosis: offChain.diagnosis || null,
      instructions: offChain.instructions || null,
      clinic: offChain.clinic || null,
      salt: offChain.salt || null,
    },
    verification: {
      doctorSignatureValid: isSignatureValid,
      isExpired: Date.now() > rx.expiryTimestamp,
      state: rx.state,
      canDispense: rx.state === 'Active' && Date.now() <= rx.expiryTimestamp && isSignatureValid,
    }
  });
});

// POST /issue - Doctor creates and signs a new e-prescription
router.post('/issue', async (req, res) => {
  const {
    doctorId = 'DOC-99412',
    patientId,
    patientName,
    patientAge,
    drugName,
    dosage,
    validDays = 14,
    diagnosis = 'General Consultation',
    instructions = 'As directed by physician',
  } = req.body;

  const cleanPatientId = typeof patientId === 'string' ? patientId.trim() : '';
  const cleanDrugName = typeof drugName === 'string' ? drugName.trim() : '';
  const cleanDosage = typeof dosage === 'string' ? dosage.trim() : '';
  const cleanPatientName = typeof patientName === 'string' ? patientName.trim() : '';
  const parsedValidDays = Number(validDays);

  if (!cleanPatientId || !cleanDrugName || !cleanDosage) {
    return res.status(400).json({ success: false, error: 'Missing required prescription fields (patientId, drugName, dosage)' });
  }
  if (!Number.isFinite(parsedValidDays) || parsedValidDays <= 0 || parsedValidDays > 365) {
    return res.status(400).json({ success: false, error: 'validDays must be a number between 1 and 365' });
  }

  // Find doctor identity
  const doctor = Object.values(STAKEHOLDERS).find(s => s.id === doctorId) || STAKEHOLDERS.doctor1;

  // 1. Generate cryptographic salt
  const salt = generateSalt(16);

  // 2. Compute salted SHA-256 hash (Zero PII on-chain)
  const saltedHash = computePrescriptionHash({
    patientId: cleanPatientId,
    doctorLicense: doctor.license,
    drugName: cleanDrugName,
    dosage: cleanDosage,
    salt,
  });

  // 3. Doctor signs salted hash with private ECDSA key
  const signature = signECDSA(doctor.keys.privateKey, saltedHash);

  const prescriptionId = `RX-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = Date.now();
  const expiryTimestamp = now + (parsedValidDays * 86400000);

  // 4. Commit to on-chain state (Module 1)
  const onChainRecord = {
    prescriptionId,
    saltedHash,
    doctorId: doctor.id,
    doctorName: doctor.name,
    doctorLicense: doctor.license,
    doctorPublicKeyPEM: doctor.keys.publicKey,
    doctorEcdsaSignature: signature,
    drugName: cleanDrugName,
    dosage: cleanDosage,
    issueTimestamp: now,
    expiryTimestamp,
    state: 'Active',
  };
  db.putPrescription(onChainRecord);

  // 5. Store off-chain patient clinic record
  await db.putOffChainPrescription({
    prescriptionId,
    patientId: cleanPatientId,
    patientName: cleanPatientName || 'Anonymous Patient',
    patientAge: patientAge || 'N/A',
    doctorLicense: doctor.license,
    drugName: cleanDrugName,
    dosage: cleanDosage,
    diagnosis,
    instructions,
    clinic: doctor.hospital,
    salt,
  });

  // 6. Record block on ledger
  const { block, txId } = db.commitBlock('PRESCRIPTION_ISSUED', {
    prescriptionId,
    saltedHash,
    doctorLicense: doctor.license,
    expiryTimestamp,
  });

  res.json({
    success: true,
    message: 'Prescription issued and cryptographically committed to MedTrust ledger',
    prescriptionId,
    txId,
    blockHeight: block.height,
    saltedHash,
    qrPayload: JSON.stringify({
      prescriptionId,
      saltedHash,
      doctorLicense: doctor.license,
      expires: expiryTimestamp,
    }),
    prescription: {
      ...onChainRecord,
      patientName: cleanPatientName || 'Anonymous Patient',
      drugName: cleanDrugName,
      dosage: cleanDosage,
      salt,
      diagnosis,
      instructions,
      clinic: doctor.hospital,
    }
  });
});

// POST /verify-salt - Verify raw data against on-chain hash
router.post('/verify-salt', (req, res) => {
  const { prescriptionId, patientId, doctorLicense, drugName, dosage, salt } = req.body;
  if (!prescriptionId || !patientId || !doctorLicense || !drugName || !dosage || !salt) {
    return res.status(400).json({
      success: false,
      error: 'Missing required verification fields (prescriptionId, patientId, doctorLicense, drugName, dosage, salt)',
    });
  }

  const rx = db.getPrescription(prescriptionId);
  if (!rx) {
    return res.status(404).json({ success: false, error: 'Prescription not found' });
  }

  const computed = computePrescriptionHash({ patientId, doctorLicense, drugName, dosage, salt });
  const matches = computed === rx.saltedHash;

  res.json({
    success: true,
    matches,
    onChainHash: rx.saltedHash,
    computedHash: computed,
    dpdpCompliant: true,
  });
});

export default router;
