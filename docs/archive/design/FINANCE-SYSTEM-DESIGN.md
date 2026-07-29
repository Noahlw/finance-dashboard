# CF-Budget: Financial Management System Architecture  [SUPERSEDED]

> **This document is superseded.** The AppSheet/Google Forms approach has been abandoned. See [Committee Finance Web App Specification](../../spec.md) for the current architecture. This document is retained for historical reference only.

**For:** University student Christian fellowship (Hong Kong)
**Replaces:** `SEM A Statement.xlsx` (Dashboard / MonthlyExpense / MonthlyIncome) + WhatsApp threads
**Author role:** Senior Systems Architect & Workflow Automation Consultant
**Date:** 2026-07-04

---

## 0. Assumptions (stated up front)

| # | Assumption | Basis / consequence if wrong |
|---|-----------|------------------------------|
| A1 | Hong Kong context: currency HKD, payout rails are **FPS / PayMe / cash**, not ACH/cheques. | Inferred from the xlsx ("noah payme", 城大團契, HKD-scale amounts). If different, only §3 payout steps and the `Payout.method` enum change. |
| A2 | Scale: ~30–80 members, 5–10 committee (exco), **1 treasurer**, ~20–40 money-touching transactions/month. | Inferred from xlsx volume. All three tiers survive 10× this volume; Sheets-as-DB dies around ~50k rows, which is decades away. |
| A3 | The university department requires **periodic statements + spot audit on demand**, not live system access. | If they demand live access, give them the Auditor role in §4.1 — the design already supports it. |
| A4 | Accounts are **free consumer Google accounts** (no paid Workspace domain), unless the university issues accounts. | AppSheet free tier works with consumer accounts (up to 10 users per app); Apps Script quotas are the consumer ones (100 emails/day — fine at this volume). |
| A5 | **Telegram is acceptable** as the bot channel for Tier 3. WhatsApp Business API is *not free* (per-conversation pricing, business verification), so a native WhatsApp bot violates the $0 constraint. WhatsApp remains as a human channel with deep-links into forms. |
| A6 | One fiscal period = one semester ("SEM A", "SEM B", summer), with a semester-level budget approved by the committee at the start. |
| A7 | The treasurer is trusted but must be **checkable**: the system is designed so the treasurer cannot silently rewrite history, not so the treasurer cannot act. |

---

# Phase 1 — Data Model & Core Schema

## 1.1 Design principles

1. **The ledger is append-only.** Corrections are new rows that reference the row they correct — never edits, never deletions. This single rule buys most of your audit-readiness.
2. **Every dollar out is chained:** `Payout → ExpenseClaim → ClaimLineItem → BudgetRequestLine (approved) → BudgetRequest`, and every ClaimLineItem points at a `Receipt`. No orphan money.
3. **People are foreign keys, not free text.** "noah" / "Noah" / blank in the current sheet is the root cause of half your reconciliation pain.
4. **PII lives in a separate store** (§4.2). The ledger only ever contains opaque `user_id`s.
5. **Status is data, transitions are code.** Humans express intent (tap "Approve"); a script performs the transition, stamps who/when, and writes the audit row. Humans never type a status string.

## 1.2 Entity–relationship diagram

```
                            ┌─────────────┐
                            │   User      │  (ledger: opaque ID + role only;
                            │ USER-0001 ...  │   PII in separate vault, §4.2)
                            └──┬───┬───┬──┘
              requester_id ────┘   │   └──── payee_user_id
                                   │ claimant_id / approved_by / paid_by
                                   ▼
┌──────────────┐  1:N  ┌───────────────────┐
│ BudgetRequest│──────▶│ BudgetRequestLine │◀──────────────┐
│  BUDGET-26A-001  │       │  BUDGETLINE-26A-001-01   │               │
└──────┬───────┘       │ (approved lines    │               │ budget_line_id
       │               │  ARE the budget)   │               │ (immutable FK)
       │ event_id      └─────────┬─────────┘               │
       ▼                         │ category_id             │
┌──────────────┐                 ▼                         │
│   Event      │        ┌──────────────┐        ┌──────────┴─────┐
│  EVENT-26A-003  │        │  Category    │        │ ClaimLineItem  │
└──────────────┘        │  CAT-ACT ... │        │ CLAIMLINE-26A-014-01 │
                        └──────────────┘        └───┬───────┬────┘
                                                    │       │ receipt_id
                                       claim_id     │       ▼
                                                    │   ┌──────────┐
                                                    ▼   │ Receipt  │
                                          ┌──────────────┤ RECEIPT-0231 │
                                          │ ExpenseClaim │└─────────┘
                                          │  CLAIM-26A-014  │   (Drive file ID
                                          └──────┬───────┘    + SHA-256)
                                                 │ 1:N (multi-payee)
                                                 ▼
┌──────────────┐                          ┌──────────────┐
│   Income     │   (independent inflow)   │   Payout     │
│  INCOME-26A-042  │                          │  PAYOUT-26A-019  │
└──────────────┘                          └──────────────┘

┌───────────────────────────────────────────────────────────────┐
│ AuditLog  (append-only, hash-chained; every mutation lands    │
│ here regardless of which entity it touched)                   │
└───────────────────────────────────────────────────────────────┘
```

Physically, in Tiers 1–3 each entity is **one tab in one Google Sheets workbook (“CF-Ledger”)**, one row per record, column A always the primary key. `User` PII columns live in a *second* workbook (“CF-Vault”, §4.2).

