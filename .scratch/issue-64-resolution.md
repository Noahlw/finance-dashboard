## Grilling resolution: production go-live approval

**This comment records the policy decision, not the approval itself. Go-live has not happened yet.** The actual approval will be posted as a separate future comment on this issue, at the moment the spreadsheet owner actually approves cutover.

Locked in [ADR 0179](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0179-initial-go-live-approval-is-owner-gated-checklist-evidenced.md):

1. **Approver:** the spreadsheet owner only. Separately decided from #55's migration authority (same role, different risk class — #55 guards against schema-change data corruption, this judges operational readiness).
2. **Evidence:** the staging `clasp deploy` deployment ID and public Web App URL, recorded in `docs/staging-release-evidence-checklist.md`'s new "Deployment identity" section. No git SHA or clean-worktree verification required (accepted gap — see ADR 0179's Consequences).
3. **Record:** the actual approval (not this comment) is recorded as a separate comment on this issue (#64), posted at the actual go-live moment.
4. **Scope:** one-time gate for the initial production cutover only. ADR 0090's existing mechanism (explicit release action, no auto-deploy) governs every production deployment thereafter with no named-approver or evidence extension — this ADR does not need to be re-satisfied for deployment #2 onward.

This was ADR 0175's last unmet closure condition (condition 4: "a go-live decision is recorded — who approves, against which staging deployment"). With this locked, all five of ADR 0175's conditions are satisfied:

1. Every `wayfinder:*` child of #27 is resolved (this closes the last one).
2. #57 confirmed every stale ticket (#29–#54) reconciled.
3. Staging evidence checklist owner + trigger locked (#59: Treasurer, triggered once pre-launch blockers merge).
4. Go-live approver + evidence + record location locked (this ticket).
5. No stray item remains in Map #27's "Not yet specified" outside items already captured as named follow-on tickets (#60–#63, #65) or the pre-launch blocker inventory itself — both are `/implement` scope, not open map decisions.

**Note for whoever runs `/implement` next:** the map itself now closes, but three items still need turning into concrete tickets before the blocker-bar wave can execute: the 9-endpoint auth-gap inventory (listed in the map body), the free-text `eventId` migration/backfill decision, and the remaining #55/#59 blocker-bar items that are still prose descriptions rather than individual `ready-for-agent` tickets (unlike #60–#65, which already got that treatment). This is deliberately left as `/implement` triage work, not resolved here — Wayfinder produces decisions, not deliverables.

Closes #64.
