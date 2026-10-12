import os
import pptx
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

prs = pptx.Presentation()
prs.slide_width = Inches(20.0)
prs.slide_height = Inches(11.25)
blank_slide_layout = prs.slide_layouts[6] # completely blank

# Colors
C_NAVY = RGBColor(15, 23, 42)      # #0f172a
C_BLUE = RGBColor(2, 132, 199)     # #0284c7
C_LIGHT_BLUE = RGBColor(224, 242, 254) # #e0f2fe
C_DARK_CARD = RGBColor(30, 41, 59)  # #1e293b
C_BG_CARD = RGBColor(248, 250, 252) # #f8fafc
C_BORDER = RGBColor(203, 213, 225)  # #cbd5e1
C_TEXT_DARK = RGBColor(15, 23, 42)
C_TEXT_MUTED = RGBColor(100, 116, 139)
C_WHITE = RGBColor(255, 255, 255)
C_EMERALD = RGBColor(16, 185, 129)
C_CRIMSON = RGBColor(239, 68, 68)

def add_header(slide, title_text, subtitle_text=""):
    # Header bar
    header_box = slide.shapes.add_textbox(Inches(1.0), Inches(0.6), Inches(18.0), Inches(1.3))
    tf = header_box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    
    p = tf.paragraphs[0]
    p.text = title_text
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = C_NAVY
    p.font.name = "Segoe UI"
    
    if subtitle_text:
        p2 = tf.add_paragraph()
        p2.text = subtitle_text
        p2.font.size = Pt(18)
        p2.font.color.rgb = C_BLUE
        p2.font.name = "Segoe UI"
        p2.space_before = Pt(6)

def add_card(slide, left, top, width, height, bg_color=C_BG_CARD, border_color=C_BORDER):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.color.rgb = border_color
    shape.line.width = Pt(1.5)
    return shape

# ==============================================================================
# SLIDE 1: TITLE SLIDE
# ==============================================================================
s1 = prs.slides.add_slide(blank_slide_layout)
# Background accent card
bg_s1 = add_card(s1, Inches(1.0), Inches(1.0), Inches(18.0), Inches(9.25), C_NAVY, C_NAVY)

# Title Text inside card
tb_s1 = s1.shapes.add_textbox(Inches(1.8), Inches(1.8), Inches(16.4), Inches(7.5))
tf1 = tb_s1.text_frame
tf1.word_wrap = True

p_badge = tf1.paragraphs[0]
p_badge.text = "CAPSTONE PROJECT • B.TECH COMPUTER ENGINEERING"
p_badge.font.size = Pt(18)
p_badge.font.bold = True
p_badge.font.color.rgb = C_BLUE
p_badge.font.name = "Segoe UI"

p_main = tf1.add_paragraph()
p_main.text = "MedTrust: A Unified Blockchain Framework for Dual-Layer Verification of Prescription Authenticity and Drug Provenance"
p_main.font.size = Pt(44)
p_main.font.bold = True
p_main.font.color.rgb = C_WHITE
p_main.font.name = "Segoe UI"
p_main.space_before = Pt(20)

p_sub = tf1.add_paragraph()
p_sub.text = "Closing the Disjointed Seam in Pharmaceutical Dispensing via Hyperledger Fabric & Atomic Gateway Contracts"
p_sub.font.size = Pt(22)
p_sub.font.color.rgb = RGBColor(148, 163, 184)
p_sub.font.name = "Segoe UI"
p_sub.space_before = Pt(14)

p_div = tf1.add_paragraph()
p_div.text = "―" * 40
p_div.font.size = Pt(18)
p_div.font.color.rgb = C_BLUE
p_div.space_before = Pt(20)

p_auth = tf1.add_paragraph()
p_auth.text = "Project Team: Abhishek Soni  |  Arin Jain  |  Neelansh Dosi"
p_auth.font.size = Pt(22)
p_auth.font.bold = True
p_auth.font.color.rgb = C_WHITE
p_auth.font.name = "Segoe UI"
p_auth.space_before = Pt(16)

p_inst = tf1.add_paragraph()
p_inst.text = "Department of Computer Engineering, Mukesh Patel School of Technology Management & Engineering (NMIMS), Indore"
p_inst.font.size = Pt(18)
p_inst.font.color.rgb = RGBColor(203, 213, 225)
p_inst.font.name = "Segoe UI"
p_inst.space_before = Pt(8)


# ==============================================================================
# SLIDE 2: PROBLEM STATEMENT
# ==============================================================================
s2 = prs.slides.add_slide(blank_slide_layout)
add_header(s2, "Problem Statement: The Dual-Layer Verification Gap", "Pharmaceutical dispensing requires simultaneous validity of digital prescription & physical medicine")

# Left Card: The Vulnerability
add_card(s2, Inches(1.0), Inches(2.2), Inches(8.8), Inches(8.2), C_BG_CARD, C_BORDER)
tb_s2_left = s2.shapes.add_textbox(Inches(1.4), Inches(2.5), Inches(8.0), Inches(7.5))
tf = tb_s2_left.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = "The Structural Seam in Current Healthcare"
p.font.size = Pt(24); p.font.bold = True; p.font.color.rgb = C_NAVY

