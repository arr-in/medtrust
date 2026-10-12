# MedTrust Capstone Live Demo Script (7–10 Minutes)

**Target Duration:** 8–9 minutes  
**Pre-Demo State:** Freshly reset via `cd server && npm run demo:reset` (Block Height: `#2`, 3 blocks total `#0..#2`, 3 Prescriptions, 4 Drug Batches, 0 Incidents).

---

## 0. Opening & Problem Statement (0:00 – 1:00)

**Screen:** Start on the **Verification Gate (`⚡ Verification Gate`)** tab (`http://localhost:3000`). Point to the header showing `medtrust-channel` (green pulsing dot) and `ECDSA P-256`.

**What to say:**
> "Good morning/afternoon. Our project, **MedTrust**, solves what we call the **Dual-Layer Verification Gap** in pharmaceutical dispensing.  
> Today, prescription monitoring systems and supply-chain track-and-trace systems operate in complete silos. A genuine doctor's prescription can be filled with a counterfeit or recalled drug box, and a genuine drug box can be dispensed against a forged or already-used prescription.  
> MedTrust unifies **Module 1 (Prescription Authenticity)** and **Module 2 (Physical Drug Provenance & Chain of Custody)** behind a single **Atomic Gateway Contract**. Neither state updates unless all cryptographic and custody conditions across both layers pass simultaneously."

---

## 1. Supply Chain Genesis — Manufacturer Portal (1:00 – 2:15)

**Action:**
1. Click the **`🏭 Manufacturer`** tab in the top navigation bar.
2. Point to the pre-filled form for **Cipla Ltd., Verna Industrial Estate, Goa (`MFG-CIPLA-GOA`)**:
   - **Drug Name:** `Azithromycin IP`
   - **Strength / Dosage:** `500mg`
   - **NDC Barcode:** `0378-0012-05`
   - **Shelf Life:** `18` months
3. Set **Batch Serial ID** to `BATCH-CIPLA-DEMO-01` (or keep the pre-generated `BATCH-CIPLA-XXXX`).
4. Click **"Commit Batch Genesis to Blockchain"**.
5. Scroll down to the **Active Batches Registered on Consortium Ledger** table and point out `BATCH-CIPLA-DEMO-01` with Custodian `MFG-CIPLA-GOA (Manufacturer)` and Status `In Supply Chain`.

**What to say:**
> "We start at the physical drug's origin. Here, Cipla's Goa facility registers a new batch of Azithromycin 500mg (`BATCH-CIPLA-DEMO-01`). Clicking commit writes a `BATCH_GENESIS_REGISTRATION` block to the ledger and assigns initial custody to `MFG-CIPLA-GOA`. Notice the table below also holds our pre-seeded consortium batches, including `BATCH-CIPLA-AZI-2026-01` (already at Apollo Pharmacy), `BATCH-SUN-PCM-2026-99` (currently in transit with a distributor), and `BATCH-CIPLA-AMX-RECALLED`."

---

## 2. Multi-Hop Logistics — Distributor Portal (2:15 – 3:15)

**Action:**
1. Click the **`🚚 Distributor`** tab.
2. In **"Select Drug Batch to Route"**, select `BATCH-CIPLA-DEMO-01 — Azithromycin IP (At: MFG-CIPLA-GOA)`.
3. In **"Transfer Recipient Node"**, keep `PHARM-APOLLO-104 (Apollo Pharmacy Indore)` selected.
4. Click **"Digitally Sign & Commit Custody Transfer"**.
5. Point to the **Custody Journey Timeline** on the right showing:
   - `HOP-1-GENESIS`: `PLANT-GENESIS → MFG-CIPLA-GOA`
   - `HOP-2-TRANSFER`: `MFG-CIPLA-GOA → PHARM-APOLLO-104`

**What to say:**
> "Next, the physical batch moves through the distribution corridor. When we sign the custody handoff to Apollo Pharmacy Indore (`PHARM-APOLLO-104`), the ledger verifies that the sender actually possesses the batch before appending `HOP-2-TRANSFER`. If a grey-market diversion occurs and a batch shows up at a pharmacy that isn't the current on-chain custodian, the POS terminal will block it."

---

## 3. Privacy-Preserving E-Prescription — Doctor Portal & Patient Pass (3:15 – 4:45)

