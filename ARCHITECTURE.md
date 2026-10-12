# MedTrust Architecture

## Component Status Matrix

| Component | Current Implementation | Target Architecture | Status |
|---|---|---|---|
| Prescription on-chain store | Persistent JSON/Disk Store (`ledger_db.js` + `ledger_store.js`) | Fabric world-state (CouchDB) via `PrescriptionContract` (`prescription_layer.go`) | 🔶 Simulated (Disk-Persistent) |
| Drug batch on-chain store | Persistent JSON/Disk Store (`ledger_db.js` + `ledger_store.js`) | Fabric world-state (CouchDB) via `DrugProvenanceContract` (`drug_provenance_layer.go`) | 🔶 Simulated (Disk-Persistent) |
| Gateway dual-layer logic | Node.js in `gateway.routes.js` | Fabric chaincode `GatewayContract` (`gateway_contract.go`) | 🔶 Simulated |
| Immutable block journal | Disk-persisted array with SHA-256 chaining (`ledger_store.js`) | Real Fabric block ledger | 🔶 Simulated (Disk-Persistent) |
| Off-chain PII store (prescriptions) | **MongoDB / Disk-Synced Store** via `offchain_db.js` | Same (MongoDB / off-chain store is the correct choice — PII must not be on-chain) | ✅ Real |
| ECDSA key generation & signing | Real `crypto` module, secp256r1 (`crypto_engine.js`), keys persisted in `data/stakeholders_keys.json` | Same (MSP certificates use the same curve) | ✅ Real |
| Salted SHA-256 prescription hashing | Real `crypto.createHash('sha256')`, random 128-bit salt | Same | ✅ Real |
| DRA recall propagation | Disk-persisted Map mutation, instant | Fabric event hub, cross-peer broadcast | 🔶 Simulated (effective in-process) |
| Go chaincode | Written with full ECDSA P-256 verification (`prescription_layer.go`, `drug_provenance_layer.go`, `gateway_contract.go`) — **not deployed** | Deploy to test-network via `peer lifecycle chaincode` | ❌ Not Integrated |

---

## Layer Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        React 19 Frontend                        │
│   PharmacistPOS · DoctorPortal · ManufacturerPortal             │
│   DistributorPortal · PatientPass · DRAPanel · BenchmarkSuite   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST (Vite proxy → :5001)
┌────────────────────────▼────────────────────────────────────────┐
│               Node.js / Express Gateway Server (:5001)          │
│                                                                 │
│   gateway.routes.js   → Dual-layer check + atomic commit        │
│   prescription.routes.js → ECDSA sign/verify + hash            │
│   drug.routes.js      → Batch registry + custody chain         │
│   dra.routes.js       → Recall + incident feed                  │
│   benchmark.routes.js → Scenarios A–F performance suite        │
└────┬───────────────────────────────────────┬────────────────────┘
     │                                       │
     │ Persistent Disk Ledger Simulation     │ Off-Chain PII Store
     │ (ledger_db.js + ledger_store.js)      │ (offchain_db.js)
     │                                       │
┌────▼──────────────────────┐    ┌───────────▼──────────────────┐
│  MedTrustLedgerDB         │    │  offchain_prescriptions      │
│  onChainPrescriptions Map │    │  (patient PII, diagnosis,     │
│  onChainBatches Map       │    │   salt, instructions)         │
│  immutableBlocks []       │    │                               │
│  incidentLogs []          │    │  Uses MongoDB if MONGODB_URI  │
│  Persisted to JSON disk   │    │  or USE_MEMORY_MONGO=true,    │
│  (medtrust_ledger.json)   │    │  else instant JSON disk store │
└───────────────────────────┘    └──────────────────────────────┘

─── TARGET ARCHITECTURE (not yet integrated) ─────────────────────