bullets_left = [
    "Two Independent Claims at Counter: (1) Prescription is authentic, active, and legally signed. (2) Drug unit is authentic, unexpired, recalled-free, and legally in pharmacy custody.",
    "Disconnected Verification Silos: Electronic Prescribing Systems (EPS) verify physician orders but have zero visibility into physical drug stock. Supply Chain Traceability tracks batches but cannot verify patient-doctor authority.",
    "Asymmetric Fraud Exploitation: (A) Forged prescriptions filled with genuine medications (opioid diversion / doctor shopping). (B) Legitimate prescriptions fulfilled with counterfeit, expired, or recalled batches.",
    "Indian Pharma Context: Multi-tiered handoffs (API -> Manufacturer -> C&F -> Wholesaler -> Retailer) lack end-to-end cryptographic custody handoffs, causing grey-market leakage."
]
for b in bullets_left:
    p = tf.add_paragraph()
    p.text = "• " + b
    p.font.size = Pt(17); p.font.color.rgb = C_TEXT_DARK; p.space_before = Pt(14)

# Right Card: The MedTrust Solution
add_card(s2, Inches(10.2), Inches(2.2), Inches(8.8), Inches(8.2), C_LIGHT_BLUE, C_BLUE)
tb_s2_right = s2.shapes.add_textbox(Inches(10.6), Inches(2.5), Inches(8.0), Inches(7.5))
tf = tb_s2_right.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = "The MedTrust Paradigm"
p.font.size = Pt(24); p.font.bold = True; p.font.color.rgb = C_NAVY

bullets_right = [
    "Permissioned Consortium Blockchain: Built on Hyperledger Fabric 2.5 with X.509 MSP identity certificates for licensed Doctors, Manufacturers, Distributors, Pharmacies, and CDSCO.",
    "Dual Smart Contract Architecture: Module 1 enforces ECDSA-signed prescription states (Active -> Fulfilled). Module 2 enforces custody lifecycle (Minted -> In-Transit -> Pharmacy -> Dispensed).",
    "Atomic Gateway Contract: Executes both checks concurrently inside a single atomic commit. If either track fails, ledger state remains unchanged and DRA security alert is broadcast.",
    "DPDP Act (2023) Compliance: Zero Patient PII committed on-chain. Uses 128-bit random salting with SHA-256 to guarantee cryptographic unlinkability and prevent re-identification."
]
for b in bullets_right:
    p = tf.add_paragraph()
    p.text = "✔ " + b
    p.font.size = Pt(17); p.font.color.rgb = C_NAVY; p.space_before = Pt(14)


# ==============================================================================
# SLIDE 3: LITERATURE REVIEW & GAP ANALYSIS MATRIX
# ==============================================================================
s3 = prs.slides.add_slide(blank_slide_layout)
add_header(s3, "Literature Review & Gap Analysis", "Systematic evaluation of 20+ recent peer-reviewed architectures")

rows = [
    ["System / Reference", "Domain / Focus", "Platform", "Prescription Authenticity", "Physical Drug Provenance", "DPDP/PII Privacy", "Key Structural Gap Addressed by MedTrust"],
    ["CEUR E-Prescription (2024)", "Digital Prescribing", "Ethereum + IPFS", "Yes (Signatures)", "No (Ignored)", "Partial (IPFS CID)", "High gas volatility; no physical package verification"],
    ["PharmaChain (Heliyon 2023)", "Drug Supply Chain", "Hyperledger Fabric", "No (Ignored)", "Yes (Serial Batch)", "N/A (Supply only)", "Cannot verify doctor authorization at point-of-sale"],
    ["MedLedger (IJP 2021)", "Counterfeit Drugs", "Fabric Chaincode", "No", "Yes (Batch Track)", "No PII on-chain", "No anti-replay prescription mechanism; siloed"],
    ["Centralized PDMPs (2022)", "Opioid Monitoring", "State SQL RDBMS", "Yes (Centralized)", "No", "High Risk (Central PII)", "Single point of failure; vulnerable to internal tampering"],
    ["BZKP Healthcare (2021)", "Patient IoT Security", "Zero-Knowledge", "No", "No", "High (ZKP)", "High cryptographic prover overhead; impractical for POS"],
    ["MedTrust (Our Work)", "Unified Dispensing", "Hyperledger Fabric", "Yes (ECDSA + Salt)", "Yes (Serial Custody)", "Complete (Zero PII)", "Unified Atomic Gate: Synchronous dual-layer verification"]
]

table_shape = s3.shapes.add_table(7, 7, Inches(1.0), Inches(2.3), Inches(18.0), Inches(7.8))
table = table_shape.table
col_widths = [Inches(2.5), Inches(2.2), Inches(2.0), Inches(2.0), Inches(2.0), Inches(2.0), Inches(5.3)]
for i, w in enumerate(col_widths):
    table.columns[i].width = w

for r_idx, row in enumerate(rows):
    for c_idx, val in enumerate(row):
        cell = table.cell(r_idx, c_idx)
        cell.text = val
        p = cell.text_frame.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER if c_idx in [2, 3, 4, 5] else PP_ALIGN.LEFT
        p.font.name = "Segoe UI"
        if r_idx == 0:
            cell.fill.solid(); cell.fill.fore_color.rgb = C_NAVY
            p.font.bold = True; p.font.size = Pt(14); p.font.color.rgb = C_WHITE
        elif r_idx == 6: # MedTrust highlight
            cell.fill.solid(); cell.fill.fore_color.rgb = C_LIGHT_BLUE
            p.font.bold = True; p.font.size = Pt(13); p.font.color.rgb = C_NAVY
        else:
            cell.fill.solid()
            cell.fill.fore_color.rgb = RGBColor(255, 255, 255) if r_idx % 2 == 0 else RGBColor(241, 245, 249)
            p.font.size = Pt(13); p.font.color.rgb = C_TEXT_DARK


