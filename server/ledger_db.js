import { sha256 } from './crypto_engine.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-Memory Verifiable Blockchain Ledger & CouchDB-Style State Store
 * Maintains atomic commit semantics, state isolation, and tamper-evident block chaining.
 */
class MedTrustLedgerDB {
  constructor() {
    this.onChainPrescriptions = new Map();
    this.offChainPrescriptionStore = new Map(); // MongoDB off-chain encrypted audit store
    this.onChainBatches = new Map();
    this.incidentLogs = [];
    this.immutableBlocks = [];
    this.recalledBatches = new Set();
    this.initGenesisBlock();
  }

  initGenesisBlock() {
    const genesisData = {
      description: "MedTrust Consortium Genesis Block - Hyperledger Fabric Channel 'medtrust-channel'",
      network: "MedTrust-India-Consortium",
      rootCA: "DRA-CDSCO-RootCA",
      consensus: "Raft-PBFT-Simulation",
      timestamp: Date.now(),
    };
    const prevHash = "0".repeat(64);
    const blockHash = sha256(prevHash + JSON.stringify(genesisData) + 0);

    this.immutableBlocks.push({
      height: 0,
      timestamp: Date.now(),
      prevHash,
      blockHash,
      txCount: 1,
      transactions: [{
        txId: "GENESIS-TX-00000000",
        type: "GENESIS_INITIALIZE",
        payload: genesisData,
      }]
    });
  }

  commitBlock(type, payload) {
    const lastBlock = this.immutableBlocks[this.immutableBlocks.length - 1];
    const prevHash = lastBlock.blockHash;
    const height = this.immutableBlocks.length;
    const timestamp = Date.now();
    const txId = 'TX-' + uuidv4().slice(0, 8).toUpperCase();

    const tx = {
      txId,
      type,
      timestamp,
      payload,
    };

    const blockHash = sha256(prevHash + JSON.stringify(tx) + height + timestamp);

    const block = {
      height,
      timestamp,
      prevHash,
      blockHash,
      txCount: 1,
      transactions: [tx],
    };

    this.immutableBlocks.push(block);
    return { block, txId };
  }

  // --- MODULE 1: PRESCRIPTION STORE ---
  putPrescription(prescription) {
    this.onChainPrescriptions.set(prescription.prescriptionId, prescription);
  }

  getPrescription(prescriptionId) {
    return this.onChainPrescriptions.get(prescriptionId);
  }

  getAllPrescriptions() {
    return Array.from(this.onChainPrescriptions.values());
  }

  putOffChainPrescription(record) {
    this.offChainPrescriptionStore.set(record.prescriptionId, record);
  }

  getOffChainPrescription(prescriptionId) {
    return this.offChainPrescriptionStore.get(prescriptionId);
  }

  // --- MODULE 2: DRUG BATCH STORE ---
  putBatch(batch) {
    this.onChainBatches.set(batch.batchId, batch);
  }

  getBatch(batchId) {
    return this.onChainBatches.get(batchId);
  }

  getAllBatches() {
    return Array.from(this.onChainBatches.values());
  }

  // --- INCIDENTS & RECALLS (DRA) ---
  addIncident(incident) {
    const entry = {
      id: 'INC-' + uuidv4().slice(0, 8).toUpperCase(),
      timestamp: Date.now(),
      ...incident,
    };
    this.incidentLogs.unshift(entry);
    return entry;
  }

  getIncidents() {
    return this.incidentLogs;
  }

  getBlocks() {
    return [...this.immutableBlocks].reverse();
  }

  // --- ATOMIC STATE COMMIT (GATEWAY CONTRACT) ---
  atomicDispenseCommit({ prescriptionId, batchId, pharmacyId }) {
    const rx = this.onChainPrescriptions.get(prescriptionId);
    const batch = this.onChainBatches.get(batchId);

    if (!rx || !batch) {
      throw new Error("Cannot commit: Missing prescription or drug batch");
    }

    const now = Date.now();

    // 1. Mutate Prescription State
    rx.state = 'Fulfilled';
    rx.dispensedPharmacyId = pharmacyId;
    rx.dispensedBatchId = batchId;
    rx.dispensedTimestamp = now;

    // 2. Mutate Batch State
    batch.isDispensed = true;
    batch.dispensedPharmacyId = pharmacyId;
    batch.dispenseTimestamp = now;

    // Append final hop
    batch.custodyHistory.push({
      transitionId: `HOP-DISPENSED-${batch.custodyHistory.length + 1}`,
      senderId: pharmacyId,
      recipientId: `PATIENT_HASH_${rx.saltedHash.slice(0, 8)}`,
      location: pharmacyId,
      timestamp: now,
      signatureHex: 'DISPENSE_ATOMIC_COMMITTED',
    });

    // 3. Commit to Immutable Blockchain
    const { block, txId } = this.commitBlock('ATOMIC_GATEWAY_DISPENSE', {
      prescriptionId,
      batchId,
      pharmacyId,
      prescriptionHash: rx.saltedHash,
      batchNdc: batch.ndc,
      drugName: batch.drugName,
    });

    return {
      success: true,
      txId,
      blockHeight: block.height,
      blockHash: block.blockHash,
      timestamp: now,
      prescription: rx,
      batch,
    };
  }
}

export const db = new MedTrustLedgerDB();
