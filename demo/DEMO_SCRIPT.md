# MedTrust Capstone Live Demo Script (7–10 Minutes)

**Target Duration:** 8–9 minutes  
**Pre-Demo State:** Freshly reset via `cd server && npm run demo:reset` (Block Height: `#2`, 3 blocks total `#0..#2`, 3 Prescriptions, 4 Drug Batches, 0 Incidents).

---

## 0. Opening & Problem Statement (0:00 – 1:00)

**Screen:** Start on the **`Pharmacist POS`** tab (`http://localhost:3000`). Point to the header showing the **`Network Online`** status pill, role navigation tabs, and theme toggle.

**What to say:**
> "Good morning/afternoon. Our project, **MedTrust**, solves what we call the **Dual-Layer Verification Gap** in pharmaceutical dispensing.  
> Today, prescription monitoring systems and supply-chain track-and-trace systems operate in complete silos. A genuine doctor's prescription can be filled with a counterfeit or recalled drug box, and a genuine drug box can be dispensed against a forged or already-used prescription.  
> MedTrust unifies **Module 1 (Prescription Authenticity)** and **Module 2 (Physical Drug Provenance & Chain of Custody)** behind a single **Atomic Gateway Contract**. Neither state updates unless all cryptographic and custody conditions across both layers pass simultaneously."

---

## 1. Supply Chain Genesis — Manufacturer Portal (1:00 – 2:15)

**Action:**
1. Click the **`Manufacturer`** tab in the top navigation bar.
2. Point to the pre-filled form for **Cipla Ltd., Verna Industrial Estate, Goa (`MFG-CIPLA-GOA`)**:
   - **Drug Name:** `Azithromycin IP`
   - **Strength / Dosage:** `500mg`
   - **Batch Serial ID:** Set to `BATCH-CIPLA-DEMO-01` (or keep the pre-generated `BATCH-CIPLA-XXXX`).
   - *(Optional)* Expand **"Facility & Barcode Details (Optional)"** if asked about NDC barcode (`0378-0012-05`) or shelf life (`18` months).
3. Click **"Register Drug Batch"**.
4. Point to the green confirmation banner showing `Batch BATCH-CIPLA-DEMO-01 registered on ledger`, and check the **Registered Drug Batches** table on the right (`Custodian: MFG-CIPLA-GOA`, Status: `In Supply Chain`).
5. Click the guided next-step button **`"Next: Transfer Custody →"`** inside the success banner to jump directly to the **Distributor** tab.

**What to say:**
> "We start at the physical drug's origin. Here, Cipla's Goa facility registers a new batch of Azithromycin 500mg (`BATCH-CIPLA-DEMO-01`). Clicking **Register Drug Batch** writes a genesis block to the ledger and assigns initial custody to `MFG-CIPLA-GOA`. Notice the table on the right also holds our pre-seeded consortium batches, including `BATCH-CIPLA-AZI-2026-01` (already at Apollo Pharmacy), `BATCH-SUN-PCM-2026-99` (in transit with a distributor), and `BATCH-CIPLA-AMX-RECALLED`."

---

## 2. Multi-Hop Logistics — Distributor Portal (2:15 – 3:15)

**Action:**
1. On the **`Distributor`** tab, in **"1. Select Drug Batch"**, select `BATCH-CIPLA-DEMO-01 — Azithromycin IP (At: MFG-CIPLA-GOA)`.
2. In **"2. Destination Node"**, keep `Apollo Pharmacy Indore (PHARM-APOLLO-104)` selected.
3. Click **"Confirm Custody Transfer"**.
4. Point to the **Custody History** timeline on the right showing:
   - `1`: `PLANT-GENESIS → MFG-CIPLA-GOA` (`HOP-1-GENESIS`)
   - `2`: `MFG-CIPLA-GOA → PHARM-APOLLO-104` (`HOP-2-TRANSFER`)
   - *(Optional)* Click **"Technical details (signature & location)"** on a hop card to show the cryptographic signature.

**What to say:**
> "Next, the physical batch moves through the distribution corridor. When we confirm the custody handoff to Apollo Pharmacy Indore (`PHARM-APOLLO-104`), the ledger verifies that the sender actually possesses the batch before appending `HOP-2-TRANSFER`. If a grey-market diversion occurs and a batch shows up at a pharmacy that isn't the current on-chain custodian, the POS terminal will block it."