## 1.3 Entity schemas

Types below use Sheets-pragmatic types: `ID` (string, generated), `enum` (data-validated dropdown, script-enforced), `money` (number, 2dp, HKD), `ts` (ISO-8601 string written by script — *not* Excel serials like the current `45882.0`).

### User (ledger side)

| Field | Type | Notes |
|---|---|---|
| `user_id` | ID `USER-####` | PK. Never reused. |
| `display_name` | string | e.g. "Noah L." — shown in app/notifications |
| `role` | enum | `MEMBER` \| `COMMITTEE` \| `TREASURER` \| `ADVISOR_AUDITOR` |
| `email` | string | Google identity used for form/app login (needed for auth; treat as low-sensitivity PII) |
| `telegram_chat_id` | string | Tier 3 only; blank otherwise |
| `active` | bool | deactivate, never delete (FKs must resolve forever) |

### User (vault side — separate workbook, §4.2)

| Field | Type | Notes |
|---|---|---|
| `user_id` | ID | join key to ledger |
| `full_name` | string | official name for university paperwork |
| `student_id` | string | **sensitive** |
| `payout_method` | enum | `FPS` \| `PAYME` \| `BANK` \| `CASH` |
| `payout_handle` | string | FPS ID / phone / bank acct — **sensitive** |
| `consent_ts` | ts | when they consented to storage (see §4.5) |

### Category

| Field | Type | Notes |
|---|---|---|
| `category_id` | ID `CAT-XXX` | PK, e.g. `CAT-ACT`, `CAT-FOOD`, `CAT-TRAN`, `CAT-CAMP`, `CAT-ADMIN` |
| `name` | string | "Activities", "Food", "Transportation"… (matches current xlsx values) |
| `semester_cap` | money | optional soft cap per semester; dashboard warns at 80% |
| `active` | bool | |

### Event

| Field | Type | Notes |
|---|---|---|
| `event_id` | ID `EVENT-<sem>-###` | PK, e.g. `EVENT-26A-003` |
| `name` | string | "Winter Camp", "Reg Day", "Week 4 Worship" |
| `semester` | enum | `26A`, `26B`, … |
| `owner_user_id` | FK→User | the person accountable for the event's budget |

### BudgetRequest  (pre-spend: "may we spend?")

| Field | Type | Notes |
|---|---|---|
| `request_id` | ID `BUDGET-<sem>-###` | PK |
| `requester_id` | FK→User | |
| `event_id` | FK→Event | nullable for non-event spend (e.g. admin supplies) |
| `title` | string | |
| `justification` | string | |
| `needed_by` | date | drives approval-SLA nudges |
| `status` | enum | see state machine §1.5 |
| `submitted_at` | ts | set by system on submit |
| `decided_at` | ts | set by system on decision |
| `decided_by` | FK→User | committee member/treasurer who decided |
| `decision_note` | string | required when status ∈ {PARTIALLY_APPROVED, REJECTED} |

### BudgetRequestLine  (the atom of budget; approved lines **are** the budget)

| Field | Type | Notes |
|---|---|---|
| `line_id` | ID `BUDGETLINE-<sem>-###-##` | PK (`request_id` + 2-digit seq) |
| `request_id` | FK→BudgetRequest | |
| `category_id` | FK→Category | |
| `description` | string | "BBQ food for 40 pax" |
| `requested_amount` | money | |
| `approved_amount` | money | 0 ≤ approved ≤ requested; set only by transition engine |
| `line_status` | enum | `PENDING` \| `APPROVED` \| `REDUCED` \| `REJECTED` |
| `claimed_amount` | money | **derived** (SUMIF over ClaimLineItems in states ≥ VERIFIED); shown, never hand-edited |
| `remaining` | money | derived: `approved_amount − claimed_amount` |

### ExpenseClaim  (post-spend: "pay me back")

| Field | Type | Notes |
|---|---|---|
| `claim_id` | ID `CLAIM-<sem>-###` | PK |
| `claimant_id` | FK→User | who fronted the money |
| `status` | enum | see state machine §1.5 |
| `submitted_at` / `verified_at` / `approved_at` / `paid_at` / `locked_at` | ts | each stamped by the transition engine |
| `verified_by` / `approved_by` | FK→User | four-eyes: must differ from `claimant_id` |
| `total_amount` | money | derived: Σ its ClaimLineItems |
| `late_flag` | bool | set automatically (§5.4) |
| `notes` | string | |

### ClaimLineItem  (enables one receipt → many budget lines, and one claim → many receipts)

| Field | Type | Notes |
|---|---|---|
| `claim_line_id` | ID `CLAIMLINE-<sem>-###-##` | PK |
| `claim_id` | FK→ExpenseClaim | |
| `budget_line_id` | FK→BudgetRequestLine | **immutable after claim leaves SUBMITTED** — this is the money-to-approval chain |
| `receipt_id` | FK→Receipt | nullable *only* if `missing_receipt_flag` (§5.3) |
| `amount` | money | portion of the receipt charged to this budget line |
| `description` | string | |
| `missing_receipt_flag` | bool | triggers declaration sub-flow §5.3 |

### Receipt

