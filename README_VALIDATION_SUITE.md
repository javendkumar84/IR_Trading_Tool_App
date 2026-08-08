# Enterprise Trade Validation Suite & Playwright Automation Framework

Welcome to the **Enterprise Trade Validation & Playwright Automation Suite** for the Interest Rate Derivatives Trading Platform.

This framework delivers automated trade booking validation, deep FpML XML parsing vs UI field comparison, amendment delta tracking, reusable XML comparison engines, and stakeholder-ready PDF report generation.

---

## 1. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                            IR DERIVATIVES TRADING TOOL                            |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
   +----------------------------------------------------------------------------+
   |                             NAVBAR / NAVIGATION                            |
   |  [Dashboard] [XML Capture] [SQL Blotter] [Amend] [QA] [Validation Dashboard]|
   +----------------------------------------------------------------------------+
                                         |
                                         v
   +----------------------------------------------------------------------------+
   |                       TRADE VALIDATION DASHBOARD UI                        |
   | - Execution Controls (Booking, Amendment, Full Regression, PDF Export)     |
   | - Real-time Progress Bar & Test Counters (Passed, Failed, Skipped)         |
   | - Interactive Evidence Viewer (Screenshot, XML Diff, Field Matrix)       |
   +----------------------------------------------------------------------------+
         |                                |                               |
         v                                v                               v
+------------------+            +-------------------+            +--------------------+
|  BOOKING ENGINE  |            | AMENDMENT ENGINE  |            | XML COMPARISON     |
|  - E2E 9 Products|            | - Field Mutator   |            |  ENGINE            |
|  - XML vs UI Diff|            | - Diff Tracker    |            | - Node Parser      |
|  - Evidence Logs |            | - Before/After    |            | - Structural Diff  |
+------------------+            +-------------------+            +--------------------+
         |                                |                               |
         +--------------------------------+-------------------------------+
                                         |
                                         v
   +----------------------------------------------------------------------------+
   |                    PDF REPORT & EVIDENCE GENERATOR ENGINE                  |
   | - Cover Page & Executive Summary Metrics                                   |
   | - Embedded Evidence Snapshots & XML Diff Tables                            |
   | - Stakeholder-Ready PDF Formatting (Page Numbers, TOC, Branding)          |
   +----------------------------------------------------------------------------+
```

---

## 2. Folder Structure

```
IR_Trading_Tool/
├── src/
│   ├── components/
│   │   ├── TradeValidationDashboard.tsx   # Interactive Validation UI & Control Panel
│   │   ├── Navbar.tsx                      # Updated Navbar with "Validation Dashboard" tab
│   ├── lib/
│   │   ├── xmlComparisonEngine.ts         # Reusable XML parser & tree comparison engine
│   │   ├── tradeValidationSuite.ts        # Booking & Amendment Validation Orchestrator
│   │   ├── pdfValidationReportGenerator.ts # Enterprise PDF Report Generator
│   │   ├── screenshotUtility.ts           # Automated DOM/Evidence Screenshot Capture
│   ├── types.ts                           # Added Validation Types & Interfaces
├── e2e/
│   ├── pages/                             # Page Object Models (POM)
│   │   ├── BookingPage.ts
│   │   ├── AmendmentPage.ts
│   ├── tests/                             # Playwright TypeScript Specs
│   │   ├── tradeValidation.spec.ts
├── playwright.config.ts                   # Playwright E2E configuration
├── evidence/                              # Evidence Repository (Bookings & Amendments)
├── reports/                               # Generated Reports (PDF, HTML, XML, Screenshots)
```

---

## 3. Supported Product Types (All 9 Derivatives)

1. **Vanilla Interest Rate Swap (`IRS`)**
2. **Interest Rate Cap / Floor Option (`CAP_FLOOR`)**
3. **European Swaption (`SWAPTION`)**
4. **Structured Range Accrual Swap (`RANGE_ACCRUAL`)**
5. **SnowRange Memory Ratchet Swap (`SNOW_RANGE`)**
6. **Target Redemption Note / Swap (`TARN`)**
7. **Snowball Step-Up Ratchet Swap (`SNOWBALL`)**
8. **Cross-Currency FX Forward (`FX_FORWARD`)**
9. **European FX Option (`FX_OPTION`)**

---

## 4. Execution Workflow

### Feature 1 – Trade Booking Validation
1. Automated booking across all 9 supported product types.
2. Extracts generated Trade ID and parses FpML XML payload.
3. Retrieves UI displayed values (Trade ID, Product, Currency, Counterparty, Notional, Rates, Dates, Status).
4. Compares XML values vs UI values:
   - `✓ PASS` if XML = UI
   - `✗ FAIL` if mismatch exists.
5. Captures screenshot evidence and stores comparison matrix.

### Feature 2 – Trade Amendment Validation
1. Opens booked trade in amendment editor.
2. Mutates business fields (e.g. Counterparty, Notional, Rate, Spread).
3. Saves amended trade and extracts amended XML.
4. Executes XML Comparison Engine (Original XML vs Amended XML).
5. Highlights changed fields, old vs new values, expected vs actual.
6. Captures before & after screenshots and stores evidence.

### Feature 3 – XML Comparison Engine
- Reusable tree differ ignoring formatting/whitespace.
- Compares node values, missing nodes, added nodes.
- Produces structured PASS/FAIL result and HTML diff string.

### Feature 5 – Stakeholder PDF Report Generation
- Generates a multi-page PDF document containing:
  - **Cover Page**: Project Name, Environment, App Version, Lead Tester, Execution Duration.
  - **Table of Contents**: Formatted section directory.
  - **Executive Summary**: Total Trades, Passed, Failed, Success Rate %.
  - **Validation Matrix**: Trade-by-trade booking & amendment results.
  - **Field Comparisons**: Full XML vs UI attribute comparison table.
  - **Embedded Screenshots**: UI evidence snapshots embedded directly in PDF.

---

## 5. Installation & Execution Guide

### Prerequisites
- Node.js (v18+)
- npm / npx

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Install Playwright Browsers (Optional for E2E runner)
```bash
npx playwright install
```

### Step 3: Run Interactive Trade Validation Suite (UI)
1. Start the application:
   ```bash
   npm run dev
   ```
2. Open [http://localhost:3000](http://localhost:3000) in browser.
3. Click on the **Trade Validation Dashboard** tab.
4. Click **Run Complete Regression** to launch validation execution.
5. Click **Generate Stakeholder PDF** to export and print executive report.

### Step 4: Run Playwright E2E Test Suite (CLI)
```bash
npx playwright test
```

---

## 6. Verification Commands
- **TypeScript Type Checking**: `npx tsc --noEmit`
- **QA Automated Suite**: `npx tsx src/test_qa_runner.ts`
- **Production Bundle Build**: `npm run build`