---

## 3. Privacy-Preserving E-Prescription — Doctor & Patient Pass (3:15 – 4:45)

**Action:**
1. Click the **`Doctor`** tab.
2. Show the clean 4-field form for **Dr. Ananya Sharma (`DOC-99412`, License `MCI-2018-99412`)**:
   - **Patient ID:** `PAT-IND-2026-7731`
   - **Patient Full Name:** `Kavita Deshmukh`
   - **Medication Name:** `Azithromycin IP`
   - **Strength / Dosage:** `500mg`
3. Click **"Sign & Issue Prescription"**.
4. Point to the **Latest Issued Pass** card on the right showing the QR code (`RX-2026-XXXX`). Expand **"Technical details (cryptographic commitment)"** if you want to show the 256-bit salted SHA-256 hash and 128-bit salt.
5. Point to the **Issued Prescriptions** table below showing that **Patient Name** (`Rohan Verma`, `Pooja Mehta`, `Sanjay Singhal`, `Kavita Deshmukh`) and **Medication** are joined from the off-chain store, while only the truncated 8-character hash pill (`a9c28f7b…` with one-click copy) is stored on-chain.
6. Click **`"View Patient Pass →"`** to jump to the **`Patient Pass`** tab. Select `RX-2026-001-ACTIVE — Rohan Verma (Active)` from the top-right selector, point out the QR pass, and click **`"Verify at Pharmacist POS →"`**.

**What to say:**
> "Now let's look at Module 1: Prescription Authenticity under India's **DPDP Act 2023**. Storing patient names or diagnoses on a blockchain violates health privacy laws. Instead, MedTrust generates a random 128-bit salt, computes `SHA-256(patientId | doctorLicense | drugName | dosage | salt)`, and signs that hash with Dr. Sharma's `secp256r1` ECDSA private key.  
> The patient receives this Digital Pass on their phone (`RX-2026-001-ACTIVE` for Rohan Verma, or the prescription we just issued for Kavita Deshmukh)."

---

## 4. Point-of-Sale 3-Step Verification & Attack Interception (4:45 – 7:00)

**Action:**
1. On the **`Pharmacist POS`** tab, point out the 3-step workflow (`1. Prescription`, `2. Drug Batch`, `3. Verify & Dispense`) and the **Quick Demo Scenarios** bar at the top.
2. **Camera Modal Demo (15 seconds):** Click the **`Scan Camera`** button inside Card 1 (`1. Prescription`) to show the centered modal overlay. (If a camera is active, show the live viewfinder; if not, click **"Use Demo Prescription (`RX-2026-001-ACTIVE`)"** or close the modal with `X`).
3. **Test Attack Presets First (before consuming `RX-2026-001-ACTIVE`):**
   - Click **`Already Used (Replay)`** (`RX-2026-002-REPLAY` + `BATCH-CIPLA-AZI-2026-01`) → Point out Step 3 turning red (`Checks Failed — Cannot Dispense: This prescription was already dispensed and cannot be reused.` with `Code: REPLAY_FRAUD_DETECTED`). Click **"Block & Report to Regulator"** to log the incident and show the red **Blocked — Dispensing Not Allowed** banner.
   - Click **`Counterfeit Batch`** (`RX-2026-001-ACTIVE` + `BATCH-FAKE-GREY-999`) → Shows *"This batch serial number is not registered on the ledger (suspected counterfeit)."* (`COUNTERFEIT_BATCH_DETECTED`). Click **"Block & Report to Regulator"**.
   - Click **`Wrong Custody`** (`RX-2026-001-ACTIVE` + `BATCH-SUN-PCM-2026-99`) → Shows *"This drug batch is not in this pharmacy's custody (currently held by DIST-ALLKEM-BHO)."* (`BROKEN_CUSTODY_CHAIN`). Click **"Block & Report to Regulator"**.
   - Click **`Recalled Batch`** (`RX-2026-001-ACTIVE` + `BATCH-CIPLA-AMX-RECALLED`) → Shows *"This drug batch has an active regulatory recall from CDSCO / DRA."* (`RECALLED_DRUG_BATCH`).
   - Click **`Expired Rx`** (`RX-2026-003-EXPIRED` + `BATCH-CIPLA-AZI-2026-01`) → Shows *"This prescription has passed its expiration date."* (`EXPIRED_PRESCRIPTION`).
