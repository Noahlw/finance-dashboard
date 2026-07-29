# Wayfinder map #27 closes on decisions, not deliverables

Status: accepted

Map #27 (code-managed React web app on Apps Script) closes when its decisions are locked and its tracker is clean — not when the underlying production-blocker fixes are implemented, merged, or verified in staging. This matches the map's own stated boundary ("Wayfinder produces decisions, not deliverables") and avoids the map staying open through the full implementation and release cycle, which is `/implement` and release-tracking work, not wayfinding.

## Closure condition

Map #27 closes when all of the following hold:

1. Every `wayfinder:*` child ticket of #27 is resolved: closed with a recorded resolution, or explicitly ruled out of scope on the map body. This currently means #57, #58, #59, and any tickets they spawn.
2. #57's reconciliation confirms every one of #29–#32 and #33–#54 is closed-with-resolution, kept-open-with-a-real-decision-remaining, or replaced by a fresh `/implement`-ready ticket. No stale ticket is left unaddressed.
3. #59 records a named owner and trigger condition for filling `docs/staging-release-evidence-checklist.md`. Locked: the **Treasurer** owns filling the checklist, triggered once every #55/#59 pre-launch blocker has merged — immediately before requesting the production `clasp push`/deploy per DEPLOY.md and ADR 0090's explicit-approval requirement. The map requires this ownership/trigger decision to be recorded; it does not require the checklist itself to be filled before the map closes.
4. A go-live decision is recorded on the map or a linked ticket: who approves production cutover, and against which staging deployment ID it is evaluated. The map requires the decision of who approves and how; it does not require the cutover to have happened.
5. No item remains in the map's "Not yet specified" section that is not already covered by resolving 1–4. This is a catch-all, not a new gate: it exists so a stray addition to "Not yet specified" outside the tracked tickets cannot silently bypass closure by never being checked against 1–4.

## What does not gate closure

- The actual code fixes for #55/#59's blocker bar landing in `/implement` and merging.
- The staging evidence checklist being filled with real evidence.
- The production go-live event itself.

These remain tracked by whatever succeeds the map (PRs against the blocker-bar tickets, the Treasurer's own release checklist, or a dedicated release ticket) — not by #27 staying open.

## Rationale

The map's own Notes already state this destination: "After the frontier below clears, hand concrete fixes to `/implement` as fresh tickets — do not reopen #34–#54 as if never built." A map that stays open until every fix is staging-verified defeats that purpose and creates the exact failure mode wayfinding is meant to avoid: an artifact that never falsifiably closes.
