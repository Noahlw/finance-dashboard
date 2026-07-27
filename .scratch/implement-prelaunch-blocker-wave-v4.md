Part of #27
Cross-linked: #55, #59, #68-#77

# Implementation wave: pre-launch blocker bar

## What to build

This is the consolidated `/implement` tracking ticket that was missing when Map #27 closed. The map/specification phase is complete; this issue coordinates implementation of the pre-launch blocker requirements locked in #55 and #59. It is not evidence that the system is ready for official use. Readiness requires every child ticket below to be implemented and verified, followed by the staging evidence gate.

## Child tickets

All ten blocker-bar items are now individually ticketed and `ready-for-agent`:

1. [#68 — P0: `api_getMyClaims` compares line status against undefined `STATUS.APPROVED`](https://github.com/Noahlw/finance-dashboard/issues/68)
2. [#69 — Discord failed-notification retry UI](https://github.com/Noahlw/finance-dashboard/issues/69)
3. [#70 — Reports view: approved-only default and missing `eventId`/`budgetLine` filters](https://github.com/Noahlw/finance-dashboard/issues/70)
4. [#71 — Wire `_requireOperator`/active-status authorization into 8 confirmed unguarded mutating endpoints](https://github.com/Noahlw/finance-dashboard/issues/71)
5. [#72 — Payout account selection on approve and FPS/PAYME transaction-reference UI](https://github.com/Noahlw/finance-dashboard/issues/72)
6. [#73 — Event CRUD: create/edit endpoints, list endpoint, and picker UI per ADR 0073](https://github.com/Noahlw/finance-dashboard/issues/73)
7. [#74 — Reconciliation drill-down and correction UI](https://github.com/Noahlw/finance-dashboard/issues/74)
8. [#75 — Budget Request Reduce and Close UI](https://github.com/Noahlw/finance-dashboard/issues/75)
9. [#76 — P0-B: `ClaimsView` draft-resume UI](https://github.com/Noahlw/finance-dashboard/issues/76)
10. [#77 — P0-A: `api_uploadReceipt` hash check-then-append race](https://github.com/Noahlw/finance-dashboard/issues/77)

The original nine-entry authorization inventory is fully reviewed in #71: eight confirmed gaps are covered in its acceptance criteria (`api_uploadReceipt`, `api_deleteOrphanedReceipt`, `api_editClaim`, `api_saveBudgetRequestDraft`, `api_submitBudgetRequest`, `api_discardBudgetRequest`, `api_getPendingBudgetRequests`, and `api_decisionBudgetRequest`); `api_resolveSession` was verified to have its own inline role/active check and is explicitly documented as excluded from `_requireOperator` coverage because session bootstrap cannot call itself recursively.

## Recommended execution order

- [ ] **Wave A, correctness and authorization:** #68, #71, #77. These close the broken claim-stepper data path, the authorization/security gaps, and the concurrent duplicate-receipt data-integrity race.
- [ ] **Wave B, claim and Event foundations:** #73 and #76 may proceed in parallel. Event CRUD/list/picker work establishes the real Event selection surface; draft resume restores saved Claim state into the existing form. #67 (legacy submitted-Claim Event re-link) follows #73 plus the Claim edit support it requires.
- [ ] **Wave C, operator workflows:** #75, #72, #74. Add Budget Request Reduce/Close, payout account/reference capture, and reconciliation drill-down/correction UI without changing the existing domain calculation or transition semantics.
- [ ] **Wave D, reporting and notifications:** #70, #69. Add the approved-only Reports defaults/filters and failed-Discord retry surface.

The order is recommended, not a license to change child-ticket scope. Agents may parallelize independent tickets within a wave, but must respect the #73 prerequisite for #67's Event picker integration; #76 is independent of the Event picker and may proceed in parallel and must not declare a wave complete from compilation alone.

## Acceptance criteria for this umbrella

- [ ] Every child ticket #68-#77 is implemented, reviewed, and closed with its own behavioral verification; no child is closed merely because a scaffold compiles.
- [ ] The existing adjacent tickets #60-#63, #65, and #67 are either implemented in the same release wave or have an explicit dependency/deferral record; #67 must not be marked complete before #73's Event picker and its own Claim edit support are present.
- [ ] A focused regression test exists for every security/data-integrity P0: approved budget lines reach the claim stepper, unauthorized/inactive callers are rejected, duplicate concurrent receipt hashes create one row, and saved Claim drafts resume after reload.
- [ ] The full operator-facing journeys from #55/#59 are manually exercised against staging after implementation: Budget Request planning and Reduce/Close, Claim recording including draft resume and receipts, Event selection/CRUD, payout approval/account/reference capture, reconciliation correction, Reports filters, and failed Discord retry.
- [ ] `docs/staging-release-evidence-checklist.md` is completed against the dedicated staging Apps Script deployment, including the recorded staging `clasp deploy` ID and Web App URL, with the required screenshots/record IDs and test-date/reviewer evidence.
- [ ] The spreadsheet owner records the initial production go-live approval as a future comment on #64, naming the exact staging deployment ID/URL evaluated, per ADR 0179. Until this evidence exists, the system is not approved for official committee use.
- [ ] Verification commands and results are recorded in the release PR: `npm test`, `cd src/frontend && npm run build`, the applicable lint/check command, and the staging browser/manual journey evidence. Automated tests must continue to use isolated staging resources and never production data.

## Out of scope

- Reopening or changing the decisions in #55, #56, #58, #59, #64, #66, ADR 0175, ADR 0178, or ADR 0180.
- The deferred post-launch defects from #55 (semester config key mismatch, committee-year counter freeze, and the `closeSemester` closed-period lock); these require a later implementation decision before their first actual use.
- Schema migration Phase 1 runner work in #65 except where a release dependency must be recorded; #65 is a separate implementation ticket with its own migration-safety acceptance criteria.
- AppSheet configuration, external hosting, Google Forms, or production deployment before the staging checklist and spreadsheet-owner approval are complete.
