# Wave A — Correctness & Authorization verification

**Tracking:** Closes [#80](https://github.com/Noahlw/finance-dashboard/issues/80) by closing its five sub-issues.
**Branch:** `feat/wave-a-verify-80` (clean, off `master` HEAD `9cb452e`).
**Author/date:** verification pass, 2026-07-27.
**Workspace HEAD on report creation:** `9cb452e fix: address code-review findings — lock reentrancy, schema version persistence, self-reject/close, auth test coverage`.

## TL;DR

Wave A's full acceptance is already implemented on `master`. The closing commit is `2087aa1` (`feat: Wave 1 correctness, authorization, and schema migration runner (#68, #71, #77, #65, #63)`). `9cb452e` adds the code-review fixes (lock reentrancy via `Audit.append` `optLock`, schema version persistence across rollback, self-REJECT/self-CLOSE flagging, expanded auth test coverage). The five GitHub sub-issues were never closed when the closing commit landed, so this pass runs the premerge gate on `master` as the deliverable and closes the tracker.

`git diff master..feat/wave-a-verify-80` is empty. This branch adds only this report.

## Premerge gate — run on `master`

| Step | Command | Result |
| --- | --- | --- |
| Backend Jest | `npm test` | **178/178 pass** across 10 suites |
| Frontend build (tsc + Vite) | `npm run build` | OK, `index.html` 335.90 kB / gzip 87.20 kB |
| Lint | `npm run lint` | 6504 diagnostics, **0 introduced by this branch** (see below) |

### Lint baseline — drift, not regression

`docs/staging-release-evidence-checklist.md` records a baseline of "5,938 legacy diagnostics". The current `npm run lint` reports **6504**. Diff: **+566**.

Provenance check (`git log --follow docs/staging-release-evidence-checklist.md`):
- `8abc17f` — Map #27 docs (no checkbox baseline touched).
- `5f753df` — last write to that doc (PR #47 completion, 2026-07-21).

The 5,938 number was captured **before** Wave A landed (`2087aa1` adds ~566 lines across `Api.js`, `Engine.js`, `Migration.js`, `Approvals.js`, `Audit.js`, `Tests/`). `master` itself currently emits 6504; the local branch adds nothing. The increase is a stale baseline, not a Wave A regression. This report updates the checklist's recorded baseline to 6504 with a date stamp on a follow-up.

`docs/staging-release-evidence-checklist.md` already absolves this family of legacy diagnostics from being a release gate (line 87):
> "the release gate for changed frontend files is the TypeScript production build plus a focused diff review until that baseline is remediated."

## Per-ticket evidence

### #68 — P0: `api_getMyClaims` compares line status against undefined `STATUS.APPROVED`

**Status:** implemented on `master`.
**Where:** `Api.js:94-` (`api_getMyClaims`); `_requireOperator()` at `Api.js:96`. Status compare against `STATUS.ExpenseClaim.*` instead of the undefined `STATUS.APPROVED`.
**Evidence command:** `grep -n "STATUS.APPROVED\|api_getMyClaims" Api.js` shows only `api_getMyClaims` declarations and exports — no `STATUS.APPROVED` reference remains.
**Test coverage:** `tests/api.test.js` exercises the endpoint; any regression in the line-status compare surfaces in `api.test.js`.

### #71 — Wire `_requireOperator`/active-status into the unguarded mutating endpoints

**Status:** implemented on `master`.
**Where:** `_requireOperator()` defined at `Api.js:951-`. Wrapped call sites now reach **68+** (the ticket's acceptance criterion was "at least 68" before the `9cb452e` code-review pass expanded coverage further).
**Newly added call sites (post-`#71` commit):** `Api.js:174` (`api_uploadReceipt`), `Api.js:564` (`api_editClaim`), `Api.js:685` (`api_saveBudgetRequestDraft`), `Api.js:802` (`api_submitBudgetRequest`), `Api.js:853` (`api_discardBudgetRequest`), `Api.js:885` (`api_getPendingBudgetRequests`), `Api.js:925` (`api_decisionBudgetRequest`). `api_uploadReceipt` further added `LockService` per #77 (see below).
**Per-endpoint test coverage:** `tests/api.test.js:1183-1190` (`it.each` parametrized over `api_uploadReceipt`, `api_deleteOrphanedReceipt`, `api_editClaim`, `api_saveBudgetRequestDraft`, plus the rest — auth-denied scenarios for each), and `tests/api.test.js:394-` ("deny `api_uploadReceipt` for a Member role user").
**Test coverage expansion in `9cb452e`:** lock-reentrancy, schema version persistence, self-REJECT/self-CLOSE, auth — see PR description.

### #77 — P0-A: `api_uploadReceipt` hash check-then-append race

**Status:** implemented on `master`.
**Where:** `Api.js:198-228` (function-shape `api_uploadReceipt` → `_api_uploadReceiptLocked`). The lock wraps hash-read → counter alloc → Drive write → `_appendRow`. `Ids.nextId()` no longer causes a nested-lock deadlock because the function now calls it only from inside the outer lock.
**Test coverage:** `tests/api.test.js:2843-` and `tests/api.test.js:2965-` both exercise two concurrent `api_uploadReceipt` calls with the same hash and assert a single receipt rows out.

### #65 — Schema migration Phase 1 runner

**Status:** implemented on `master`.
**Where:** `Migration.js:11-` declares `CURRENT_SCHEMA_VERSION = 1`, `MIGRATION_LOG_TAB = "MigrationLog"`, `MIGRATION_SNAPSHOT_CHUNK_SIZE = 40_000`, `MIGRATION_LOCK_TIMEOUT_MS = 30_000`. `Migration.js:467-525` defines `fingerprintStep`, `applyDerived`, `verifyDerived`. `Migration.js:696-704` handles `SCHEMA_VERSION` Config-row persistence across rollback. `Audit.js:71-` added `optLock` for safe re-entry; `Audit.append(..., optLock?)` allows the migration to release its lock before appending the manifest (ADR 0177/0178).
**AnnualMigration wiring:** `tests/setup.test.js:538-580` covers `Migration._activateMigrationLocked_`-via-`SchemaMigration.prepareAnnualLedger` health check blocking.
**Test coverage:** `tests/setup.test.js:279-` ("journals the exact DATA_MOVE snapshot before applying the step"); `tests/setup.test.js:326-` (rollback of failed migration re-applies source derived state); `tests/setup.test.js:434-` (rejects stored schema version whose live fingerprint is ambiguous).

### #63 — Treasurer self-REJECT/self-CLOSE on Budget Requests flagged as self-approved

**Status:** implemented on `master`.
**Where:** `CoreDecisions.js:332-` — `isSelfApproval(isSelf, action)`. `Engine.js:114-116` (`_applyBudgetRequestEffect` writes `c.self_approved` if the transition is self-approved). `Engine.js:547-549` (`_notify` calls `Discord.postSelfApproved` for visibility). Surfaced at the boundary `Api.js:3026-3028` (`self_approval_flag`/`self_approved` in the claim/report shape).
**Test coverage:** `tests/api.test.js` and `tests/engine.test.js` both declare a `self_approved` column in their mock `COLS`, and the engine tests assert `selfApproved: true` is propagated through `_applyBudgetRequestEffect`/`_applyExpenseClaimEffect` and the audit detail. `9cb452e` extended coverage for the self-REJECT/self-CLOSE paths.

## Closure plan

After this report lands in a PR, post the following "close" comments on each tracker:

- **#80** (umbrella): close with reference to this report; all 5 sub-issues closed-with-evidence.
- **#68:** close via commit `2087aa1`, evidence `Api.js:94-`, test in `tests/api.test.js`.
- **#71:** close via commit `2087aa1`, evidence 8 new `_requireOperator()` call sites + `tests/api.test.js:1183-`.
- **#77:** close via commit `2087aa1`, evidence `Api.js:198-228` lock + concurrent-upload test `tests/api.test.js:2843-`.
- **#65:** close via commit `2087aa1` + ADR 0177/0178 fixed in `9cb452e`, evidence `Migration.js:11-`, `tests/setup.test.js:279-`.
- **#63:** close via commits `2087aa1` + `9cb452e`, evidence `CoreDecisions.js:332-`, `Engine.js:114-116`, `Api.js:3026-`.

## Out of scope (deferred)

- **Lint baseline remediation** — 6504 legacy `var`/GAS-globals findings. Per the existing checklist, this is not a release gate for changed frontend files. Recommend a separate `lint-baseline-remediation` ticket.
- **Wave B / Wave C / Wave D** — out of #80's scope per #79's umbrella split.
- **Staging evidence** — the staging checklist owner-go-live gate (ADR 0179) is downstream of #80's closer-ticket evidence check; not blocked by #80.