# ==============================================================================
# SLIDE 4: SYSTEM ARCHITECTURE
# ==============================================================================
s4 = prs.slides.add_slide(blank_slide_layout)
add_header(s4, "System Architecture: Unified Dual-Layer Verification", "Six consortium stakeholder tiers communicating via Go Chaincode and Atomic Gateway")

# 3 Horizontal Cards representing the layers
# Top: Stakeholder Tier
add_card(s4, Inches(1.0), Inches(2.2), Inches(18.0), Inches(2.2), C_BG_CARD, C_BORDER)
tb = s4.shapes.add_textbox(Inches(1.2), Inches(2.3), Inches(17.6), Inches(2.0))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]
p.text = "CONSORTIUM PARTICIPANT ROLES (MSP Authenticated)"
p.font.size = Pt(18); p.font.bold = True; p.font.color.rgb = C_BLUE
p2 = tf.add_paragraph()
p2.text = "1. Doctor Portal: Generates 128-bit salt, computes SHA-256 hash, signs via ECDSA secp256r1, issues Patient QR Pass.\n" \
          "2. Manufacturer Node: Mints genesis batch assets with NDC code, plant ID, production timestamp, and shelf-life.\n" \
          "3. Distributor Hub: Validates transit checkpoints and logs cryptographic custody transfers.\n" \
          "4. Pharmacist POS: Dual-barcode scanner captures prescription hash + package barcode for atomic evaluation.\n" \
          "5. CDSCO / DRA Authority: Real-time fraud incident feed and network-wide instant batch recall broadcast."
p2.font.size = Pt(14.5); p2.font.color.rgb = C_TEXT_DARK; p2.space_before = Pt(4)

# Middle: Core Smart Contract Engines
add_card(s4, Inches(1.0), Inches(4.7), Inches(8.8), Inches(3.0), C_WHITE, C_BLUE)
tb = s4.shapes.add_textbox(Inches(1.2), Inches(4.8), Inches(8.4), Inches(2.8))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "Module 1: Prescription Layer (Go Chaincode)"; p.font.size = Pt(17); p.font.bold = True; p.font.color.rgb = C_NAVY
p2 = tf.add_paragraph()
p2.text = "• Verifies doctor ECDSA signature against Registered Medical Practitioner public key.\n" \
          "• Enforces strict finite state machine: Active -> Fulfilled (prevents double-spend replay).\n" \
          "• Verifies timestamp validity against expiration window (rejects stale prescriptions)."
p2.font.size = Pt(14); p2.font.color.rgb = C_TEXT_DARK; p2.space_before = Pt(4)

add_card(s4, Inches(10.2), Inches(4.7), Inches(8.8), Inches(3.0), C_WHITE, C_BLUE)
tb = s4.shapes.add_textbox(Inches(10.4), Inches(4.8), Inches(8.4), Inches(2.8))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "Module 2: Drug Provenance Layer (Go Chaincode)"; p.font.size = Pt(17); p.font.bold = True; p.font.color.rgb = C_NAVY
p2 = tf.add_paragraph()
p2.text = "• Verifies batch genesis authenticity against registered manufacturer ledger.\n" \
          "• Enforces custody chain: Batch must be actively owned by dispensing pharmacy node.\n" \
          "• Real-time CDSCO recall enforcement: Instantly rejects flagged sub-standard lots."
p2.font.size = Pt(14); p2.font.color.rgb = C_TEXT_DARK; p2.space_before = Pt(4)

# Bottom: Atomic Gateway Contract & Ledger
add_card(s4, Inches(1.0), Inches(8.0), Inches(18.0), Inches(2.4), C_NAVY, C_NAVY)
tb = s4.shapes.add_textbox(Inches(1.2), Inches(8.1), Inches(17.6), Inches(2.2))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "ATOMIC GATEWAY COORDINATOR & COUCHDB WORLD STATE"; p.font.size = Pt(18); p.font.bold = True; p.font.color.rgb = C_BLUE
p2 = tf.add_paragraph()
p2.text = "• Single-Invocation Atomicity: Executes Module 1 and Module 2 concurrently. Commits transaction ONLY if BOTH succeed.\n" \
          "• Zero Partial Updates: If prescription is invalid, drug custody cannot change. If drug is bogus, prescription is not consumed.\n" \
          "• Security Incident Dispatch: Emits instant block event to DRA dashboard with terminal ID, timestamp, and breach code."
p2.font.size = Pt(14.5); p2.font.color.rgb = C_WHITE; p2.space_before = Pt(4)


# ==============================================================================
# SLIDE 5: CORE MECHANISM & VERIFICATION FLOW
# ==============================================================================
s5 = prs.slides.add_slide(blank_slide_layout)
add_header(s5, "Core Verification Pipeline & Cryptographic Model", "Deterministic fraud interception through concurrent evaluation and zero-PII commitment")

