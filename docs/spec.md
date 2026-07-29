# Committee Finance Web App Specification

Parent: [Wayfinder map: Code-managed React web app on Apps Script for CF-Budget](https://github.com/Noahlw/finance-dashboard/issues/27)

## Problem Statement

The repository contains a partial Apps Script finance backend and a small React claim form, but the product direction has changed. AppSheet is abandoned. Members provide claim information and receipt photos through WhatsApp; Committee Operators must record claims for them. The current UI models the wrong user, requires a receipt, exposes an incomplete workflow, and submits receipt files separately from the claim. The current anonymous web deployment and deployer-executed identity mode also do not enforce the agreed access boundary. The project needs one coherent, mobile-first finance workspace covering intake, review, payment, reporting, and annual rollover.

## Solution

Build a code-managed React/Vite web app served by Apps Script HTML Service. It is the primary phone interface and a fully equivalent desktop browser interface. Google Sheets remains the annual data store and reporting layer; Google Drive stores receipts, payment QR codes, exports, and annual files. Only active, allowlisted Google accounts with Committee or Treasurer roles use the v1 finance workspace. Members remain Claimants represented by Committee Operators.

## User Stories

1. As a Committee Operator, I want to sign in with my allowlisted Google account, so that finance actions are attributable to me.
2. As a Treasurer, I want multiple active Treasurer accounts, including `citycf41@gmail.com` as the recommended primary, so that the work does not depend on one person.
3. As an unauthorized or inactive account, I want access denied, so that finance data is not exposed.
4. As an operator on a phone, I want a touch-friendly workspace with swipeable views, so that I can work without a PC.
5. As a desktop operator, I want equivalent views and actions, so that PC browser use remains practical.
6. As a Committee Operator, I want a Needs Attention view, so that I can find missing information, warnings, and failed actions quickly.
7. As a Committee Operator, I want shared Claims, Budget Requests, Income, Payout, and Reports views, so that work can be handed over across the committee.
8. As a Committee Operator, I want to record a Claim from WhatsApp information, so that a member does not need to use the finance app.
9. As a Committee Operator, I want to enter a complete SID and an optional real name or nickname, so that a Claimant remains identifiable without requiring a member login.
10. As a Committee Operator, I want duplicate SIDs rejected, so that one annual file cannot contain two records for one member.
11. As a Committee Operator, I want to add a new member through the web app, so that annual setup does not require retyping every member.
12. As a Committee Operator or Treasurer, I want to reactivate an inactive member, so that a legitimate returning member can be selected without creating a duplicate.
13. As an operator, I want to save a Claim as a private Draft and resume it later, so that interrupted mobile work is recoverable.
14. As an operator, I want a Claim stepper for Claimant/Event, amount and Budget Line, payment, Receipts, and review, so that the form is manageable on a phone.
15. As an operator, I want one Claim per Claimant and amount, so that multiple recipients are represented by separate records.
16. As an operator, I want to link a Claim to an optional Event now or later, so that Events can group related Claims without forcing early setup.
17. As an operator, I want to enter a positive HKD amount with two decimal places, so that all active finance records use one currency.
18. As an operator, I want a required Note and Expense Date, so that the purpose and timing of each expense are clear.
19. As an operator, I want every Claim to select one approved Budget Line, so that spending has an intended funding source.
20. As an operator, I want unavailable or over-budget Budget Lines to remain selectable with a warning, so that the committee can record reality for Treasurer review.
21. As an operator, I want to choose FPS, PAYME, or OTHER, with FPS as the default, so that payment details match the real external payment method.
22. As an operator, I want FPS to collect an HK eight-digit phone number and destination account, so that the Treasurer has complete transfer details.
23. As an operator, I want PayMe to accept exactly one phone number or QR code, so that payment instructions are unambiguous.
24. As an operator, I want Other to collect free-form payment information, so that unusual payment methods remain recordable.
25. As an operator, I want to submit without a Receipt while seeing a clear recommendation to attach one, so that missing proof does not prevent intake.
26. As an operator, I want multiple image or PDF Receipts up to 5 MB each, so that downloaded WhatsApp photos and documents work on mobile and desktop.
27. As an operator, I want optional vendor, purchase date, and Receipt Total metadata, so that useful evidence can be captured without making intake brittle.
28. As a Treasurer, I want Receipt Total overages flagged without being silently rejected, so that discrepancies are visible for review.
29. As an operator, I want final Claim and Receipt submission to be atomic, so that a failed save does not leave orphaned Drive files or half-created Claims.
30. As an operator, I want same-operator Receipt reuse for a legitimate split, while cross-operator duplicate hashes are blocked for Treasurer review, so that evidence can be shared without hiding duplicate submissions.
31. As an operator, I want normal edits in Submitted or Needs Info, so that requested corrections are practical.
32. As a Treasurer, I want audited correction of verified pre-payment Claims, so that finance data can be fixed without losing history.
33. As an operator, I want Needs Info to record a request and notify a configured Discord role, so that the committee can contact the member through WhatsApp.
34. As a Committee Operator, I want to create multi-line Budget Requests as Drafts, so that planned spending can be prepared on a phone.
35. As a Treasurer, I want to approve, reduce, request information for, reject, or close Budget Requests line by line, so that partial approval is supported.
36. As an operator, I want requested and approved Budget Line amounts shown separately, so that later Claim availability is explainable.
37. As an operator, I want a Budget Line to be selectable only when its parent request is approved, so that pending or rejected plans cannot fund Claims.
38. As a Treasurer, I want approved line changes to use Needs Info or an audited correction, so that Committee edits cannot bypass approval.
39. As a Treasurer, I want to verify Claims separately from payout approval, so that another operator can review the work.
40. As a Treasurer, I want to approve payouts after verification, so that payout authority remains role-controlled.
41. As an operator, I want Claims rejected with a reason, so that the decision is understandable and auditable.
42. As a Treasurer, I want to record a Payout against one Finance Account, so that money-out is tied to a real pool of funds.
43. As a Treasurer, I want FPS and PayMe Payouts to require a transaction reference, so that external transfers can be reconciled.
44. As a Treasurer, I want to record partial payment in one Payout and manually complete it when the full Claim amount is paid, so that staged payment is supported without duplicate Payout records.
45. As a Treasurer, I want failed Payout attempts to leave balances unchanged, notify Treasury, and be retryable, so that transient external failures do not corrupt finance data.
46. As a Treasurer, I want post-Sent Payout data protected from ordinary edits, so that corrections require an auditable finance process.
47. As a Committee Operator, I want to record Income against one proposed Finance Account with an optional source reference, so that incoming money enters a review queue.
48. As a Treasurer, I want to confirm or change the Income account and approve the record, so that account classification is controlled.
49. As a Treasurer, I want approved Income to increase the balance exactly once, so that retries cannot double-count money-in.
50. As a Treasurer, I want approved Income corrections to use an Account Adjustment, so that original postings remain preserved.
51. As a Treasurer, I want separately received amounts recorded as separate Income records, so that each receipt has its own approval history.
52. As a Treasurer, I want named Finance Accounts for pools such as a personal PayMe account or Cash Box, so that balances are tracked separately.
53. As a Treasurer, I want audited Account Adjustments and Transfers, so that corrections and movement between accounts are explainable.
54. As a Treasurer, I want Semester dates configurable in the annual spreadsheet, so that the three-period calendar matches the committee.
55. As an operator, I want Semester suggested from Expense Date and out-of-range dates assigned to the current open Semester, so that intake is not blocked by calendar edge cases.
56. As a Committee Operator, I want to correct the assigned Semester, so that an operator can fix a reasonable classification with an audit record.
57. As a Treasurer, I want Semester Close to delete private Drafts, lock finance records, and block unresolved non-draft work, so that closed periods are reliable.
58. As a Treasurer, I want Account balances to roll forward between Semesters, so that I do not re-enter the same balance.
59. As a Treasurer, I want closing `SUMMER` to launch an interactive annual migration, so that the next academic year is created without manual re-entry.
60. As a Treasurer, I want the migration to create `CF Budget/2026-2027 (42)/` beneath a configured parent with annual Receipt, Payment QR Code, and Export folders, so that files are separated by academic and committee year.
61. As a Treasurer, I want active members and `Users` rows preselected for review, so that continuing people retain identity and access without re-entry.
62. As a Treasurer, I want inactive members preserved for history but excluded from new Claims, so that departures do not erase records or remain accidentally selectable.
63. As a Committee Operator, I want new members added through the web app without creating login access, so that member records and operator accounts stay separate.
64. As a Treasurer, I want Finance Account balances prefilled from prior closing balances and editable with a reason, so that rollover is both efficient and reconciled.
65. As a Treasurer, I want Events selectively carried as new annual records without copying old Claims, Budget Requests, or Payouts, so that event continuity does not duplicate financial history.
66. As a Treasurer, I want the new annual spreadsheet created from a fresh schema and activated only after validation, so that stale history and missing Treasurer access cannot leak into production.
67. As an operator, I want previous annual files read-only but viewable, so that historical reporting and audit remain available.

## Implementation Decisions

- Use one server seam: React calls the Apps Script API boundary through `google.script.run`; the boundary authenticates the active Google account, delegates to domain services, and returns normalized view data or structured errors. Keep Sheet and Drive access behind existing configuration/domain services rather than teaching React about storage.
- Replace the current member-self-service assumption with a Committee Workspace. The API must resolve the active operator from the annual `Users` allowlist and enforce role permissions server-side. Production must require signed-in Google access and execute with the accessing user identity.
- Model Claimant identity separately from operator identity. Require the complete SID, keep optional name/nickname, preserve the operator and audit identity, enforce SID uniqueness per annual file, and keep Member Accounts out of v1.
- Expand the existing Claim model to include Expense Date, Semester, Event, payment details, receipts, missing-receipt condition, Budget Line, audit state, and one Payout. Keep the agreed Claim state machine: Draft, Submitted, Needs Info, Verified, Approved for Payout, Paid, Locked, or Rejected.
- Implement the React workspace as mobile-first stepper workflows and shared queues, with desktop tabs or equivalent controls. Draft saves happen at explicit Save Draft actions and step transitions, not every keystroke. Drafts are private and excluded from operational queues until submitted.
- Treat final Claim submission and Receipt persistence as one logical transaction. Use an idempotency key, validate all metadata before writing, clean up newly created Drive files if the Sheet transaction fails, and return retry-safe errors. Receipts are images or PDFs, up to 5 MB each; missing receipts and Receipt Total overages are warnings.
- Keep payment details on each Claim. The UI dynamically validates FPS, PAYME, and OTHER fields; Payout uses the saved method/details. Payment QR codes use their own metadata and Drive location rather than the purchase Receipt path.
- Preserve separate domain services for Claims, Budget Requests, Income, Payouts, Finance Accounts, Semester Close, Annual Migration, Discord notification, and Audit History. All state transitions and balance movements must be idempotent and server-authoritative.
- Use semester-scoped Budget Lines and shared annual tables with a Semester field. Availability is advisory at Claim submission; payout approval requires a budget adjustment or Treasurer override for an over-budget Claim. Non-draft unresolved work blocks close.
- Model Finance Account balance movements explicitly: approved Income posts money-in once, successful Payout money-out posts at Sent, failed attempts do not post, Transfers affect two accounts, and Account Adjustments require Treasurer reason and audit data.
- Implement Annual Migration as a resumable staged workflow. Create a fresh annual spreadsheet and year folder beneath the configured parent, preselect active members/accounts/Users, allow review and additions, copy only selected reference data, create linked annual records for carried Events/Accounts/Categories, require opening-balance confirmation, require at least one active Treasurer, and require explicit activation. Staging never becomes production automatically.
- Keep Discord best-effort. Information Requests mention the spreadsheet-configured role ID and include only operational Claim context; notification failure is logged and surfaced without rolling back the finance state.
- Correct the deployment and packaging configuration to match the product boundary: signed-in accessing-user execution, no anonymous authorization, separate staging and production settings, secrets in Script Properties, editable operational values in spreadsheet Config, and a build/package step that includes the generated HTML artifact required by Apps Script.
- Treat the repository as the source of truth. The implementation must work through the Vite build and Apps Script deployment flow; production release remains an explicit action after staging verification.

## Testing Decisions

- Test externally visible behavior at the highest available seam. Prefer API/domain tests for authorization, validation, status transitions, idempotency, audit entries, and balance movements; avoid asserting private helper implementation details.
- Extend the existing Jest backend harness and Sheets/Drive test helpers for Claim, Receipt, Budget Request, Income, Payout, Finance Account, Semester Close, and Annual Migration behavior.
- Add contract coverage for the React-to-Apps-Script boundary: successful payloads, structured failures, unauthorized roles, duplicate requests, retry behavior, and atomic Receipt cleanup.
- Use the existing browser/Puppeteer harness for representative mobile and desktop journeys: sign-in boundary, Claim stepper with and without a Receipt, Budget Request, Needs Info, Treasurer approval, Payout failure/retry, dashboard views, and migration activation.
- Run frontend type-check/build/lint checks and verify the generated Apps Script artifact contains the UI. Test the staging deployment against a test spreadsheet and Drive folder; automated tests must never mutate production data.
- Assert acceptance behavior such as missing Receipt warnings, over-budget warnings, cross-operator duplicate blocking, no balance movement for pending/failed actions, read-only closed periods, and no orphaned Drive files after failed submission.
- No repository-wide coverage threshold is currently required; coverage should increase around every new external behavior and every financial mutation.

## Out of Scope

- AppSheet configuration, AppSheet views, AppSheet bots, AppSheet slices, and Google Forms as a user-facing intake path.
- Member login, app-managed Member Accounts, attendance UI, attendance QR scanning, and future Google step-up flows for promoted members.
- WhatsApp API integration; Discord only notifies a configured role and the human follow-up remains manual.
- Direct FPS or PayMe API integration; v1 records externally executed payments.
- Offline queueing, offline conflict resolution, native mobile applications, Next.js, Vercel, and external hosting.
- Direct hard deletion of historical Claims, Payouts, Income, Audit History, or Finance Accounts with history.
- Advisor/Auditor role access in v1.

## Further Notes

The current implementation is a partial scaffold, not a compatible implementation of this specification: it has a member-facing form, requires one Receipt, writes uploads separately, and currently deploys with anonymous/deployer identity settings. Existing APIs, sheet headers, status constants, and setup routines should be treated as migration inputs and compatibility constraints, not as final contracts. The accumulated domain glossary and accepted ADRs in the repository are the source for detailed semantics; this specification is the handoff boundary for implementation tickets.
