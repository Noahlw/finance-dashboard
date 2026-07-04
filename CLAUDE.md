# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A $0-budget finance system for a university Christian fellowship (Hong Kong, HKD): Google Forms
(member intake) + Google Sheets (database) + Google Apps Script (the **Engine** — sole mutator of
state) + AppSheet (committee app) + Discord webhooks (notifications). No paid services, no servers.

**Required reading before non-trivial work**: `BUILD-PLAN.md` (the master roadmap — overrides
`FINANCE-SYSTEM-DESIGN.md` wherever they conflict), `CONTEXT.md` (canonical glossary — use these
terms exactly in code, comments, Discord messages), and `docs/adr/*.md` (key decisions; do not
casually "fix" what an ADR deliberately chose).

## Commands

```bash
npm test                 # Jest — the only automated test suite; runs in seconds, no GAS needed
```

There is no CI and no automated way to test the actual Apps Script/Sheets runtime — `npm test`
only covers the pure logic extracted into `src/gas/*.js` (see Architecture below). Verifying real
GAS behavior (a new transition, a form handler, a Jobs.gs function) requires pushing to a real or
scratch Apps Script project and running a function there:

```bash
cd src/gas && clasp push --force          # deploy current code (safe, code-only)
clasp run <functionName>                  # only works if the target project has gone through
                                           # the GCP-project-link + OAuth-client + executionApi
                                           # manifest setup — most Apps Script projects, including
                                           # this repo's bound project by default, have NOT
```

In practice: to verify a change end-to-end, `clasp create --type sheets` a disposable scratch
project (own `.clasp.json`, own copy of `src/gas/*`, own manifest with `executionApi` added), push
there, and run `setupAll()` then `test_phase1()`/`test_phase2()`/`test_phase3()`. Never add
`executionApi` to the real project's `appsscript.json` without the user's explicit sign-off — it's
a real, semi-permanent change to production's remote-execution surface. When editing a scratch
project's `appsscript.json`, edit an isolated copy, not a file shared with the real repo —
`clasp create` will silently overwrite whatever manifest is at its `rootDir`.

A single test run (`test_phase1` → `test_phase2` → `test_phase3`) leaves fixture data behind
(including deliberately-broken data used to test negative paths). Call `cleanupTestPhase1()` then
`setupAll()` between runs on the same spreadsheet, or fixture residue will cause spurious failures
on the next run.

## Architecture

### Deployment: one flat GAS project rooted at `src/gas/`

`src/gas/.clasp.json` has `rootDir: ""` — clasp pushes every `.gs`/`.js` file directly inside
`src/gas/` (not subdirectories elsewhere) as one shared global namespace. Nothing outside
`src/gas/` is ever deployed. This is why `.js` files with pure logic (`Constants.js`,
`CoreAudit.js`, `CoreDecisions.js`) live *inside* `src/gas/` rather than a separate directory —
anything meant to run in production must be physically there.

### The Engine is the sole mutator (locked decision, not a suggestion)

