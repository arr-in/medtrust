# MedTrust Capstone Defense — 15 Hardest Q&A + Real Limitations

> Full Q&A and Limitations reference (also available in [`demo/DEMO_QA.md`](demo/DEMO_QA.md)).

---

## Part 1: The 15 Hardest Viva / Review Questions

### Q1. Why do you need a permissioned blockchain here instead of a centralized PostgreSQL or MongoDB database?
**Answer:**  
In India's pharmaceutical ecosystem, the stakeholders—manufacturers (Cipla, Sun Pharma), logistics providers (Blue Dart), competing pharmacy chains (Apollo, MedPlus), clinics, and the regulator (CDSCO)—belong to mutually untrusted organizations with competing commercial incentives. A single company hosting a centralized SQL database can unilaterally alter custody records or backdate batch registrations. A permissioned consortium ledger gives each stakeholder a shared, append-only state machine where custody transfers (`CUSTODY_TRANSFER_RECORDED`), prescriptions (`PRESCRIPTION_ISSUED`), and regulatory recalls (`DRA_BATCH_RECALL_BROADCAST`) are cryptographically linked by SHA-256 block hashes and signed with stakeholder keys, while CDSCO acts as the Root Certificate Authority.

---

### Q2. Be completely honest: is the backend running a live multi-node Hyperledger Fabric Docker network right now, or is it simulated?
**Answer:**  
We wrote the full Hyperledger Fabric Go smart contracts in [`chaincode/`](chaincode/) (`prescription_layer.go`, `drug_provenance_layer.go`, `gateway_contract.go`) using `fabric-contract-api-go` with real `crypto/ecdsa` and `crypto/sha256` verification. However, running a multi-container Fabric Docker swarm (orderer + CAs + CouchDB peers) on a single laptop is heavy for a rapid interactive POS demo. Therefore, our Node.js backend (`server/ledger_db.js` and `server/crypto_engine.js`) implements a **Fabric-semantics-compatible state engine** backed by persistent disk storage (`server/data/ledger_state.json`) that executes the **exact same** real `secp256r1` ECDSA cryptography, salted SHA-256 hashing, world-state key-value model, and atomic dual-layer commit rules as our Go chaincode.

---

### Q3. Did you compile and deploy the Go chaincode in `chaincode/`?
**Answer:**  
The Go chaincode (`chaincode/prescription_layer.go`, `drug_provenance_layer.go`, `gateway_contract.go`) is written against `github.com/hyperledger/fabric-contract-api-go v1.2.1` and implements the complete `VerifyPrescriptionConditions`, `VerifyDrugConditions`, and `VerifyAndDispense` atomic contract logic, including ASN.1 DER ECDSA signature verification over the SHA-256 digest of the salted hash. In our local Windows demo environment, the Go compiler/Fabric peer binaries are not installed, so the live UI connects to the Node.js gateway engine while the Go chaincode serves as our Fabric peer deployment artifact.

---

### Q4. What exact data is stored ON-CHAIN versus OFF-CHAIN, and why?
**Answer:**  
- **On-Chain (`server/data/ledger_state.json` / `MedTrustLedgerDB.onChainPrescriptions` & `onChainBatches`):**
  - *Module 1:* `prescriptionId`, 256-bit `saltedHash`, `doctorId`, `doctorName`, `doctorLicense`, `doctorPublicKeyPEM`, `doctorEcdsaSignature`, `drugName`, `dosage`, `issueTimestamp`, `expiryTimestamp`, and lifecycle `state` (`Active` / `Fulfilled` / `Expired`). **Zero patient PII (no patient name, no national ID, no diagnosis) is stored on-chain.**
  - *Module 2:* `batchId`, `drugName`, `dosage`, `ndc`, `manufacturerId`, `plantLocation`, `mfgTimestamp`, `expiryTimestamp`, `currentCustodianId`, `custodyHistory[]`, `isRecalled`, and `isDispensed`.
- **Off-Chain (`server/offchain_db.js` → MongoDB or `server/data/offchain_prescriptions.json`):**
  - Stores `patientId`, `patientName`, `patientAge`, `diagnosis`, `instructions`, `clinic`, and the 128-bit `salt`.
- **Why:** India's **Digital Personal Data Protection (DPDP) Act 2023** and GDPR grant patients the right to erasure and strict confidentiality of health records. Because an immutable blockchain cannot delete blocks, putting plaintext patient names or diagnoses on-chain would be illegal.

---

### Q5. How does the salted SHA-256 hash protect privacy? Why is a salt necessary?
**Answer:**  
In `server/crypto_engine.js`, we compute:
$$\text{saltedHash} = \text{SHA256}(\text{patientId} \parallel \text{"|"} \parallel \text{doctorLicense} \parallel \text{"|"} \parallel \text{drugName} \parallel \text{"|"} \parallel \text{dosage} \parallel \text{"|"} \parallel \text{salt})$$
where `salt` is a CSPRNG-generated 128-bit (16-byte / 32-hex-char) random value (`crypto.randomBytes(16)`).  
Without the random salt, an attacker who knows a doctor's license (`MCI-2018-99412`) and common drugs (`Azithromycin IP|500mg`) could run a **dictionary / rainbow-table brute-force attack** over predictable `patientId` formats (`PAT-IND-2026-XXXX`) to reverse the SHA-256 hash and identify which patient was prescribed which medication. The 128-bit random salt makes brute-forcing computationally infeasible ($2^{128}$ search space) even if two prescriptions have identical clinical fields.