**Action:**
1. Click the **`🩺 Doctor`** tab.
2. Show the pre-filled form for **Dr. Ananya Sharma (`DOC-99412`, License `MCI-2018-99412`)**:
   - **Patient ID:** `PAT-IND-2026-7731`
   - **Patient Full Name (Off-Chain Only):** `Kavita Deshmukh`
   - **Drug / Generic Name:** `Azithromycin IP`
   - **Strength & Dosage:** `500mg`
3. Click **"Sign with ECDSA Key & Write to Ledger"**.
4. Point to the right panel showing:
   - **Patient QR Pass** (`RX-2026-XXXX`)
   - **256-bit Salted Hash (Module 1)**
   - **Random 128-bit Cryptographic Salt**
5. Scroll down to the **Prescriptions Recorded on Fabric Ledger** table and show that **Patient Name** (`Rohan Verma`, `Pooja Mehta`, `Sanjay Singhal`, `Kavita Deshmukh`), **Drug Name**, and **Dosage** are joined from the off-chain clinical store while only the salted SHA-256 hash lives on-chain.
6. Click the **`📱 Patient`** tab (`Patient Pass`) and select `RX-2026-001-ACTIVE — Rohan Verma [Active]` from the top-right dropdown. Point out the scannable QR code and the **256-bit SHA-256 On-Chain Commitment**.

**What to say:**
> "Now let's look at Module 1: Prescription Authenticity under India's **DPDP Act 2023**. Storing patient names or diagnoses on a blockchain violates health privacy laws. Instead, MedTrust generates a random 128-bit salt, computes `SHA-256(patientId | doctorLicense | drugName | dosage | salt)`, and signs that hash with Dr. Sharma's `secp256r1` ECDSA private key.  
> The patient receives this Digital Pass on their phone (`RX-2026-001-ACTIVE` for Rohan Verma, or the prescription we just issued for Kavita Deshmukh)."

---

## 4. Point-of-Sale Atomic Dispense & Attack Interception (4:45 – 7:00)

**Action:**
1. Click the **`⚡ Verification Gate`** tab (`PharmacistPOS`).
2. **Webcam Modal Demo (15 seconds):** Click the green **`Webcam`** button next to Prescription Input to show the centered modal overlay. (If a camera is active, show the live viewfinder; if not, click **"Use Demo Scan (RX-2026-001-ACTIVE)"** or close the modal with `X`).
3. **Clean Dispense (Scenario A):**
   - Select the newly issued prescription `RX-2026-XXXX` (for Kavita Deshmukh) from the **"Available on Ledger"** dropdown, and select `BATCH-CIPLA-DEMO-01` from the **"Batches in Network"** dropdown (keep `RX-2026-001-ACTIVE` untouched for a moment so you can click through all preset attack buttons first, OR test presets first!).
   - *Tip:* Click the **Capstone Scenarios** preset buttons at the top first before consuming `RX-2026-001-ACTIVE`:
     - Click **`🔴 Replay / Double-Spend`** (`RX-2026-002-REPLAY` + `BATCH-CIPLA-AZI-2026-01`) → Point out `State is Active (Replay Protection)` failing in red and `REPLAY_FRAUD_DETECTED`. Click **"Block & Report Breach to DRA"** to log the incident.
     - Click **`🔴 Counterfeit Drug Batch`** (`RX-2026-001-ACTIVE` + `BATCH-FAKE-GREY-999`) → Point out `Batch Genesis Exists` failing in red (`COUNTERFEIT_BATCH_DETECTED`). Click **"Block & Report Breach to DRA"**.
     - Click **`🔴 Broken Custody Chain`** (`RX-2026-001-ACTIVE` + `BATCH-SUN-PCM-2026-99`) → Point out `Unbroken Custody: Verified at Current Pharmacy` failing in red (`BROKEN_CUSTODY_CHAIN`) because the batch is still with Allkem Wholesalers (`DIST-ALLKEM-BHO`). Click **"Block & Report Breach to DRA"**.
     - Click **`🔴 CDSCO Recalled Batch`** (`RX-2026-001-ACTIVE` + `BATCH-CIPLA-AMX-RECALLED`) → Point out `No Active DRA / CDSCO Recalls` failing in red (`RECALLED_DRUG_BATCH`).
     - Click **`🔴 Expired Prescription`** (`RX-2026-003-EXPIRED` + `BATCH-CIPLA-AZI-2026-01`) → Point out `EXPIRED_PRESCRIPTION`.
   - Now click **`🟢 Valid Clean Dispense`** (`RX-2026-001-ACTIVE` + `BATCH-CIPLA-AZI-2026-01`):
     - Show that all 9 checks across Module 1 and Module 2 turn green (`GATEWAY AUTHORIZED` in `< 1 ms`).
     - Click **"Authorize & Commit Atomic Dispense"**.
     - Point out the confetti confirmation, new **Block Height**, and that both `RX-2026-001-ACTIVE` (`Fulfilled`) and `BATCH-CIPLA-AZI-2026-01` (`Dispensed`) transitioned atomically!
     - Click **"Authorize / Block"** a second time on the exact same pair to show it immediately flips to `REPLAY_FRAUD_DETECTED`!