4. **Valid Clean Dispense:**
   - Click **`Valid Dispense`** (`RX-2026-001-ACTIVE` + `BATCH-CIPLA-AZI-2026-01`), or select your newly created `RX-2026-XXXX` + `BATCH-CIPLA-DEMO-01`.
   - Point out Step 3 turning green (`All 9 Checks Passed`). Expand **"Technical details (9 verification checks & latency)"** to briefly show the 4 Module-1 checks and 5 Module-2 checks passing in `< 1 ms`.
   - Click **"Verify & Dispense Medication"**.
   - Point out the green **"Approved — Medication Dispensed"** result banner, confetti confirmation, and updated block number.
   - Click **"Block & Report to Regulator"** on the exact same pair a second time to prove it immediately flips to *"This prescription was already dispensed and cannot be reused"* (`REPLAY_FRAUD_DETECTED`)!

**What to say:**
> "At the Apollo Pharmacy POS counter, the pharmacist follows three simple steps: scan the prescription, scan the drug box, and dispense. Behind the scenes, the gateway evaluates 9 cryptographic and supply-chain checks in under 1 millisecond.  
> When an issue occurs—whether replay fraud, a counterfeit serial, broken custody, or a recalled batch—the pharmacist gets an immediate plain-language explanation and blocks the transaction with one click, reporting the attempt to the regulator.  
> When we run a valid pair (`RX-2026-001-ACTIVE` + `BATCH-CIPLA-AZI-2026-01`), both states update atomically in a single block."

---

## 5. Regulatory Recall & Audit Trail — Regulator (DRA) & Ledger (7:00 – 8:15)

**Action:**
1. Click the **`Regulator (DRA)`** tab (or click **`"View Alert in Regulator Panel →"`** from a blocked POS result).
2. Point to the 4 summary cards (**Prescriptions**, **Drug Batches**, **Security Alerts**, **Block Height**) and the **Security & Fraud Alerts** feed on the right showing the plain-language alerts we just triggered.
3. On the left card (**Recall a Drug Batch**), pick `BATCH-CIPLA-DEMO-01` (or `BATCH-CIPLA-AZI-2026-01`) from the **"Select Active Batch"** dropdown and click **"Issue Immediate Recall"**.
4. Click the **`Ledger`** tab.
5. Point to the **Block Activity** timeline chart, the 8-character truncated block hash pills (with copy buttons), and click on any block row (`Medication Dispensed (POS)`, `Regulatory Batch Recall`, `Prescription Issued`) to expand its full SHA-256 hashes and JSON transaction payload.

**What to say:**
> "In the Regulator panel, CDSCO inspectors see every blocked attempt in real time with plain-language descriptions and the technical breach code. They can also issue an immediate recall on any batch with one click.  
> In the **Ledger** tab, every block from Genesis (`#0`) to the latest block is linked by SHA-256 hashes, and clicking any row reveals the full cryptographic commitment and JSON state diff."

---

## 6. Empirical Evaluation — Benchmarks (8:15 – 9:00)

**Action:**
1. Click the **`Benchmarks`** tab.
2. Keep **Iterations per scenario** at `25` (150 total checks across 6 scenarios) and click **"Run Benchmark"**.
3. Point to:
   - **Detection Accuracy:** `100%` (6 / 6 Scenarios)
   - **Avg Verification Latency:** `~0.35 – 0.60 ms`
   - **Verification Latency (Avg vs P95 in ms)** and **Cryptographic Overhead (ms)** side-by-side bar charts.
   - **Scenario Breakdown** table below.

**What to say:**
> "Finally, our built-in Benchmark Suite runs 150 live iterations across all 6 legitimate and attack scenarios. Even with full `secp256r1` ECDSA signature verification and SHA-256 hashing on every check, average verification latency is under 1 millisecond with 100% detection accuracy—turning post-dispense audits into a real-time point-of-sale gate. Thank you—we're happy to take questions."