| Field | Type | Notes |
|---|---|---|
| `receipt_id` | ID `RECEIPT-####` | PK |
| `drive_file_id` | string | Google Drive file ID in the restricted Receipts folder — the binary never lives in the sheet |
| `sha256` | string | hash of file bytes at upload; proves the image wasn't swapped later (§4.4) |
| `uploaded_by` | FK→User | |
| `uploaded_at` | ts | |
| `vendor` | string | typed or OCR'd |
| `receipt_date` | date | date **on the receipt**, distinct from upload date |
| `receipt_total` | money | printed total; system checks Σ(linked ClaimLineItem.amount) ≤ receipt_total |
| `ocr_json` | string | Tier 3 only: raw OCR extraction for audit of auto-filled fields |

### Income

| Field | Type | Notes |
|---|---|---|
| `income_id` | ID `INCOME-<sem>-###` | PK |
| `date` | date | |
| `category_id` | FK→Category | reuse Category with `kind=INCOME` rows: Donations, Camp Fees, Retained Earnings, Other |
| `amount` | money | |
| `received_by` | FK→User | who physically/digitally received it |
| `source_ref` | string | e.g. "PayMe txn", "offering box week 4" — never the donor's identity for anonymous offerings |
| `event_id` | FK→Event | nullable; lets you P&L a camp |
| `notes` | string | |

### Payout

| Field | Type | Notes |
|---|---|---|
| `payout_id` | ID `PAYOUT-<sem>-###` | PK |
| `claim_id` | FK→ExpenseClaim | |
| `payee_user_id` | FK→User | ≠ necessarily the claimant (multi-person events, §5.5) |
| `amount` | money | Σ payouts per claim must equal claim.total_amount before claim can reach PAID |
| `method` | enum | `FPS` \| `PAYME` \| `BANK` \| `CASH` |
| `txn_reference` | string | FPS reference / PayMe screenshot Drive ID / "cash, witnessed by USER-0007" |
| `paid_by` | FK→User | treasurer |
| `status` | enum | `QUEUED` → `SENT` → `CONFIRMED` (payee acks) |
| `paid_at` / `confirmed_at` | ts | |

### AuditLog (append-only, script-written only — §4.4)

| Field | Type | Notes |
|---|---|---|
| `seq` | int | monotonically increasing |
| `ts` | ts | |
| `actor_user_id` | FK→User | or `SYSTEM` |
| `entity_type` / `entity_id` | string | e.g. `ExpenseClaim` / `CLAIM-26A-014` |
| `action` | string | `CREATE` \| `TRANSITION` \| `FIELD_SET` \| `LOCK` \| `SNAPSHOT` |
| `detail` | string | JSON: `{"from":"SUBMITTED","to":"VERIFIED","fields":{...}}` |
| `prev_hash` | string | hash chain (§4.4) |
| `row_hash` | string | `SHA256(seq|ts|actor|entity|action|detail|prev_hash)` |

## 1.4 Mapping from `SEM A Statement.xlsx`

| Current | Problem | Becomes |
|---|---|---|
| **MonthlyExpense** tab (one flat row per spend) | No approval link, no receipt, no status, `Paid by` free-text, dates as raw serials (45882.0) | Splits into **ExpenseClaim + ClaimLineItem + Receipt + Payout**. `Expense details`→`ClaimLineItem.description`; `Category`→`Category` FK via the budget line; `Cost`→`ClaimLineItem.amount`; `Transaction date`→`Receipt.receipt_date`; `Paid by`→`ExpenseClaim.claimant_id` FK; `Notes`→`notes`. |
| **MonthlyExpense.Budget** column (empty on every row) | Budget was never actually tracked | Replaced by **BudgetRequest/BudgetRequestLine** — budget becomes a first-class approved object, not an empty column |
| **MonthlyIncome** tab | Mostly fine, but `Received by` free-text ("Noah lw", "noah payme", 城大團契) | **Income** table; `Received by`→FK; "城大團契" rows become `received_by = <fellowship account user>` with `source_ref` describing the channel |
| **Dashboard** tab (hand-maintained, one aggregate row) | Stale, manual, single row for five months | Becomes a **pure formula/pivot layer** (Tier 1) or AppSheet views (Tier 2): per-month and per-category rollups computed from Income/ClaimLineItem/Payout. Nothing is ever typed into it again. |
| (nowhere) | Requests & claims live in WhatsApp | **BudgetRequest, ExpenseClaim, AuditLog** — net-new tables |

**Migration note:** existing SEM-A rows import as `ExpenseClaim`s in a terminal `LEGACY` status with `budget_line_id = BUDGETLINE-LEGACY`, `missing_receipt_flag = TRUE` where no receipt exists. History is preserved and clearly fenced off from the new controls; opening balance = 10,167.35 imported as one `Income` row of category Retained Earnings.

## 1.5 State machines

**BudgetRequest** (transitions only via engine; allowed actor in brackets):

```
              submit [requester]
 DRAFT ────────────────────────▶ PENDING ──────────┐
   ▲                               │ │ │           │ request-info [approver]
   │ withdraw allowed              │ │ │           ▼
   │ until decision                │ │ │      NEEDS_INFO ──resubmit [requester]──▶ PENDING
   │                               │ │ │
 WITHDRAWN ◀── withdraw [requester]┘ │ └────────────────────┐
                                     │ approve-all          │ reject [approver]
                                     ▼ [approver]           ▼
                    ┌────────── APPROVED               REJECTED (terminal)
   approve-partial  │                │
   [approver]       ▼                │  all lines fully claimed,
              PARTIALLY_APPROVED ────┤  or semester closes
                                     ▼
                                  CLOSED (terminal; remaining budget released)
```