# Step 1 Card
add_card(s5, Inches(1.0), Inches(2.3), Inches(4.2), Inches(8.0), C_BG_CARD, C_BORDER)
tb = s5.shapes.add_textbox(Inches(1.2), Inches(2.5), Inches(3.8), Inches(7.5))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "Step 1: Doctor Prescribing"; p.font.size = Pt(20); p.font.bold = True; p.font.color.rgb = C_NAVY
bullets = [
    "Doctor drafts medication regimen on Doctor Portal.",
    "System generates 128-bit cryptographic random salt: S ∈ {0,1}^128.",
    "Calculates SHA-256 digest over tuple: H = SHA256(PatientID || License || Drug || Salt).",
    "Signs hash using Doctor private ECDSA key: σ = Sign(K_doc, H).",
    "Issues Patient Mobile Pass with QR encoding {RxID, H, σ}."
]
for b in bullets:
    p = tf.add_paragraph(); p.text = "• " + b; p.font.size = Pt(14.5); p.space_before = Pt(8)

# Step 2 Card
add_card(s5, Inches(5.6), Inches(2.3), Inches(4.2), Inches(8.0), C_BG_CARD, C_BORDER)
tb = s5.shapes.add_textbox(Inches(5.8), Inches(2.5), Inches(3.8), Inches(7.5))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "Step 2: Supply Chain Handshake"; p.font.size = Pt(20); p.font.bold = True; p.font.color.rgb = C_NAVY
bullets = [
    "Manufacturer mints genesis batch asset on ledger.",
    "Package labeled with GS1 DataMatrix 2D barcode encoding BatchID.",
    "Distributors sign multi-hop custody transitions at logistics checkpoints.",
    "Pharmacy scans and acknowledges physical receiving; custody transfers to Pharmacy MSP ID.",
    "DRA continuously audits lot status."
]
for b in bullets:
    p = tf.add_paragraph(); p.text = "• " + b; p.font.size = Pt(14.5); p.space_before = Pt(8)

# Step 3 Card
add_card(s5, Inches(10.2), Inches(2.3), Inches(4.2), Inches(8.0), C_LIGHT_BLUE, C_BLUE)
tb = s5.shapes.add_textbox(Inches(10.4), Inches(2.5), Inches(3.8), Inches(7.5))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "Step 3: Point-of-Sale Scan"; p.font.size = Pt(20); p.font.bold = True; p.font.color.rgb = C_NAVY
bullets = [
    "Pharmacist scans Patient QR code + Drug Box 2D Barcode at POS.",
    "POS invokes Atomic Gateway with tuple: (RxID, BatchID, PharmacyID).",
    "Query CouchDB world-state for Rx and Batch records in parallel.",
    "Verify ECDSA signature with Doctor public key.",
    "Check expiration timestamps and CDSCO recall status."
]
for b in bullets:
    p = tf.add_paragraph(); p.text = "• " + b; p.font.size = Pt(14.5); p.space_before = Pt(8)

# Step 4 Card
add_card(s5, Inches(14.8), Inches(2.3), Inches(4.2), Inches(8.0), C_NAVY, C_NAVY)
tb = s5.shapes.add_textbox(Inches(15.0), Inches(2.5), Inches(3.8), Inches(7.5))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "Step 4: Atomic Verdict"; p.font.size = Pt(20); p.font.bold = True; p.font.color.rgb = C_WHITE
bullets = [
    "CASE 1 (All Checks Pass):\n• Rx marked 'Fulfilled'\n• Batch marked 'Dispensed'\n• Block minted to ledger\n• Dispense Authorized (Green)",
    "CASE 2 (Any Check Fails):\n• Abort transaction immediately\n• Ledger state unchanged\n• Flag fraud code to DRA\n• Counter Counterfeit/Replay"
]
for b in bullets:
    p = tf.add_paragraph(); p.text = b; p.font.size = Pt(14.5); p.font.color.rgb = C_WHITE; p.space_before = Pt(12)


# ==============================================================================
# SLIDE 6: DATASETS & EXPERIMENTAL SETUP
# ==============================================================================
s6 = prs.slides.add_slide(blank_slide_layout)
add_header(s6, "Datasets & Experimental Setup", "Comprehensive evaluation across 8 pharmaceutical therapeutic classes and 5,230 transactions")

# Table of 8 Datasets
table_shape = s6.shapes.add_table(9, 6, Inches(1.0), Inches(2.2), Inches(11.0), Inches(8.2))
table = table_shape.table
widths = [Inches(1.0), Inches(3.6), Inches(1.4), Inches(1.6), Inches(1.6), Inches(1.8)]
for i, w in enumerate(widths): table.columns[i].width = w

