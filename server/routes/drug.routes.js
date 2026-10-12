import express from 'express';
import { db } from '../ledger_db.js';
import { STAKEHOLDERS } from '../seed_data.js';

const router = express.Router();

// GET all drug batches
router.get('/batches', (req, res) => {
  const batches = db.getAllBatches();
  res.json({ success: true, count: batches.length, batches });
});

// GET single batch with full custody timeline
router.get('/batches/:id', (req, res) => {
  const batch = db.getBatch(req.params.id);
  if (!batch) {
    return res.status(404).json({ success: false, error: `Batch ${req.params.id} not found (Counterfeit or unregistered)` });
  }

  const isExpired = Date.now() > batch.expiryTimestamp;
  const custodyHops = batch.custodyHistory || [];

  res.json({
    success: true,
    batch,
    audit: {
      isExpired,
      isRecalled: batch.isRecalled,
      isDispensed: batch.isDispensed,
      custodian: batch.currentCustodianId,
      totalHops: custodyHops.length,
      unbrokenChain: custodyHops.length >= 1,
    }
  });
});

// POST /register - Manufacturer creates genesis batch record
router.post('/register', (req, res) => {
  const {
    batchId,
    drugName,
    ndc,
    dosage,
    plantLocation = 'Verna Industrial Estate, Goa',
    manufacturerId = 'MFG-CIPLA-GOA',
    expiryMonths = 12,
  } = req.body;

  const cleanBatchId = typeof batchId === 'string' ? batchId.trim() : '';
  const cleanDrugName = typeof drugName === 'string' ? drugName.trim() : '';
  const cleanDosage = typeof dosage === 'string' ? dosage.trim() : '';
  const parsedExpiryMonths = Number(expiryMonths);

  if (!cleanBatchId || !cleanDrugName || !cleanDosage) {
    return res.status(400).json({ success: false, error: 'Missing required batch fields (batchId, drugName, dosage)' });
  }
  if (!Number.isFinite(parsedExpiryMonths) || parsedExpiryMonths <= 0 || parsedExpiryMonths > 120) {
    return res.status(400).json({ success: false, error: 'expiryMonths must be a number between 1 and 120' });
  }

  if (db.getBatch(cleanBatchId)) {
    return res.status(400).json({ success: false, error: `Batch ${cleanBatchId} already registered on ledger` });
  }

  const now = Date.now();
  const expiryTimestamp = now + (parsedExpiryMonths * 30 * 86400000);

  const genesisHop = {
    transitionId: `HOP-1-GENESIS`,
    senderId: 'PLANT-GENESIS',
    recipientId: manufacturerId,
    location: plantLocation,
    timestamp: now,
    signatureHex: 'GENESIS_AUTHORIZATION_SIG',
  };

  const newBatch = {
    batchId: cleanBatchId,
    drugName: cleanDrugName,
    ndc: (typeof ndc === 'string' && ndc.trim()) || `0378-${Math.floor(1000 + Math.random() * 9000)}-01`,
    dosage: cleanDosage,
    plantLocation,
    manufacturerId,
    mfgTimestamp: now,
    expiryTimestamp,
    currentCustodianId: manufacturerId,
    currentCustodianRole: 'Manufacturer',
    custodyHistory: [genesisHop],
    isRecalled: false,
    isDispensed: false,
  };

  db.putBatch(newBatch);
  const { block, txId } = db.commitBlock('BATCH_GENESIS_REGISTRATION', {
    batchId: cleanBatchId,
    drugName: cleanDrugName,
    dosage: cleanDosage,
    manufacturerId,
    plantLocation,
    expiryTimestamp,
  });

  res.json({
    success: true,
    message: 'Drug batch genesis record committed to MedTrust ledger',
    batch: newBatch,
    txId,
    blockHeight: block.height,
  });
});

// POST /transfer-custody - Log a multi-hop custody transfer
router.post('/transfer-custody', (req, res) => {
  const { batchId, senderId, recipientId, recipientRole, location } = req.body;
  const cleanBatchId = typeof batchId === 'string' ? batchId.trim() : '';
  const cleanSenderId = typeof senderId === 'string' ? senderId.trim() : '';
  const cleanRecipientId = typeof recipientId === 'string' ? recipientId.trim() : '';

  if (!cleanBatchId || !cleanSenderId || !cleanRecipientId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required custody transfer fields (batchId, senderId, recipientId)',
    });
  }
  if (cleanSenderId === cleanRecipientId) {
    return res.status(400).json({
      success: false,
      error: 'Sender and recipient custody nodes cannot be identical',
    });
  }

  const batch = db.getBatch(cleanBatchId);
  if (!batch) {
    return res.status(404).json({ success: false, error: `Batch ${cleanBatchId} not found` });
  }

  if (batch.isDispensed) {
    return res.status(400).json({ success: false, error: `Batch ${cleanBatchId} already dispensed to patient` });
  }
  if (batch.isRecalled) {
    return res.status(400).json({ success: false, error: `Batch ${cleanBatchId} is recalled by DRA, custody transfer prohibited` });
  }
  if (batch.currentCustodianId !== cleanSenderId) {
    return res.status(400).json({
      success: false,
      error: `Custody breach: sender ${cleanSenderId} does not possess batch (current custodian is ${batch.currentCustodianId})`
    });
  }

  const now = Date.now();
  const hopNumber = batch.custodyHistory.length + 1;
  const hop = {
    transitionId: `HOP-${hopNumber}-TRANSFER`,
    senderId: cleanSenderId,
    recipientId: cleanRecipientId,
    location: (typeof location === 'string' && location.trim()) || 'Indore Logistics Corridor',
    timestamp: now,
    signatureHex: `CUSTODY_SIG_${cleanSenderId.slice(0, 8)}_${now}`,
  };

  batch.custodyHistory.push(hop);
  batch.currentCustodianId = cleanRecipientId;
  batch.currentCustodianRole = recipientRole || 'Distributor';

  db.putBatch(batch);
  const { block, txId } = db.commitBlock('CUSTODY_TRANSFER_RECORDED', {
    batchId: cleanBatchId,
    from: cleanSenderId,
    to: cleanRecipientId,
    hopNumber,
  });

  res.json({
    success: true,
    message: `Custody of batch ${cleanBatchId} successfully transferred to ${cleanRecipientId}`,
    batch,
    txId,
    blockHeight: block.height,
  });
});

export default router;
