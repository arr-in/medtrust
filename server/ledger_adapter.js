/**
 * MedTrust Ledger Backend Adapter Interface (ILedgerAdapter)
 * Standardizes access to on-chain and state store capabilities.
 * Allows seamless hot-swapping between the Simulated Disk/SQLite Ledger Adapter
 * and a live Hyperledger Fabric Network SDK Adapter (fabric-network / fabric-gateway).
 */

export class ILedgerAdapter {
  async getPrescription(prescriptionId) { throw new Error("Method not implemented"); }
  async putPrescription(prescription) { throw new Error("Method not implemented"); }
  async getAllPrescriptions() { throw new Error("Method not implemented"); }

  async getBatch(batchId) { throw new Error("Method not implemented"); }
  async putBatch(batch) { throw new Error("Method not implemented"); }
  async getAllBatches() { throw new Error("Method not implemented"); }

  async addIncident(incident) { throw new Error("Method not implemented"); }
  async getIncidents() { throw new Error("Method not implemented"); }

  async getBlocks() { throw new Error("Method not implemented"); }
  async commitBlock(type, payload) { throw new Error("Method not implemented"); }

  async atomicDispenseCommit({ prescriptionId, batchId, pharmacyId }) { throw new Error("Method not implemented"); }
}

/**
 * Simulated Ledger Adapter backed by MedTrust Database Store (disk persistent)
 */
export class SimulatedLedgerAdapter extends ILedgerAdapter {
  constructor(dbInstance) {
    super();
    this.db = dbInstance;
  }

  async getPrescription(prescriptionId) {
    return this.db.getPrescription(prescriptionId);
  }

  async putPrescription(prescription) {
    return this.db.putPrescription(prescription);
  }

  async getAllPrescriptions() {
    return this.db.getAllPrescriptions();
  }

  async getBatch(batchId) {
    return this.db.getBatch(batchId);
  }

  async putBatch(batch) {
    return this.db.putBatch(batch);
  }

  async getAllBatches() {
    return this.db.getAllBatches();
  }

  async addIncident(incident) {
    return this.db.addIncident(incident);
  }

  async getIncidents() {
    return this.db.getIncidents();
  }

  async getBlocks() {
    return this.db.getBlocks();
  }

  async commitBlock(type, payload) {
    return this.db.commitBlock(type, payload);
  }

  async atomicDispenseCommit({ prescriptionId, batchId, pharmacyId }) {
    return this.db.atomicDispenseCommit({ prescriptionId, batchId, pharmacyId });
  }
}
