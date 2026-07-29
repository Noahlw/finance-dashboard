# ADR Master Index

Total: 183 Architecture Decision Records (6 obsolete, 177 active)

| # | Source | Title | Status | Domain |
|---|--------|-------|--------|-------|
| 0001 | from-archive | ADR 0001 — Shared owner account, personal actor accounts | ARCHIVED | OBSOLETE (Historical - pre-dates current) |
| 0002 | from-archive | ADR 0002 — Treasurer-only approval, with self-dealing accept | ARCHIVED | OBSOLETE (Historical - pre-dates current) |
| 0003 | from-archive | ADR 0003 — Extract-and-strangle over Big Bang Clean Architec | ARCHIVED | OBSOLETE (Historical - pre-dates current) |
| 0001 | from-docs-adr | 1. 100% Airtable Native Architecture | ARCHIVED | OBSOLETE (Abandoned tech - Airtable arch) |
| 0001 | from-docs-adr | 0001: Allow Duplicate Receipt Uploads for Receipt Splitting | ACTIVE | architecture-deploy |
| 0002 | from-docs-adr | 2. Airtable Data Layer Simplifications | ARCHIVED | OBSOLETE (Abandoned tech - Airtable data) |
| 0003 | from-docs-adr | 3. Deep Module Script Architecture | ACTIVE | architecture-deploy |
| 0004 | from-docs-adr | Next.js + Google Sheets API Security & Data Flow | ACTIVE | architecture-deploy |
| 0005 | from-docs-adr | 5. Local Ephemeral E2E Testing | ACTIVE | architecture-deploy |
| 0006 | from-docs-adr | React web app is the interface for every role | ARCHIVED | OBSOLETE (Superseded by ADR 0007) |
| 0007 | from-docs-adr | Web app is operated by committee members | ACTIVE | architecture-deploy |
| 0008 | from-docs-adr | Claims separate claimant and operator identity | ACTIVE | claims |
| 0009 | from-docs-adr | Web access is limited to committee operators | ACTIVE | architecture-deploy |
| 0010 | from-docs-adr | Claims remain separate within an event | ACTIVE | claims |
| 0011 | from-docs-adr | Receipts are recommended but not required at claim intake | ACTIVE | architecture-deploy |
| 0012 | from-docs-adr | Missing receipts are explicit claim flags | ACTIVE | architecture-deploy |
| 0013 | from-docs-adr | Claims use an explicit review and payout lifecycle | ACTIVE | claims |
| 0014 | from-docs-adr | Claim mutability follows the review lifecycle | ACTIVE | claims |
| 0015 | from-docs-adr | Treasurer controls pre-payment claim corrections | ACTIVE | payout |
| 0016 | from-docs-adr | Access requires Google identity and an active committee role | ACTIVE | identity-auth |
| 0017 | from-docs-adr | User provisioning remains Treasurer-controlled | ACTIVE | identity-auth |
| 0018 | from-docs-adr | Claimant identity is manually entered before attendance inte | ACTIVE | claims |
| 0019 | from-docs-adr | Claim payment details use conditional methods | ACTIVE | claims |
| 0020 | from-docs-adr | Legacy payout methods are abandoned | ACTIVE | payout |
| 0021 | from-docs-adr | Claims may have multiple purchase receipts | ACTIVE | claims |
| 0022 | from-docs-adr | Claims use HKD only | ACTIVE | payout |
| 0023 | from-docs-adr | Claim amount is manually entered | ACTIVE | claims |
| 0024 | from-docs-adr | Receipt metadata is optional at intake | ACTIVE | architecture-deploy |
| 0025 | from-docs-adr | Receipt and payment files use a bounded upload contract | ACTIVE | payout |
| 0026 | from-docs-adr | Claim and receipt submission is atomic from the operator’s p | ACTIVE | claims |
| 0027 | from-docs-adr | Budget availability does not block claim intake | ACTIVE | budget |
| 0028 | from-docs-adr | Treasurer resolves over-budget claims before payout | ACTIVE | budget |
| 0029 | from-docs-adr | Committee creates budget requests and Treasurer decides | ACTIVE | budget |
| 0030 | from-docs-adr | Budget Requests contain multiple Budget Lines | ACTIVE | budget |
| 0031 | from-docs-adr | Budget Requests can be revised after an information request | ACTIVE | budget |
| 0032 | from-docs-adr | Budget Line decisions are independent | ACTIVE | budget |
| 0033 | from-docs-adr | Each Claim selects one Budget Line | ACTIVE | budget |
| 0034 | from-docs-adr | Claims may be linked to Events later | ACTIVE | architecture-deploy |
| 0035 | from-docs-adr | Event association follows Claim mutability | ACTIVE | architecture-deploy |
| 0036 | from-docs-adr | SID is required and Claimant name is optional | ACTIVE | claims |
| 0037 | from-docs-adr | Each Claim produces one payout | ACTIVE | payout |
| 0038 | from-docs-adr | Payouts are recorded and confirmed manually | ACTIVE | payout |
| 0039 | from-docs-adr | Payouts use the Claim’s saved payment details | ACTIVE | claims |
| 0040 | from-docs-adr | Claim creators cannot verify their own Claims | ACTIVE | review-approval |
| 0041 | from-docs-adr | Committee or Treasurer may reject Claims | ACTIVE | review-approval |
| 0042 | from-docs-adr | Information requests notify a Discord role | ACTIVE | claims |
| 0043 | from-docs-adr | Discord follow-up role is spreadsheet-configured | ACTIVE | architecture-deploy |
| 0045 | from-docs-adr | Discord delivery does not block Claim workflow | ACTIVE | architecture-deploy |
| 0046 | from-docs-adr | Authorized operators may view full Claim payment details | ACTIVE | payout |
| 0047 | from-docs-adr | Authorized operators can view full Claim audit history | ACTIVE | identity-auth |
| 0048 | from-docs-adr | Committee work uses shared queues | ACTIVE | architecture-deploy |
| 0049 | from-docs-adr | Shared queues cover all finance workflows | ACTIVE | architecture-deploy |
| 0050 | from-docs-adr | Semester close is Treasurer-only | ACTIVE | semester-annual |
| 0051 | from-docs-adr | Unresolved finance work blocks Semester Close | ACTIVE | semester-annual |
| 0052 | from-docs-adr | Committee records Income and Treasurer approves it | ACTIVE | accounts-income |
| 0053 | from-docs-adr | Pending Income is excluded from approved balances | ACTIVE | accounts-income |
| 0054 | from-docs-adr | Income supports Treasurer review and correction | ACTIVE | accounts-income |
| 0055 | from-docs-adr | Web app provides finance reports and CSV exports | ACTIVE | architecture-deploy |
| 0056 | from-docs-adr | V1 is online-only | ACTIVE | architecture-deploy |
| 0057 | from-docs-adr | The committee web app is mobile-first | ACTIVE | architecture-deploy |
| 0058 | from-docs-adr | Receipt intake supports mobile and desktop file selection | ACTIVE | architecture-deploy |
| 0059 | from-docs-adr | Apps Script web app runs as the accessing user | ACTIVE | architecture-deploy |
| 0060 | from-docs-adr | The Users sheet is the access allowlist | ACTIVE | identity-auth |
| 0061 | from-docs-adr | Multiple active Treasurers are supported | ACTIVE | architecture-deploy |
| 0062 | from-docs-adr | Claims and Budget Requests use separate UI flows | ACTIVE | claims |
| 0063 | from-docs-adr | Dashboard uses swipeable mobile views | ACTIVE | architecture-deploy |
| 0064 | from-docs-adr | Dashboard views are curated operational views | ACTIVE | architecture-deploy |
| 0065 | from-docs-adr | New Claim uses a mobile stepper | ACTIVE | claims |
| 0066 | from-docs-adr | Claims may be saved as Drafts | ACTIVE | claims |
| 0067 | from-docs-adr | Draft Claims remain private until submission | ACTIVE | claims |
| 0068 | from-docs-adr | Draft Claims can be discarded | ACTIVE | claims |
| 0069 | from-docs-adr | Drafts save at explicit workflow boundaries | ACTIVE | semester-annual |
| 0070 | from-docs-adr | Draft files upload only at final submission | ACTIVE | claims |
| 0071 | from-docs-adr | Budget Requests support private Drafts | ACTIVE | budget |
| 0072 | from-docs-adr | New Budget Request uses a mobile stepper | ACTIVE | budget |
| 0073 | from-docs-adr | Committee manages Events with Treasurer oversight | ACTIVE | architecture-deploy |
| 0074 | from-docs-adr | Treasurer controls Categories and semester caps | ACTIVE | architecture-deploy |
| 0075 | from-docs-adr | Member accounts and attendance are future landing-page capab | ACTIVE | architecture-deploy |
| 0076 | from-docs-adr | Future Member Accounts do not require Google identity | ACTIVE | architecture-deploy |
| 0077 | from-docs-adr | Future member registration proof is deferred | ACTIVE | architecture-deploy |
| 0078 | from-docs-adr | Role promotion remains spreadsheet-only | ACTIVE | identity-auth |
| 0079 | from-docs-adr | Spreadsheet Owner controls future role flags | ACTIVE | identity-auth |
| 0080 | from-docs-adr | Claim purpose note is required | ACTIVE | claims |
| 0081 | from-docs-adr | Claim Expense Date is required | ACTIVE | claims |
| 0082 | from-docs-adr | Same-operator duplicate Receipts are reused | ACTIVE | architecture-deploy |
| 0083 | from-docs-adr | Receipt totals cap split Claims when available | ACTIVE | claims |
| 0084 | from-docs-adr | Payment QR Codes use separate storage from Receipts | ACTIVE | payout |
| 0085 | from-docs-adr | Payment methods require complete conditional details | ACTIVE | payout |
| 0086 | from-docs-adr | FPS and PayMe use normalized Hong Kong phone numbers | ACTIVE | payout |
| 0087 | from-docs-adr | FPS destination accounts are free-form | ACTIVE | payout |
| 0088 | from-docs-adr | Discord notifications are scoped to actionable events | ACTIVE | architecture-deploy |
| 0089 | from-docs-adr | Production deployment is repository-driven | ACTIVE | architecture-deploy |
| 0090 | from-docs-adr | Production releases require explicit approval | ACTIVE | architecture-deploy |
| 0091 | from-docs-adr | Staging is separate from production | ACTIVE | architecture-deploy |
| 0092 | from-docs-adr | Runtime configuration is split by sensitivity | ACTIVE | architecture-deploy |
| 0093 | from-docs-adr | Semester Close provisions the next Drive location | ACTIVE | semester-annual |
| 0094 | from-docs-adr | One spreadsheet covers an academic year | ACTIVE | semester-annual |
| 0095 | from-docs-adr | Each academic year has three semester periods | ACTIVE | semester-annual |
| 0096 | from-docs-adr | Semester Close follows a three-period sequence | ACTIVE | semester-annual |
| 0097 | from-docs-adr | Annual rollover uses an interactive Treasurer migration wiza | ACTIVE | semester-annual |
| 0098 | from-docs-adr | Finance Accounts track balances and cash movement | ACTIVE | accounts-income |
| 0099 | from-docs-adr | Treasurer manages Finance Account lifecycle | ACTIVE | accounts-income |
| 0100 | from-docs-adr | Approved Income updates its Finance Account automatically | ACTIVE | accounts-income |
| 0101 | from-docs-adr | Payouts deduct balances when sent | ACTIVE | payout |
| 0102 | from-docs-adr | Balance discrepancies use audited Account Adjustments | ACTIVE | accounts-income |
| 0103 | from-docs-adr | Finance Account links are role-controlled | ACTIVE | accounts-income |
| 0104 | from-docs-adr | Treasurer can transfer funds between Finance Accounts | ACTIVE | accounts-income |
| 0105 | from-docs-adr | Annual member migration preserves identity and history | ACTIVE | semester-annual |
| 0106 | from-docs-adr | Committee Operators can add new Member records | ACTIVE | architecture-deploy |
| 0107 | from-docs-adr | Annual migration preselects active Finance Accounts | ACTIVE | semester-annual |
| 0108 | from-docs-adr | Annual Migration activates only after Treasurer confirmation | ACTIVE | semester-annual |
| 0109 | from-docs-adr | Annual Migration copies reviewed reference data | ACTIVE | semester-annual |
| 0110 | from-docs-adr | Annual Migration selectively carries Events forward | ACTIVE | semester-annual |
| 0111 | from-docs-adr | Carried Events become new annual records | ACTIVE | semester-annual |
| 0112 | from-docs-adr | Carried Finance Accounts get new annual records | ACTIVE | semester-annual |
| 0113 | from-docs-adr | Carried Categories get new annual records | ACTIVE | semester-annual |
| 0114 | from-docs-adr | SID remains the cross-year Member identity | ACTIVE | identity-auth |
| 0115 | from-docs-adr | Annual migration keeps member identity data unchanged | ACTIVE | semester-annual |
| 0116 | from-docs-adr | Event carry-forward excludes finance history | ACTIVE | semester-annual |
| 0117 | from-docs-adr | Inactive migrated members cannot start new Claims | ACTIVE | architecture-deploy |
| 0118 | from-docs-adr | SID is unique within an annual file | ACTIVE | identity-auth |
| 0119 | from-docs-adr | Member creation does not grant login access | ACTIVE | architecture-deploy |
| 0120 | from-docs-adr | Committee and Treasurer can reactivate members | ACTIVE | architecture-deploy |
| 0121 | from-docs-adr | Member status changes are audited | ACTIVE | architecture-deploy |
| 0122 | from-docs-adr | Annual folder names include the committee year | ACTIVE | semester-annual |
| 0123 | from-docs-adr | Annual folders contain dedicated file folders | ACTIVE | semester-annual |
| 0124 | from-docs-adr | Abandoned migration staging stays resumable | ACTIVE | semester-annual |
| 0125 | from-docs-adr | Committee year number auto-increments | ACTIVE | architecture-deploy |
| 0126 | from-docs-adr | Annual spreadsheet naming matches its folder | ACTIVE | semester-annual |
| 0127 | from-docs-adr | Annual folders use a configured Drive parent | ACTIVE | semester-annual |
| 0128 | from-docs-adr | Closed annual files are read-only | ACTIVE | semester-annual |
| 0129 | from-docs-adr | New annual files start from a fresh schema | ACTIVE | semester-annual |
| 0130 | from-docs-adr | Annual Migration copies Users rows | ACTIVE | semester-annual |
| 0131 | from-docs-adr | Migration requires an active Treasurer | ACTIVE | semester-annual |
| 0132 | from-docs-adr | Primary Treasurer is preselected during migration | ACTIVE | architecture-deploy |
| 0133 | from-docs-adr | Migration does not change roles | ACTIVE | semester-annual |
| 0134 | from-docs-adr | Migration validates Treasurer access before activation | ACTIVE | semester-annual |
| 0135 | from-docs-adr | Opening balances are prefilled for confirmation | ACTIVE | architecture-deploy |
| 0136 | from-docs-adr | Opening-balance differences are audited | ACTIVE | architecture-deploy |
| 0137 | from-docs-adr | Carried accounts can be renamed per year | ACTIVE | semester-annual |
| 0138 | from-docs-adr | New accounts require opening balances | ACTIVE | architecture-deploy |
| 0139 | from-docs-adr | Non-carried accounts remain historical references | ACTIVE | semester-annual |
| 0140 | from-docs-adr | Non-draft Budget Requests block Semester Close | ACTIVE | budget |
| 0141 | from-docs-adr | Budget Lines are Semester-scoped | ACTIVE | budget |
| 0142 | from-docs-adr | Account balances roll forward between Semesters | ACTIVE | accounts-income |
| 0143 | from-docs-adr | Semester Close deletes private drafts | ACTIVE | semester-annual |
| 0144 | from-docs-adr | Semester Close locks period data | ACTIVE | semester-annual |
| 0145 | from-docs-adr | Semester dates are Treasurer-configured | ACTIVE | semester-annual |
| 0146 | from-docs-adr | Semester is assigned from Expense Date | ACTIVE | semester-annual |
| 0147 | from-docs-adr | Out-of-range expenses use the current open Semester | ACTIVE | architecture-deploy |
| 0148 | from-docs-adr | Committee can correct Semester assignment | ACTIVE | semester-annual |
| 0149 | from-docs-adr | Future Expense Dates are allowed | ACTIVE | architecture-deploy |
| 0150 | from-docs-adr | Missing Receipt does not block payout | ACTIVE | payout |
| 0151 | from-docs-adr | Receipts attach until payout approval | ACTIVE | payout |
| 0152 | from-docs-adr | Receipt-total overage is a warning | ACTIVE | architecture-deploy |
| 0153 | from-docs-adr | Final Receipt upload is atomic with Claim submission | ACTIVE | claims |
| 0154 | from-docs-adr | Cross-operator Receipt duplicates require review | ACTIVE | architecture-deploy |
| 0155 | from-docs-adr | Payout reference is required for electronic methods | ACTIVE | payout |
| 0156 | from-docs-adr | Partial Payouts are allowed | ACTIVE | payout |
| 0157 | from-docs-adr | Failed Payouts do not deduct balances | ACTIVE | payout |
| 0158 | from-docs-adr | Sent Payout completion depends on the paid amount | ACTIVE | payout |
| 0159 | from-docs-adr | Partial Payouts require manual completion | ACTIVE | payout |
| 0160 | from-docs-adr | Income links one Finance Account | ACTIVE | accounts-income |
| 0161 | from-docs-adr | Committee proposes the Income account | ACTIVE | accounts-income |
| 0162 | from-docs-adr | Income source reference is optional | ACTIVE | accounts-income |
| 0163 | from-docs-adr | Approved Income uses audited corrections | ACTIVE | accounts-income |
| 0164 | from-docs-adr | Income records represent actual receipts | ACTIVE | accounts-income |
| 0165 | from-docs-adr | Budget Lines retain requested and approved amounts | ACTIVE | budget |
| 0166 | from-docs-adr | Over-budget Budget Lines remain selectable | ACTIVE | budget |
| 0167 | from-docs-adr | Only approved Budget Requests fund Claims | ACTIVE | budget |
| 0168 | from-docs-adr | Closed Budget Requests cannot reopen for Claims | ACTIVE | budget |
| 0169 | from-docs-adr | Approved Budget Lines need Treasurer correction | ACTIVE | budget |
| 0170 | from-docs-adr | Committee and Treasurer can create finance records | ACTIVE | architecture-deploy |
| 0171 | from-docs-adr | Treasurer approves Budget Requests and Income | ACTIVE | budget |
| 0172 | from-docs-adr | Treasurer may approve their own Budget or Income record | ACTIVE | budget |
| 0173 | from-docs-adr | Claim verification is separate from payout approval | ACTIVE | claims |
| 0174 | from-docs-adr | Rejection permissions follow record type | ACTIVE | architecture-deploy |
| 0175 | from-docs-adr | Wayfinder map #27 closes on decisions, not deliverables | ACTIVE | governance |
| 0176 | from-docs-adr | Schema migration canonicalizes headers by numeric COLS index | ACTIVE | semester-annual |
| 0177 | from-docs-adr | Schema migration rollback restores data by snapshot, but rec | ACTIVE | semester-annual |
| 0178 | from-docs-adr | Three setupAll() guards ship as the go-live gate; the full m | ACTIVE | semester-annual |
| 0179 | from-docs-adr | Initial production go-live is owner-approved against staging | ACTIVE | architecture-deploy |
| 0180 | from-docs-adr | Legacy free-text eventId values are never backfilled; manual | ACTIVE | architecture-deploy |

## Domain docs

| Doc | Description | ADR count |
|-----|-------------|----------|
| [`docs/claims.md`](claims.md) | Claim lifecycle, drafts, stepper, states, receipts | 23 |
| [`docs/budget.md`](budget.md) | Budget requests, lines, approvals, reduce/close | 18 |
| [`docs/payout.md`](payout.md) | Payment methods (FPS/PAYME/OTHER), partial payouts | 19 |
| [`docs/accounts-income.md`](accounts-income.md) | Finance accounts, income recording, transfers | 15 |
| [`docs/identity-auth.md`](identity-auth.md) | Roles, authorization, Users allowlist, SID | 8 |
| [`docs/review-approval.md`](review-approval.md) | Verification, rejection, Needs Info, corrections | 2 |
| [`docs/semester-annual.md`](semester-annual.md) | Semesters, annual migration, carry-forward | 39 |
| [`docs/architecture-deploy.md`](architecture-deploy.md) | Deployment, staging, config, testing | 52 |
| [`docs/governance.md`](governance.md) | Wayfinder, go-live approval, schema migration | 1 |