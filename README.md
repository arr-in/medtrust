# MedTrust: A Unified Blockchain Framework for Dual-Layer Verification of Prescription Authenticity and Drug Provenance in Pharmaceutical Dispensing

**Capstone Project — Review 2 & 3**  
*Department of Computer Engineering, Mukesh Patel School of Technology Management & Engineering (NMIMS), Indore*  
**Authors:** Abhishek Soni, Arin Jain, Neelansh Dosi  

---

## 1. Problem Statement: The Dual-Layer Verification Gap
A pharmaceutical dispensing event depends on two independent claims being true simultaneously:
1. **Prescription Authenticity (Module 1):** The prescription authorizing the medication is authentic, cryptographically signed by a licensed physician (`secp256r1` ECDSA), active, and neither previously fulfilled nor expired.
2. **Drug Provenance & Physical Custody (Module 2):** The physical drug package presented is registered at genesis, matches the prescribed medication, is within its shelf-life, has no active CDSCO/DRA recall, and is currently in the custody of the dispensing pharmacy via an unbroken chain-of-custody record.

In existing healthcare distribution networks, prescription monitoring and supply-chain track-and-trace operate in disconnected silos. Forged or replayed prescriptions can be filled with genuine medications, and genuine prescriptions can be filled with counterfeit, diverted, or recalled drugs.

**MedTrust** solves this by unifying both verification tracks behind a single **Atomic Gateway Contract**. Neither state updates unless all **9 cryptographic and supply-chain conditions** across both layers pass simultaneously. *(Note: The backend runs a disk-persistent permissioned ledger engine with CouchDB-style world state and an off-chain clinical store; Go smart contracts in `chaincode/` implement the native Hyperledger Fabric Contract API).*

---

## 2. System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │           MedTrust Architecture         │
                               └─────────────────────────────────────────┘

    ┌─────────────────┐        ┌──────────────────┐        ┌───────────────────┐
    │      Doctor     │        │   Manufacturer   │        │    Distributor    │
    │  (ECDSA Sign)   │        │ (Genesis Record) │        │ (Custody Transit) │
    └────────┬────────┘        └────────┬─────────┘        └─────────┬─────────┘
             │                          │                            │
             ▼                          ▼                            ▼
    ┌──────────────────┐       ┌─────────────────────────────────────────────────┐
    │     Module 1     │       │                    Module 2                     │
    │   Prescription   │       │             Drug Authenticity Layer             │
    │   Verification   │       │  (Batch Genesis, Multi-Hop Custody, Expiry,     │
    │ (Salted SHA-256) │       │     Drug Match & CDSCO Regulatory Recalls)      │
    └────────┬─────────┘       └────────────────────────┬────────────────────────┘
             │                                          │
             └───────────────────┐  ┌───────────────────┘
                                 ▼  ▼
                     ┌───────────────────────────┐
                     │      Pharmacist POS       │
                     │  (3-Step Dual QR/Barcode) │
                     └─────────────┬─────────────┘
                                   │
                                   ▼
                     ┌───────────────────────────┐
                     │  Atomic Gateway Contract  │
                     │ 9 Concurrent Layer Checks │
                     │    Single Atomic Commit   │
                     └─────────────┬─────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
          [ APPROVED DISPENSE ]           [ BLOCKED & REPORTED ]
        Rx   -> Fulfilled               State Unchanged
        Drug -> Dispensed               Logged to Regulator (DRA) Feed
