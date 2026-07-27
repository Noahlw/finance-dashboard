Part of #27
Blocked by: #56

## Question

What facts from the current build answer (or invalidate) the still-open wayfinder tickets and the stale ready-for-agent build tickets, so the map's Decisions-so-far and frontier match reality?

Work through each open ticket and either:

1. Post a resolution comment that records what the build already decided, then close it, or
2. Keep it open with an updated Question if a real decision remains, or
3. Rule it out of scope on the map if it sits past the destination, or
4. For ready-for-agent build tickets specifically: replace with a fresh defect ticket if the original scope was built but real gaps remain (cross-reference PR #47, which claims "full implementation #34-#45" — reconcile that claim against actual behavior before closing or replacing each one).

## Tickets in scope

### Wayfinder grilling/research/prototype tickets

- [Grilling: Choose Google identity and authorization for the web app](https://github.com/Noahlw/finance-dashboard/issues/29)
- [Prototype: Prove the React web app and receipt upload end to end](https://github.com/Noahlw/finance-dashboard/issues/30)
- [Research: Inventory and retire AppSheet-only implementation](https://github.com/Noahlw/finance-dashboard/issues/31)
- [Research: Validate Apps Script HTML Service as the React runtime](https://github.com/Noahlw/finance-dashboard/issues/32)

### Stale ready-for-agent build tickets (#33-#54)

These predate the Jul 26 audit and PR #47's "full implementation" merge. Per the map's own notes they are "stale relative to the commit log" — PR #47 claims to have implemented #34-#45, but the current audit (feeding #55/#58/#59) found real gaps in several of these areas. Each needs individual reconciliation, not a blanket close.

- [Spec: Committee-operated finance web app](https://github.com/Noahlw/finance-dashboard/issues/33)
- [Secure Apps Script runtime and operator workspace](https://github.com/Noahlw/finance-dashboard/issues/34)
- [Budget Request and Budget Line workflow](https://github.com/Noahlw/finance-dashboard/issues/35)
- [Member directory and Claim intake](https://github.com/Noahlw/finance-dashboard/issues/36)
- [Receipt upload and atomic Claim submission](https://github.com/Noahlw/finance-dashboard/issues/37)
- [Claim review and Discord follow-up](https://github.com/Noahlw/finance-dashboard/issues/38)
- [Finance Accounts and Income workflow](https://github.com/Noahlw/finance-dashboard/issues/39)
- [Payout lifecycle and balance movements](https://github.com/Noahlw/finance-dashboard/issues/40)
- [Dashboard views, reports, and exports](https://github.com/Noahlw/finance-dashboard/issues/41)
- [Semester Close](https://github.com/Noahlw/finance-dashboard/issues/42)
- [Annual Migration and year-folder provisioning](https://github.com/Noahlw/finance-dashboard/issues/43)
- [Retire AppSheet-only implementation](https://github.com/Noahlw/finance-dashboard/issues/44)
- [Staging deployment and production release verification](https://github.com/Noahlw/finance-dashboard/issues/45)
- [Finish PR #47 spec gaps: four-slice implementation plan](https://github.com/Noahlw/finance-dashboard/issues/48)
- [01 — Operator access and safe annual setup](https://github.com/Noahlw/finance-dashboard/issues/49)
- [02 — Draft-first Claim submission](https://github.com/Noahlw/finance-dashboard/issues/50)
- [03 — Approval, Payout, and Movement Ledger](https://github.com/Noahlw/finance-dashboard/issues/51)
- [04 — Reconciliation and Discord recovery](https://github.com/Noahlw/finance-dashboard/issues/52)
- [05 — Resumable Annual Migration](https://github.com/Noahlw/finance-dashboard/issues/53)
- [06 — Mobile accessibility and staging release gate](https://github.com/Noahlw/finance-dashboard/issues/54)

This is a task ticket: do the reconciliation work. The answer records, for each ticket, closed-with-gist / kept-open-why / out-of-scope-why / replaced-with-<new ticket>, and lists any map body edits made (Decisions-so-far, Not yet specified, Out of scope). Cross-check against #55's confirmed blocker list, #58's schema migration scope, and #59's missed-blocker list before closing anything as "already handled" — do not close a ready-for-agent ticket on the assumption PR #47 covered it without verifying against the current audit findings.
