## Grilling Resolution: #59 decision items locked

Grilled with `/skill:grill-with-docs`. All three decision items are now resolved.

### 1. P0-A and P0-B are pre-launch blockers, no exception

Both `api_uploadReceipt`'s hash check-then-append race and `ClaimsView`'s missing draft-resume UI join the pre-launch bar locked in #55, under the same "full operator-facing workspace" scope. The go-live scenario's week-one workflows (Budget Request planning, claim recording) are exactly where both defects trigger — there is no scale or timing argument for deferring either.

### 2. Event picker is pre-launch, full CRUD per ADR 0073

This decision turned out larger than #59's original framing. Investigation found:

- `Events` is a real domain entity with a schema already defined in `Constants.js` (`event_id`, `name`, `semester`, `owner_user_id`, `created_at`).
- [ADR 0073](https://github.com/Noahlw/finance-dashboard/blob/main/docs/adr/0073-committee-event-management-treasurer-oversight.md) (status: accepted) already decided: "Committee Operators may create and edit Events. The Treasurer may also correct or close Events."
- **None of it is built.** The only Event-touching endpoint anywhere in `Api.js` is `api_setEventSelections`, used exclusively by Annual Migration to select which events carry forward — it is write-only and has nothing to do with day-to-day Event creation. There is no read/list endpoint, no create endpoint, no edit endpoint. `ClaimsView.tsx:53` and `FinanceAccountsView.tsx:476` type a free-text `eventId` string with no backing record — it is not even a foreign key today.

**Locked: pre-launch, full CRUD per ADR 0073 as written** — not a minimal create-only shim, not a frontend-only picker swap. This adds real scope to the eventual `/implement` ticket:

- Backend: `api_createEvent`, `api_editEvent` (Committee Operator), `api_closeEvent`/`api_correctEvent` (Treasurer oversight per ADR 0073), and a list/read endpoint for the picker to query.
- Frontend: an Event picker component backed by the new list endpoint, replacing the free-text inputs in `ClaimsView.tsx` and `FinanceAccountsView.tsx`, plus whatever Committee-facing create/edit UI ADR 0073 implies.
- Existing Claim/Income records with free-text `eventId` values need a migration or backfill decision when the real `event_id` foreign key is introduced — flagging this for whoever picks up the `/implement` ticket; it is not resolved here.

No new ADR needed — ADR 0073 already recorded the domain decision. This grilling only reaffirms it belongs in the pre-launch blocker bar rather than being deferred.

### Updated pre-launch blocker bar (combining #55 + #59)

- P0: `api_getMyClaims` undefined `STATUS.APPROVED` comparison (`Api.js:128-130`)
- 6+ `_requireOperator` auth gaps (scope confirmed broader than 6 — see #55/#58 blind-spot findings; full inventory lands in `/implement`)
- Budget Request Reduce/Close UI
- Discord retry UI
- Reconciliation drill-down UI
- Reports approved-only default + 3 filters
- Payout account selection + FPS/PAYME reference UI
- **P0-A**: `api_uploadReceipt` hash race (lock the check-then-append)
- **P0-B**: `ClaimsView` draft-resume UI
- **Event CRUD**: full create/edit (Committee) + correct/close (Treasurer) + list endpoint + picker UI, per ADR 0073

Staging evidence checklist ownership (Treasurer, post-merge trigger) already locked via #56/ADR 0175.

Closes #59.
