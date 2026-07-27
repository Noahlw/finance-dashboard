Discovered during #57's reconciliation of #51 (Approval, Payout, and Movement Ledger) against the current build.

## Defect

`CoreDecisions.js:152`'s `SELF_APPROVAL_ACTIONS` list includes `APPROVE`, `REDUCE`, `VERIFY`, `APPROVE_PAYOUT` but omits `REQUEST_INFO`, `REJECT`, and `CLOSE`. Per ADR 0079 (spreadsheet owner controls role flags) and the broader self-approval-transparency pattern already established (Treasurer self-approval is allowed but must be flagged and audited — see ADR 0172), a Treasurer who self-**rejects** or self-**closes** their own Budget Request or Claim currently does so without the `self_approved` flag being set or a Discord self-approval notice firing. The action succeeds (Treasurer authority is correct), but the audit trail loses the self-dealing transparency signal for these three action types.

## Fix direction

Add `REQUEST_INFO`, `REJECT`, `CLOSE` to `SELF_APPROVAL_ACTIONS` in `CoreDecisions.js:152` so `isSelfApproval()` (line 332-334) correctly flags these cases too, consistent with the existing self-approval audit/notification pattern for `APPROVE`/`REDUCE`/`VERIFY`/`APPROVE_PAYOUT`.
