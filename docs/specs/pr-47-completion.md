# PR #47 Completion Specification

## Problem Statement

PR #47 is a partial Committee-operated finance workspace, but its live implementation does not yet satisfy the approved contract for authorization, Draft-first Claims, receipts, payment details, balances, annual migration, mobile recovery, and staging verification. Further implementation needs one authoritative, dependency-aware handoff.

## Solution

Complete the mobile-first React/Vite web app served by Apps Script HTML Service. Google Sheets remains the annual data/reporting layer and Google Drive remains the file store. Only active allowlisted Committee and Treasurer Google accounts use finance operations; Members remain Claimants represented by Committee Operators.

## User Stories

1. As an active operator, I want server-enforced allowlist authorization, so that every finance action is attributable and protected.
2. As a Committee Operator, I want to create a Member with a complete eight-digit SID and optional name, so that I can record a Claim for a new Member.
3. As an operator, I want to save and resume a private Draft, so that a phone interruption does not lose my work.
4. As an operator, I want the same Draft identity and idempotency key reused on retry, so that one action cannot create duplicate Claims.
5. As an operator, I want an accessible correction dialog that preserves values and local files, so that validation and network errors are recoverable.
6. As an operator, I want to submit without a Receipt while being advised to attach one, so that evidence is recommended without blocking intake.
7. As a mobile operator, I want camera capture and photo/file picking, so that downloaded WhatsApp evidence can be submitted from a phone.
8. As an operator, I want multiple image/PDF Receipts up to 5 MB each and optional metadata, so that evidence remains flexible.
9. As an operator, I want FPS, PAYME, or OTHER payment details, so that the saved Claim matches the actual payment method.
10. As a Treasurer, I want exactly one approved Budget Line on final submission while retaining over-budget choices with warnings, so that funding is explicit without blocking intake.
11. As a Treasurer, I want full and partial Payouts tied to Finance Accounts, so that account balances reflect money actually sent.
12. As a Treasurer, I want an append-only Movement Ledger and reconciliation view, so that balances are traceable and duplicate movements are detectable.
13. As a Treasurer, I want self-approved Claims visibly flagged, so that the explicit self-approval exception remains auditable.
14. As a Treasurer, I want asynchronous Discord notices with delivery status and retry, so that notification failures do not corrupt finance workflows.
15. As a Treasurer, I want an interactive annual migration wizard, so that Members, Accounts, Events, Categories, and Users can be selected instead of re-entered.
16. As a Treasurer, I want migration validation, snapshot, rollback, and health checks, so that a failed activation cannot strand the annual system.
17. As an operator, I want swipeable dashboard views with keyboard/button alternatives, so that mobile navigation is convenient and accessible.
18. As a maintainer, I want focused tests and staging browser evidence, so that PR #47 is mergeable based on behavior rather than claims.

## Implementation Decisions