**What to say:**
> "At the Apollo Pharmacy POS counter, the pharmacist scans both the patient's QR code and the physical drug box. Notice the **Dual-Layer Concurrent Evaluation Matrix**: in under 1 millisecond, it evaluates 4 checks on Module 1 (including real ECDSA signature verification) and 5 checks on Module 2 (genesis existence, recall status, expiry, pharmacy custody, and drug-name match).  
> Watch what happens when we test our fraud presets: Replay attacks, counterfeit serials, broken custody chains, and expired prescriptions are all blocked before the medication can leave the counter, and each attempt is reported to the regulator.  
> When we run a valid pair (`RX-2026-001-ACTIVE` + `BATCH-CIPLA-AZI-2026-01`), both states commit atomically in a single block. If the patient tries to use that same QR code 5 seconds later, it is immediately blocked as Replay Fraud."

---

## 5. Regulatory Recall & Audit Trail — DRA Command & Ledger Explorer (7:00 – 8:15)

**Action:**
1. Click the **`🏛️ DRA Command`** tab (`DRAPanel`).
2. Point to the 4 top KPI cards (**Total Prescriptions**, **Total Batches Tracked**, **Blocked Fraud Incidents**, **Fabric Block Height**) and the **Security Incident & Breach Feed** on the right showing the exact breaches we just triggered at POS.
3. On the left card (**Broadcast Instant Drug Batch Recall**), enter `BATCH-CIPLA-DEMO-01` (or `BATCH-CIPLA-AZI-2026-01`) and click **"Commit Regulatory Recall to Blockchain"**.
4. Click the **`⛓️ Ledger`** tab (`LedgerExplorer`).
5. Point to the **Immutable Block Production Timeline** chart and click on the latest blocks (`ATOMIC_GATEWAY_DISPENSE`, `DRA_BATCH_RECALL_BROADCAST`, `PRESCRIPTION_ISSUED`) to expand their **Previous Block Hash**, **Current Block Hash**, and **CouchDB State Diff JSON payload**.

**What to say:**
> "From the CDSCO Regulatory Command Center, regulators see every blocked fraud attempt in real time with the exact pharmacy node, batch ID, and breach code. They can also broadcast an instant recall on any batch, which immediately blocks dispensing across all consortium pharmacies.  
> In the **Ledger Explorer**, we can inspect every block from Genesis (`#0`) to the latest block, verifying the cryptographic SHA-256 hash links (`prevHash → blockHash`) and the exact transaction payloads."

---

## 6. Empirical Evaluation — Benchmark Suite (8:15 – 9:00)

**Action:**
1. Click the **`📊 Benchmarks`** tab (`BenchmarkSuite`).
2. Keep **Iterations / vector** at `25` (150 total simulations across the 6 vectors) and click **"Execute Benchmark Run"**.
3. Point to:
   - **Interception Accuracy:** `100%` (Zero False Positives / Negatives)
   - **Avg Verification Latency:** `~0.35 – 0.60 ms`
   - **Verification Latency Distribution (Avg vs P95)** and **Cryptographic Overhead (ECDSA secp256r1)** bar charts.
   - **MedTrust vs Traditional PDMP** comparison table below.

**What to say:**
> "Finally, our built-in Benchmark Suite runs 150 live iterations across all 6 attack and legitimate vectors. Even with full `secp256r1` ECDSA signature verification and SHA-256 hashing on every check, average gateway evaluation latency is under 1 millisecond with 100% interception accuracy—turning retrospective post-dispense audits into a real-time point-of-sale gate. Thank you—we're happy to take questions."