Rules: `PARTIALLY_APPROVED` requires ≥1 line `REDUCED`/`REJECTED` and `decision_note` non-empty. Approver must not equal requester (four-eyes). `CLOSED` is set by the semester-close job or when Σremaining = 0.

**ExpenseClaim:**

```
 SUBMITTED ──verify [committee ≠ claimant]──▶ VERIFIED ──approve-payout [treasurer]──▶ APPROVED_FOR_PAYOUT
    ▲  │                                        │                                          │
    │  │ request-info                           │ reject (with note)                       │ all payouts CONFIRMED
    │  ▼                                        ▼                                          ▼
    │ NEEDS_INFO ──resubmit [claimant]──▶ SUBMITTED                                       PAID
    │                                        REJECTED (terminal)                            │ nightly lock job
    └── auto after resubmit                                                                 ▼
                                                                                          LOCKED (terminal, §4.4)
```

Verification checklist enforced at `verify`: every line has a receipt (or approved missing-receipt declaration), Σ line amounts per receipt ≤ receipt_total, every `budget_line_id` has `remaining ≥ amount`, claim submitted within deadline or `late_flag` set.

**Payout:** `QUEUED → SENT → CONFIRMED` (payee taps "received" or treasurer attaches proof + 72h no-dispute auto-confirm).

---

# Phase 2 — System Architecture Options

All three tiers share the **same CF-Ledger schema** — the tiers are *interaction layers*, not different databases. You can (and should, per §6) deploy them cumulatively: Tier 2 sits on Tier 1; Tier 3 sits on both.

## Tier 1 — Pure Google Workspace (Forms + Sheets + Apps Script)

**Components:** Google Forms (×3: Budget Request, Expense Claim, Income Log) · CF-Ledger spreadsheet · CF-Vault spreadsheet · Drive "Receipts" folder · Apps Script (transition engine, notifier, lock job, snapshot job) · Gmail (notifications) · a "Approvals" tab acting as inbox for committee.

```
 Member                      Committee/Treasurer
   │ fills Form (mobile)          │ opens Approvals tab / gets email
   ▼                              ▼
┌─────────────┐  onFormSubmit  ┌──────────────────────────────┐
│ Google Form │───trigger────▶│  Apps Script Engine          │
│ (+file up-  │               │  • validate + assign IDs     │
│  load Q for │               │  • write rows to CF-Ledger   │
│  receipts)  │               │  • hash + append AuditLog    │
└─────────────┘               │  • email notify approvers    │
       │ receipt file          └──────┬────────────┬─────────┘
       ▼                              ▼            ▼
 ┌──────────────┐            ┌────────────┐  ┌───────────┐
 │ Drive:       │            │ CF-Ledger  │  │ Gmail     │
 │ /Receipts    │            │ (10 tabs)  │  │ notify    │
 │ (restricted) │            └─────┬──────┘  └───────────┘
 └──────────────┘                  │ IMPORTRANGE (read-only)
                                   ▼
                     ┌──────────────────────────┐   nightly     ┌─────────────┐
                     │ CF-Dashboard spreadsheet │   snapshot──▶ │ Backup Drive│
                     │ (formulas/pivots only,   │   job         │ (2nd acct)  │
                     │  shared read-only)       │               └─────────────┘
                     └──────────────────────────┘
```

