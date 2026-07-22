# BUILD-PLAN.md — Subagent Execution Plan: CF Fellowship Finance System (Tier 2)  [SUPERSEDED]

> **This document is superseded.** AppSheet and the Tier-2 build plan have been abandoned. See [Committee Finance Web App Specification](../../docs/specs/committee-finance-web-app.md) for the current architecture. This document is retained for historical reference only.

**Audience:** an execution subagent (Claude Sonnet 5, medium effort) working inside this repo, plus Noah (the human treasurer) who performs all Google-console/click work at marked checkpoints.
**How to use:** invoke the subagent once per phase with the prompt template in §1.4. Do not give the whole build to one invocation.

---

## §0 — Agent Briefing

### 0.1 Role and mission

You are implementing a $0-budget finance system for a university Christian fellowship (Hong Kong, HKD): Google Forms (member intake) + Google Sheets (database) + Google Apps Script (the *Engine* — sole mutator of state) + AppSheet (committee app, built by the human from your spec) + Discord webhooks (notifications). The full design rationale is in `FINANCE-SYSTEM-DESIGN.md`; **this file overrides it wherever they conflict.**

### 0.2 Required reading (in this order, before your first task)

1. This file, fully.
2. `FINANCE-SYSTEM-DESIGN.md` §1.3 (entity schemas), §1.5 (state machines), §3 (workflows), §4.4 (hash chain), §5 (edge cases).
3. `CONTEXT.md` (glossary — use these terms exactly in code identifiers, comments, and Discord messages).
4. `docs/adr/0001-*.md`, `docs/adr/0002-*.md` (why identity and approval work the way they do — do not "fix" these).

### 0.3 Locked decisions (D1–D9) — supersede the design doc

