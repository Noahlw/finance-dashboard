Part of #27
Cross-linked: #55 (production blocker bar that explicitly listed "Reduce/Close" UI as in-scope pre-launch)
Cross-linked: #59 (follow-up audit that did not reclassify Reduce/Close)

## What to build

The Engine, the backend `api_` wrapper, and the frontend `apiService` wrapper for Treasurer Reduce and Close on Budget Requests already exist and are wired. Only the Treasurer-facing UI buttons, the amount input for Reduce, and one missing type field are missing.

### Verified-existing surfaces (do NOT recreate — reuse as-is)

- **Engine function**: `Engine.transition(entityType, entityId, action, actorUserId, payload)` at `Engine.js:1585` accepts the action strings `'REDUCE'` and `'CLOSE'` for `entityType === "BudgetRequest"`. The action strings are documented in the JSDoc at `Engine.js:1580` (`'APPROVE', 'REDUCE', 'REJECT', 'REQUEST_INFO', 'VERIFY', 'APPROVE_PAYOUT', 'SUBMIT', 'WITHDRAW', 'RESUBMIT', 'CLOSE'`). `REDUCE` is handled at `Engine.js:72-73` (calls `_applyLineDecision` with `amount_override`) and `CLOSE` at `Engine.js:108-111` (status-only transition).
- **Engine legal states** (from `CoreDecisions.TRANSITIONS` at `CoreDecisions.js:66-91`): REDUCE is legal only from `PENDING` (Treasurer, requires amount, requires note). CLOSE is legal from `APPROVED` or `PARTIALLY_APPROVED` (Treasurer, no payload required). Both are Treasurer-only.
- **Backend wrapper**: `api_decisionBudgetRequest(entityId, action, payload)` at `Api.js:893-913` already calls `Engine.transition("BudgetRequest", entityId, action, user.userId, payload || {})` and enforces TREASURER role at `Api.js:899-902`. Exposed globally (line 3819 export list).
- **Frontend wrapper**: `apiService.decisionBudgetRequest(entityId, action, payload)` at `src/frontend/src/services/api.ts:296-321` already calls `google.script.run.api_decisionBudgetRequest(entityId, action, payload)`. No new `api_` endpoint or `apiService` method needed — reuse this one.
- **Confirmation helper**: `askForConfirmation` already imported in `BudgetRequestsView.tsx:2` from `./components/AccessibleDialog`, used by `handleSubmit` (line 139) and `handleDiscard` (line 151). Use the same helper for both new actions.
- **Toast helper**: `showNotice` already imported (line 2) and used for error surfacing throughout the view (lines 110, 132, 146, 158, 175).

### Missing piece 1 — type field

`BudgetDecisionPayload` at `src/frontend/src/types.ts:163-166` currently has only `action` and an optional `decision_note`. REDUCE requires `payload.amount_override` on the wire (Engine reads it at `Engine.js:238`). Add `amount_override?: number` to `BudgetDecisionPayload` so the UI can typecheck the value it sends.

### Missing piece 2 — UI surface (the actual work)

The decision modal in `src/frontend/src/BudgetRequestsView.tsx` at lines 458-530 currently exposes only three Treasurer actions: Approve (line 506), Request Info (line 513), Reject (line 520). There is no Reduce button, no Close button, and no amount input. The review dashboard (`src/frontend/src/ReviewDashboard.tsx`) does not host any Budget Request decision actions — the Treasurer decision flow lives in `BudgetRequestsView.tsx`'s pending-detail modal only.

In that modal:

1. Add a **`Reduce`** button that opens a sub-form inside the modal asking for the new total approved amount (numeric input, USD, must be > 0 and < `pendingDetail.total_requested`). The input must show the current requested total next to it for context. Submission sends `apiService.decisionBudgetRequest(pendingDetail.request_id, "REDUCE", { action: "REDUCE", decision_note: decisionNote, amount_override: <parsed number> })`.
2. Add a **`Close`** button that, when clicked, calls `askForConfirmation("Close this budget request? It cannot be re-opened.")`, then sends `apiService.decisionBudgetRequest(pendingDetail.request_id, "CLOSE", { action: "CLOSE", decision_note: decisionNote })` on confirm.
3. Gate each button by the request's current status so they cannot be sent in illegal states:
   - **Reduce**: show only when `pendingDetail.status === "PENDING"` (REDUCE is only legal from PENDING per `CoreDecisions.js:68`).
   - **Close**: show only when `pendingDetail.status === "APPROVED"` or `pendingDetail.status === "PARTIALLY_APPROVED"` (CLOSE is only legal from these two per `CoreDecisions.js:82-90`).
