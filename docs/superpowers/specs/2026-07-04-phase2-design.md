# Phase 2 Design Spec: Engine Complete

## 1. Overview
This spec covers Phase 2 of the CF-Budget system, focusing on advanced Engine features, automated jobs, and read-only reporting.

## 2. Components & Architecture

### 2.1 Income Intake (Action Row)
**Purpose:** Provide the Treasurer a fast, in-sheet UI to record income.
*   **Location:** `Approvals` tab, Row 2.
*   **Fields:** Date, Category (dropdown), Amount, Source Ref, Event (optional dropdown), Notes.
*   **Action:** A checkbox in the final column labeled `[ RECORD INCOME ]`.
*   **Execution:** `onEditApprovals` trigger detects the checkbox, calls `Engine.gs` (or `Income.gs`) to validate, inserts a new row into the `Income` tab, logs it via `Audit.append`, and clears Row 2 for the next entry.

### 2.2 Missing Receipt Flow & Guardrails
**Purpose:** Handle lost receipts without breaking the audit chain, while enforcing strict limits.
*   **Form Update:** Add a "Missing receipt?" multiple-choice question to the Expense Claim form. If 'Yes', users upload a written declaration to the required File Upload field.
*   **Engine Guardrails:** During transition, if `missing_receipt_flag` is true:
    1.  Check `amount` <= `MISSING_RECEIPT_CAP` (HK$200).
    2.  Check past claims by this `claimant_id` in the current semester to ensure count <= `MISSING_RECEIPT_MAX_PER_SEM` (2).
    3.  If either limit is breached, transition is DENIED.

### 2.3 Duplicate Receipt Detection
**Purpose:** Prevent accidental or malicious double-claiming of the same receipt.
*   **Execution:** During intake (`IntakeForms.gs`), the SHA-256 hash of the uploaded receipt is compared against the `sha256` column of all existing `Receipts`.
*   **Outcome:** If an exact match is found, the claim is instantly REJECTED with a clear error message.

### 2.4 Top-Up Linkage
**Purpose:** Handle situations where an expense exceeds the approved budget line.
*   **Execution:** If a claim exceeds `remaining`, it is denied. The user must submit a new Budget Request with `justification` starting with `TOP-UP of BRL-XXX`. The Engine detects this and visually flags it for the approver.

### 2.5 Automated Dashboard
**Purpose:** Provide a read-only, real-time financial overview for the committee and members.
*   **Execution:** A one-off script `buildDashboard()` will create a separate Google Sheets workbook.
*   **Data Flow:** Uses `IMPORTRANGE` to securely pull data from CF-Ledger.
*   **Views:** Uses `QUERY` to generate pivots for Monthly Expense, Monthly Income, and Remaining Budget per Event.

### 2.6 Scheduled Jobs
**Purpose:** Automate nudges and workflow progressions.
*   **Execution:** A time-driven trigger `dailyJob()` running at ~08:00 AM.
*   **Tasks:**
    1.  **SLA Nudges:** Find approvals `PENDING` > 72 hours, send Discord nudge.
    2.  **Auto-Confirm Payouts:** Find payouts `SENT` > 72 hours, automatically transition to `CONFIRMED`.
    3.  **Claim Locking:** Find claims `PAID` > 24 hours, transition to `LOCKED`.

## 3. Data Flow & Interfaces
*   All state mutations must route through `Engine.transition` to guarantee hash-chained `AuditLog` entries.
*   The Dashboard must not have any Apps Script attached to it; it is purely driven by native Sheets functions (`IMPORTRANGE`, `QUERY`, `SUMIFS`).

## 4. Edge Cases & Error Handling
*   If the Dashboard generation fails mid-way, it should fail loudly so it can be re-run safely.
*   Income Intake must validate that all required fields (Date, Category, Amount) are present before processing. If missing, uncheck the box and show a Toast error.
