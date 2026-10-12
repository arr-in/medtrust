import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../server/data');

console.log('🧹 Wiping existing runtime ledger and off-chain data in server/data/...');
if (fs.existsSync(dataDir)) {
  fs.rmSync(dataDir, { recursive: true, force: true });
}

// Dynamically import server modules AFTER wiping server/data so they initialize cleanly
const { initOffChainDB } = await import('../server/offchain_db.js');
const { seedConsortiumData } = await import('../server/seed_data.js');
const { db } = await import('../server/ledger_db.js');

await initOffChainDB();
await seedConsortiumData();

console.log('✨ Demo state reset complete!');
console.log(`   • Blocks on Ledger:    ${db.getBlocks().length} (Heights #0, #1, #2)`);
console.log(`   • Seeded Prescriptions: ${db.getAllPrescriptions().length} (RX-2026-001-ACTIVE, RX-2026-002-REPLAY, RX-2026-003-EXPIRED)`);
console.log(`   • Seeded Drug Batches:  ${db.getAllBatches().length} (BATCH-CIPLA-AZI-2026-01, BATCH-SUN-PCM-2026-99, BATCH-CIPLA-AMX-RECALLED, BATCH-EXPIRED-DOXY-2024)`);
console.log(`   • Active Incidents:     ${db.getIncidents().length}`);
process.exit(0);
