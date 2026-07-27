Discovered during #57's reconciliation of #38 (Claim review and Discord follow-up) against the current build.

## Defect

`CoreDecisions.authorize()` (`CoreDecisions.js:167-168`) correctly rejects Committee self-verification server-side (an operator cannot verify a Claim they created or that names them as Claimant). However, `ReviewDashboard.tsx` shows the Verify button unconditionally — it does not check whether the viewing operator is the claim's `created_by` or `claimant_id` before rendering the action. The operator can click Verify, only to have the server reject it. This is a real UX gap (confusing failure, not a security hole — the server-side rejection is correct and holds).

## Fix direction

In `ReviewDashboard.tsx`, hide or disable the Verify action when the current operator matches the claim's `created_by` or `claimant_id`, mirroring the server-side `COMMITTEE_SELF_VERIFICATION` check already enforced in `CoreDecisions.authorize()`.

## Note

This is distinct from the already-tracked "Discord retry UI" gap in #55 — that gap is a separate missing feature (retrying failed Discord notifications), not related to self-verification.