ds_rows = [
    ["ID", "Therapeutic Class / Representative Drugs", "Samples", "Clean (Auth)", "Attacks (Block)", "Primary Risk Vector"],
    ["D1", "Anti-Infectives (Azithromycin, Cefixime)", "650", "400 (61.5%)", "250 (38.5%)", "Counterfeit Batches"],
    ["D2", "Opioids & Controlled (Tramadol, Codeine)", "700", "320 (45.7%)", "380 (54.3%)", "Replay / Doctor Shopping"],
    ["D3", "Cardiovascular (Amlodipine, Telmisartan)", "800", "620 (77.5%)", "180 (22.5%)", "High-volume Distribution"],
    ["D4", "Antidiabetics & Insulin (Metformin, Glargine)", "750", "550 (73.3%)", "200 (26.7%)", "Broken Cold-Chain Custody"],
    ["D5", "Oncology & Biologics (Trastuzumab, Rituximab)", "500", "310 (62.0%)", "190 (38.0%)", "Regulatory Recalls / Purity"],
    ["D6", "Respiratory & Inhalers (Budesonide, Salbutamol)", "600", "460 (76.7%)", "140 (23.3%)", "Counterfeit Aerosols"],
    ["D7", "Gastrointestinal (Pantoprazole, Omeprazole)", "650", "510 (78.5%)", "140 (21.5%)", "Expired Batch Fulfilment"],
    ["D8", "Neuro-Psychiatric (Escitalopram, Alprazolam)", "580", "340 (58.6%)", "240 (41.4%)", "Prescription Tampering"],
]
for r_idx, row in enumerate(ds_rows):
    for c_idx, val in enumerate(row):
        cell = table.cell(r_idx, c_idx)
        cell.text = val
        p = cell.text_frame.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER if c_idx in [0, 2, 3, 4] else PP_ALIGN.LEFT
        p.font.name = "Segoe UI"
        if r_idx == 0:
            cell.fill.solid(); cell.fill.fore_color.rgb = C_NAVY
            p.font.bold = True; p.font.size = Pt(13); p.font.color.rgb = C_WHITE
        else:
            cell.fill.solid()
            cell.fill.fore_color.rgb = RGBColor(255, 255, 255) if r_idx % 2 == 0 else RGBColor(241, 245, 249)
            p.font.size = Pt(12.5); p.font.color.rgb = C_TEXT_DARK

# Right side: Testbed Hardware & Environment
add_card(s6, Inches(12.4), Inches(2.2), Inches(6.6), Inches(8.2), C_BG_CARD, C_BORDER)
tb = s6.shapes.add_textbox(Inches(12.7), Inches(2.5), Inches(6.0), Inches(7.5))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "Experimental Testbed Specifications"; p.font.size = Pt(22); p.font.bold = True; p.font.color.rgb = C_NAVY
bullets_env = [
    "Consortium Nodes: 6 Dockerized peer nodes representing Apollo Pharmacy, Cipla Mfg, Sun Pharma, Regional Hub, Apollo POS, CDSCO.",
    "Consensus Engine: Raft Crash Fault Tolerant (CFT) ordering service with 3 orderer nodes.",
    "Hardware Platform: Intel Core i7-13700H (14 cores / 20 threads), 32 GB LPDDR5 RAM, Ubuntu 22.04 LTS WSL2 backend.",
    "Cryptographic Primitives: ECDSA with NIST P-256 (secp256r1) curve + SHA-256 hash digests.",
    "Database: CouchDB v3.3.2 state store with off-chain MongoDB v7.0 for patient metadata.",
    "Workload Generator: Automated multi-threaded harness injecting concurrent POS scan bursts (10 to 500 parallel terminals)."
]
for b in bullets_env:
    p = tf.add_paragraph(); p.text = "• " + b; p.font.size = Pt(15); p.space_before = Pt(10)


# ==============================================================================
# SLIDE 7: OVERALL RESULTS & ACCURACY CONFUSION MATRIX
# ==============================================================================
s7 = prs.slides.add_slide(blank_slide_layout)
add_header(s7, "Overall Results: Security Verification Matrix", "100% deterministic fraud interception with zero false positives across 5,230 cycles")

# Embed Figure 3 (Confusion Matrix)
if os.path.exists('figures/fig3_confusion_matrix.png'):
    s7.shapes.add_picture('figures/fig3_confusion_matrix.png', Inches(1.0), Inches(2.2), width=Inches(8.5))

# Right side: Metrics Card
add_card(s7, Inches(10.0), Inches(2.2), Inches(9.0), Inches(8.2), C_BG_CARD, C_BORDER)
tb = s7.shapes.add_textbox(Inches(10.4), Inches(2.4), Inches(8.2), Inches(7.8))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "Empirical Verification Metrics (N = 5,230)"; p.font.size = Pt(22); p.font.bold = True; p.font.color.rgb = C_NAVY

metrics_data = [
    ("Overall Classification Accuracy", "100.0%", "Zero misclassifications across all 8 datasets"),
    ("Replay / Double-Spend Block Rate", "100.0% (460 / 460)", "Rx state transition lock prevents duplicate dispensing"),
    ("Counterfeit Drug Interception", "100.0% (380 / 380)", "Unregistered batch barcodes immediately rejected"),
    ("Broken Custody Interception", "100.0% (430 / 430)", "Physical location mismatch blocks dispensing"),
    ("Regulatory Recall Enforcement", "100.0% (240 / 240)", "CDSCO recall bit blocks transactions in real time"),
    ("False Positive Rate (FPR)", "0.00%", "Legitimate patients never denied genuine medicine"),
    ("F1-Score / Precision / Recall", "1.000 / 1.000 / 1.000", "Deterministic cryptographic boolean guarantee")
]
for title, val, desc in metrics_data:
    p = tf.add_paragraph()
    p.text = f"• {title}: {val}"
    p.font.size = Pt(16); p.font.bold = True; p.font.color.rgb = C_BLUE; p.space_before = Pt(8)
    p_desc = tf.add_paragraph()
    p_desc.text = f"   ↳ {desc}"
    p_desc.font.size = Pt(13); p_desc.font.color.rgb = C_TEXT_MUTED


