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

  if (!batchId || !drugName || !dosage) {
    return res.status(400).json({ success: false, error: 'Missing required batch fields' });
  }

  if (db.getBatch(batchId)) {
    return res.status(400).json({ success: false, error: `Batch ${batchId} already registered on ledger` });
  }

  const now = Date.now();
  const expiryTimestamp = now + (Number(expiryMonths) * 30 * 86400000);

  const genesisHop = {
    transitionId: `HOP-1-GENESIS`,
    senderId: 'PLANT-GENESIS',
    recipientId: manufacturerId,
    location: plantLocation,
    timestamp: now,
    signatureHex: 'GENESIS_AUTHORIZATION_SIG',
  };

  const newBatch = {
    batchId,
    drugName,
    ndc: ndc || `0378-${Math.floor(1000 + Math.random() * 9000)}-01`,
    dosage,
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
    batchId,
    drugName,
    dosage,
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

  const batch = db.getBatch(batchId);
  if (!batch) {
    return res.status(404).json({ success: false, error: `Batch ${batchId} not found` });
  }

  if (batch.isDispensed) {
    return res.status(400).json({ success: false, error: `Batch ${batchId} already dispensed to patient` });
  }
  if (batch.isRecalled) {
    return res.status(400).json({ success: false, error: `Batch ${batchId} is recalled by DRA, custody transfer prohibited` });
  }
  if (batch.currentCustodianId !== senderId) {
    return res.status(400).json({
      success: false,
      error: `Custody breach: sender ${senderId} does not possess batch (current custodian is ${batch.currentCustodianId})`
    });
  }

  const now = Date.now();
  const hopNumber = batch.custodyHistory.length + 1;
  const hop = {
    transitionId: `HOP-${hopNumber}-TRANSFER`,
    senderId,
    recipientId,
    location: location || 'Indore Logistics Corridor',
    timestamp: now,
    signatureHex: `CUSTODY_SIG_${senderId.slice(0, 8)}_${now}`,
  };

  batch.custodyHistory.push(hop);
  batch.currentCustodianId = recipientId;
  batch.currentCustodianRole = recipientRole || 'Distributor';

  db.putBatch(batch);
  const { block, txId } = db.commitBlock('CUSTODY_TRANSFER_RECORDED', {
    batchId,
    from: senderId,
    to: recipientId,
    hopNumber,
  });

  res.json({
    success: true,
    message: `Custody of batch ${batchId} successfully transferred to ${recipientId}`,
    batch,
    txId,
    blockHeight: block.height,
  });
});

export default router;
