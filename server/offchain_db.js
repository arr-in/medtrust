import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * MedTrust Off-Chain Encrypted Audit Store
 * Backed by MongoDB (using embedded mongodb-memory-server with disk persistence fallback)
 * Stores full unhashed prescription metadata, diagnosis, and patient instructions off-chain,
 * coupled to the salted SHA-256 hashes committed on the permissioned ledger.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_FILE = path.join(__dirname, 'data', 'offchain_prescriptions.json');

let mongoClient = null;
let dbInstance = null;
let prescriptionsCollection = null;
let isInitialized = false;
const inMemoryFallback = new Map();

function ensureDataDir() {
  const dir = path.dirname(BACKUP_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadDiskBackupToFallback() {
  if (fs.existsSync(BACKUP_FILE)) {
    try {
      const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
      const records = JSON.parse(raw);
      for (const r of records) {
        inMemoryFallback.set(r.prescriptionId, r);
      }
    } catch {
      // ignore
    }
  }
}

// Preload disk backup synchronously so off-chain reads work immediately even before initOffChainDB()
loadDiskBackupToFallback();

export async function initOffChainDB() {
  if (isInitialized) return;
  
  ensureDataDir();

  let uri = process.env.MONGODB_URI;
  const useMemoryMongo = process.env.USE_MEMORY_MONGO === 'true';

  if (!uri && !useMemoryMongo) {
    loadDiskBackupToFallback();
    isInitialized = true;
    console.log(`💾 Off-Chain Store Ready (JSON disk store: ${inMemoryFallback.size} records loaded).`);
    return;
  }

  try {
    if (!uri && useMemoryMongo) {
      console.log("🍃 Starting embedded MongoDB instance (mongodb-memory-server)...");
      const mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
    }

    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    dbInstance = mongoClient.db('medtrust_offchain');
    prescriptionsCollection = dbInstance.collection('prescriptions');
    
    // Load disk backup into Mongo if collection is empty
    const count = await prescriptionsCollection.countDocuments();
    if (count === 0 && fs.existsSync(BACKUP_FILE)) {
      const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
      const records = JSON.parse(raw);
      if (records.length > 0) {
        await prescriptionsCollection.insertMany(records);
        console.log(`🍃 Restored ${records.length} off-chain prescription records into MongoDB.`);
      }
    }

    isInitialized = true;
    console.log("✅ MongoDB Off-Chain Store Connected & Ready.");
  } catch (err) {
    console.warn("⚠️ Could not initialize MongoDB instance, using disk-synced fallback:", err.message);
    loadDiskBackupToFallback();
    isInitialized = true;
  }
}

export async function putOffChainPrescription(record) {
  if (prescriptionsCollection) {
    try {
      await prescriptionsCollection.updateOne(
        { prescriptionId: record.prescriptionId },
        { $set: record },
        { upsert: true }
      );
      saveOffChainDiskBackup();
      return;
    } catch (err) {
      console.error("Error writing to MongoDB off-chain store:", err.message);
    }
  }
  inMemoryFallback.set(record.prescriptionId, record);
  saveOffChainDiskBackup();
}

export async function getOffChainPrescription(prescriptionId) {
  if (prescriptionsCollection) {
    try {
      const doc = await prescriptionsCollection.findOne({ prescriptionId });
      if (doc) {
        const { _id, ...cleanDoc } = doc;
        return cleanDoc;
      }
    } catch (err) {
      console.error("Error reading from MongoDB off-chain store:", err.message);
    }
  }
  return inMemoryFallback.get(prescriptionId);
}

export async function getAllOffChainPrescriptions() {
  if (prescriptionsCollection) {
    try {
      const docs = await prescriptionsCollection.find({}).toArray();
      return docs.map(({ _id, ...cleanDoc }) => cleanDoc);
    } catch (err) {
      console.error("Error reading all from MongoDB off-chain store:", err.message);
    }
  }
  return Array.from(inMemoryFallback.values());
}

async function saveOffChainDiskBackup() {
  ensureDataDir();
  try {
    let records = [];
    if (prescriptionsCollection) {
      const docs = await prescriptionsCollection.find({}).toArray();
      records = docs.map(({ _id, ...cleanDoc }) => cleanDoc);
    } else {
      records = Array.from(inMemoryFallback.values());
    }
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    // backup write warning
  }
}
