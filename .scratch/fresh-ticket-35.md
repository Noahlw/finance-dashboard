Discovered during #57's reconciliation of #35 (Budget Request and Budget Line workflow) against the current build.

## Defect

`api_getMyClaims` (`Api.js:134`) returns an `overBudget` flag per budget line, but `ClaimsView.tsx:359-371`'s budget-line selection step only reads `bl.remaining` — it never reads or surfaces `bl.overBudget`. Per ADR 0166 (over-budget lines remain selectable) and #35's acceptance criteria ("Budget Lines... remain visibly over budget when availability is zero or negative"), the operator should see a visible warning when selecting an over-budget line. Today they get no such warning; the line is silently selectable with no visual distinction from a healthy line.

## Fix direction

In `ClaimsView.tsx`'s budget-line selection UI, read `bl.overBudget` alongside `bl.remaining` and render a warning state (e.g. a badge or inline note) when true, consistent with the "remain selectable but visibly flagged" pattern ADR 0166 already established for the backend.

## Note

This is distinct from the already-tracked "Budget Request Reduce and Close UI" gap in #55 — that gap is about missing Treasurer-facing decision actions; this is a Claim-intake-side warning gap.
