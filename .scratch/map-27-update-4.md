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
- [Grilling: Which audit defects are production blockers?](https://github.com/Noahlw/finance-dashboard/issues/55) — Mid-cutover pre-academic-year scenario locked. Mandatory pre-launch blockers: P0 STATUS.APPROVED fix, 6+ _requireOperator auth gaps (confirmed broader than 6 — full inventory below), Budget Request Reduce/Close UI, Discord retry UI, reconciliation drill-down UI, Reports approved-only default + 3 filters, Payout account selection & FPS/PAYME ref UI. Deferred post-launch items: semester config key mismatch (Engine.js:1449 — confirmed still present), committee-year counter freeze (root-caused in #43's reconciliation: `AnnualMigration.js:1084` parses digits from `CURRENT_SEMESTER`, but the new spreadsheet seeds it as bare `"SEM A"` with no year digit, so every migration after the first falls back to a hardcoded 26→27), `closeSemester` documents a closed-period lock but never implements it.
- [Grilling: What closes the React web app wayfinder map?](https://github.com/Noahlw/finance-dashboard/issues/56) — see [ADR 0175](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0175-wayfinder-map-closes-on-decisions-not-fixes.md). The map closes on decisions locked + clean tracker, not on fixes merged/verified. Falsifiable closure checklist: (1) every wayfinder:* child of #27 resolved; (2) #57 confirms every stale ticket reconciled; (3) staging evidence checklist owner + trigger — locked: Treasurer, triggered once all pre-launch blockers merge, run before production clasp push/deploy; (4) a go-live decision is recorded; (5) no stray item remains in "Not yet specified" outside 1-4's scope.
- [Missed production blockers from #55 audit](https://github.com/Noahlw/finance-dashboard/issues/59) — P0-A (`api_uploadReceipt` hash race) and P0-B (`ClaimsView` draft-resume gap) confirmed pre-launch blockers. Event picker locked pre-launch as full CRUD per ADR 0073.
- [Task: Reconcile open wayfinder tickets #29–#32 and stale build tickets #33–#54 with the build](https://github.com/Noahlw/finance-dashboard/issues/57) — all 24 tickets individually reconciled against the current build: 20 closed with the build already answering their question (2 of those, #34, superseded by #49 rather than independently verified), 4 replaced with narrow fresh defect tickets for genuinely new gaps discovered this pass (#60: over-budget warning dropped in Claim stepper; #61: Verify button shown for self-created claims; #62: no browser/E2E test suite; #63: Treasurer self-reject/self-close not flagged as self-approved). AppSheet retirement independently verified complete. No stale ticket left unclassified.

## Not yet specified

- #58's schema migration and upgrade safety decisions are not yet finalized (hard requirements from a CEO-review blind-spot pass are recorded on the ticket; open questions remain).
- The full auth-gap inventory (9 endpoints bypass `_requireOperator`/active-status checks, not the original 6 named in #55: `api_resolveSession`, `api_uploadReceipt`, `api_editClaim`, `api_saveBudgetRequestDraft`, `api_submitBudgetRequest`, `api_discardBudgetRequest`, `api_deleteOrphanedReceipt`, `api_getPendingBudgetRequests`, `api_decisionBudgetRequest`) needs to land in the eventual `/implement` ticket.
- Existing Claim/Income records with free-text `eventId` values need a migration/backfill decision once the real `event_id` foreign key exists (from #59's Event CRUD scope) — not yet resolved.
- New fresh tickets #60-#63 need triage into an `/implement` wave alongside the #55/#58/#59 blocker bar.

## Out of scope

- AppSheet app/editor configuration, AppSheet views, slices, bots, and AppSheet-specific UI behavior.
- Next.js, Vercel, external hosting, or a native mobile application.
- Reintroducing Google Forms as a user-facing intake flow.
- Implementing the audit fixes inside this map — fixes are /implement work after the blocker bar is decided.
