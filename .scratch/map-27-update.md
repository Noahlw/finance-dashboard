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
- [Grilling: Which audit defects are production blockers?](https://github.com/Noahlw/finance-dashboard/issues/55) — Mid-cutover pre-academic-year scenario locked. Mandatory pre-launch blockers: P0 STATUS.APPROVED fix, 6 _requireOperator auth gaps, Budget Request Reduce/Close UI, Discord retry UI, reconciliation drill-down UI, Reports approved-only default + 3 filters, Payout account selection & FPS/PAYME ref UI. Deferred post-launch items: semester config key mismatch, committee-year counter freeze, closed-period lock. Production upgrade safety split to #58. Note: #55 closed without classifying every item in its own question; the gap is tracked in #59.

## Not yet specified

- Missed production blockers from #55's own audit question (#59) — api_uploadReceipt hash race (P0-A), ClaimsView draft-resume gap (P0-B), Event picker classification, staging evidence checklist ownership.
- Production schema migration and upgrade safety policy (#58) — owner-only execution, versioned data-moving migrations, now scoped with hard requirements from a CEO-review blind-spot pass (canonical header preflight, lock/journal/rollback, formula registry, per-ledger schema version, setupAll abort-before-write, AnnualMigration wiring).
- The auth-gap fix itself is broader than #55's original six-endpoint list: a blind-spot review found api_resolveSession, api_decisionBudgetRequest, and api_getPendingBudgetRequests also bypass active-status or ownership checks. This full inventory needs to land in the eventual /implement ticket, not just the six named in #55.
- Exact staging journeys and evidence artifacts required once the map-exit criteria are known (#56).
- How stale ready-for-agent build tickets (#33-#54) should be closed, replaced, or left alone after the blocker bar is set (#56, #57).
- Whether UI-completion gaps form one implement wave or several after blockers land.
- Go-live ownership: who records the committee/Treasurer cutover decision, and against which staging deployment.

## Out of scope

- AppSheet app/editor configuration, AppSheet views, slices, bots, and AppSheet-specific UI behavior.
- Next.js, Vercel, external hosting, or a native mobile application.
- Reintroducing Google Forms as a user-facing intake flow.
- Implementing the audit fixes inside this map — fixes are /implement work after the blocker bar is decided.