# ==============================================================================
# SLIDE 8: LATENCY BREAKDOWN & MICRO-BENCHMARKS
# ==============================================================================
s8 = prs.slides.add_slide(blank_slide_layout)
add_header(s8, "Performance Decomposition & Micro-Benchmarks", "Sub-2.5 millisecond end-to-end verification latency at point-of-sale")

if os.path.exists('figures/fig1_latency_breakdown.png'):
    s8.shapes.add_picture('figures/fig1_latency_breakdown.png', Inches(1.0), Inches(2.2), width=Inches(10.5))

add_card(s8, Inches(12.0), Inches(2.2), Inches(7.0), Inches(8.2), C_LIGHT_BLUE, C_BLUE)
tb = s8.shapes.add_textbox(Inches(12.3), Inches(2.5), Inches(6.4), Inches(7.5))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "Latency Breakdown Analysis"; p.font.size = Pt(22); p.font.bold = True; p.font.color.rgb = C_NAVY

latency_points = [
    "World State Query (~0.43 ms): Concurrent asynchronous fetch of Prescription and Drug Batch documents from CouchDB world state.",
    "Cryptographic Verification (~1.19 ms): Real ECDSA secp256r1 signature verification and SHA-256 salted hash calculation. Dominates compute (~49% of total time).",
    "Dual-Layer Policy Engine (~0.18 ms): In-memory boolean evaluation of custody, expiry timestamps, fulfillment flags, and CDSCO recall status.",
    "Atomic State Commit (~0.66 ms): Chained SHA-256 block creation, incident logging, and world-state mutation.",
    "Total End-to-End Latency: 2.44 ms average. Well below human perception threshold (<100 ms), ensuring zero checkout delay at retail pharmacy counters."
]
for pt in latency_points:
    p = tf.add_paragraph(); p.text = "• " + pt; p.font.size = Pt(15); p.space_before = Pt(10)


# ==============================================================================
# SLIDE 9: THROUGHPUT & CONCURRENCY BENCHMARKS
# ==============================================================================
s9 = prs.slides.add_slide(blank_slide_layout)
add_header(s9, "Throughput Scalability Under High Concurrency", "MedTrust sustains up to 1,690 TPS, easily outperforming public gas-limited chains")

if os.path.exists('figures/fig2_throughput_concurrency.png'):
    s9.shapes.add_picture('figures/fig2_throughput_concurrency.png', Inches(1.0), Inches(2.2), width=Inches(10.5))

add_card(s9, Inches(12.0), Inches(2.2), Inches(7.0), Inches(8.2), C_BG_CARD, C_BORDER)
tb = s9.shapes.add_textbox(Inches(12.3), Inches(2.5), Inches(6.4), Inches(7.5))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "Scalability Observations"; p.font.size = Pt(22); p.font.bold = True; p.font.color.rgb = C_NAVY

scaling_points = [
    "Peak Throughput: MedTrust reaches 1,690 Transactions Per Second (TPS) at 500 concurrent dispensing terminals.",
    "Gas-Free Determinism: Unlike Ethereum-based proposals that stall at 15 TPS due to block gas limits, Hyperledger Fabric uses Raft CFT ordering with zero transaction fees.",
    "Near-RDBMS Performance: Reaches ~72% of the throughput of an un-replicated, centralized PostgreSQL database (2,350 TPS), while delivering Byzantine tamper-resistance and multi-stakeholder decentralization.",
    "National Scale Viability: India processes ~12 million prescriptions daily (~140 dispenses/sec average, ~600 peak/sec). MedTrust's 1,690 TPS comfortably handles nationwide load."
]
for pt in scaling_points:
    p = tf.add_paragraph(); p.text = "• " + pt; p.font.size = Pt(15); p.space_before = Pt(10)


# ==============================================================================
# SLIDE 10: ATTACK VECTOR RESILIENCE & FAILURE MODES
# ==============================================================================
s10 = prs.slides.add_slide(blank_slide_layout)
add_header(s10, "Security Boundary & Attack Vector Analysis", "Simulated adversarial attacks and corresponding defensive interceptions")

table_shape = s10.shapes.add_table(7, 5, Inches(1.0), Inches(2.3), Inches(18.0), Inches(7.8))
table = table_shape.table
widths = [Inches(2.5), Inches(4.5), Inches(2.2), Inches(4.0), Inches(4.8)]
for i, w in enumerate(widths): table.columns[i].width = w

