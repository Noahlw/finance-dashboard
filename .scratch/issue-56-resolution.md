## Grilling Resolution: What closes Map #27

Grilled with `/skill:grill-with-docs`. Full reasoning recorded in [ADR 0175](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0175-wayfinder-map-closes-on-decisions-not-fixes.md).

### Locked: the map closes on decisions, not deliverables

Per the map's own Notes ("Wayfinder produces decisions, not deliverables"), #27 closes once its decisions are locked and its tracker is clean — not once the underlying blocker-bar fixes are implemented, merged, or staging-verified. That work continues under `/implement` and release tracking after the map closes; it does not keep the map open.

### Falsifiable closure checklist

Map #27 closes when all of the following hold:

1. Every `wayfinder:*` child ticket of #27 is resolved — currently #57, #58, #59, and anything they spawn.
2. #57 confirms every one of #29–#32 and #33–#54 is closed-with-resolution, kept-open-with-a-real-decision-remaining, or replaced by a fresh `/implement`-ready ticket. #57 has been expanded to cover #33–#54 alongside #29–#32 (previously only the latter were in scope) — see the updated #57 body.
3. #59 records a named owner and trigger for `docs/staging-release-evidence-checklist.md`. **Locked now:** the Treasurer owns filling it, triggered once every #55/#59 pre-launch blocker has merged, run immediately before requesting production `clasp push`/deploy (per DEPLOY.md and ADR 0090's explicit-approval gate). The map requires this decision recorded, not the checklist filled.
4. A go-live decision is recorded: who approves production cutover and against which staging deployment ID. The map requires the decision of *who* and *how*, not the cutover event itself.
5. No item remains in the map's "Not yet specified" section outside the scope already covered by 1–4 — a catch-all so a stray addition can't silently bypass closure.

### What does not gate closure

The actual blocker-bar code fixes landing in `/implement`, the staging checklist being filled with real evidence, and the production go-live event itself — these are tracked downstream of the map, not by #27 staying open.

Closes #56.