---

### Q6. Walk me through how ECDSA signing and verification actually work in your code.
**Answer:**  
In `server/crypto_engine.js`:
1. **Key Generation:** Each stakeholder has an asymmetric `prime256v1` (`secp256r1` / NIST P-256) keypair generated via Node's native `crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' })` and persisted in PKCS#8 / SPKI PEM format (`server/data/stakeholders_keys.json`).
2. **Signing (`signECDSA`):** When a doctor issues a prescription, `crypto.createSign('SHA256')` hashes the `saltedHash` string and signs it with the doctor's private key, outputting a hex-encoded ASN.1 DER signature (`doctorEcdsaSignature`).
3. **Verification (`verifyECDSA`):** At the POS gateway (`evaluateDualLayerConditions`), `crypto.createVerify('SHA256')` verifies `doctorEcdsaSignature` against `saltedHash` using the doctor's `doctorPublicKeyPEM` stored on the prescription record. This is real elliptic-curve cryptography, not a mock boolean flag.

---

### Q7. What makes the Gateway Contract "atomic"? What happens if Module 1 passes but Module 2 fails?
**Answer:**  
In `server/routes/gateway.routes.js` (`POST /api/gateway/dispense`) and `chaincode/gateway_contract.go` (`VerifyAndDispense`):
1. The gateway first runs a **read-only pre-validation phase** (`evaluateDualLayerConditions`) across both Module 1 (prescription exists, `state === 'Active'`, not expired, valid doctor ECDSA signature) and Module 2 (batch exists, not dispensed, not recalled, not expired, `currentCustodianId === pharmacyId`, and `rx.drugName === batch.drugName`).
2. **Only if all 9 conditions pass** does it call `db.atomicDispenseCommit()`, which mutates `rx.state = 'Fulfilled'` and `batch.isDispensed = true` together and writes a single `ATOMIC_GATEWAY_DISPENSE` block.
3. If **any** condition in Module 1 or Module 2 fails, **neither** state is mutated; instead, an immutable security incident (`DISPENSE_BLOCKED`) is logged to the DRA feed and HTTP `403` is returned.

---

### Q8. How did you prevent the prescription table from showing `"Restricted"` or `"Redacted"`?
**Answer:**  
On-chain records intentionally exclude `patientName` and clinical notes. When the Doctor Portal or Patient Pass queries `GET /api/prescriptions`, the gateway performs an asynchronous join (`await Promise.all(...)` over `db.getOffChainPrescription(rx.prescriptionId)`) with the off-chain clinical store (`server/offchain_db.js`) to hydrate `patientName`, `diagnosis`, `instructions`, and `salt` for authorized clinical views while keeping the on-chain block payload strictly PII-free.

---

### Q9. What happens if a pharmacist tries to dispense Paracetamol against a valid Azithromycin prescription?
**Answer:**  
Our gateway enforces a cross-layer medication match check in `evaluateDualLayerConditions` (`server/routes/gateway.routes.js` lines 104–109): it compares `rx.drugName` against `batch.drugName` (case-insensitive). If they differ, the gateway blocks the transaction with `breachCode: 'DRUG_MISMATCH_DETECTED'` and logs a high-severity incident to the DRA Command Center.

---

### Q10. A drug batch has thousands of individual strips/boxes in the real world, not just one box. Why does `batch.isDispensed` mark the whole batch as dispensed?
**Answer:**  
That is a deliberate simplification in our prototype: each `batchId` in our seed data models a **serialized unit-level package (secondary/tertiary pack serial)** rather than a 10,000-unit master lot. In a production GS1 / DSCSA deployment, the identifier is a **SGTIN (Serialized Global Trade Item Number)** combining the GTIN/Lot ID with a unique box serial number (`BATCH-CIPLA-AZI-2026-01#BOX-00412`), so marking one serialized box `isDispensed = true` only consumes that specific physical box while the parent batch lot remains active.

---

### Q11. How are the custody transfers secured? Does the distributor or manufacturer cryptographically sign each custody hop?
**Answer:**  
In our current prototype (`POST /api/drugs/transfer-custody` in `server/routes/drug.routes.js`), the gateway enforces state-level custody ownership (`batch.currentCustodianId === senderId`) and appends a transition record with a deterministic transition tag (`CUSTODY_SIG_<sender>_<timestamp>`) and commits a `CUSTODY_TRANSFER_RECORDED` block. Unlike Module 1 (which performs full ECDSA `secp256r1` signing and verification on every prescription), Module 2's custody hop signatures are currently symbolic strings rather than verified ECDSA signatures—adding full ECDSA sign/verify per custody hop using `STAKEHOLDERS[sender].keys` is one of our documented next steps.

---

