## Reconciliation complete: 24/24 tickets resolved

All tickets in scope have been individually verified against the current codebase (not trusted from ticket text or PR #47's title alone) and closed with a resolution comment recording what the build already answers.

### Summary by outcome

**Closed with build already answering the question (19):** #29, #30, #31, #32, #33, #36, #37, #39, #40, #42, #43, #44, #45, #48, #49, #50, #52, #53, #54

**Closed as out-of-scope, superseded by a more current ticket (1):** #34 — superseded by #49 (post-PR-#47 granular replacement, itself reconciled and closed).

**Closed and replaced with a narrow fresh defect ticket for a genuinely new gap found this pass (4):**
- #35 → [#60](https://github.com/Noahlw/finance-dashboard/issues/60): Budget Line over-budget warning dropped in Claim stepper
- #38 → [#61](https://github.com/Noahlw/finance-dashboard/issues/61): Claim review UI shows Verify for self-created claims
- #41 → [#62](https://github.com/Noahlw/finance-dashboard/issues/62): No browser/E2E test suite
- #51 → [#63](https://github.com/Noahlw/finance-dashboard/issues/63): Treasurer self-reject/self-close not flagged as self-approved

### Key facts established this pass

- **AppSheet retirement is complete** — no `AppSheetApi.js` or functional AppSheet code exists; planning docs are archived with `[SUPERSEDED]` headers; only residue is one stale historical comment in `Approvals.js`.
- **Committee-year counter freeze root-caused** (was previously just observed, now diagnosed): `AnnualMigration.js:1084` derives the next committee year from digits in `CURRENT_SEMESTER`, but the newly-created spreadsheet seeds that key as the bare string `"SEM A"` with no year digit — every migration after the first therefore falls back to a hardcoded default and recomputes the same year. Recorded on #55/Map #27 for whoever picks up the deferred fix.
- **`approvePayoutWithAccount`** already exists in `services/api.ts` — `ReviewDashboard.tsx` simply calls the wrong method (`approvePayout`). Flagged for whoever implements #55's payout-account-selection UI gap.
- **`ReconciliationView.tsx`** is a near-total stub (only renders the accounts table); **zero** Discord-retry UI exists anywhere in the frontend, not partial. Precision added to #55's already-tracked gaps.
- The auth-gap scope is confirmed broader than #55's original 6 named endpoints — 9 endpoints total bypass `_requireOperator`/active-status checks. Full list now in Map #27's "Not yet specified."

No ticket was closed on the assumption that PR #47 "fully implemented #34-#45" without independent verification — every closure cites specific file:line evidence from the current build.

Map #27 body updated (Decisions-so-far, Not yet specified).

Closes #57.
