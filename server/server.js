import express from 'express';
import cors from 'cors';
import { seedConsortiumData, STAKEHOLDERS } from './seed_data.js';
import { initOffChainDB } from './offchain_db.js';
import prescriptionRoutes from './routes/prescription.routes.js';
import drugRoutes from './routes/drug.routes.js';
import gatewayRoutes from './routes/gateway.routes.js';
import draRoutes from './routes/dra.routes.js';
import benchmarkRoutes from './routes/benchmark.routes.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize off-chain MongoDB store & seed consortium data
initOffChainDB().then(() => {
  seedConsortiumData();
}).catch(err => {
  console.warn("MongoDB init notice:", err.message);
  seedConsortiumData();
});


// Routes
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/drugs', drugRoutes);
app.use('/api/gateway', gatewayRoutes);
app.use('/api/dra', draRoutes);
app.use('/api/benchmark', benchmarkRoutes);

// Stakeholders directory endpoint (public certificates & identities)
app.get('/api/stakeholders', (req, res) => {
  const publicDirectory = {};
  for (const [key, val] of Object.entries(STAKEHOLDERS)) {
    publicDirectory[key] = {
      id: val.id,
      name: val.name,
      role: val.role,
      location: val.location,
      license: val.license,
      hospital: val.hospital,
      publicKeyPEM: val.keys.publicKey,
    };
  }
  res.json({ success: true, stakeholders: publicDirectory });
});

// Network status & health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    framework: 'MedTrust Permissioned Blockchain',
    channel: 'medtrust-channel',
    chaincodeVersion: '1.0.0',
    rootCA: 'CDSCO-DRA-ROOT-CA',
    activePeers: 6,
    timestamp: Date.now(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MedTrust Blockchain Gateway Engine listening on port ${PORT}`);
});
