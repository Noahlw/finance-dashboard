## Destination

A fully code-managed, responsive React/Vite web app served by Google Apps Script HTML Service for phone and PC. It replaces AppSheet as the user-facing UI; no AppSheet editor or configuration is required. It preserves Google Sheets, Drive, and the existing finance-domain logic, including receipt-photo upload from the UI. The remaining wayfinding work is the production-readiness path: blocker bar, map exit criteria, and reconciling stale tickets with the build.

## Notes

- Domain: university club finance system (budget requests, expense claims, payouts, income, semester close).
- Skills every session should consult: wayfinder, grilling, domain-modeling, implement. Reach for research/prototype only when a ticket names them.
- Standing preferences: Google Workspace/Apps Script, no external hosting, version-controlled and AI-buildable UI, phone and desktop support, receipt uploads, no AppSheet dependency.
- Existing scaffold: src/frontend/ uses google.script.run; Vite emits a single HTML artifact at the repository root.
- AppSheet is fully out of scope and fully retired (verified in #57's reconciliation). Google Sheets remains the data/reporting system; the web UI is the operational interface.
- Jul 26 audit is the ground truth for remaining defects; the durable spec now lives at `docs/specs/committee-finance-web-app.md`.
- Wayfinder produces decisions, not deliverables. After the frontier below clears, hand concrete fixes to /implement as fresh tickets.

## Decisions so far

- [Grilling: Define web UI workflow parity and offline expectations](https://github.com/Noahlw/finance-dashboard/issues/28) — mobile-first, online-only committee workspace with accepted Claim, Budget Request, Income, Payout, receipt, dashboard, notification, and annual-migration workflows.
- [Grilling: Which audit defects are production blockers?](https://github.com/Noahlw/finance-dashboard/issues/55) — Mid-cutover pre-academic-year scenario locked. Mandatory pre-launch blockers: P0 STATUS.APPROVED fix, 9 `_requireOperator`/active-status auth gaps (full inventory below), Budget Request Reduce/Close UI, Discord retry UI, reconciliation drill-down UI, Reports approved-only default + 3 filters, Payout account selection & FPS/PAYME ref UI. Deferred post-launch: semester config key mismatch (Engine.js:1449), committee-year counter freeze (`AnnualMigration.js:1084` parses digits from `CURRENT_SEMESTER`, but the new spreadsheet seeds it as bare `"SEM A"`), `closeSemester`'s undocumented-but-unimplemented closed-period lock.
- [Grilling: What closes the React web app wayfinder map?](https://github.com/Noahlw/finance-dashboard/issues/56) — see [ADR 0175](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0175-wayfinder-map-closes-on-decisions-not-fixes.md). The map closes on decisions locked + clean tracker, not on fixes merged/verified. Falsifiable closure checklist: (1) every `wayfinder:*` child of #27 resolved; (2) #57 confirms every stale ticket reconciled; (3) staging evidence checklist owner + trigger — Treasurer, triggered once all pre-launch blockers merge; (4) a go-live decision is recorded — who approves, against which staging deployment; (5) no stray item remains in "Not yet specified" outside 1–4's scope.
- [Missed production blockers from #55 audit](https://github.com/Noahlw/finance-dashboard/issues/59) — P0-A (`api_uploadReceipt` hash race) and P0-B (`ClaimsView` draft-resume gap) confirmed pre-launch blockers. Event picker locked pre-launch as full CRUD per ADR 0073.
- [Task: Reconcile open wayfinder tickets #29–#32 and stale build tickets #33–#54 with the build](https://github.com/Noahlw/finance-dashboard/issues/57) — all 24 tickets individually reconciled: 20 closed with the build already answering their question, 4 replaced with narrow fresh defect tickets (#60–#63) for genuinely new gaps. AppSheet retirement independently verified complete.
- [Grilling: Define production schema migration and upgrade safety policy](https://github.com/Noahlw/finance-dashboard/issues/58) — see [ADR 0176](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0176-schema-migration-canonicalizes-by-numeric-column-index.md), [ADR 0177](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0177-schema-migration-rollback-recomputes-derived-state.md), [ADR 0178](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0178-schema-migration-go-live-gate-and-release-invariant.md). Headers canonicalize against `COLS`'s numeric index, never label text; any ambiguity hard-aborts the whole call with zero writes. Rollback restores `DATA_MOVE` snapshots literally but recomputes `DERIVED_REAPPLY` state (formulas/validations/protections) from a schema-version-keyed registry, never from "whatever `COLS` currently is." Scope split: 3 of the 8 CEO-review hard requirements (header preflight, `LEDGER_ID` guard, drop-and-recreate protections/validations) are live hazards on every `setupAll()` call and ship as the go-live gate; the other 5 (full runner, per-ledger `SCHEMA_VERSION`, AnnualMigration wiring, race-condition locks) are committed follow-on work gated by an explicit release invariant — no `COLS` change ships before that runner exists.

## Not yet specified

- [Grilling: Who approves production go-live, against which staging deployment?](https://github.com/Noahlw/finance-dashboard/issues/64) — the one remaining item against ADR 0175's closure condition 4. Distinct from #55's migration authority (which gates schema migrations specifically, not the overall cutover sign-off).
- The full auth-gap inventory (9 endpoints bypass `_requireOperator`/active-status checks: `api_resolveSession`, `api_uploadReceipt`, `api_editClaim`, `api_saveBudgetRequestDraft`, `api_submitBudgetRequest`, `api_discardBudgetRequest`, `api_deleteOrphanedReceipt`, `api_getPendingBudgetRequests`, `api_decisionBudgetRequest`) needs to land in the eventual `/implement` ticket.
- Existing Claim/Income records with free-text `eventId` values need a migration/backfill decision once the real `event_id` foreign key exists (from #59's Event CRUD scope).
- [Implement schema migration Phase 1 runner](https://github.com/Noahlw/finance-dashboard/issues/65) (journal, rollback, versioned registry, AnnualMigration wiring; the follow-on work committed in #58's ADRs), and #60-#63, need triage into an /implement wave alongside the #55/#59 blocker bar.

## Out of scope

- AppSheet app/editor configuration, AppSheet views, slices, bots, and AppSheet-specific UI behavior.
- Next.js, Vercel, external hosting, or a native mobile application.
- Reintroducing Google Forms as a user-facing intake flow.
- Implementing the audit fixes inside this map — fixes are /implement work after the blocker bar is decided.
