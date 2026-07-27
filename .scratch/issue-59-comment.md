## Partial resolution from #56's map-exit-criteria grilling

Decision needed item #3 is now locked, decided as part of #56 (see ADR 0175):

**Who owns filling the staging evidence checklist, and what triggers it:** the Treasurer owns filling `docs/staging-release-evidence-checklist.md`, triggered once every pre-launch blocker from this ticket and #55 has merged — run immediately before requesting the production `clasp push`/deploy (per DEPLOY.md and ADR 0090's explicit-approval gate). It gates production deployment; it does not run in parallel with the last pre-launch fixes landing.

Items #1 (P0-A/P0-B blocker classification) and #2 (Event picker) remain open for this ticket to decide.
