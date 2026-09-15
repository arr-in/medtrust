# MedTrust: A Unified Blockchain Framework for Dual-Layer Verification of Prescription Authenticity and Drug Provenance in Pharmaceutical Dispensing

**Capstone Project — Review 2 & 3**  
*Department of Computer Engineering, Mukesh Patel School of Technology Management & Engineering (NMIMS), Indore*  
**Authors:** Abhishek Soni, Arin Jain, Neelansh Dosi  

---

## 1. Problem Statement: The Dual-Layer Verification Gap
A pharmaceutical dispensing event depends on two independent claims being true simultaneously:
1. **Prescription Authenticity:** The prescription authorizing the medication is authentic, signed by an authorized physician, active, and not previously fulfilled or expired.
2. **Drug Provenance & Physical Custody:** The physical drug package presented is authentic, within its shelf-life, not subject to a regulatory recall, and currently in the custody of the dispensing pharmacy according to an unbroken chain-of-custody record.

In existing healthcare distribution networks (including India's CDSCO / state drug distribution chain), these checks operate in disconnected silos. Forged prescriptions can be filled with genuine medications, and genuine prescriptions can be filled with counterfeit drugs.

**MedTrust** solves this by unifying both verification tracks into a single, permissioned Hyperledger Fabric blockchain architecture coordinated by an **Atomic Gateway Contract**.

---

## 2. System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │           MedTrust Architecture         │
                               └─────────────────────────────────────────┘

    ┌─────────────────┐        ┌──────────────────┐        ┌───────────────────┐
    │  Doctor Portal  │        │   Manufacturer   │        │    Distributor    │
    │  (ECDSA Sign)   │        │ (Genesis Record) │        │ (Custody Transit) │
    └────────┬────────┘        └────────┬─────────┘        └─────────┬─────────┘
             │                          │                            │
             ▼                          ▼                            ▼
    ┌──────────────────┐       ┌─────────────────────────────────────────────────┐
    │     Module 1     │       │                    Module 2                     │
    │   Prescription   │       │             Drug Authenticity Layer             │
    │   Verification   │       │  (Batch Genesis, Serialized Custody, Expiry,    │
    │ (Salted SHA-256) │       │             CDSCO Regulatory Recalls)           │
    └────────┬─────────┘       └────────────────────────┬────────────────────────┘
             │                                          │
             └───────────────────┐  ┌───────────────────┘
                                 ▼  ▼
                     ┌───────────────────────────┐
                     │    Pharmacist Terminal    │
                     │   (Dual QR/Barcode POS)   │
                     └─────────────┬─────────────┘
                                   │
                                   ▼
                     ┌───────────────────────────┐
                     │  Atomic Gateway Contract  │
                     │   Concurrent Evaluation   │
                     │    Single Atomic Commit   │
                     └─────────────┬─────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
          [ VALID DISPENSE ]             [ SECURITY REJECT ]
        Rx   -> Fulfilled               State Unchanged
        Drug -> Dispensed               Flagged to DRA Incident Feed
```

---

## 3. Technology Stack

| Layer | Technology | Specification / Justification |
| :--- | :--- | :--- |
| **Blockchain Platform** | Hyperledger Fabric (v2.5) | Permissioned consortium model for licensed stakeholders; gas-free deterministic execution. |
| **Smart Contracts** | Go (Chaincode) | Native Fabric Contract API (`fabric-contract-api-go`) providing strong type safety and low latency. |
| **State Database** | CouchDB | Document-oriented world state for rapid key-value and rich JSON querying. |
| **Off-Chain Audit Store**| MongoDB-compatible store | Secure off-chain storage for human-readable prescription info; zero patient PII on-chain. |
| **Cryptographic Engine** | ECDSA (`secp256r1`) + SHA-256 | Digital signatures and salted prescription hashes adhering to India's DPDP Act (2023) and GDPR. |
| **Gateway & Backend** | Node.js / Express | Verification gateway, REST API, and X.509 certificate authority abstraction. |
| **Frontend UI** | React 18 + Vite | Minimalist, dark-slate healthcare interface with responsive dual-scanner terminal and live telemetry. |

---

## 4. Cryptographic Model & DPDP Act Compliance
To eliminate patient re-identification risks and comply with India's **Digital Personal Data Protection (DPDP) Act 2023**:
- No Patient Personally Identifiable Information (PII) is committed on-chain.
- The prescription metadata is combined with a 128-bit cryptographic salt:
  $$\text{PrescriptionHash} = \text{SHA256}(\text{PatientID} \parallel \text{DoctorLicense} \parallel \text{DrugName} \parallel \text{Dosage} \parallel \text{Salt})$$
- The prescribing doctor digitally signs this 256-bit hash using their private ECDSA key (`secp256r1`).
- Only the 256-bit hash, doctor public key / certificate ID, validity timeframe, and lifecycle state (`Active`, `Fulfilled`, `Expired`) reside on-chain.

---

## 5. Six Consortium Stakeholder Roles

1. **Doctor Portal (`/doctor`):** Prescribe medications, calculate salted hash, sign with ECDSA key, generate patient QR pass.
2. **Patient Pass (`/patient`):** Privacy-preserving mobile wallet pass encoding the prescription identifier and hash for point-of-sale scanning.
3. **Manufacturer Hub (`/manufacturer`):** Mint genesis batch records (Plant location, batch serial, NDC barcode, manufacturing timestamp, shelf-life).
4. **Distributor Terminal (`/distributor`):** Log multi-hop custody transitions (Manufacturer → Regional Hub → Local Wholesaler → Pharmacy) with digital signatures and geographic check-ins.
5. **Point-of-Sale (POS) Terminal (`/pos`):** Pharmacist dual scanner evaluating Module 1 & Module 2 concurrently. Authorizes atomic dispense or blocks transaction.
6. **DRA / CDSCO Command Center (`/dra`):** Apex regulatory auditor node. Monitor live fraud attempts, inspect block heights, and broadcast instant drug recalls across all consortium peers.

---

## 6. Capstone Evaluation & Fraud Vector Simulation
The built-in benchmark suite (`/benchmark`) tests 6 critical real-world dispensing flows:

| Scenario | Attack Vector / Flow | Expected Verdict | Security Action |
| :--- | :--- | :--- | :--- |
| **Scenario A** | Clean Legitimate Dispense | `AUTHORIZED` | Prescription marked `Fulfilled`, Drug marked `Dispensed` atomically. |
| **Scenario B** | Replay / Double-Spend Fraud | `BLOCKED` | Prescription already `Fulfilled`; blocked to prevent multiple fills. |
| **Scenario C** | Counterfeit / Bogus Drug Batch | `BLOCKED` | Batch serial not found in ledger genesis state. |
| **Scenario D** | Broken Supply Chain Custody | `BLOCKED` | Drug physical custody does not match dispensing pharmacy node. |
| **Scenario E** | Regulatory Recall Enforcement | `BLOCKED` | CDSCO purity/recall flag blocks dispensing instantaneously. |
| **Scenario F** | Expired Prescription | `BLOCKED` | Dispensing attempt after valid duration timestamp. |

---

## 7. Project Directory Structure

```
medtrust/
├── chaincode/                     # Hyperledger Fabric Go Chaincodes
│   ├── go.mod                     # Go module definition
│   ├── main.go                    # Chaincode entry point & contract registration
│   ├── prescription_layer.go      # Module 1: Hash, sign, binary state
│   ├── drug_provenance_layer.go   # Module 2: Custody, expiry, recall
│   └── gateway_contract.go        # Atomic Gateway: Concurrent check & single commit
├── server/                        # Node.js Express Blockchain Engine
│   ├── package.json
│   ├── server.js                  # Main server entry & route mounting
│   ├── crypto_engine.js           # ECDSA secp256r1 & salted SHA-256
│   ├── ledger_db.js               # CouchDB state store & immutable block chain
│   ├── seed_data.js               # Realistic Indian pharma ecosystem seeds
│   ├── test_crypto.js             # Engine verification script
│   └── routes/
│       ├── prescription.routes.js
│       ├── drug.routes.js
│       ├── gateway.routes.js
│       ├── dra.routes.js
│       └── benchmark.routes.js
├── client/                        # React + Vite Minimalist Frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css                # Custom minimalist design system
│       ├── index.css
│       ├── services/api.js        # REST API connectors
│       └── components/
│           ├── Header.jsx
│           ├── PharmacistPOS.jsx
│           ├── DoctorPortal.jsx
│           ├── PatientPass.jsx
│           ├── ManufacturerPortal.jsx
│           ├── DistributorPortal.jsx
│           ├── DRAPanel.jsx
│           ├── BenchmarkSuite.jsx
│           └── LedgerExplorer.jsx
└── README.md
```

---

## 8. Running the Application Locally

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Step 1: Start Backend Blockchain Engine
```bash
cd server
npm install
npm start
```
The server will start on port `5001` and seed the consortium identities (CDSCO, Cipla, Sun Pharma, Blue Dart, Apollo Pharmacy).

### Step 2: Start Frontend UI
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 9. Academic Reference & Citation
If referencing this project for the capstone review:
> Abhishek Soni, Arin Jain, Neelansh Dosi. *"MedTrust: A Unified Blockchain Framework for Dual-Layer Verification of Prescription Authenticity and Drug Provenance in Pharmaceutical Dispensing"*, Capstone Project Review 2 Report, B.Tech Computer Engineering, NMIMS Indore, 2026.
