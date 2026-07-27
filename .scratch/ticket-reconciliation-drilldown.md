Part of #27
Cross-linked: #55, #59

## What to build

Complete the Treasurer-facing reconciliation workflow by exposing the drill-down and audited-correction capabilities that already exist in the Apps Script backend.

The backend surface is already present:

- `Reconciliation.build()` starts from `MovementLedger.list()` (`Reconciliation.js:4-5`), totals each signed movement by `account_id`, and classifies every movement into `drilldown.income`, `drilldown.payouts`, `drilldown.transfers`, or `drilldown.adjustments` (`Reconciliation.js:7-29`). Each movement carries `account_id`, signed `amount`, `movement_id`, `movement_type`, `source_type`, `source_id`, optional `counterparty_account_id`, `posted_by`, `posted_at`, and `reason` (`MovementLedger.js:22-44`).
- For each Finance Account, `Reconciliation.build()` calculates `expected_balance = opening_balance + ledger_total`, reads the recorded `current_balance` as `actual_balance`, calculates `difference = actual_balance - expected_balance`, and flags non-zero differences as `mismatches` (`Reconciliation.js:46-65`). It returns `accounts`, the four drill-down collections, `mismatches`, incomplete Payouts, and the movement count (`Reconciliation.js:93-99`).
- `api_getReconciliation()` is the Treasurer-only read endpoint and returns `Reconciliation.build()` (`Api.js:3696-3707`).
- `api_correctReconciliation(payload)` is the Treasurer-only correction endpoint. It requires a non-empty `reason`, then calls `Reconciliation.correct(accountId, amount, direction, reason, operator.userId)` and returns the resulting `adjustment_id` (`Api.js:3710-3737`).
- `Reconciliation.correct()` rejects a blank reason, delegates the money change to `Engine.adjustAccount()`, and appends a reconciliation-specific `CORRECT` audit record containing the adjustment ID, amount, direction, and reason (`Reconciliation.js:102-121`). `Engine.adjustAccount()` independently enforces Treasurer role, `CREDIT`/`DEBIT`, a non-empty reason, a positive amount, and an active account (`Engine.js:931-960`); it writes the Account Adjustment, posts the corresponding Movement Ledger entry, and appends the Account Adjustment audit record (`Engine.js:963-993`).

The React surface does not expose those capabilities today. `ReconciliationView.tsx:23-54` renders only the account-level Opening/Ledger/Expected/Recorded/Difference summary table: rows have no drill-down action and there is no correction form. `ReconciliationData` omits the backend's `drilldown` payload (`src/frontend/src/types.ts:33-54`), and `apiService` has only the read wrapper for `api_getReconciliation()` (`src/frontend/src/services/api.ts:885-909`). `FinanceAccountsView.tsx:870-963` does contain a separate generic Adjustment form, but it calls `apiService.recordAdjustment()` / `api_recordAdjustment` (`src/frontend/src/services/api.ts:1095-1117`; `Api.js:2420-2457`) and is not tied to a reconciliation mismatch or the reconciliation-specific audit trail.

Build the drill-down directly into `ReconciliationView`: a Treasurer must be able to open an account-level mismatch and inspect only that account's underlying Movement Ledger transactions, with the summary arithmetic still visible. Add a correction form scoped to the selected mismatch. The frontend correction action must call a new typed `apiService.correctReconciliation(...)` wrapper over `google.script.run.api_correctReconciliation(payload)` - not the generic `api_recordAdjustment` path - so the call flows through `Reconciliation.correct()` to `Engine.adjustAccount()` and records both the normal adjustment trail and the reconciliation-specific `CORRECT` audit entry.

## Acceptance criteria

- [ ] The frontend reconciliation types model the backend `drilldown` payload and all Movement Ledger fields needed for traceability: account, signed amount, movement ID/type, source ID/type, counterparty account when present, actor, timestamp, and reason.
- [ ] In `ReconciliationView`, each account in `data.mismatches` has an accessible expand/select action. Opening balance, signed ledger total, expected balance, recorded balance, and difference remain visible while inspecting the mismatch.
- [ ] Opening a mismatch shows every and only Movement Ledger row whose `account_id` matches that account, including Income, Payout, Transfer In/Out, and Adjustment movements. Each row shows movement ID/type, signed amount, source type/ID, counterparty when present, posted-by, posted-at, and reason; an account with no matching movements has an explicit empty state rather than a blank table.
- [ ] The drill-down makes the arithmetic auditable from the screen: the displayed opening balance plus the displayed signed movements equals the displayed expected balance, alongside the independently displayed recorded balance and difference.
- [ ] A correction form is scoped to the selected mismatched account and collects a positive amount, `CREDIT` or `DEBIT` direction, and a mandatory non-whitespace reason. The UI does not submit while any of those fields is invalid, and the backend continues to reject a missing reason.
- [ ] A typed `apiService.correctReconciliation` wrapper and the corresponding `google.script.run` declaration invoke `api_correctReconciliation` with `{ accountId, amount, direction, reason }`. The reconciliation UI does not route correction submissions through `api_recordAdjustment`.
- [ ] A successful correction returns and surfaces the `adjustment_id`, then reloads reconciliation data from `api_getReconciliation`. The resulting backend records include the Account Adjustment/Movement Ledger audit trail from `Engine.adjustAccount()` and the reconciliation-specific `Reconciliation` / `CORRECT` audit entry with the Treasurer, account, amount, direction, and submitted reason.
- [ ] A failed correction shows the structured backend error, preserves the entered values for retry, and does not optimistically alter the displayed balances or transactions.
- [ ] Non-Treasurers cannot read or submit this workflow; the existing frontend Treasurer gate (`src/frontend/src/App.tsx:161`) and both endpoint role checks remain effective.
- [ ] Automated coverage at the existing frontend/backend seams demonstrates account filtering across all four movement categories, blank-reason rejection, the exact `api_correctReconciliation` service call, success refresh, error preservation, and the reconciliation-specific audit append.

## Out of scope

- Changing the reconciliation calculation, mismatch threshold, Movement Ledger signing rules, or the meaning of opening/expected/recorded balances.
- Replacing or redesigning `Engine.adjustAccount()`, `Reconciliation.correct()`, `api_correctReconciliation()`, or their existing audit behavior beyond wiring the UI to that path.
- General Finance Account adjustment/transfer UI in `FinanceAccountsView`, payout lifecycle/retry behavior, Discord notification recovery, or changing incomplete-Payout detection.