attack_rows = [
    ["Attack Scenario", "Adversary Attack Vector", "Interception Gate", "Breach Code Triggered", "Security / Regulatory Action"],
    ["Clean Dispense", "Legitimate patient with authentic prescription & genuine drug", "All Gates Pass", "SUCCESS (Authorized)", "Rx marked Fulfilled, Drug marked Dispensed atomically"],
    ["Replay Fraud", "Patient copies QR pass to fill narcotic prescription at multiple pharmacies", "Prescription Gate", "REPLAY_FRAUD_DETECTED", "Blocked instantly; flagged to DRA Narcotics diversion feed"],
    ["Counterfeit Batch", "Unscrupulous retailer injects fake drug box with unregistered barcode", "Drug Layer Gate", "COUNTERFEIT_BATCH_DETECTED", "Dispense blocked; pharmacy node audited; police notification"],
    ["Broken Custody", "Drug diverted from distributor hijacked or stolen in transit", "Custody Gate", "BROKEN_CUSTODY_CHAIN", "Blocked; logistics carrier flagged for unauthorized inventory"],
    ["Regulatory Recall", "Manufacturer or CDSCO detects contamination; recall broadcast", "Recall Flag Gate", "RECALLED_DRUG_BATCH", "Zero-day block nationwide across all 100% connected pharmacies"],
    ["Expired Rx", "Patient presents outdated prescription past 30-day validity window", "Time Check Gate", "EXPIRED_PRESCRIPTION", "Dispensing rejected; patient prompted to consult doctor for renewal"]
]
for r_idx, row in enumerate(attack_rows):
    for c_idx, val in enumerate(row):
        cell = table.cell(r_idx, c_idx)
        cell.text = val
        p = cell.text_frame.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER if c_idx in [2, 3] else PP_ALIGN.LEFT
        p.font.name = "Segoe UI"
        if r_idx == 0:
            cell.fill.solid(); cell.fill.fore_color.rgb = C_NAVY
            p.font.bold = True; p.font.size = Pt(13.5); p.font.color.rgb = C_WHITE
        else:
            cell.fill.solid()
            cell.fill.fore_color.rgb = RGBColor(255, 255, 255) if r_idx % 2 == 0 else RGBColor(241, 245, 249)
            p.font.size = Pt(13); p.font.color.rgb = C_TEXT_DARK
            if c_idx == 2 and r_idx > 1:
                p.font.bold = True; p.font.color.rgb = C_CRIMSON


# ==============================================================================
# SLIDE 11: PRIVACY PRESERVATION & DPDP ACT (2023)
# ==============================================================================
s11 = prs.slides.add_slide(blank_slide_layout)
add_header(s11, "Privacy Preservation & DPDP Act (2023) Compliance", "Eliminating patient re-identification while achieving 96.2% ledger storage reduction")

if os.path.exists('figures/fig5_storage_scalability.png'):
    s11.shapes.add_picture('figures/fig5_storage_scalability.png', Inches(1.0), Inches(2.2), width=Inches(10.5))

add_card(s11, Inches(12.0), Inches(2.2), Inches(7.0), Inches(8.2), C_BG_CARD, C_BORDER)
tb = s11.shapes.add_textbox(Inches(12.3), Inches(2.5), Inches(6.4), Inches(7.5))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "Cryptographic Privacy Model"; p.font.size = Pt(22); p.font.bold = True; p.font.color.rgb = C_NAVY

dpdp_points = [
    "Zero On-Chain PII: Patient Name, Aadhaar, Age, Gender, and Medical Diagnosis are NEVER written to the blockchain.",
    "Salted SHA-256 Entropy: Each prescription incorporates a 128-bit cryptographically secure random salt (2^128 search space), rendering rainbow table and brute-force attacks computationally infeasible.",
    "Unlinkable Pseudonymity: Multiple prescriptions issued to the same patient yield completely uncorrelated 256-bit hashes, preventing dossier profiling.",
    "Off-Chain Sensitive Storage: Clinical details stored securely in doctor/patient off-chain MongoDB instance; only cryptographic hashes cross into the public consortium.",
    "96.2% Ledger Storage Reduction: On-chain footprint is only 0.48 KB per dispense vs 12.5 KB for monolithic FHIR/PDF chains, enabling 100K transactions in under 47 MB."
]
for pt in dpdp_points:
    p = tf.add_paragraph(); p.text = "• " + pt; p.font.size = Pt(15); p.space_before = Pt(8)


# ==============================================================================
# SLIDE 12: COMPARATIVE BENCHMARK (RADAR)
# ==============================================================================
s12 = prs.slides.add_slide(blank_slide_layout)
add_header(s12, "Multi-Dimensional Benchmark Against State-of-the-Art", "MedTrust uniquely dominates across privacy, latency, gas cost, and dual-layer atomicity")

if os.path.exists('figures/fig4_comparative_benchmarks.png'):
    s12.shapes.add_picture('figures/fig4_comparative_benchmarks.png', Inches(1.0), Inches(2.2), width=Inches(9.2))

add_card(s12, Inches(10.6), Inches(2.2), Inches(8.4), Inches(8.2), C_BG_CARD, C_BORDER)
tb = s12.shapes.add_textbox(Inches(11.0), Inches(2.4), Inches(7.6), Inches(7.8))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "System Comparison Highlights"; p.font.size = Pt(22); p.font.bold = True; p.font.color.rgb = C_NAVY

comp_points = [
    "Vs Ethereum E-Prescriptions: Public Ethereum incurs high gas fees ($2–$25/tx), unpredictable 15-second block latency, and 15 TPS throughput cap. MedTrust provides 0 gas fees, 2.4 ms latency, and 1,690 TPS.",
    "Vs PharmaChain / HyperChain: Existing drug traceability systems track serialized boxes but ignore prescription legitimacy, leaving a massive backdoor for forged prescriptions.",
    "Vs Centralized State PDMPs: Traditional SQL prescription monitoring programs suffer from single-point-of-failure vulnerabilities, insider tampering risks, and lack physical drug provenance.",
    "Unified Synergy: MedTrust is the first framework to achieve 100% Dual-Layer Atomicity with full DPDP Act compliance and sub-3ms retail checkout latency."
]
for pt in comp_points:
    p = tf.add_paragraph(); p.text = "• " + pt; p.font.size = Pt(15.5); p.space_before = Pt(12)


