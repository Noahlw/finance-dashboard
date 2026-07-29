# CF Finance Domain Glossary

This glossary defines the canonical language for the committee-operated CF finance workspace. It describes the people, records, and business boundaries; implementation details belong in the specification and ADRs.

## People and access

| Term | Meaning |
|------|---------|
| **Committee Operator** | An active Google account on the annual `Users` allowlist that records and reviews finance work on behalf of members. |
| **Treasurer** | An allowlisted operator with authority to approve payouts and Income, manage Finance Accounts, close Semesters, and activate annual migration. |
| **Claimant** | The member who incurred an expense. A Claimant does not log in to the v1 workspace. |
| **SID** | The Claimant's complete student ID. It is required identity data, not an authentication credential. |
| **Name** | An optional real name or nickname recorded with a Claimant's SID. |
| **Users allowlist** | The annual spreadsheet's authoritative list of operator Google accounts, roles, and active status. |

## Finance records

| Term | Meaning |
|------|---------|
| **Claim** | A reimbursement request recorded by a Committee Operator for one Claimant and one positive HKD amount. It selects exactly one approved Budget Line, may link to an Event, and produces one Payout. |
| **ClaimLineItem** | One allocation of part of a Claim to one Receipt and that Claim's single Budget Line. A Claim may have multiple items for multiple Receipts, but never multiple funding lines. |
| **Draft** | A private, incomplete Claim or Budget Request saved for later continuation. Draft form data is persisted; Receipt and Payment QR Code files remain local until final Claim submission. |
| **Note** | The required explanation of a Claim's expense purpose. |
| **Receipt** | A purchase image or PDF attached to a Claim. Vendor, purchase date, and Receipt Total metadata are optional; missing Receipts and Receipt Total overages are warnings. |
| **Payment QR Code** | A PayMe payment file, stored separately from purchase Receipts. PayMe uses exactly one phone number or Payment QR Code. |
| **Payment Details** | The Claim's method-specific payout instructions: FPS phone plus destination account, PayMe phone or QR Code, or OTHER free text. |
| **Payout** | The single payment record for one Claim and one Claimant. It records cumulative money paid from one Finance Account; partial payment stays on the same record until manually completed. |
| **Income** | Money received by CF and recorded against one proposed Finance Account. Treasurer approval posts it to the balance exactly once. |
| **Finance Account** | A named pool of CF money, such as a Treasurer's personal PayMe account or Cash Box, with tracked balance movements. |
| **Account Adjustment** | An audited Treasurer correction to a Finance Account balance that preserves the original movement history. |
| **Transfer** | An audited movement of money between two Finance Accounts. |

## Planning and periods

| Term | Meaning |
|------|---------|
| **Budget Request** | A proposed spending request that may contain multiple independently decided Budget Request Lines. |
| **Budget Line** | One approved funding line within a Budget Request. Every Claim selects one approved line; availability is advisory at intake, so over-budget lines remain selectable with warnings. |
| **Withdrawn** | The terminal status of a `PENDING` Budget Request voluntarily withdrawn by its requester before Treasurer review. |
| **Event** | A named activity that groups related Claims and Budget Requests. A Claim may be linked to an Event later. |
| **Semester** | One of exactly three periods in an annual spreadsheet: `SEM A`, `SEM B`, or `SUMMER`. Each period is reportable and lockable. |
| **Semester Close** | The Treasurer-controlled action that removes private Drafts, blocks unresolved work, rolls balances forward, and locks the closed period. |
| **Annual Migration** | The resumable Treasurer workflow that creates the next annual spreadsheet, carries forward selected reference data and balances, validates it, and explicitly activates it. |
| **Schema Migration** | An owner-only, versioned operation that physically restructures an *existing* ledger's column layout in place — journaled, rollback-capable, canonicalized against `COLS`'s numeric index. Distinct from Annual Migration: it never creates a new spreadsheet, and it is not expected to run in the initial go-live window. |
| **Locked** | A finance record or closed period that ordinary workflows may no longer edit; corrections require an audited correction path. |
| **Needs Info** | A review status requiring more information from the human member through the Committee's manual WhatsApp follow-up. It may trigger a best-effort Discord notice to a configured role. |

## Development and Verification

| Term | Meaning |
|------|---------|
| **Pre-merge Gate** | The automated verification process triggered on a Pull Request targeting the default branch that must pass all code quality, test suite, and build checks before merging. |
| **Premerge Pass** | The aggregate required status check that confirms all underlying parallel verification jobs (linting, testing, building) succeeded cleanly. |

## Avoid

| Avoid | Use instead |
|-------|-------------|
| Member login / Submitter login | Committee Operator records a Claim for a Claimant |
| Reimbursement transaction | Claim |
| Proof / invoice | Receipt |
| Bank transfer / Cash payout in new flows | FPS, PAYME, or OTHER |
| Payment receipt | Payment QR Code or Receipt, depending on what is meant |
| Admin panel / CMS | Finance workspace or Users allowlist |
| `26A`, `26B`, `SUMMER` | `SEM A`, `SEM B`, `SUMMER` |
| AppSheet / Google Forms intake | React/Vite Apps Script finance workspace |
