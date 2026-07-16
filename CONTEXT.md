# CONTEXT.md — Glossary

Canonical language for the university club finance dashboard system. Code identifiers, docs, and discussions must use these terms exactly.

## Domain Language

| Term | Meaning |
|------|---------|
| **Claim** | A request for reimbursement, created by a Submitter. Tied to one BudgetRequestLine. Contains one or more ClaimLineItems referencing Receipts. Status life: `SUBMITTED → NEEDS_INFO → VERIFIED → APPROVED_FOR_PAYOUT → PAID → LOCKED` (or `REJECTED` at any review stage). |
| **ClaimLineItem** | The atom linking money to authority: one portion of one Receipt charged to one BudgetRequestLine. |
| **Receipt** | An image/PDF uploaded to a restricted Drive folder. Tracked by Drive file ID and SHA-256 hash. Has vendor, date, and total. |
| **BudgetRequest** | A pre-spend ask ("may we spend?"). Contains one or more BudgetRequestLines. Status life: `DRAFT → PENDING → APPROVED/PARTIALLY_APPROVED/REJECTED/NEEDS_INFO/WITHDRAWN → CLOSED`. |
| **BudgetRequestLine** | One category-level line of a BudgetRequest. Has requested/approved/remaining amounts. Approved lines *are* the budget. |
| **Category** | A fixed annual budget bucket (e.g. Marketing, Operations). Each BudgetRequestLine maps to exactly one Category. |
| **Event** | A named activity (e.g. "Fall Gala") that groups related BudgetRequests. |
| **Payout** | One transfer of money to one payee for one Claim. Method is FPS/PayMe/Bank/Cash. Status: `QUEUED → SENT → CONFIRMED`. |
| **User** | A committee member or participant, stored in the Users sheet. Has a role (`admin`/`treasurer`), email, and display name. |
| **Submitter / Claimant** | The person requesting reimbursement (a User). Authenticated via Google Login. |
| **Note** | An optional text field on a Claim explaining the expense purpose. |
| **Engine** | The Apps Script backend (`Engine.js`) that is the sole mutator of status and audit data. Humans express intent via intent columns; the Engine performs transitions. |
| **Intent column** | An editable column (ACTION / AMOUNT_OVERRIDE / NOTE / CONFIRM) where a human expresses what they want done. The Engine reads it, acts, and clears it. |
| **AuditLog** | Append-only, hash-chained record of every mutation. Written only by the Engine; verified by `verifyChain()`. |
| **Dashboard** | The React frontend in `src/frontend/` where Submitters view their Claims and BudgetRequests, submit new Claims, and edit pending ones. |
| **Admin Interface** | The raw Google Sheet. Committee members review and approve claims directly in the spreadsheet. |
| **Semester** | The fiscal period (e.g. `26A`). IDs embed it; `closeSemester()` freezes it. |
| **Locked** | Terminal claim state: rows are protected and the Engine refuses all writes. Corrections after lock are reversing entries, never edits. |
| **Self-approved item** | A request or claim where the approver/verifier is also the requester/claimant (in practice: the Treasurer). Permitted, always flagged and announced. |

## Technical Language

| Term | Meaning |
|------|---------|
| **GAS** | Google Apps Script — the runtime for the backend files (`.gs` compiled to `.js` at root). |
| **CF-Ledger** | Primary spreadsheet workbook containing all data tabs (Users, Categories, BudgetRequests, ExpenseClaims, Receipts, AuditLog, etc.). |
| **CF-Vault** | Separate, restricted spreadsheet for PII (student IDs, payout handles). Never referenced by the frontend or included in Discord messages. |
| **clasp** | CLI tool for pushing code to a GAS project (`@google/clasp`). |

## Avoid

| Term | Reason |
|------|--------|
| Reimbursement, Transaction | Use **Claim** instead. |
| Proof, Invoice | Use **Receipt** instead. |
| State | Use **Status** instead. |
| Description | Use **Note** instead. |
| Applicant | Use **Submitter** or **Claimant** instead. |
| User Profile, Bank Info | Use **Payment Details** instead. |
| Immutable | Use **Locked** only for the terminal claim state. |
| Admin Panel, CMS | Use **Admin Interface** (it's the raw sheet). |