- The Users sheet is the access allowlist. Only active Google accounts with COMMITTEE or TREASURER roles may use finance operations. Role promotion remains spreadsheet-owner-only. Members do not log in in this release.
- SID is text and exactly eight digits, preserving leading zeros. Claimant name is optional. Unknown or inactive SIDs are hard blocks, including for Drafts. Committee-only Member creation is required.
- Claims are Draft-first. Values and selected files remain local until final submission. One atomic public Claim operation validates everything before writing, uses a stable idempotency key, and cleans only artifacts created by the failed attempt.
- Claims are HKD only. Receipts are optional; multiple image/PDF files are allowed up to 5 MB each. Missing proof and receipt mismatches are warnings. Images may be compressed for readability; PDFs and PayMe QR files must preserve fidelity.
- Payment methods are FPS, PAYME, and OTHER only. FPS requires phone plus destination account. PAYME requires exactly one phone or QR. OTHER requires free text. BANK and CASH are removed from public contracts.
- Final submission requires exactly one approved Budget Line. Unavailable or over-budget lines remain selectable with a warning.
- A Treasurer may verify and approve their own Claim; Committee may not self-verify. Self-approved Claims must be marked SELF_APPROVED in audit/report data. The newer approved decision supersedes the conflicting no-self-verification ADR.
- Balances derive from an append-only Movement Ledger under lock and idempotency. Approved Income posts money-in once; Sent Payout posts money-out once; failed attempts post nothing; Transfers affect both accounts; Treasurer Adjustments require a reason and audit. Full Payout marks the Claim PAID; partial Payout leaves the remainder.
- Finance Accounts can be created, renamed, deactivated, or historically retained by a Treasurer. Historical records are never hard-deleted.
- Reconciliation is Treasurer-only and derived from the ledger. It shows mismatches, income/payout/transfer drill-down, failed or incomplete payouts, opening-balance comparisons, and audited corrections.
- Discord follow-up notices are asynchronous, contain no payment details, and use pending/sent/failed delivery records with Treasurer retry.
- Setup is idempotent and non-destructive. Destructive reset is a separate owner-only operation. Operational IDs remain in annual spreadsheet configuration; secrets remain in Script Properties.
- Annual Migration uses exactly: PREVIEW -> MEMBERS -> ACCOUNTS -> EVENTS -> CATEGORIES -> USERS -> VALIDATE -> ACTIVATE.
- Migration creates a new year folder, annual spreadsheet, Receipt folder, Payment QR Code folder, and Export folder. One annual file contains SEM A, SEM B, and SUMMER.
- Migration is resumable by an active Treasurer, persists selections and stage, supports Back/Save/Continue/Resume/Cancel/Retry, and never activates staging automatically.
- Migration creates a preflight snapshot. Activation switches the active pointer only after validation, audits the change, shares the target with active operators, and makes the previous file read-only/viewable. Failed health checks restore the previous pointer without deleting either file.
- Active operators are carried forward; MEMBER rows are excluded; roles are not auto-promoted; citycf41@gmail.com is recommended but not mandatory. Finance history is never copied. Opening balances require Treasurer confirmation and reasons.
- New code uses focused services/helpers, typed API contracts, bounded reads, cached summaries, locks, and resumable batches. No new database is introduced.
- The UI is mobile-first with desktop support, semantic controls, focus management, accessible dialogs, keyboard alternatives, swipeable dashboard views, and no native alert/confirm dialogs.

## Ticket Decomposition for to-tickets

1. **Security, configuration, setup, and API foundation**
   - Dependency: none.
   - Deliver active-operator authorization, denial auditing, typed errors, idempotent setup, owner-only reset, configuration separation, and removal of legacy production write paths.

2. **Atomic Claims, Receipts, Payments, Payouts, Income, and Movement Ledger**
   - Dependency: ticket 1.
   - Deliver Draft-first atomic submission, stable idempotency, separate QR storage, strict payment validation, accessible recovery, payout confirmation, and ledger-safe balance updates.

3. **Resumable Annual Migration with rollback and health checks**
   - Dependency: ticket 1; may run alongside ticket 2.
   - Deliver the exact eight-stage wizard, selective carry-forward, opening balances, staged persistence, preflight snapshot, reversible activation, and post-activation validation.

4. **Reconciliation, accessibility, standards, and staging proof**
   - Dependency: tickets 2 and 3.
   - Deliver the Treasurer reconciliation dashboard, mobile/keyboard UX, Discord delivery audit/retry integration, changed-file quality cleanup, and staging browser evidence.

Each child ticket must link to Issue #48 and this specification, contain external-behavior acceptance criteria, and attach commit, test, and staging evidence.

## Testing Decisions

- Test external behavior and domain invariants at the highest existing seam; do not test private helper structure.
- Extend the existing Jest and Sheets/Drive harness for authorization, setup idempotency, Claim validation, atomic file cleanup, payment variants, payout/income movements, reconciliation, and migration stages.
- Add React-to-Apps-Script contract coverage for success, structured failures, unauthorized access, duplicate requests, retries, unknown outcomes, and Draft/file preservation.
- Add non-production staging browser journeys for Claim with and without Receipts, multiple files and PayMe QR, correction/retry, Treasurer approval, full/partial/failed Payout, reconciliation, Discord retry, migration resume, validation failure, activation, rollback, and health-check failure.
- Required release evidence: backend tests, frontend build, changed-file Ultracite result with any legacy baseline documented, generated artifact verification, staging evidence, and proof that tests never mutate production.

## Out of Scope

AppSheet, product Google Forms, Member login, Member-managed accounts, attendance, offline mode, WhatsApp API, direct FPS/PayMe API integration, external hosting, a new database, automatic role promotion, automatic event linking, and copied finance history. Historical Claims, Receipts, Payouts, Income, Ledger records, Audit History, and Finance Accounts are not hard-deleted.

## Further Notes

Issue #48 is the parent implementation specification for PR #47. Keep it open until all four child tickets and their staging evidence are complete. The current PR remains not merge-ready until authorization, atomic finance writes, migration safety, reconciliation, accessibility, and verification gates are satisfied.