- **Where state lives:** exclusively in CF-Ledger status columns; Forms are stateless intake; Dashboard is derived.
- **How approval works:** the Approvals tab shows `PENDING` items with an `Action` dropdown (`Approve / Reduce / Reject / Request info`) + amount/note columns; an installable `onEdit` trigger reads the intent, executes the transition as the engine, clears the intent cell, emails the requester. The approver never touches the status column itself (it's in a protected range).
- **Integration points:** Form file-upload → Drive; Apps Script ↔ Sheets/Gmail/Drive natively; `IMPORTRANGE` for read-only dashboard.
- **Failure modes:** onFormSubmit triggers occasionally double-fire → engine must be idempotent (form response ID as natural key); consumer Gmail quota 100/day (fine); no true row-level DB locking → engine takes `LockService` lock around every mutation.
- **What you give up:** no real UI for members (forms can't show "your claim status" — mitigate with a personal status email on every transition), approvals live in a spreadsheet tab, receipt capture is a clunky form upload.

## Tier 2 — No-code app layer: **AppSheet** on the same Sheets

**Why AppSheet over Glide/Softr:** free with consumer Google accounts for up to 10 users **per app**; native two-way Sheets binding (Glide free tier caps rows and updates; Softr's free tier is web-page-ish and weak on camera capture); built-in camera image capture to Drive; per-role views; and it lives inside the Google security boundary you're already trusting. Split usage to stay free: **App 1 "CF Money" for members** — but 10-user cap bites at 30–80 members, so members stay on *Forms* (unlimited, free) for intake, and AppSheet serves the ≤10 people who need interactive state: **committee + treasurer**. This hybrid is the honest free-tier design.

```
 Members (30–80)                 Committee + Treasurer (≤10)
   │ Google Forms (as Tier 1)        │ AppSheet app (phone)
   ▼                                 │  • My approvals queue
┌──────────────┐                     │  • Tap Approve/Reduce/Reject
│ Apps Script  │◀────────────────────┤  • Verify claim: view receipt inline
│ Engine       │   AppSheet writes   │  • Record payout + txn ref
│ (unchanged,  │   to Intent columns │  • Live budget-vs-actual views
│  still the   │   or calls script   ▼
│  only status │   via webhook   ┌─────────────┐
│  mutator)    │────────────────▶│ CF-Ledger   │
└──────┬───────┘                 └─────────────┘
       └── Gmail + (optional) AppSheet push notifications to exco
```

- **Where state lives:** unchanged (CF-Ledger). AppSheet **actions** write to intent columns / call an Apps Script Web App endpoint; the engine remains the single status mutator, so audit logic isn't duplicated in AppSheet behaviors.
- **Integration points:** AppSheet↔Sheets native; AppSheet action → Apps Script Web App (`doPost`) for transitions; images captured by AppSheet land in Drive automatically.
- **Failure modes:** AppSheet sync lag (~seconds) can show a stale queue — harmless because the engine revalidates every transition; free tier shows "Powered by AppSheet" and requires each user added by email.
- **What you give up:** members still don't get an app (they get status emails + a read-only published dashboard); 10-seat ceiling shapes the design permanently unless the university grants Workspace for Education (which includes AppSheet Core — then members get the app too).

## Tier 3 — Conversational + OCR layer: **Telegram bot + Gemini OCR**

**Positioning:** friction-killer for the two highest-volume member actions — *submit a claim by photographing a receipt* and *check my status* — layered on Tiers 1–2. WhatsApp stays a human channel; pinned message deep-links to the bot/forms (A5).

```
 Member phone                                   Google side
 ┌───────────────┐   sendPhoto/commands   ┌─────────────────────────────┐
 │ Telegram app  │────────────────────────▶ Apps Script Web App (doPost)│
 │  /claim       │◀────────────────────────  = Telegram webhook          │
 │  📷 receipt   │   replies, buttons      │  1. auth: map chat_id→user │
 │  /status      │                         │  2. fetch photo bytes      │
 │  /approve (exco)                        │  3. Drive: store + SHA-256 │
 └───────────────┘                         │  4. Gemini API (free tier):│
                                           │     extract vendor/date/   │
        Telegram Bot API (free)            │     total/line items JSON  │
                                           │  5. reply w/ prefilled     │
                                           │     claim → user taps ✅   │
                                           │  6. hand to Engine (same   │
                                           │     validation as Forms)   │
                                           └────────┬───────────────────┘
                                                    ▼
                                          CF-Ledger + AuditLog + Drive
                                          (identical to Tier 1/2 paths)
```

- **Where state lives:** unchanged. The bot is *another stateless intake/notify surface*; conversational step state (mid-claim wizard) is kept in a `BotSessions` tab or `CacheService`, and is disposable.
- **OCR:** Gemini API free tier (generous daily quota at this volume) extracts `{vendor, date, total, lines[]}`; raw JSON stored in `Receipt.ocr_json`; **user must confirm** extracted values (OCR proposes, human disposes — auditors will ask). Zero-cost fallback: Drive's built-in OCR (convert image→Google Doc, parse text), uglier but quota-free.
- **Notifications upgrade:** every engine transition now pushes Telegram messages (instant, free, unlimited) instead of/alongside email; approvers get inline `Approve ✅ / Reject ❌` buttons for small requests (callback → same Web App → engine).
- **Failure modes:** webhook cold-start latency (~1–3s, fine); Telegram file size cap 20 MB via bot download (fine for photos); Gemini quota exhaustion → engine falls back to "manual entry" reply; chat_id spoofing impossible (Telegram authenticates), but **map chat_id→user_id only via an invite-code binding flow**, never by phone number guess.
- **What you give up:** two codebases-worth of surface (bot + forms) to keep consistent; members must install Telegram (HK penetration is decent but not universal — Forms remain the fallback forever).

**Make/Zapier note:** deliberately excluded from the spine. Zapier free = 100 tasks/mo (≈3 claims/day kills it); Make free = 1,000 ops/mo but every claim consumes several ops. At your volume they'd become the first thing that breaks silently. Apps Script has no such metering. Use Make, if at all, only for non-critical conveniences.

---

# Phase 3 — End-to-End Workflows

## 3.1 Pre-spend: Budget Request → Approval → Notification

| # | Step | Actor | Surface | Trigger / automation | Writes |
|---|---|---|---|---|---|
| 1 | Submit request (title, event, needed-by, N lines of category+desc+amount) | Requester | Form (T1) / Form (T2) / `/request` bot wizard (T3) | `onFormSubmit` / `doPost` | `BudgetRequest` (PENDING) + `BudgetRequestLine`s (PENDING); AuditLog CREATE; ack email/DM to requester with `request_id` |
| 2 | Notify approvers | System | Gmail / AppSheet push / Telegram | same event, same execution | — |
| 3 | Decide per line: approve / reduce (enter `approved_amount`) / reject; or request info | Committee (≠ requester) | Approvals tab (T1) / AppSheet action (T2) / inline buttons for small requests (T3) | installable `onEdit` on intent columns / Web App call | line statuses; request status derived: all approved→`APPROVED`; mixed→`PARTIALLY_APPROVED`; all rejected→`REJECTED`; info→`NEEDS_INFO`; stamps `decided_by/at`; AuditLog TRANSITION |
| 4 | Notify requester with per-line outcome + remaining-budget summary | System | email/DM | same execution | — |
| 5 | SLA nudge: PENDING > 72h or `needed_by` < 48h away | System | daily time-driven trigger 08:00 | reminder to approvers; AuditLog `NUDGE` | — |

**Idempotency guards (apply to every workflow):** engine keys on form `responseId`/Telegram `update_id`; duplicate event → no-op. Every transition re-reads current status under `LockService` and rejects illegal moves (e.g. approving an already-withdrawn request) with a notification instead of silent failure.

## 3.2 Post-spend: Expense → Receipt → Claim → Verification → Payout

| # | Step | Actor | Surface | Trigger | Writes |
|---|---|---|---|---|---|
| 1 | Spend money (outside system) | Claimant | — | — | — |
| 2 | Submit claim: photo(s) of receipt(s), pick approved budget line(s) from a **live dropdown of lines with remaining > 0**, amount per line | Claimant | Form with file upload (T1/2) / `/claim` + photo (T3, OCR prefills) | `onFormSubmit` / `doPost` | `Receipt` (Drive file + SHA-256), `ExpenseClaim` (SUBMITTED), `ClaimLineItem`s; late check vs deadline policy → `late_flag`; AuditLog; ack with `claim_id` |
| 3 | Verify: receipt legible? amounts ≤ receipt total? correct budget line? remaining sufficient? | Committee member ≠ claimant | Approvals tab / AppSheet (receipt image inline) | `onEdit` intent / Web App | `VERIFIED` (or `NEEDS_INFO` / `REJECTED` + note); stamps `verified_by/at` |
| 4 | Approve for payout (four-eyes complete: verifier ≠ claimant, treasurer ≠ verifier ideally) | Treasurer | same | same | `APPROVED_FOR_PAYOUT`; creates `Payout` row(s) QUEUED — one per payee (§5.5) |
| 5 | Execute payout via FPS/PayMe/cash; enter `txn_reference` (or attach proof screenshot to Drive) | Treasurer | AppSheet payout view / payout tab | `onEdit` / Web App | Payout `SENT`, `paid_at`; DM/email payee "HK$X sent, ref …, tap to confirm" |
| 6 | Payee confirms receipt of money (or 72h auto-confirm with no dispute) | Payee / System | email link (T1) / bot button (T3) | Web App GET token / callback / daily job | Payout `CONFIRMED`; when **all** payouts of the claim CONFIRMED → claim `PAID` |
| 7 | Lock | System | — | nightly job | claims PAID > 24h → `LOCKED`; protected-range lock on their rows (§4.4); AuditLog LOCK |

**No manual copy-pasting anywhere:** statuses move only via engine transitions fired by form submits, intent-column edits, Web App calls, and time-driven jobs. The Dashboard reads the ledger; the ledger is written only by the engine (plus treasurer-restricted payout reference fields).

## 3.3 Notification matrix

| Event | Requester/Claimant | Approvers | Treasurer | Payee |
|---|---|---|---|---|
| Request submitted | ack + ID | new-item alert | — | — |
| Decision made | per-line outcome | — | FYI if approved | — |
| Claim submitted | ack + ID | verify queue alert | — | — |
| Verified | status update | — | payout queue alert | — |
| Payout sent | — | — | — | confirm prompt |
| Confirmed → PAID | closure notice | — | reconciliation tick | — |
| SLA breach / stale NEEDS_INFO 7d | nudge | nudge | weekly digest | — |

---

# Phase 4 — Security, Privacy & Audit Architecture

## 4.1 Access control matrix

| Data class | Member | Committee | Treasurer | Advisor/Auditor | Univ. dept |
|---|---|---|---|---|---|
| Own requests/claims + statuses | R/W (own) | R/W (own) | R/W (own) | R | — |
| All requests/claims (ledger, no PII) | — | R + transition | R + transition | R | on request |
| Receipts folder | upload-only (via form)¹ | R | R | R | on request |
| CF-Vault (student IDs, payout handles) | own row (via treasurer) | — | R/W | — | — |
| AuditLog | — | — | R (no write — script-only) | R | on request |
| Aggregated dashboard (published, read-only) | R | R | R | R | R |
| Raw CF-Ledger workbook sharing | not shared | not shared² | editor² | viewer | — |

¹ Form file-uploads land in the owner's Drive; a mover job relocates them into the restricted Receipts folder so uploaders can't later edit/delete their receipt file.
² Committee interact via Approvals tab (protected ranges expose only intent columns) or AppSheet; only the engine's owning account + treasurer hold editor rights, and even the treasurer's hand-edits outside designated columns are caught by the integrity check (§4.4).

## 4.2 PII isolation (two-workbook split)

- **CF-Ledger** never contains student IDs, FPS/bank handles, or full legal names — only `USER-####` and display names. A leak of the ledger (the most-shared artifact) leaks money data but no identity/banking data.
- **CF-Vault** (separate workbook, shared with treasurer only, never IMPORTRANGE'd into anything) holds the sensitive columns. The engine reads it only at payout time to show the treasurer the payee's handle.
- Least-collection: don't store bank data for members who choose PayMe-on-request or cash; record donor identities never (offerings are anonymous by category).
- Retention: at graduation/inactivity, blank the vault row's sensitive fields (keep `user_id` + display name so historical FKs still resolve).

## 4.3 The unbreakable money chain

Every payout is traceable in both directions with immutable FKs:

```
Payout PAYOUT-26A-019 ─▶ claim CLAIM-26A-014 ─▶ CLAIMLINE-26A-014-01 ─▶ Receipt RECEIPT-0231 (Drive file + SHA-256)
                                     └────────────────▶ BUDGETLINE-26A-003-02 ─▶ BUDGET-26A-003 (approved by USER-0004 on 2026-02-11)
```

Enforcement: (a) `budget_line_id` and `receipt_id` on a ClaimLineItem are frozen once the claim leaves SUBMITTED — the engine rejects writes; (b) after LOCKED, the engine refuses *all* writes to the claim's rows and a protected range is applied; (c) receipts folder allows no delete/overwrite (mover job owns the files; `sha256` in the ledger detects substitution); (d) referenced rows can never be deleted because *nothing* is ever deleted (corrections = reversing entries: a new ClaimLineItem with negative amount referencing the original, plus note).

## 4.4 Tamper-evidence: hash chain + snapshots + versioning

1. **Hash-chained AuditLog:** each row stores `row_hash = SHA256(seq|ts|actor|entity|action|detail|prev_hash)` (Apps Script `Utilities.computeDigest`). Editing or deleting any historical audit row breaks every subsequent hash. A `verifyChain()` function re-walks the chain on demand and in the nightly job; failure → immediate email to treasurer **and** advisor.
2. **Nightly snapshot job:** exports CF-Ledger to timestamped `.xlsx` + the AuditLog tail to `.csv` into a Drive folder owned by a **second Google account** (advisor-controlled) that the treasurer cannot write to (shared one-way). Tampering in the live sheet thus diverges from an out-of-reach history.
3. **Native version history:** Sheets revision history + Drive file versions provide a third, Google-maintained record of who edited what and when (consumer accounts keep this; it's not infinitely retained, hence #2).
4. **Integrity sweep (nightly):** recompute derived sums, check every FK resolves, check Σ ClaimLineItems per receipt ≤ receipt_total, check LOCKED rows' current values against their locked-value hash stored in AuditLog. Discrepancy → flag row + notify.
5. **Semester close:** freeze the period — export signed statement (PDF of dashboard + full ledger xlsx + chain-verification result), mark all period rows LOCKED, open next semester's tabs. This is the artifact you hand the university.

## 4.5 Consent & hygiene

One-time onboarding form: consent to store student ID + payout handle for reimbursement purposes, named data controller (treasurer), deletion-on-request policy. 2-Step Verification mandatory for the engine-owner account, treasurer, and backup account. The Apps Script Web App runs as the owner account with a secret token check on every request (Telegram secret token header / signed form tokens).

---

# Phase 5 — Edge Case Handling

Each case: **Before** (current sheet+WhatsApp reality) → **After** (system rule, exact behavior).

### 5.1 One receipt across multiple budget categories
- **Before:** one row, one category — the HK$600 "Camp BBQ" receipt that was really food + charcoal + transport gets dumped into Activities; category totals are fiction.
- **After:** claimant submits **one Receipt**, then N **ClaimLineItems** each pointing at a different `budget_line_id` with its portion. Engine validates `Σ amounts ≤ receipt_total` (< allowed: personal items on the same receipt are simply not claimed; a `personal_portion` note field records the remainder for the verifier). Verifier sees the split against the single image. Each category's `claimed_amount` gets exactly its share.

### 5.2 Partial budget approvals
- **Before:** WhatsApp: "ok but not $500, maybe $300" — untracked; nobody remembers the agreed number at claim time.
- **After:** approver sets `approved_amount = 300` on the line → line `REDUCED`, request `PARTIALLY_APPROVED`, `decision_note` mandatory. Claim-time dropdown shows the line as "BBQ food — approved HK$300 (remaining HK$300)". A claim exceeding `remaining` is rejected at submit with an over-budget message and instruction to file a **top-up BudgetRequest** referencing the original line (new request, `justification` auto-prefixed `TOP-UP of BUDGETLINE-…`) — over-spends become visible decisions, not surprises.

### 5.3 Lost / missing receipts
- **Before:** "I lost it la" → paid anyway or awkwardly refused; zero audit trail either way.
- **After:** claimant ticks *Missing receipt* on that line → `missing_receipt_flag = TRUE`, `receipt_id` null, and a **Missing-Receipt Declaration** is required: what/where/when/why-no-receipt + any secondary evidence (bank/PayMe screenshot, vendor chat) uploaded as a quasi-receipt with `vendor = "DECLARATION"`. Policy knobs (constants in the engine): declaration claims capped at **HK$200/line**, max **2 per person per semester**, always require treasurer (not just committee) verification, and are flagged in the semester statement. Above cap → claim line rejected with "committee exception meeting required" (exception recorded as an AuditLog entry by the treasurer if granted).

### 5.4 Late submissions
- **Before:** camp receipts surface two months later; the month's numbers were already "final".
- **After:** policy constant `CLAIM_DEADLINE_DAYS = 30` after `receipt_date` (and hard stop at semester close + 14 days). Late claim is **accepted, never silently rejected**, but: `late_flag = TRUE`, auto-warning to claimant at submit, verifier sees the flag, and it books into the *current* open period with a `period_note` referencing the original date — historical monthly statements are never restated. Semester statement lists late items in their own annex. Post-hard-stop claims require a treasurer exception (logged), else `REJECTED` with a kind explanation.

### 5.5 Multi-person reimbursement for a single event
- **Before:** three people front money for camp; one WhatsApp thread; someone gets forgotten (see xlsx rows 14–18 — `Paid by` is blank on the big camp rows).
- **After:** two supported shapes. (a) **Preferred:** each fronter files their own claim against the same event's budget lines — the ledger naturally shows N claims per line, and `remaining` arbitrates. (b) **One-claim-many-payees:** the event owner files one claim; at APPROVED_FOR_PAYOUT the treasurer creates **multiple Payout rows** (`payee_user_id`, amount each); engine enforces `Σ payouts = claim.total` before the claim can reach PAID, and each payee confirms *their own* payout. No payee, no forgotten reimbursement: a QUEUED payout older than 7 days nags the treasurer.

### 5.6 Bonus rules the auditors will ask about
- **Duplicate detection:** on claim submit, engine warns verifier if another ClaimLineItem exists with same `receipt_total` ± same `receipt_date` ± same vendor, or identical receipt `sha256` (hard reject).
- **Self-approval:** transitions verify actor ≠ claimant/requester; a sole-treasurer-fronted expense must be verified by a committee member and its payout confirmed by a second exco.
- **Refunds/returns:** negative ClaimLineItem referencing the original (never edit the original); negative Income for returned camp fees.

---

# Phase 6 — Build Plan (solo builder; Python for migration, Apps Script for engine, AppSheet no-code)

**Sequencing logic:** ship the data model + intake first (kills WhatsApp chaos immediately), automation second, exco UX third, member-delight last.

### P0 — Foundation & migration *(1 weekend, ~8–12 h)*
1. Create CF-Ledger workbook: 10 tabs per §1.3, data validations, protected ranges; CF-Vault; Drive folder tree (`/Receipts`, `/Snapshots`, `/Statements`). (3 h)
2. Python migration script: parse `SEM A Statement.xlsx` (openpyxl), normalize users ("noah"→USER-0001), convert serial dates, emit LEGACY claims + income rows + opening balance. (3 h)
3. Build the 3 Google Forms (request / claim with file-upload / income); wire dropdowns to Category/Event lists. (2 h)
4. Onboarding + consent form; populate User + Vault. (1–2 h)
   **Go/no-go:** a real budget request and a real claim flow through on paper rules (manual status edits by you) with correct FKs.

### P1 — Transition engine & notifications *(2–3 weekends, ~16–24 h)* ← the heart
1. Apps Script core: ID generation, `LockService`-guarded transition function, idempotency keys, AuditLog writer + hash chain. (6 h)
2. `onFormSubmit` handlers ×3 incl. receipt mover + SHA-256. (4 h)
3. Approvals tab + installable `onEdit` intent handler; email notification templates. (4 h)
4. Time-driven jobs: SLA nudges, lock job, nightly snapshot to second account, integrity sweep + `verifyChain()`. (4 h)
5. Dashboard workbook: per-month, per-category, per-event pivots; publish read-only. (2 h)
   **Go/no-go:** run one full month for real. Statuses never hand-edited; chain verifies; dashboard matches manual tally to the cent.

### P2 — AppSheet exco app + semester close *(1–2 weekends, ~10–14 h)*
1. AppSheet on CF-Ledger: approvals queue, claim verification with inline receipt image, payout view writing intent columns / Web App calls. (6 h)
2. Payout confirmation links (tokenized Web App GET) for payees. (2 h)
3. Semester-close job: freeze, lock, export signed statement PDF+xlsx to `/Statements`. (2–3 h)
   **Go/no-go:** an approval and a verification each happen phone-only in <60 s; university accepts the SEM statement format.

### P3 — Telegram bot + OCR *(2–3 weekends, ~16–24 h; optional but high-adoption-value)*
1. Bot setup, webhook→Web App, invite-code chat_id↔user binding. (4 h)
2. `/status`, transition push notifications (replace/augment email). (3 h)
3. `/claim` wizard: photo → Drive + hash → Gemini extraction → confirm → engine. Drive-OCR fallback. (6–8 h)
4. Inline approve/reject buttons for requests under HK$500. (3 h)
   **Go/no-go:** median claim submission < 90 s from photo to ack; OCR field-accuracy good enough that <20% of claims need edits.

### Deliberately deferred
Payment-API integration (FPS has no free consumer API — manual + reference capture is correct), member-facing AppSheet (blocked by 10-seat free cap unless university grants Workspace for Education — revisit then), Make/Zapier (quota fragility, §2), custom web app (needless surface for this scale).

---

## Appendix A — Policy constants (single source of truth in the engine)

| Constant | Default | Used in |
|---|---|---|
| `CLAIM_DEADLINE_DAYS` | 30 | §5.4 |
| `SEMESTER_HARD_STOP_DAYS` | 14 | §5.4 |
| `MISSING_RECEIPT_CAP` | HK$200 | §5.3 |
| `MISSING_RECEIPT_MAX_PER_SEM` | 2 | §5.3 |
| `INLINE_APPROVE_LIMIT` | HK$500 | §6 P3 |
| `APPROVAL_SLA_HOURS` | 72 | §3.1 |
| `PAYOUT_AUTOCONFIRM_HOURS` | 72 | §3.2 |
| `LOCK_AFTER_PAID_HOURS` | 24 | §3.2 |
