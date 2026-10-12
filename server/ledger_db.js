import { sha256 } from './crypto_engine.js';
import { v4 as uuidv4 } from 'uuid';
import { loadLedgerState, saveLedgerState } from './ledger_store.js';
import { putOffChainPrescription as saveOffChainMongo, getOffChainPrescription as loadOffChainMongo, getAllOffChainPrescriptions as loadAllOffChainMongo } from './offchain_db.js';

/**
 * MedTrust Permissioned Blockchain Ledger & State Store Simulation
 * Maintains atomic commit semantics, state isolation, and tamper-evident block chaining.
 * Storage Backend: Persistent JSON/Disk Store with CouchDB-style Key-Value semantics.
 * Note: Chaincode in 'chaincode/' is Fabric-ready for deployment to live Hyperledger network.
 */
class MedTrustLedgerDB {
  constructor() {
    this.onChainPrescriptions = new Map();
    this.offChainPrescriptionStore = new Map(); // MongoDB off-chain encrypted audit store
    this.onChainBatches = new Map();
    this.incidentLogs = [];
    this.immutableBlocks = [];
    this.recalledBatches = new Set();
    
    this.loadFromDisk();
  }

  loadFromDisk() {
    const saved = loadLedgerState();
    if (saved && saved.immutableBlocks && saved.immutableBlocks.length > 0) {
      console.log(`💾 Loaded persistent ledger state from disk (${saved.immutableBlocks.length} blocks, ${saved.onChainPrescriptions.length} prescriptions, ${saved.onChainBatches.length} batches).`);
      this.immutableBlocks = saved.immutableBlocks;
      this.incidentLogs = saved.incidentLogs || [];
      this.recalledBatches = new Set(saved.recalledBatches || []);
      
      for (const rx of saved.onChainPrescriptions) {
        this.onChainPrescriptions.set(rx.prescriptionId, rx);
      }
      for (const b of saved.onChainBatches) {
        this.onChainBatches.set(b.batchId, b);
      }
    } else {
      this.initGenesisBlock();
      this.saveToDisk();
    }
  }

  saveToDisk() {
    saveLedgerState({
      onChainPrescriptions: this.onChainPrescriptions,
      onChainBatches: this.onChainBatches,
      incidentLogs: this.incidentLogs,
      immutableBlocks: this.immutableBlocks,
      recalledBatches: this.recalledBatches,
    });
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
    this.saveToDisk();
    return { block, txId };
  }

  // --- MODULE 1: PRESCRIPTION STORE ---
  putPrescription(prescription) {
    this.onChainPrescriptions.set(prescription.prescriptionId, prescription);
    this.saveToDisk();
  }

  getPrescription(prescriptionId) {
    return this.onChainPrescriptions.get(prescriptionId);
  }

  getAllPrescriptions() {
    return Array.from(this.onChainPrescriptions.values());
  }

  async putOffChainPrescription(record) {
    this.offChainPrescriptionStore.set(record.prescriptionId, record);
    await saveOffChainMongo(record);
  }

  async getOffChainPrescription(prescriptionId) {
    const mongoDoc = await loadOffChainMongo(prescriptionId);
    if (mongoDoc) return mongoDoc;
    return this.offChainPrescriptionStore.get(prescriptionId);
  }

  async getAllOffChainPrescriptions() {
    const docs = await loadAllOffChainMongo();
    if (docs && docs.length > 0) return docs;
    return Array.from(this.offChainPrescriptionStore.values());
  }

  // --- MODULE 2: DRUG BATCH STORE ---
  putBatch(batch) {
    this.onChainBatches.set(batch.batchId, batch);
    if (batch.isRecalled) {
      this.recalledBatches.add(batch.batchId);
    }
    this.saveToDisk();
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
    this.saveToDisk();
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

    this.saveToDisk();

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