`Engine.gs`'s `transition()` is the only code allowed to write a `status` column, a `*_by`/`*_at`
stamp, `approved_amount`, or `self_approved` on `BudgetRequests`/`ExpenseClaims`. Every other
surface (Forms handlers, the Approvals tab's `onEdit` trigger, AppSheet actions) only ever
*expresses intent* — Engine performs the transition. `Payouts.gs` has its own simpler
QUEUED→SENT→CONFIRMED lifecycle but follows the same rule (only `Payouts.gs` writes `Payouts`
status). Don't add a code path that writes these columns directly, anywhere.

### Extract-and-strangle, not Clean Architecture (ADR 0003)

An earlier attempt built a `src/core/` "Clean Architecture" (separate `CoreEngine`/
`CoreValidations`/`GasSheetRepository`, Command Objects) and abandoned it — see
`docs/adr/0003-extract-and-strangle-over-big-bang-clean-architecture.md`. The docs describing that
architecture (`docs/superpowers/specs/2026-07-04-clean-architecture-revamp-*.md`) are marked
superseded and kept only as historical record — **do not resume that design**.

The actual pattern in use: `Engine.gs` keeps all I/O (`SpreadsheetApp`, `LockService`, Discord) and
remains the sole mutator; its *pure* decision logic (the `TRANSITIONS` table, `authorize()`'s
four-eyes/role/note/amount gate, `computeReduceSplit()`'s proportional-split math,
`checkReceiptTotal()`/`checkPayoutSum()`/`resolveTreasurerIdDrift()`, etc.) lives in
`src/gas/CoreDecisions.js`, delegated to via one-line wrappers, and is unit-tested directly in
Jest. When adding new business logic to `Engine.gs`/`Jobs.gs`/`Setup.gs`, prefer extracting the
pure comparison/decision piece into `CoreDecisions.js` the same way — but only when it's a real,
independently-nameable invariant; don't extract trivial control flow just to have something in
`CoreDecisions.js`.

### Dual Node/GAS environment, one file each

`Constants.js`, `CoreAudit.js`, and `CoreDecisions.js` all use the same guard so the identical file
runs under both Jest and the GAS runtime:

```js
var STATUS_ = typeof module !== 'undefined' ? require('./Constants').STATUS : STATUS;
// ... at the bottom:
if (typeof module !== 'undefined') { module.exports = { CoreDecisions: CoreDecisions }; }
```

`jest.setup.js` is the single designated seam for mocking any GAS globals a pure module might
touch — add mocks there rather than scattering more `typeof X !== 'undefined'` checks across
individual files.

### Testing model: two layers, deliberately not one

- **Jest** (`tests/*.test.js`) tests only the pure logic in `CoreDecisions.js`/`CoreAudit.js` —
  fast, real business-rule assertions (legal/illegal transitions, edge-case amounts, rounding),
  not smoke tests.
- **`Tests.gs`** (`test_phase1()`, `test_phase2()`, `test_phase3()`) is a real-GAS integration
  suite, run manually (see Commands above) against actual Sheets/Drive I/O — walkthroughs of the
  full request→approve→claim→verify→payout lifecycle, illegal-transition denials, LOCKED-row
  tamper detection, the nightly integrity sweep, and the onboarding handler. This is the only way
  to catch bugs that only manifest against real Sheets behavior (e.g. `ARRAYFORMULA`-extended
  sheets reporting far more rows than real data via `getDataRange()`, or Sheets auto-coercing
  numeric-looking strings to numbers and silently dropping leading zeros) — Jest mocks can't
  surface these.

### IDs, Config, and PII — three invariants that are easy to violate by accident

- **ID prefixes** (`ENTITY_PREFIX` in `Constants.js`) are opaque, stable, sequential, and
  semester-scoped (`USER-0001`, `BUDGET-26A-001`, `BUDGETLINE-26A-001-01`, `RECEIPT-0001`, ...),
  generated only via `Ids.nextId()`/`Ids.childId()`. Never embed meaning (a name, a vendor, a date)
  into an ID — `FINANCE-SYSTEM-DESIGN.md`'s design principle #3 exists specifically because free-text
  identifiers in the old spreadsheet caused reconciliation failures.
- **All policy values come from the `Config` tab** at runtime via `Config.get()`/`getNum()`/
  `getBool()`/`getOptional()` — never hard-code a deadline, cap, webhook URL, or semester code.
  `Config.get()` throws if a key is missing or still the seed placeholder `'PASTE_ME'`; use
  `getOptional()` for values that may legitimately be unset pre-checkpoint.
  `Setup_verifyConfigConsistency()` (called from `setupAll()`) auto-heals `TREASURER_USER_ID` if it
  drifts from the real Users row (e.g. across an ID-scheme change) — extend this pattern if another
  Config value ever comes to reference a row ID.
- **No PII in CF-Ledger or Discord.** Student IDs and payout handles live only in the separate
  CF-Vault workbook (`getVaultSheet_()`), never in `AuditLog` detail objects or any Discord message.

### Other load-bearing rules (violating these silently breaks audit-readiness, not just style)

- Every mutation goes through `Audit.append()`, which SHA-256 hash-chains each row to the previous
  one (`Audit.verifyChain()` re-walks and verifies this). No function may delete or overwrite a
  committed row — corrections are new rows referencing the original.
- Every Engine/Payouts mutation runs inside `LockService.getScriptLock()` (30s wait, fail loudly to
  `#treasury` via `Discord.postTreasury()` on timeout).
- Form handlers key on the form response ID (or, for `Onboarding.gs`, upsert-by-email-identity —
  a deliberate exception since re-submission is meant to update payout details, not no-op).
- Money = `Number`, 2dp, HKD. Timestamps = ISO-8601 strings via `Audit._nowIso()`
  (`Utilities.formatDate(new Date(), 'Asia/Hong_Kong', "yyyy-MM-dd'T'HH:mm:ssXXX")`) — never a raw
  `Date` object in a ledger cell.
- No file over ~400 lines — split by concern (this is why `Onboarding.gs` is its own file rather
  than grown inside `IntakeForms.gs`).