### Q12. How were the benchmark numbers in `/benchmark` and the paper produced? Why is the latency under 1 ms?
**Answer:**  
When you click **Execute Benchmark Run** (`POST /api/benchmark/run-all` in `server/routes/benchmark.routes.js`), the server uses `process.hrtime.bigint()` (nanosecond resolution) to time `N` live iterations across each of the 6 scenarios. Every iteration performs a real world-state lookup and a real OpenSSL/Node `crypto.createVerify('SHA256')` ECDSA `secp256r1` signature verification.  
Because the world state is held in an in-memory `Map` synced to local disk (without multi-node network round-trips or Raft ordering delays), the measured latency (`~0.35–0.60 ms`, of which `~0.25–0.45 ms` is ECDSA verification) represents **pure gateway + cryptographic computation overhead**. In a distributed multi-org Hyperledger Fabric network over WAN, end-to-end commit latency would be ~100–500 ms due to endorsement and Raft ordering.

---

### Q13. What happens when the server restarts? Do ECDSA signatures break or do seed blocks duplicate?
**Answer:**  
Everything persists cleanly across restarts in `server/data/`:
1. Stakeholder ECDSA keypairs are generated once and saved to `server/data/stakeholders_keys.json` (`loadOrCreateStakeholderKeys()` in `server/seed_data.js`), so `doctorPublicKeyPEM` on existing prescriptions remains valid across restarts.
2. On-chain blocks, prescriptions, batches, and incidents persist in `server/data/ledger_state.json`.
3. Off-chain PII records persist in `server/data/offchain_prescriptions.json` (or MongoDB if `MONGODB_URI` is set).
4. `seedConsortiumData()` is idempotent—it checks `!db.getBatch(id)` and `!db.getPrescription(id)` before inserting or committing blocks, so restarting the server never inflates the block height.

---

### Q14. What if a rogue doctor issues fake prescriptions using their valid ECDSA key?
**Answer:**  
A valid ECDSA signature proves **origin and integrity** (that Dr. Sharma signed the prescription and it wasn't altered), not clinical appropriateness. However, because every `PRESCRIPTION_ISSUED` transaction permanently records `doctorId` and `doctorLicense` on the consortium ledger, the DRA / CDSCO auditor node can detect anomalous prescribing volume (e.g., pill-mill patterns) and revoke the doctor's X.509 certificate in the consortium MSP.

---

### Q15. How does the webcam scanner work, and what if a barcode/QR code is tampered with on the physical box?
**Answer:**  
The frontend uses `html5-qrcode` in `WebcamScannerModal.jsx` to decode QR codes and 1D/2D barcodes from the device camera stream (requesting 720p continuous/macro focus) and extracts the `prescriptionId` or `batchId`.  
If an attacker copies a valid barcode onto a counterfeit box (a **clone attack**), the first box to reach Apollo Pharmacy and get dispensed transitions that serialized ID to `isDispensed = true`. Any second cloned box with the same serial number is immediately rejected with `BATCH_ALREADY_DISPENSED`—or if scanned at a different pharmacy that never received custody on-chain, rejected with `BROKEN_CUSTODY_CHAIN`.

---

## Part 2: Honest Limitations & Future Work

1. **Single-Node Ledger Simulation vs. Multi-Org Fabric Deployment:**
   - *Current State:* The live backend runs a single-node persistent state engine in Node.js (`server/ledger_db.js`) while the Go chaincode in `chaincode/` is uncompiled locally.
   - *Future Work:* Deploy `chaincode/` onto a multi-org Hyperledger Fabric 2.5 test network with separate Docker peers for CDSCO, Manufacturers, Distributors, and Pharmacies using Raft consensus.
2. **Unit-Level Serialization vs. Lot-Level Quantities:**
   - *Current State:* Each `batchId` is treated as a single dispensable unit (`isDispensed: boolean`) and each prescription is fulfilled in a single dispense (`state: 'Fulfilled'`).
   - *Future Work:* Support hierarchical **Lot → Carton → Secondary Pack (SGTIN)** serialization and partial prescription fills (e.g., dispensing 10 tablets out of 30 authorized).
3. **Cryptographic Signatures on Supply-Chain Custody Hops:**
   - *Current State:* Module 1 uses real `secp256r1` ECDSA signatures (`signECDSA` / `verifyECDSA`), whereas Module 2 custody transfers (`POST /api/drugs/transfer-custody`) currently record a symbolic `signatureHex` string after verifying `currentCustodianId === senderId`.
   - *Future Work:* Require both sender and receiver ECDSA signatures (dual-signed handshake) on every custody transfer hop.
4. **Role-Based Authentication & X.509 Client Certificates:**
   - *Current State:* The React frontend allows switching freely between Doctor, Manufacturer, Distributor, Pharmacist, and DRA tabs without login so evaluators can inspect all 6 roles seamlessly in a single browser window.
   - *Future Work:* Enforce mutual TLS (mTLS) and Fabric CA X.509 client certificate authentication per route so only a licensed Doctor certificate can call `/api/prescriptions/issue` and only CDSCO can call `/api/dra/recall`.