```

---

## 3. Technology Stack

| Layer | Technology | Specification / Justification |
| :--- | :--- | :--- |
| **Blockchain Engine** | Hyperledger Fabric Compatible | Permissioned ledger engine with SHA-256 hash-linked blocks (`prevHash → blockHash`) and persistent disk state. |
| **Smart Contracts** | Go (`chaincode/`) | Native Hyperledger Fabric Contract API (`fabric-contract-api-go`) with real `crypto/ecdsa` P-256 verification. |
| **World State Store** | Persistent Key-Value Store | CouchDB-style key-value state persistence (`server/data/ledger_state.json`) with idempotent consortium seeding. |
| **Off-Chain PII Store** | MongoDB / JSON Disk Store | Stores patient clinical details off-chain (`server/offchain_db.js`); zero patient PII is written on-chain. |
| **Cryptographic Engine** | ECDSA (`secp256r1`) + SHA-256 | ASN.1 DER digital signatures and 128-bit salted SHA-256 commitments compliant with India's DPDP Act 2023. |
| **Gateway & Backend** | Node.js / Express | REST API, 9-check atomic gateway coordinator, persistent stakeholder key store, and live benchmark runner. |
| **Frontend UI** | React 19 + Vite | Calm clinical design system (Light & Dark themes), smooth CSS transitions, webcam QR scanner, and Recharts telemetry. |

---

## 4. Cryptographic Model & DPDP Act 2023 Compliance
To eliminate patient re-identification risks and comply with India's **Digital Personal Data Protection (DPDP) Act 2023**:
- **Zero On-Chain PII:** Patient names, ages, and clinical notes never touch the blockchain ledger.
- **Salted SHA-256 Commitment:** Prescription metadata is combined with a unique 128-bit random salt:
  $$\text{PrescriptionHash} = \text{SHA256}(\text{PatientID} \parallel \text{DoctorLicense} \parallel \text{DrugName} \parallel \text{Dosage} \parallel \text{Salt})$$
- **ECDSA P-256 Signature:** The prescribing physician signs `PrescriptionHash` using their persistent `secp256r1` (`prime256v1`) private key.
- **On-Chain Record:** Only `prescriptionId`, `saltedHash`, `doctorPublicKeyPEM`, `doctorEcdsaSignature`, `drugName`, `dosage`, `expiryTimestamp`, and `state` (`Active`, `Fulfilled`, `Expired`) reside on-chain.

---

## 5. Role-Based Application Views

The frontend provides 8 focused views with guided next-step buttons, plain-language error explanations, truncated 8-character hash pills with one-click copy, and collapsible `<details>` sections for deep cryptographic inspection:

1. **Pharmacist POS (`Pharmacist POS`):** 3-step point-of-sale workflow (**1. Prescription → 2. Drug Batch → 3. Verify & Dispense**), integrated webcam QR/barcode scanner, quick demo scenario presets, plain-language approval/rejection banners, and collapsible 9-check verification matrix.
2. **Doctor (`Doctor`):** Streamlined prescription form with inline validation, automatic 128-bit salt generation, `secp256r1` ECDSA signing, instant Patient QR Pass preview, and off-chain/on-chain joined prescription table.
3. **Patient Pass (`Patient Pass`):** Digital prescription wallet pass displaying the scannable QR code, medication details, 8-character commitment hash, and one-click jump to Pharmacist POS.
4. **Manufacturer (`Manufacturer`):** Register new drug batches at genesis (`BATCH_GENESIS_REGISTRATION`) with NDC barcode and shelf-life tracking, plus live batch inventory table.
5. **Distributor (`Distributor`):** Sign and record multi-hop custody transfers (`PLANT-GENESIS → Manufacturer → Distributor → Pharmacy`) with numbered hop timelines and verifiable custody signatures.
6. **Regulator (`Regulator (DRA)`):** CDSCO / Drug Regulatory Authority dashboard displaying network KPIs, one-click batch recall broadcasting (`DRA_BATCH_RECALL_BROADCAST`), and a real-time plain-language security alerts feed.
7. **Ledger (`Ledger`):** Interactive blockchain explorer with block activity chart, `prevHash → blockHash` chain links, and click-to-expand JSON transaction payloads.
8. **Benchmarks (`Benchmarks`):** Live empirical evaluation runner executing 150+ iterations across all 6 legitimate and fraud vectors with latency (Avg vs. P95) and cryptographic overhead charts.

---

## 6. Atomic Gateway Verification Matrix & Fraud Scenarios

Every dispense request evaluates **9 conditions** concurrently (4 on Module 1 + 5 on Module 2):
- **Module 1 (Prescription):** `RxExists`, `DoctorSigValid` (ECDSA P-256), `StateIsActive` (replay protection), `RxNotExpired`.
- **Module 2 (Drug Batch):** `BatchExists` (counterfeit check), `NotRecalled` (CDSCO recall check), `BatchNotExpired`, `CustodyAtCurrentPharmacy` (anti-diversion check), `BatchMatchesRxDrug` (medication match check).

| Scenario | Attack Vector / Flow | Expected Verdict | Breach Code | Security Action |
| :--- | :--- | :--- | :--- | :--- |
| **Scenario A** | Clean Legitimate Dispense | `AUTHORIZED` | `NONE` | Rx marked `Fulfilled` & Batch marked `Dispensed` in one atomic block. |
| **Scenario B** | Replay / Double-Spend Fraud | `BLOCKED` | `REPLAY_FRAUD_DETECTED` | Prescription already `Fulfilled`; blocks duplicate fill and logs incident. |
| **Scenario C** | Counterfeit / Unregistered Batch | `BLOCKED` | `COUNTERFEIT_BATCH_DETECTED` | Batch serial missing from ledger genesis state. |
| **Scenario D** | Broken Supply Chain Custody | `BLOCKED` | `BROKEN_CUSTODY_CHAIN` | Batch is not in the dispensing pharmacy's custody. |
| **Scenario E** | Regulatory Recall Enforcement | `BLOCKED` | `RECALLED_DRUG_BATCH` | Active CDSCO/DRA recall blocks dispensing immediately. |
| **Scenario F** | Expired Prescription | `BLOCKED` | `EXPIRED_PRESCRIPTION` | Prescription validity timestamp has elapsed. |
| **Scenario G** | Medication Mismatch | `BLOCKED` | `DRUG_MISMATCH_DETECTED` | Physical drug batch medication does not match prescribed drug. |

---

## 7. Project Directory Structure

```
medtrust-main/
├── chaincode/                     # Hyperledger Fabric Go Smart Contracts
│   ├── go.mod                     # Go module definition
│   ├── main.go                    # Chaincode entry point & contract registration
│   ├── prescription_layer.go      # Module 1: Salted hash, ECDSA P-256 verify, state lifecycle
│   ├── drug_provenance_layer.go   # Module 2: Genesis, multi-hop custody, expiry, recall
│   └── gateway_contract.go        # Atomic Gateway: Concurrent evaluation & atomic commit
├── server/                        # Node.js Express Blockchain & Gateway Engine
│   ├── package.json
│   ├── server.js                  # Server entry point, DB init & route mounting
│   ├── crypto_engine.js           # ECDSA secp256r1 signing/verification & salted SHA-256
│   ├── ledger_db.js               # World state store & SHA-256 hash-linked block chain
│   ├── ledger_store.js            # Disk persistence for ledger state (server/data/)
│   ├── offchain_db.js             # MongoDB / JSON disk store for off-chain patient PII
│   ├── benchmark_store.js         # Persistent benchmark telemetry store
│   ├── seed_data.js               # Idempotent consortium seed data & persistent ECDSA keys
│   ├── test_scenarios.js          # Automated unit & integration test suite (26 assertions)
│   ├── test_crypto.js             # Cryptographic & atomic state verification script
│   ├── tests/
│   │   └── run_tests.js           # 6 fraud scenario verification table runner
│   └── routes/
│       ├── prescription.routes.js
│       ├── drug.routes.js
│       ├── gateway.routes.js
│       ├── dra.routes.js
│       └── benchmark.routes.js
├── client/                        # React 19 + Vite Frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                # Root layout, auto-sync polling, offline banner & theme state
│       ├── index.css              # Design tokens (Light/Dark palettes, spacing, motion curves)
│       ├── App.css                # Component styles, responsive grids & smooth transitions
│       ├── services/api.js        # REST API client
│       └── components/
│           ├── Header.jsx
│           ├── PharmacistPOS.jsx
│           ├── DoctorPortal.jsx
│           ├── PatientPass.jsx
│           ├── ManufacturerPortal.jsx
│           ├── DistributorPortal.jsx
│           ├── DRAPanel.jsx
│           ├── BenchmarkSuite.jsx
│           ├── LedgerExplorer.jsx
│           └── WebcamScannerModal.jsx
├── demo/                          # Live Presentation & Defense Kit
│   ├── DEMO_SCRIPT.md             # 7–10 minute click-by-click live demo script
│   ├── PRE_DEMO_CHECKLIST.md      # Pre-presentation checklist & fallback plans
│   ├── DEMO_QA.md                 # 15 technical defense Q&As
│   └── reset_demo.js              # One-command demo state reset script
└── README.md
```

---

## 8. Running the Application Locally

### Prerequisites
- **Node.js** `v18+` and **npm** `v9+`

### Step 1: Start the Backend Blockchain Engine (Port `5001`)
```bash
cd server
npm install
npm start
```
The server initializes in under 1 second on `http://localhost:5001` and seeds the consortium ledger (3 blocks `#0..#2`, 3 prescriptions, 4 drug batches, and persistent ECDSA keys).

