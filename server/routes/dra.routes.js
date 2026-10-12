import express from 'express';
import { db } from '../ledger_db.js';
import { STAKEHOLDERS } from '../seed_data.js';

const router = express.Router();

// GET all incidents / fraud attempts
router.get('/incidents', (req, res) => {
  const incidents = db.getIncidents();
  res.json({ success: true, count: incidents.length, incidents });
});

// GET immutable blockchain blocks
router.get('/ledger', (req, res) => {
  const blocks = db.getBlocks();
  res.json({
    success: true,
    blockHeight: blocks.length,
    channel: 'medtrust-channel',
    rootCA: STAKEHOLDERS.dra.id,
    blocks,
  });
});

// POST /recall - DRA broadcasts batch recall across consortium
router.post('/recall', (req, res) => {
  const { batchId, reason, authority = STAKEHOLDERS.dra.name } = req.body;
  const cleanBatchId = typeof batchId === 'string' ? batchId.trim() : '';
  const cleanReason = typeof reason === 'string' ? reason.trim() : '';

  if (!cleanBatchId || !cleanReason) {
    return res.status(400).json({ success: false, error: 'batchId and recall reason are required' });
  }

  const batch = db.getBatch(cleanBatchId);
  if (!batch) {
    return res.status(404).json({ success: false, error: `Batch ${cleanBatchId} not found on ledger` });
  }

  batch.isRecalled = true;
  batch.recallReason = cleanReason;
  batch.recallAuthority = authority;
  db.putBatch(batch);

  const { block, txId } = db.commitBlock('DRA_BATCH_RECALL_BROADCAST', {
    batchId: cleanBatchId,
    reason: cleanReason,
    authority,
    timestamp: Date.now(),
  });

  // Also log incident
  db.addIncident({
    eventType: 'REGULATORY_RECALL_ISSUED',
    breachCode: 'DRA_RECALL_MANDATE',
    reason: `CDSCO Regulatory Recall: ${reason}`,
    batchId,
    pharmacyId: batch.currentCustodianId,
    severity: 'CRITICAL',
  });

  res.json({
    success: true,
    message: `Batch ${batchId} flagged with CDSCO Regulatory Recall`,
    batch,
    txId,
    blockHeight: block.height,
  });
});

// GET ecosystem statistics for auditor dashboard
router.get('/stats', (req, res) => {
  const prescriptions = db.getAllPrescriptions();
  const batches = db.getAllBatches();
  const incidents = db.getIncidents();
  const blocks = db.getBlocks();

  const activeRx = prescriptions.filter(r => r.state === 'Active').length;
  const fulfilledRx = prescriptions.filter(r => r.state === 'Fulfilled').length;
  const recalledBatches = batches.filter(b => b.isRecalled).length;
  const dispensedBatches = batches.filter(b => b.isDispensed).length;

  res.json({
    success: true,
    stats: {
      totalPrescriptions: prescriptions.length,
      activePrescriptions: activeRx,
      fulfilledPrescriptions: fulfilledRx,
      totalBatches: batches.length,
      dispensedBatches,
      recalledBatches,
      blockedIncidents: incidents.length,
      blockHeight: blocks.length,
      stakeholdersCount: Object.keys(STAKEHOLDERS).length,
    }
  });
});

export default router;
