# Implement: pre-launch blocker bar and staging readiness wave (v2)

## Where to start

This is the master tracking ticket for the pre-launch implementation wave. All 17 sub-tickets are organized under 5 waves below. The canonical specification is at `docs/spec.md`. For domain decisions, see `docs/adr-index.md` (maps every ADR to its domain doc) and the 9 consolidated domain docs in `docs/`.

## Project status

| Wave | Ticket | Title | Status |
|------|--------|-------|--------|
| **A — Correctness & Auth** | #80 | Wave A tracker | Open |
| | #68 | Claim stepper compares line status against undefined STATUS.APPROVED | Open |
| | #63 | Treasurer self-REJECT/self-CLOSE not flagged as self-approved | Open |
| | #65 | Schema migration Phase 1 runner | Open |
| | #71 | Wire _requireOperator into 8 unguarded endpoints | Open |
| | #77 | uploadReceipt hash check-then-append race | Open |
| **B — Claim & Event Foundations** | #81 | Wave B tracker | Open |
| | #73 | Event CRUD + picker per ADR 0073 | Open |
| | #76 | ClaimsView has no draft-resume UI | Open |
| | #60 | Budget Line over-budget warning dropped | Open |
| | #67 | Allow editing eventId on submitted Claims | Open |
| **C — Operator Workflows** | #82 | Wave C tracker | Open |
| | #75 | Budget Request Reduce and Close UI | Open |
| | #72 | Payout account selection + transaction-reference UI | Open |
| | #74 | Reconciliation drill-down and correction UI | Open |
| | #61 | Claim review shows Verify for self-created claims | Open |
| **D — Reporting & Notifications** | #83 | Wave D tracker | Open |
| | #70 | Reports approved-only default + missing filters | Open |
| | #69 | Discord failed-notification retry UI | Open |
| **E — Verification** | #84 | Wave E tracker | Open |
| | #62 | Browser/E2E test suite | Open |

## Acceptance criteria

- [ ] Every sub-issue across all 5 waves is implemented, reviewed, and closed with its own behavioral verification; no child is closed merely because a scaffold compiles.
- [ ] All 6 previously-adjacent tickets (#60, #61, #62, #63, #65, #67) are implemented in this same tracked hierarchy rather than left as an out-of-band dependency note.
- [ ] A focused regression test exists for every security/data-integrity P0: approved budget lines reach the claim stepper (#68), unauthorized/inactive callers are rejected (#71), duplicate concurrent receipt hashes create one row (#77), and saved Claim drafts resume after reload (#76).
- [ ] The full operator-facing journeys are manually exercised against staging after implementation.
- [ ] `docs/operations/staging-release-evidence-checklist.md` is completed against the dedicated staging Apps Script deployment.
- [ ] The spreadsheet owner records the initial production go-live approval as a future comment on #64.
- [ ] Verification commands and results are recorded in the release PR: `npm test`, `cd src/frontend && npm run build`, lint/check, and staging evidence.

## Out of scope

- Reopening or changing the decisions in #55, #56, #58, #59, #64, #66, ADR 0175, ADR 0178, or ADR 0180.
- The deferred post-launch defects from #55 (semester config key mismatch, committee-year counter freeze, `closeSemester` closed-period lock).
- Schema migration Phase 1 runner work is tracked under #65 with its own acceptance criteria.
- AppSheet configuration, external hosting, Google Forms, or production deployment before the staging checklist and approval are complete.

## Cross-links

Part of #27 · Supersedes #78 · Cross-linked: #55, #59, #60, #61, #62, #63, #65, #67, #68, #69, #70, #71, #72, #73, #74, #75, #76, #77

## Related docs

- `docs/spec.md` — canonical specification
- `docs/adr-index.md` — ADR master index (every decision → domain doc)
- `docs/operations/staging-release-evidence-checklist.md` — release checklist
- `docs/operations/PREMERGE.md` — pre-merge gate
