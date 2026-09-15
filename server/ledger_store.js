import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'medtrust_ledger.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadLedgerState() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return {
      onChainPrescriptions: data.onChainPrescriptions || [],
      onChainBatches: data.onChainBatches || [],
      incidentLogs: data.incidentLogs || [],
      immutableBlocks: data.immutableBlocks || [],
      recalledBatches: data.recalledBatches || [],
    };
  } catch (err) {
    console.error('⚠️ Could not load ledger state from disk, starting fresh:', err.message);
    return null;
  }
}

export function saveLedgerState(state) {
  ensureDataDir();
  try {
    const serialized = {
      timestamp: Date.now(),
      onChainPrescriptions: Array.from(state.onChainPrescriptions.values()),
      onChainBatches: Array.from(state.onChainBatches.values()),
      incidentLogs: state.incidentLogs,
      immutableBlocks: state.immutableBlocks,
      recalledBatches: Array.from(state.recalledBatches),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(serialized, null, 2), 'utf-8');
  } catch (err) {
    console.error('⚠️ Failed to save ledger state to disk:', err.message);
  }
}
