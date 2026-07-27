## Destination

A fully code-managed, responsive React/Vite web app served by Google Apps Script HTML Service for phone and PC. It replaces AppSheet as the user-facing UI; no AppSheet editor or configuration is required. It preserves Google Sheets, Drive, and the existing finance-domain logic, including receipt-photo upload from the UI. The remaining wayfinding work is the production-readiness path: blocker bar, map exit criteria, and reconciling stale tickets with the build.

## Notes

- Domain: university club finance system (budget requests, expense claims, payouts, income, semester close).
- Skills every session should consult: wayfinder, grilling, domain-modeling, implement. Reach for research/prototype only when a ticket names them.
- Standing preferences: Google Workspace/Apps Script, no external hosting, version-controlled and AI-buildable UI, phone and desktop support, receipt uploads, no AppSheet dependency.
- Existing scaffold: src/frontend/ uses google.script.run; Vite emits a single HTML artifact at the repository root.
- AppSheet is fully out of scope. Google Sheets remains the data/reporting system; the web UI is the operational interface.
- Jul 26 audit + finance-roadmap-timeline canvas (local Cursor canvas) is the ground truth for remaining defects; tracker issues #33-#54 are stale relative to the commit log.
- Wayfinder produces decisions, not deliverables. After the frontier below clears, hand concrete fixes to /implement as fresh tickets — do not reopen #34-#54 as if never built.

## Decisions so far

- [Grilling: Define web UI workflow parity and offline expectations](https://github.com/Noahlw/finance-dashboard/issues/28) — mobile-first, online-only committee workspace with accepted Claim, Budget Request, Income, Payout, receipt, dashboard, notification, and annual-migration workflows.
- [Grilling: Which audit defects are production blockers?](https://github.com/Noahlw/finance-dashboard/issues/55) — Mid-cutover pre-academic-year scenario locked. Mandatory pre-launch blockers: P0 STATUS.APPROVED fix, 6+ _requireOperator auth gaps, Budget Request Reduce/Close UI, Discord retry UI, reconciliation drill-down UI, Reports approved-only default + 3 filters, Payout account selection & FPS/PAYME ref UI. Deferred post-launch items: semester config key mismatch, committee-year counter freeze, closed-period lock. Production upgrade safety split to #58.
- [Grilling: What closes the React web app wayfinder map?](https://github.com/Noahlw/finance-dashboard/issues/56) — see [ADR 0175](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0175-wayfinder-map-closes-on-decisions-not-fixes.md). The map closes on decisions locked + clean tracker, not on fixes merged/verified. Falsifiable closure checklist: (1) every wayfinder:* child of #27 resolved — now #57, #58; (2) #57 confirms every one of #29-#32 and #33-#54 is closed-with-resolution, kept-open-with-real-decision, or replaced; (3) staging evidence checklist owner + trigger — locked: Treasurer, triggered once all pre-launch blockers merge, run before production clasp push/deploy; (4) a go-live decision is recorded — who approves cutover and against which staging deployment ID; (5) no stray item remains in "Not yet specified" outside the scope of 1-4.
- [Missed production blockers from #55 audit](https://github.com/Noahlw/finance-dashboard/issues/59) — P0-A (`api_uploadReceipt` hash race) and P0-B (`ClaimsView` draft-resume gap) confirmed pre-launch blockers, no exception. Event picker locked pre-launch as full CRUD per [ADR 0073](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0073-committee-event-management-treasurer-oversight.md) (already accepted but unbuilt — no create/edit/list Event API exists at all, only a write-only migration-selection endpoint): Committee create/edit, Treasurer correct/close, list endpoint for the picker. Existing free-text `eventId` backfill is unresolved, flagged for `/implement`.

## Not yet specified

- #57's reconciliation of #29-#32 and #33-#54 is not yet done.
- #58's schema migration and upgrade safety decisions are not yet finalized (hard requirements from a CEO-review blind-spot pass are recorded on the ticket; open questions remain).
- The auth-gap fix itself is broader than #55's original six-endpoint list: a blind-spot review found api_resolveSession, api_decisionBudgetRequest, and api_getPendingBudgetRequests also bypass active-status or ownership checks. This full inventory needs to land in the eventual /implement ticket, not just the six named in #55.
- Existing Claim/Income records with free-text eventId values need a migration/backfill decision once the real event_id foreign key exists — not resolved by #59.
- Whether UI-completion gaps (now including full Event CRUD) form one implement wave or several after blockers land.

## Out of scope

- AppSheet app/editor configuration, AppSheet views, slices, bots, and AppSheet-specific UI behavior.
- Next.js, Vercel, external hosting, or a native mobile application.
- Reintroducing Google Forms as a user-facing intake flow.
- Implementing the audit fixes inside this map — fixes are /implement work after the blocker bar is decided.