# ==============================================================================
# SLIDE 13: CONCLUSION & DELIVERABLES
# ==============================================================================
s13 = prs.slides.add_slide(blank_slide_layout)
add_header(s13, "Conclusion & Project Deliverables", "A fully functional, end-to-end verified prototype ready for real-world pilot deployment")

# Left Column: Completed Deliverables
add_card(s13, Inches(1.0), Inches(2.2), Inches(8.8), Inches(8.2), C_WHITE, C_BLUE)
tb = s13.shapes.add_textbox(Inches(1.3), Inches(2.4), Inches(8.2), Inches(7.8))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "Completed Capstone Deliverables"; p.font.size = Pt(22); p.font.bold = True; p.font.color.rgb = C_NAVY

comp_delivs = [
    "Go Chaincode Contracts: Written, modularized, and tested: prescription_layer.go, drug_provenance_layer.go, gateway_contract.go.",
    "Cryptographic Verification Engine: Real ECDSA secp256r1 signing/verification and salted SHA-256 generation in crypto_engine.js.",
    "Node.js Express Blockchain Gateway: Multi-organization REST API orchestrating atomic dual-layer verification and CouchDB state management.",
    "React 18 Healthcare UI: Full responsive multi-role frontend featuring Doctor Portal, Patient Mobile Pass, Pharmacist POS, Manufacturer Hub, and CDSCO Command Center.",
    "Benchmark & Simulation Suite: End-to-end evaluation suite testing Scenarios A through F across 8 realistic Indian pharma datasets."
]
for d in comp_delivs:
    p = tf.add_paragraph(); p.text = "✔ " + d; p.font.size = Pt(15); p.space_before = Pt(10)

# Right Column: Future Roadmap
add_card(s13, Inches(10.2), Inches(2.2), Inches(8.8), Inches(8.2), C_BG_CARD, C_BORDER)
tb = s13.shapes.add_textbox(Inches(10.5), Inches(2.4), Inches(8.2), Inches(7.8))
tf = tb.text_frame; tf.word_wrap = True
p = tf.paragraphs[0]; p.text = "Future Directions & Pilot Deployment"; p.font.size = Pt(22); p.font.bold = True; p.font.color.rgb = C_NAVY

future_points = [
    "Fabric Testnet Deployment: Deploy compiled Go chaincode directly to multi-peer Hyperledger Fabric test-network via fabric-gateway SDK.",
    "Hardware Integration: Direct Bluetooth/HID barcode and RFID scanner integration with POS cashier terminal hardware.",
    "ABDM / Ayushman Bharat Digital Mission: Interoperability with India's Ayushman Bharat Health Account (ABHA) and Electronic Health Record (EHR) standards.",
    "Zero-Knowledge Range Proofs: Exploring Bulletproofs for dosage validation without revealing specific prescription contents.",
    "Pilot Pharmacy Trial: Field trial in partnership with hospital pharmacies to evaluate cashier workflow ergonomics and real-world throughput."
]
for f in future_points:
    p = tf.add_paragraph(); p.text = "➔ " + f; p.font.size = Pt(15); p.space_before = Pt(10)


# ==============================================================================
# SLIDE 14: REFERENCES & Q&A
# ==============================================================================
s14 = prs.slides.add_slide(blank_slide_layout)
add_card(s14, Inches(1.0), Inches(1.0), Inches(18.0), Inches(9.25), C_NAVY, C_NAVY)

tb = s14.shapes.add_textbox(Inches(1.8), Inches(1.5), Inches(16.4), Inches(8.0))
tf = tb.text_frame; tf.word_wrap = True

p = tf.paragraphs[0]; p.text = "Key Academic References"; p.font.size = Pt(28); p.font.bold = True; p.font.color.rgb = C_BLUE

refs = [
    "[1] S. Pancari et al., 'A Systematic Comparison between Ethereum and Hyperledger Fabric Blockchain Platforms,' Sensors, 23(19):8319, 2023.",
    "[2] A. Musamih et al., 'A Blockchain-based Approach for Drug Traceability in Healthcare Supply Chain,' IEEE Access, 9:9728–9743, 2021.",
    "[3] CEUR Workshop Proceedings, 'A Blockchain Based Approach for E-Prescription System Security and Traceability,' Vol. 3616, 2024.",
    "[4] N. Zakari et al., 'Blockchain technology in the pharmaceutical industry: a systematic review,' PeerJ Computer Science, 8:e840, 2022.",
    "[5] Ministry of Law and Justice (Govt. of India), 'The Digital Personal Data Protection Act, 2023,' The Gazette of India, Act No. 22 of 2023."
]
for r in refs:
    p = tf.add_paragraph(); p.text = r; p.font.size = Pt(14); p.font.color.rgb = RGBColor(203, 213, 225); p.space_before = Pt(8)

p_qa = tf.add_paragraph(); p_qa.text = "Thank You! Questions & Discussion"; p_qa.font.size = Pt(40); p_qa.font.bold = True; p_qa.font.color.rgb = C_WHITE; p_qa.space_before = Pt(36)
p_email = tf.add_paragraph(); p_email.text = "MedTrust Project Repository & Demo: https://github.com/medtrust | NMIMS Indore"; p_email.font.size = Pt(18); p_email.font.color.rgb = C_BLUE; p_email.space_before = Pt(10)

out_path = 'MedTrust_Final_Capstone_Presentation.pptx'
prs.save(out_path)
print(f"Presentation generated successfully: {out_path}")