┌───────────────────────────────────────────────────────────────┐
│              Hyperledger Fabric 2.5 Network                   │
│                                                               │
│  Org1Peer0 ──┐                      ┌── Org2Peer0            │
│  Org1Peer1 ──┤  medtrust-channel    ├── Org2Peer1            │
│              │  (Raft orderer)       │                        │
│              └──────────────────────┘                        │
│                    CouchDB (world-state)                      │
│                                                               │
│  Chaincode: /chaincode/*.go                                   │
│    • PrescriptionContract                                     │
│    • DrugProvenanceContract                                   │
│    • GatewayContract (atomic dual-layer invoke)               │
└───────────────────────────────────────────────────────────────┘
     ▲
     │ @hyperledger/fabric-gateway SDK (planned: fabric_gateway.js)
     │
┌────┴────────────────────────────────────┐
│  Node.js / Express Gateway Server       │
│  (same server, SDK replaces ledger_db)  │
└─────────────────────────────────────────┘
```

---

## Honest Status: What is "Blockchain" Right Now?

The current demo implementation provides:

- **Cryptographic guarantees**: Real ECDSA secp256r1 signing/verification, real SHA-256 hashing with random per-prescription salts. These are not simulated.
- **Atomic gateway semantics**: The dual-layer check and commit are executed inside a single-threaded Node.js call — JS's single-threaded event loop makes this effectively atomic. No partial writes are possible within the store.
- **Block chaining & disk persistence**: Each transaction appends a SHA-256 chained block persisted to `server/data/medtrust_ledger.json`, with stakeholder keypairs persisted in `server/data/stakeholders_keys.json`. However, this has no Byzantine fault tolerance, no multi-peer endorsement, and no Raft consensus.
- **DRA recall propagation**: Instantaneous within the same process and persisted to disk.

**What is NOT present without Fabric integration:**
- Multi-peer endorsement policy enforcement
- Byzantine fault tolerance
- Decentralized trust model (single Node.js process is a single point of trust)
- Real Fabric block hashes/numbers in the Ledger Explorer

---

## Environment Requirements

### Current (Working Demo)
```
Node.js v18+          (tested: v25.5.0)
npm                   (tested: v11.8.0)
MongoDB               (optional — defaults to instant JSON disk store if MONGODB_URI is not set)
Docker Desktop        (not required for current demo)
```

### Off-Chain Store Configuration (`offchain_db.js`)
- **Default (Instant Startup):** Uses `server/data/offchain_prescriptions.json` directly when `MONGODB_URI` is unset and `USE_MEMORY_MONGO` is not `'true'`.
- **External MongoDB:** Set `MONGODB_URI=mongodb://localhost:27017/medtrust` to connect to a running MongoDB server.
- **Embedded Memory MongoDB:** Set `USE_MEMORY_MONGO=true` to spin up `mongodb-memory-server` (synced with disk backup).

---

## Hyperledger Fabric Integration Roadmap

> **Status: Blocked pending environment setup**

### Prerequisites to complete in WSL2 Ubuntu 22.04:
```bash
# 1. Install Go 1.21
wget https://go.dev/dl/go1.21.13.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.13.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc

# 2. Clone fabric-samples and bootstrap Fabric binaries
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.9 1.5.9

# 3. Start test-network with CouchDB
cd fabric-samples/test-network
./network.sh up createChannel -c medtrust-channel -s couchdb

# 4. Package and deploy Go chaincode
./network.sh deployCC -ccn medtrust -ccp /path/to/medtrust/chaincode \
  -ccl go -c medtrust-channel

# 5. Add fabric-gateway SDK to Node server
cd /path/to/medtrust/server
npm install @hyperledger/fabric-gateway @grpc/grpc-js
```

### After Fabric is running, replace ledger_db.js calls with:
- `submitTransaction('IssuePrescription', ...)` → write to chain
- `evaluateTransaction('GetPrescription', ...)` → read from chain
- `submitTransaction('AuthorizeAndDispense', ...)` → gateway contract invoke

The Go chaincode in `/chaincode/` implements all three contracts (including `crypto/ecdsa` P-256 ASN.1 signature verification in `prescription_layer.go`) and is ready for deployment once the above environment is configured.

---

## Data Flow: Prescription Issuance (Current vs. Target)

### Current (Simulated)
```
DoctorPortal → POST /api/prescriptions/issue
  → crypto_engine.js: generateSalt() + computePrescriptionHash() + signECDSA()
  → ledger_db.js: onChainPrescriptions.set(id, record)        [disk-persisted Map]
  → offchain_db.js: await putOffChainPrescription(...)        [MongoDB or JSON disk store]
  → ledger_db.js: immutableBlocks.push(newBlock)               [disk-persisted array]
  → Response: { prescriptionId, txId, blockHeight, saltedHash, qrPayload }
```

### Target (Fabric)
```
DoctorPortal → POST /api/prescriptions/issue
  → crypto_engine.js: generateSalt() + computePrescriptionHash() + signECDSA()
  → fabric_gateway.js: contract.submitTransaction('IssuePrescription', args)
      → Fabric network: Org1Peer0 + Org2Peer0 endorse
      → Orderer: Raft consensus, block committed to CouchDB world-state
      → All peers receive block event
  → offchain_db.js: await putOffChainPrescription(...)        [MongoDB or JSON disk store]
  → Response: { prescriptionId, txId (real Fabric txId), blockHeight (real Fabric height) }
```