4. Wire the existing `handleDecision` function (line 162-177) so it forwards `amount_override` when present: extend its current payload `{ action, decision_note }` to also include `amount_override` when the caller supplies one. Cleanest approach: add an optional third parameter to `handleDecision(action, extra?)` and merge `extra` into the payload.

If `pendingDetail` does not currently include `status` in its shape (`PendingBudgetRequest` at `types.ts`), add it (or expose the underlying request status by whichever path `api_getPendingBudgetRequests` uses) so the gate above has a value to read.

## Acceptance criteria

- [ ] `BudgetDecisionPayload` (types.ts) gains an optional `amount_override?: number` field. The existing `decision_note?: string` field is unchanged.
- [ ] The Treasurer pending-detail modal in `BudgetRequestsView.tsx` renders a **`Reduce`** button when `pendingDetail.status === "PENDING"`, and a **`Close`** button when `pendingDetail.status === "APPROVED"` or `"PARTIALLY_APPROVED"`. Neither button appears for any other status.
- [ ] Clicking **Reduce** opens an inline sub-form (within the same modal) that requires a positive numeric `amount_override` strictly less than `pendingDetail.total_requested`, shows the current `total_requested` next to the input for context, and a `Confirm Reduce` action button. The sub-form's `Confirm` button calls `handleDecision("REDUCE", { amount_override: <parsedNumber> })`.
- [ ] Clicking **Close** triggers `askForConfirmation("Close this budget request? It cannot be re-opened.")`. Only on confirm does it call `handleDecision("CLOSE")` (no `amount_override`).
- [ ] `handleDecision` (`BudgetRequestsView.tsx:162-177`) accepts an optional `extra` payload and merges it into the outgoing `BudgetDecisionPayload` so `amount_override` reaches `apiService.decisionBudgetRequest`. The existing call sites (Approve / Request Info / Reject) continue to work unchanged.
- [ ] A Treasurer submitting a Reduce with `amount_override = 1500` against a PENDING request with `total_requested = 2000` causes `Engine.transition("BudgetRequest", id, "REDUCE", treasurerId, { amount_override: 1500, decision_note })` to be invoked server-side (verify via Apps Script logs / `Audit.append` row). The request transitions out of PENDING and lands on APPROVED or PARTIALLY_APPROVED per existing Engine semantics — no Engine change.
- [ ] A Treasurer submitting a Close against an APPROVED request causes `Engine.transition("BudgetRequest", id, "CLOSE", treasurerId, {})` to be invoked, and the request status moves to CLOSED per existing Engine semantics.
- [ ] On a non-Treasurer role, the new buttons either do not render (because `isTreasurer` gate at `BudgetRequestsView.tsx:37` hides the whole modal path) or, if rendered, produce a 4xx-style `UNAUTHORIZED` rejection from `api_decisionBudgetRequest` (server-side enforcement at `Api.js:899-902` is unchanged). Either is acceptable.
- [ ] No new files in `src/frontend/src/services/api.ts` — `apiService.decisionBudgetRequest` is reused. No new `api_` global in `Api.js` — `api_decisionBudgetRequest` is reused. No change to `Engine.js` semantics, `CoreDecisions.TRANSITIONS`, or any Engine helper.

## Out of scope

- Changing REDUCE or CLOSE business rules themselves: not legal states, not Treasurer-only enforcement, not the `amount_override` proportional split (`CoreDecisions.computeReduceSplit` at `CoreDecisions.js:241-287`), not the Audit.append side effects. The Engine is the source of truth and is unchanged by this ticket.
- Self-approval flagging for Treasurer REDUCE/CLOSE on their own request: that is the separate audit transparency gap tracked in #63 (Treasurer self-REJECT/self-CLOSE not flagged as self-approved). This ticket does not address audit/notification behavior; it only exposes actions that already work server-side.
- Adding REDUCE/CLOSE actions to any other view. The Treasurer decision flow lives in `BudgetRequestsView.tsx`'s pending-detail modal today; that is where the new buttons go. If `ReviewDashboard.tsx` is later refactored to host budget-request decisions, that migration is its own ticket.
- Bulk actions (Reduce/Close multiple requests at once): out of scope. This is per-request only.
- Adding `amount_override` to any other `BudgetDecisionPayload` action. Only REDUCE consumes it server-side today.