# Pre-Demo Checklist & Live Fallback Plan

Run through this checklist **10 minutes before your presentation**.

---

## 1. Ten-Minute Pre-Demo Setup Commands

Open **two terminal windows** in the project root (`medtrust-main`):

### Terminal 1 — Reset State & Start Backend Gateway (Port 5001)
```bash
cd server
npm run demo:reset
npm start
```
**Expected Output (in < 1 second):**
```text
💾 Loaded persistent ledger state from disk (3 blocks, 3 prescriptions, 4 batches).
💾 Off-Chain Store Ready (JSON disk store: 3 records loaded).
⚡ Seeding MedTrust Consortium Ledger Data...
✅ MedTrust Consortium Ledger Seeded with 4 Batches and 3 Prescriptions.
🚀 MedTrust Blockchain Gateway Engine listening on port 5001
```

### Terminal 2 — Start Frontend UI (Port 3000)
```bash
cd client
npm run dev
```
**Expected Output:**
```text
  VITE v8.3.0  ready in ~300 ms
  ➜  Local:   http://localhost:3000/
```

---

## 2. Quick 30-Second Visual Sanity Check
Open `http://localhost:3000` in Chrome/Edge:
- [ ] Top-right header shows a **green pulsing dot** next to `medtrust-channel`.
- [ ] Click **`🩺 Doctor`** → Confirm the bottom table shows real patient names (`Rohan Verma`, `Pooja Mehta`, `Sanjay Singhal`) and drugs (`Azithromycin IP 500mg`, `Dolo Paracetamol 650mg`), **not** `"Restricted"` or `"Redacted"`.
- [ ] Click **`⛓️ Ledger`** → Confirm Block Height is `#3` (Blocks `#0`, `#1`, `#2`).
- [ ] Click **`⚡ Verification Gate`** → Confirm `RX-2026-001-ACTIVE` and `BATCH-CIPLA-AZI-2026-01` show green `GATEWAY AUTHORIZED`.

---

## 3. Live Fallback Plans (If Something Goes Wrong on Stage)

### Scenario A: Laptop Webcam Fails, Is Busy (Zoom/Teams), or Browser Blocks Permission
- **What happens:** Clicking the `Webcam` button opens the modal and displays a rose `Webcam Notice` box instead of a video feed.
- **What to do:** Click the green **`Use Demo Scan (RX-2026-001-ACTIVE)`** (or **`Use Demo Scan (BATCH-CIPLA-AZI-2026-01)`**) button right inside the modal's notice box, OR use the **"Available on Ledger" / "Batches in Network"** dropdowns and **Capstone Scenarios** preset buttons directly on the POS page.

### Scenario B: You Accidentally Dispensed or Recalled `RX-2026-001-ACTIVE` / `BATCH-CIPLA-AZI-2026-01` Early
- ** Option 1 (Without restarting anything):** Issue a new prescription in the **`🩺 Doctor`** tab and register + transfer a new batch in **`🏭 Manufacturer`** → **`🚚 Distributor`**, then dispense that pair at POS. (Note: The **`📊 Benchmarks`** tab automatically snapshots and restores seed state in memory, so `Execute Benchmark Run` will still score **100%** even after you dispense or recall seed items!)
- **Option 2 (Full 2-second reset):** In Terminal 1 (server), press `Ctrl+C`, run:
  ```bash
  npm run demo:reset && npm start
  ```
  Then click theRefresh icon (`↻`) in the top-right header of the browser.

### Scenario C: Port 5001 is Already in Use (`EADDRINUSE`)
- Run this one-liner in PowerShell to free port `5001`, then `npm start`:
  ```powershell
  Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```

### Scenario D: No Internet / Campus Wi-Fi Drops
- **Zero impact:** Both the backend (`localhost:5001`), the JSON disk-backed ledger & off-chain stores (`server/data/`), all cryptographic operations (Node.js native `crypto` module), and the React frontend (`localhost:3000`) run **100% offline on localhost** with no external cloud or CDN dependencies.
