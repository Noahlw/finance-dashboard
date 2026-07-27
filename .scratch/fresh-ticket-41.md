Discovered during #57's reconciliation of #41 (Dashboard views, reports, and exports) against the current build.

## Gap

#41's acceptance criteria require "Browser tests cover view switching, queue filters, report filters, CSV export, and responsive behavior." The repository's test inventory (`tests/*.test.js`, `tests/e2e.js`) is entirely GAS-backend-side. There are zero `.test.tsx`/`.spec.tsx`/Playwright/Cypress/Vitest-browser files anywhere in `src/frontend/`. This acceptance criterion is entirely unstarted, unlike the rest of #41's scope (dashboard/reports/export functionality itself is substantially built and verified).

## Fix direction

Add a Playwright (or Vitest-browser) suite covering:
- Sidebar/bottom-nav view switching across the 7 workspace views.
- Swipe handler behavior on mobile viewport widths.
- All 5 filter inputs in `ReviewDashboard.tsx` (status, creator, eventId, budgetLine, sid).
- All filters in `ReportsView.tsx` plus default-filter behavior (once the approved-only default from #55 lands).
- CSV export blob download.
- Sidebar-vs-bottom-nav visibility at desktop vs mobile breakpoints.

## Note

Coordinates with #49-#54 (pre-launch slice tickets) and #55/#59's staging-evidence checklist — browser test coverage and staging journeys are related but distinct: automated tests are repeatable CI coverage, staging journeys are the Treasurer's one-time pre-launch evidence capture.