| # | Decision |
|---|---|
| D1 | Shared Google account = system **owner** (owns Ledger, Vault, Script, AppSheet app; survives yearly handover). Committee members act via **personal Google accounts** as AppSheet users (≤10 concurrent; swapped at yearly rotation; `Users` rows are deactivated, never deleted). |
| D2 | Greenfield. Nothing exists on the Google side until Phase 1's checkpoints create it. |
| D3 | Member intake = Google Forms (Budget Request; Expense Claim with receipt file-upload; Onboarding/consent). AppSheet is committee-only. |
| D4 | **Treasurer-only approval** for budget requests and payouts. Any committee member (or the treasurer) may verify claims. |
| D5 | **Self-dealing accepted**: the treasurer may approve/verify their own items. The Engine must (a) set `self_approved=TRUE` on the affected row, (b) immediately post a notice to the `#treasury` Discord channel, (c) include a "Self-approved items" annex in the semester statement. Never block; always flag. |
| D6 | Notifications = **Discord, channels only, outbound only.** Two webhooks from the `Config` tab: `TREASURY_WEBHOOK_URL` (private #treasury — full detail) and `STATUS_WEBHOOK_URL` (member-visible #finance-status — entity ID + title + status ONLY; include amounts only if Config `PUBLIC_SHOW_AMOUNTS=TRUE`). Plain `UrlFetchApp.fetch(url, {method:'post', contentType:'application/json', payload:...})`. No email, no Telegram, no interactive Discord components in v1. |
| D7 | Timeline ASAP: Phase 1 alone must let real money flow (claim → approval → payout → Discord). |
| D8 | Migration = opening balance only: one `Income` row `Retained Earnings, 10167.35, notes="Opening balance per SEM A Statement.xlsx"`. No legacy row import. |
| D9 | Dev workflow: you write files under `src/gas/`; Noah runs `clasp login` (shared account) and `clasp push`. You never attempt Google-side execution yourself. |

### 0.4 Hard constraints (violating any of these = failed task)

1. **Apps Script V8**, plain `.gs` files. No external libraries, no npm, no add-ons, no paid APIs, no `eval`.
2. **The Engine is the only status mutator.** Humans express intent via Forms, AppSheet actions, or intent columns; only Engine code writes `status`, `*_by`, `*_at`, `approved_amount`, audit rows.
3. **Append-only ledger.** No function may delete or overwrite a committed row. Corrections are new rows referencing the original.
4. **Every mutation writes an `AuditLog` row** via `Audit.append()` with the SHA-256 hash chain (§2, task P1-4). No exceptions, including Setup and Jobs.
5. **All policy values come from the `Config` tab** at runtime (`Config.get('KEY')`). Never hard-code a deadline, cap, webhook URL, or semester code.
6. **Concurrency:** every Engine mutation runs inside `LockService.getScriptLock()` (30 s wait, fail loudly to #treasury on timeout).
7. **Idempotency:** form handlers key on the Form response ID; re-delivery of the same event is a logged no-op.
8. **Money** = Number, 2 dp, HKD. **Timestamps** = ISO-8601 strings via `Utilities.formatDate(new Date(), 'Asia/Hong_Kong', "yyyy-MM-dd'T'HH:mm:ssXXX")`. Never write raw Date objects into ledger cells.
9. **No PII in the ledger or in Discord messages**: student IDs and payout handles exist only in CF-Vault; #finance-status never carries names or amounts (unless `PUBLIC_SHOW_AMOUNTS=TRUE`, and never handles).
10. Code style: JSDoc on every public function; private helpers suffixed `_`; one file per concern as named in the task specs; no file over ~400 lines — split if needed.

### 0.5 Repo layout you will create

```
CF-Budget/
├── BUILD-PLAN.md                  ← this file
├── FINANCE-SYSTEM-DESIGN.md
├── CONTEXT.md
├── docs/
│   ├── adr/
│   ├── appsheet-build-spec.md     ← Phase 3 output
│   └── handover.md                ← Phase 4 output
└── src/gas/
    ├── appsscript.json
    ├── Constants.gs   Config.gs   Ids.gs      Audit.gs
    ├── Discord.gs     Engine.gs   Setup.gs    FormSetup.gs
    ├── IntakeForms.gs Approvals.gs Payouts.gs Income.gs
    ├── Jobs.gs        Statement.gs Tests.gs
```

### 0.6 Canonical identifiers

- **Workbooks:** `CF-Ledger` (main), `CF-Vault` (PII, treasurer-only). IDs stored in Script Properties `LEDGER_ID`, `VAULT_ID` by `Setup.gs`.
- **CF-Ledger tabs (exact names):** `Users`, `Categories`, `Events`, `BudgetRequests`, `BudgetRequestLines`, `ExpenseClaims`, `ClaimLineItems`, `Receipts`, `Income`, `Payouts`, `AuditLog`, `Approvals`, `Config`, `Counters` (hidden). CF-Vault has one tab: `Vault`.
- **Column schemas:** exactly as `FINANCE-SYSTEM-DESIGN.md` §1.3, with these additions: `BudgetRequests.self_approved` (bool), `ExpenseClaims.self_approved` (bool), and column A of every tab is the primary key.
- **ID formats** (generated by `Ids.nextId(entity)` from the `Counters` tab, under lock): `USER-0001`, `CAT-ACT`, `EVENT-<SEM>-001`, `BUDGET-<SEM>-001`, `BUDGETLINE-<SEM>-001-01`, `CLAIM-<SEM>-001`, `CLAIMLINE-<SEM>-001-01`, `RECEIPT-0001`, `INCOME-<SEM>-001`, `PAYOUT-<SEM>-001`, where `<SEM>` = `Config.get('CURRENT_SEMESTER')` (e.g. `26A`).
- **Status enums:** exactly the design-doc state machines (§1.5) with D4 applied: `approve/reduce/reject/request-info` on requests and `approve-payout` require `actor.role == TREASURER`; `verify` requires role ∈ {COMMITTEE, TREASURER}; self-approval permitted + flagged per D5.

---

## §1 — Task Protocol

### 1.1 Execution rules

1. One phase per subagent invocation. Execute tasks **in listed order**; a task's `depends-on` must be complete first.
2. After each task, run its **Verify** block. If verification needs the Google side, emit a **HUMAN CHECKPOINT** (format below) and continue only with tasks not depending on it; otherwise STOP and report.
3. Never invent scope. If a spec seems wrong or incomplete, implement what is written and add one line to a `## Questions for Noah` section at the end of your report — do not redesign.
4. Git: commit after each completed task, message `P<phase>-<task>: <summary>` (e.g. `P1-4: audit log with hash chain`). Do not push unless asked.

### 1.2 HUMAN CHECKPOINT format

```
### HUMAN CHECKPOINT <id> — <title>
Do exactly:
  1. <console step>
  2. <console step>
Paste back: <the exact output/ID/URL needed to continue>
Blocks: <task ids that cannot start until this is done>
```

### 1.3 Report format (end of every invocation)

`## Completed` (task ids + one line each) · `## Checkpoints pending` · `## Questions for Noah` · `## Next` (first task of the next run).

### 1.4 Invocation prompt template (Noah copies this to launch each phase)

> Read `/Users/noahklw/Desktop/Coding/CF-Budget/BUILD-PLAN.md` fully, then its §0.2 reading list. Execute **Phase N** per the Task Protocol in §1. Completed checkpoint data from me: `<paste checkpoint outputs, e.g. webhook URLs, spreadsheet IDs, test logs>`. Do not start tasks blocked on unmet checkpoints.

---

## §2 — Phases & Tasks

Task fields: **id · owner (AGENT/HUMAN/PAIRED) · depends-on · files · spec · done-when**.

### Phase 1 — Money can flow

| id | owner | depends-on | summary |
|---|---|---|---|
| P1-0 | HUMAN | — | Google-side bootstrap (checkpoint CP-A) |
| P1-1 | AGENT | — | Project skeleton + `appsscript.json` + `Constants.gs` |
| P1-2 | AGENT | P1-1 | `Config.gs` + `Ids.gs` |
| P1-3 | AGENT | P1-2 | `Setup.gs` (idempotent workbook/folder builder) |
| P1-4 | AGENT | P1-2 | `Audit.gs` (hash-chained append) |
| P1-5 | AGENT | P1-2 | `Discord.gs` (webhook poster + templates) |
| P1-6 | AGENT | P1-3..5 | `Engine.gs` (transition core) |
| P1-7 | AGENT | P1-6 | `IntakeForms.gs` + `FormSetup.gs` |
| P1-8 | AGENT | P1-6 | `Approvals.gs` (intent-column onEdit) |
| P1-9 | AGENT | P1-6 | `Payouts.gs` (minimal: QUEUED→SENT + reference capture) |
| P1-10 | AGENT | P1-1..9 | `Tests.gs::test_phase1()` |
| P1-11 | HUMAN | P1-3,7,10 | Deploy + live round-trip (checkpoints CP-B..CP-E) |

**P1-0 — HUMAN CHECKPOINT CP-A (do first, in parallel with agent tasks):**
1. On the **shared account**: enable 2-Step Verification.
2. Create Discord channels `#treasury` (private to exco) and `#finance-status` (member-visible); in each: *Edit channel → Integrations → Webhooks → New Webhook → Copy URL*.
3. Install tooling locally: `npm i -g @google/clasp`, then `clasp login` **as the shared account** (needs Apps Script API enabled at script.google.com/home/usersettings).
4. Paste back: both webhook URLs. Blocks: P1-11 only (agent codes everything else meanwhile).

**P1-1** — files: `src/gas/appsscript.json`, `src/gas/Constants.gs`. Spec: `appsscript.json` with `timeZone: "Asia/Hong_Kong"`, `runtimeVersion: "V8"`, `exceptionLogging: "STACKDRIVER"`, oauth scopes: spreadsheets, drive, forms, script.external_request, script.scriptapp. `Constants.gs`: frozen objects `TABS` (all tab names), `STATUS` (every enum value per state machine), `ROLES`, `ENTITY_PREFIX` map, column-index maps `COLS.<Tab>` matching §0.6 schemas exactly (single source of truth for column order — every other file must use these, never numeric literals). Done-when: file parses (node --check after stripping nothing — plain JS), every enum in design §1.5 present.

**P1-2** — `Config.gs`: `get(key)` (string), `getNum(key)`, `getBool(key)`, cached 60 s via `CacheService`; throws with a clear message naming the missing key. `Ids.gs`: `nextId(entity)` — reads `Counters` tab (rows: entity, lastN), increments under `LockService`, formats per §0.6; `childId(parentId, seq)` for BRL/CLI. Done-when: unit-style dry logic reviewed; all ID formats produced match §0.6 examples for entity list U/EV/BR/BRL/EC/CLI/RC/IN/PO.

**P1-3** — `Setup.gs`: `setupAll()` idempotent (safe to re-run; creates only what's missing, never wipes data): creates CF-Ledger with all 14 tabs + exact header rows from `COLS`, data validations (status columns get dropdown of legal values; FK columns left free-text but note-annotated), protected ranges (all tabs warn-only except `AuditLog`, `Config`, `Counters` = owner-only; `Approvals` leaves only intent columns editable), hides `Counters`; creates CF-Vault (`Vault` tab per design §1.3 vault schema); creates Drive folders `/CF-Finance/Receipts`, `/Snapshots`, `/Statements`, `/Archive`; stores all IDs in Script Properties; seeds `Config` tab with every key in §3 (webhook URLs as `PASTE_ME` placeholders); seeds `Categories` (CAT-ACT Activities, CAT-FOOD Food, CAT-TRAN Transportation, CAT-CAMP Camp, CAT-ADMIN Admin, CAT-DON Donations[income], CAT-RET Retained Earnings[income], CAT-FEE Camp Fees[income], CAT-OTH Other[income]); seeds `Users` with `USER-0001 / Noah / TREASURER` + Config `TREASURER_USER_ID=USER-0001`; writes the D8 opening-balance Income row (INCOME-<SEM>-001, CAT-RET, 10167.35) **only if Income is empty**; audit-logs every creation as actor `SYSTEM`. Done-when: function reads as idempotent on inspection (guards before every create), and `test_phase1` covers double-run safety.

**P1-4** — `Audit.gs`: `append(actor, entityType, entityId, action, detailObj)` → appends `[seq, ts, actor, entityType, entityId, action, JSON.stringify(detailObj), prev_hash, row_hash]`; `row_hash = SHA256(seq+'|'+ts+'|'+actor+'|'+entityType+'|'+entityId+'|'+action+'|'+detail+'|'+prev_hash)` via `Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str)` hex-encoded; first row's `prev_hash='GENESIS'`; `verifyChain()` → `{ok, badSeq}` re-walking every row. Done-when: hash input string format documented in JSDoc exactly as above (the statement generator re-verifies with the same format).

**P1-5** — `Discord.gs`: `postTreasury(text)`, `postStatus(entityId, title, status, amountOrNull)` (applies `PUBLIC_SHOW_AMOUNTS`; omits names/PII always), `postSelfApproved(entityId, actor, amount)` per D5; all wrap `UrlFetchApp` with `muteHttpExceptions:true`, one retry after `Utilities.sleep(2000)`, on double failure append AuditLog `NOTIFY_FAIL` (never throw — notification failure must not roll back a transition); skip + log if URL is `PASTE_ME`. Message style: `**CLAIM-26A-014** — Camp BBQ receipts — SUBMITTED → VERIFIED (by Noah)` for #treasury; `CLAIM-26A-014 · Camp BBQ receipts · VERIFIED` for #finance-status. Done-when: no code path can throw out of Discord.gs.

**P1-6** — `Engine.gs`: the single transition function
`transition(entityType, entityId, action, actorUserId, payload)`:
1. acquire script lock; 2. load row fresh; 3. check `(entityType, currentStatus, action)` against a declarative `TRANSITIONS` table `{from, action, to, allowedRoles, guard_}`; 4. role check per D4 (treasurer-only approve/reject/reduce/request-info/approve-payout; verify = committee|treasurer); 5. **self-approval per D5**: if actor === requester/claimant on an approve/verify action → allow, set `self_approved=TRUE`, call `Discord.postSelfApproved`; 6. run guards (e.g. partial approval requires `payload.decision_note`); 7. write status + stamp `*_by/*_at`; 8. `Audit.append` with `{from, to, payload}`; 9. Discord posts; 10. release lock. Also `deriveRequestStatus_(requestId)` (all lines APPROVED→APPROVED; mix→PARTIALLY_APPROVED; all REJECTED→REJECTED). Illegal transition → append AuditLog `TRANSITION_DENIED` + `postTreasury` warning, return `{ok:false, reason}` — never throw to the caller surface. Done-when: `TRANSITIONS` table covers every edge in design §1.5 (with D4 roles) and nothing else; the 5 illegal cases in §4.1 all route to DENIED.

**P1-7** — `IntakeForms.gs`: `onFormSubmitRequest(e)`, `onFormSubmitClaim(e)` (installable triggers, created by `FormSetup.installTriggers()`): dedupe by `e.response.getId()` against a `processed_response_id` column; resolve submitter → `Users` by email (unknown email → row still created with `USER-UNKNOWN` + #treasury alert); create BR+BRL / EC+CLI+RC rows (status PENDING / SUBMITTED); receipts: move uploaded file from the form's upload folder to `/CF-Finance/Receipts`, rename `RECEIPT-####_<origname>`, compute SHA-256 of `file.getBlob().getBytes()`, store `drive_file_id`+`sha256`; late-flag per `CLAIM_DEADLINE_DAYS` vs `receipt_date`; audit + Discord. `FormSetup.gs`: `createForms()` builds both intake forms via FormApp with all questions/dropdowns (budget-line dropdown text = `BUDGETLINE-id — desc — remaining HK$x`, refreshed by `refreshClaimFormChoices()` called after every approval/claim transition) **except the file-upload question, which FormApp cannot create — emit checkpoint CP-C**; `installTriggers()` installs both onFormSubmit + the P1-8 onEdit. Claim form v1 shape: exactly one receipt + up to 3 line splits (fixed question groups; blank = unused) — multi-receipt claims are submitted as multiple claims in v1. Done-when: handlers are idempotent, and every created row gets IDs from `Ids.nextId`.

**P1-8** — `Approvals.gs`: the `Approvals` tab is the treasurer's Phase-1 cockpit (AppSheet arrives Phase 3). `refreshApprovalsTab()` lists PENDING requests + SUBMITTED/VERIFIED claims, one row each, with columns: entity_id, title, requester, amount, `ACTION` (dropdown: APPROVE / REDUCE / REJECT / REQUEST_INFO / VERIFY / APPROVE_PAYOUT), `AMOUNT_OVERRIDE`, `NOTE`, `CONFIRM` (checkbox). Installable `onEditApprovals(e)`: fires only when `CONFIRM` flips TRUE; maps the row to `Engine.transition` (actor = `Users` lookup by `e.user.getEmail()`, fallback `TREASURER_USER_ID` since Phase 1 runs on the shared account — log which path was used in the audit detail); clears the intent cells; refreshes tab. REDUCE requires AMOUNT_OVERRIDE ≤ requested; REJECT/REQUEST_INFO/REDUCE require NOTE. Done-when: no path writes status outside `Engine.transition`.

**P1-9** — `Payouts.gs` (minimal): on claim → APPROVED_FOR_PAYOUT, auto-create one Payout row (payee = claimant, amount = claim total, QUEUED); `markPayoutSent(payoutId, method, txnReference, actorUserId)` → SENT + stamps; Phase 1 shortcut: SENT auto-CONFIRMS after `PAYOUT_AUTOCONFIRM_HOURS` via Phase-2 job — until then treasurer may run `confirmPayout(payoutId)` manually from the editor; all payouts CONFIRMED → claim PAID (via Engine). Done-when: Σ invariant scaffolded (single-payee trivially satisfies; multi-payee is P4-2).

**P1-10** — `Tests.gs::test_phase1()`: runs on the live (empty) system from the editor: double-runs `setupAll()` (asserts no duplicate tabs/rows); creates a fake user, request, approval, claim, verification, payout via direct Engine calls; asserts statuses, audit chain `verifyChain().ok`, Counters increments; logs `PHASE1 PASS`/first failure. Must not require Forms (Forms path is human-tested in CP-E). Done-when: written; execution happens at CP-D.

**P1-11 — HUMAN CHECKPOINTS:**
- **CP-B (deploy):** in `src/gas/`: `clasp create --type sheets --title "CF-Finance Engine"` (or `clasp clone` if told), `clasp push`. Open the container sheet's Script editor → run `setupAll()` → grant permissions. Paste back: CF-Ledger URL + any error.
- **CP-C (forms):** run `FormSetup.createForms()` then `installTriggers()`. In the Claim form (Google Forms UI): add question *"Receipt photo"* → type **File upload** → allow images+PDF, max 10 MB → move it below the amount question. Set both forms: collect email = ON, sign-in required = ON. Paste back: both form URLs.
- **CP-D (engine test):** run `Tests.test_phase1()`. Paste back: the log.
- **CP-E (live round-trip):** paste webhook URLs from CP-A into Config (replacing `PASTE_ME`). Submit a real budget request via the form from a personal account; approve it via the Approvals tab; submit a claim with a real receipt photo; verify + approve payout; `markPayoutSent` with a real FPS/PayMe reference. Confirm: 4+ messages appeared in #treasury, 4 status lines in #finance-status, `verifyChain()` still ok. Paste back: "round-trip ok" + screenshots if anything looked wrong.
- **Phase 1 exit:** CP-E passes. Real money may now flow through the system.

### Phase 2 — Engine complete

| id | owner | depends-on | summary |
|---|---|---|---|
| P2-1 | AGENT | P1 | Full state machines: NEEDS_INFO loops, WITHDRAWN, partial-approval guards, top-up request linkage (`justification` auto-prefix `TOP-UP of BUDGETLINE-…`), missing-receipt declaration flow with `MISSING_RECEIPT_CAP`/`MAX_PER_SEM` guards (design §5.3), duplicate-receipt warning (same sha256 = hard reject; same vendor+date+total = #treasury warning) |
| P2-2 | AGENT | P2-1 | `Income.gs`: treasurer-entered income via an `Income intake` section of the Approvals tab (no public form); Engine-mediated, audited |
| P2-3 | AGENT | P2-1 | Derived columns done right: `claimed_amount`/`remaining` as ARRAYFORMULA/SUMIFS installed by Setup (never script-written per-row); claim-form dropdown refresh wired to every relevant transition |
| P2-4 | AGENT | P1 | Dashboard: `buildDashboard()` creates a **separate** read-only workbook (IMPORTRANGE + QUERY pivots: month × category expense/income, budget vs claimed vs remaining per event, balance line, late/self-approved counters). Publish instructions emitted as checkpoint |
| P2-5 | AGENT | P2-1 | `Jobs.gs` part 1: time-driven `dailyJob()` — approval SLA nudges (>72 h PENDING), payout auto-confirm, claim lock (`LOCK_AFTER_PAID_HOURS` → LOCKED + protected range), stale NEEDS_INFO (7 d) nudges |
| P2-6 | AGENT | P2-1..5 | `Tests.gs::test_phase2()` — walks **every** legal transition and asserts the 5 illegal ones in §4.1 are DENIED |
| P2-7 | HUMAN | P2-6 | CP-F: `clasp push`, run `test_phase2()`, create the dashboard workbook via `buildDashboard()`, allow IMPORTRANGE, share read-only link to members. Paste back: test log + dashboard URL |

### Phase 3 — AppSheet + operational hardening

| id | owner | depends-on | summary |
|---|---|---|---|
| P3-1 | AGENT | P2 | Write `docs/appsheet-build-spec.md`: deterministic click-by-click instructions for Noah to build the committee app on CF-Ledger — data sources (all tabs read-only EXCEPT the `Approvals` intent columns), slices (`My queue` = PENDING+SUBMITTED, `Awaiting payout`, `Recently decided`), views (Deck: queue with amount+requester; Detail: claim with inline receipt image via `drive_file_id` → `CONCATENATE("https://drive.google.com/uc?id=", [drive_file_id])`; Form view writing intent columns only), actions (Approve/Reduce/Reject/Verify/Mark paid → set intent columns + CONFIRM=TRUE, which fires the existing onEdit engine — AppSheet never writes status directly), user settings (add ≤10 exco personal emails; `USEREMAIL()` recorded into an `intent_actor_email` column so the Engine attributes the real human, not the shared account), branding/UX minimums. Spec must be executable without screenshots by someone who has never used AppSheet |
| P3-2 | AGENT | P2 | `Jobs.gs` part 2: `nightlyJob()` — snapshot export (Ledger → xlsx blob via Drive export URL + AuditLog CSV) into `/Snapshots/<date>/` **shared to the backup account** (`BACKUP_ACCOUNT_EMAIL` in Config; one-way share instructions in checkpoint); integrity sweep (FKs resolve, Σ CLI per receipt ≤ receipt_total, Σ payouts = claim totals for PAID, LOCKED rows unchanged vs locked-hash stored in audit detail, `verifyChain()`); failures → #treasury alert |
| P3-3 | AGENT | P3-2 | Onboarding: `createOnboardingForm()` (consent text per design §4.5; writes to Users + Vault via handler; Vault stays treasurer-only) |
| P3-4 | HUMAN | P3-1..3 | CP-G: build the AppSheet app per spec (~2-3 h), add exco emails, install nightly trigger, create/designate backup Google account + accept snapshot share, all exco submit onboarding form. Paste back: app share link + first nightly snapshot confirmation |

### Phase 4 — Go-live & audit polish

| id | owner | depends-on | summary |
|---|---|---|---|
| P4-1 | AGENT | P3 | `Statement.gs`: `closeSemester()` — freeze period (all period rows LOCKED), export statement PDF+xlsx to `/Statements` (income/expense by category+month, balance, late annex, missing-receipt annex, **self-approved annex per D5**, `verifyChain()` result page) |
| P4-2 | AGENT | P3 | Multi-payee payouts (design §5.5 shape b): treasurer splits a claim's payout into N rows via Approvals/AppSheet intent; Engine enforces Σ payouts = claim total before PAID |
| P4-3 | AGENT | P3 | `docs/handover.md`: yearly rotation runbook (swap AppSheet user emails, deactivate/create Users rows, rotate shared-account password + webhook URLs, transfer 2SV, verify backup account access) |
| P4-4 | AGENT | P4-1..3 | Go-live checklist + `Tests.gs::test_phase4()` (multi-payee invariant, statement generation on fixture data) |
| P4-5 | HUMAN | P4-4 | CP-H: pilot week with committee on real transactions; archive `SEM A Statement.xlsx` to `/Archive`; announce to members (form links + #finance-status). Exit: one week of real usage with zero hand-edited statuses and a clean nightly integrity report |

---

## §3 — Config tab keys (seeded by Setup.gs; Noah edits values, Engine reads)

| key | seed value | consumer |
|---|---|---|
| `CURRENT_SEMESTER` | `26A` | Ids, Statement |
| `TREASURER_USER_ID` | `USER-0001` | Engine (D4 role checks) |
| `TREASURY_WEBHOOK_URL` / `STATUS_WEBHOOK_URL` | `PASTE_ME` | Discord.gs |
| `PUBLIC_SHOW_AMOUNTS` | `FALSE` | Discord.postStatus |
| `CLAIM_DEADLINE_DAYS` | `30` | IntakeForms (late flag) |
| `SEMESTER_HARD_STOP_DAYS` | `14` | Statement/closeSemester |
| `MISSING_RECEIPT_CAP` | `200` | P2-1 guard |
| `MISSING_RECEIPT_MAX_PER_SEM` | `2` | P2-1 guard |
| `APPROVAL_SLA_HOURS` | `72` | dailyJob |
| `PAYOUT_AUTOCONFIRM_HOURS` | `72` | dailyJob |
| `LOCK_AFTER_PAID_HOURS` | `24` | dailyJob |
| `BACKUP_ACCOUNT_EMAIL` | `PASTE_ME` | nightlyJob |

---

## §4 — Verification appendix

### 4.1 The five illegal transitions every test run must prove DENIED

1. Approve a `WITHDRAWN` budget request.
2. `verify` a claim by an actor whose role is `MEMBER`.
3. `approve-payout` by a `COMMITTEE` (non-treasurer) actor (D4).
4. Any status write on a `LOCKED` claim (including via intent columns).
5. Submitting a ClaimLineItem whose amount exceeds its budget line's `remaining`.

### 4.2 Phase acceptance (run the phase's `test_phaseN()` + these live checks)

- **P1:** form → PENDING rows + #treasury post within ~1 min; approval via Approvals tab flips status, posts both channels, audit row hash-chains; `verifyChain().ok === true`; re-submitting the same form response ID changes nothing.
- **P2:** partial approval without NOTE is rejected; claim over remaining is rejected at intake with a Discord explanation; duplicate sha256 receipt hard-rejected; dashboard totals equal a hand-tally of the ledger to the cent.
- **P3:** an approval performed in AppSheet by an exco personal account lands in AuditLog attributed to **that person's** USER-id (via `intent_actor_email`), not the shared account; nightly snapshot appears in the backup account; integrity sweep reports clean.
- **P4:** statement PDF contains all four annexes; tampering test — hand-edit any historical AuditLog cell on a **copy** of the ledger and confirm `verifyChain()` flags that seq; multi-payee claim reaches PAID only when Σ payouts = total.

### 4.3 Self-containment check (meta)

A fresh Sonnet-5-medium agent given only this repo must be able to execute Phase 1 without asking a single question whose answer exists in this file, `FINANCE-SYSTEM-DESIGN.md`, `CONTEXT.md`, or the ADRs.