#### Optional Backend Environment Variables
- `PORT`: Backend server port (defaults to `5001`).
- `MONGODB_URI`: MongoDB connection string for the off-chain prescription store (e.g., `mongodb://localhost:27017/medtrust`). When unset, the server uses the instant JSON disk store (`server/data/offchain_prescriptions.json`).
- `USE_MEMORY_MONGO`: Set `USE_MEMORY_MONGO=true` to use an embedded `mongodb-memory-server` instance when `MONGODB_URI` is not set.

### Step 2: Start the Frontend UI (Port `3000`)
In a second terminal:
```bash
cd client
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### Step 3: Run Automated Tests & Reset Demo State
```bash
cd server
npm run demo:reset   # Resets ledger & off-chain store to clean 3-block baseline
npm test             # Runs 26 unit/scenario assertions + 6 fraud matrix tests + crypto tests
```

To lint and build the frontend production bundle:
```bash
cd client
npm run lint         # Runs oxlint (0 warnings, 0 errors)
npm run build        # Builds production bundle to client/dist/
```

---

## 9. Academic Reference & Citation
If referencing this project for the capstone review:
> Abhishek Soni, Arin Jain, Neelansh Dosi. *"MedTrust: A Unified Blockchain Framework for Dual-Layer Verification of Prescription Authenticity and Drug Provenance in Pharmaceutical Dispensing"*, Capstone Project Review 2 & 3 Report, B.Tech Computer Engineering, NMIMS Indore, 2026.
