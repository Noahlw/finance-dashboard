Part of #27
Cross-linked: #55, #59

## What to build

Fix one line in `api_getMyClaims` so the function actually returns the operator's approved budget lines.

**Bug, in the current code** (verified at these line numbers today, not the original Jul 26 audit positions):

- `Api.js:128` reads
  ```js
  allLines[i][c_brl.line_status - 1] === STATUS.APPROVED
  ```
- `Constants.js:266-310` defines `STATUS` as a namespaced object (`STATUS.BudgetRequest`, `STATUS.BudgetRequestLine`, `STATUS.ExpenseClaim`, `STATUS.FinanceAccount`, `STATUS.Income`, `STATUS.Payout`). There is **no** top-level `STATUS.APPROVED` key — the constant `STATUS.APPROVED` is `undefined`.
- Because the comparison is `... === undefined`, every row fails the filter and `budgetLines` is always pushed as `[]`. The function's outer `_ok({ budgetLines: [], ... })` shape is correct; the comparison is the only thing wrong.

The column write site proves the correct constant: `Engine.js:219` writes `setValue(STATUS.BudgetRequestLine.APPROVED)` to the same `line_status` column this filter reads, and the canonical sibling at `Api.js:1483-1484` already uses `STATUS.BudgetRequestLine.APPROVED` for the same comparison against the same column. The bug is purely that `api_getMyClaims` was written before the namespace refactor and never updated.

## Why this is a launch blocker

`App.tsx:122-123` does `apiService.getMyClaims().then((res) => setBudgetLines(res.budgetLines || []))`, and `ClaimsView.tsx:365-368` renders the line-selection `<select>` from that array. With the bug, every operator sees only the "None / pay from general fund" option (`ClaimsView.tsx:364`) regardless of how many lines they have approved, so the claim stepper's budget-line selection is effectively broken in production. No budget line = no per-line claim tracking, which defeats the audit-trail requirement that drove the original design.

## Fix

Change `Api.js:128` to:

```js
allLines[i][c_brl.line_status - 1] === STATUS.BudgetRequestLine.APPROVED
```

No other changes. Do not touch the column read, the `budgetLines.push(...)` shape, the `claims` / `requests` mapping, the request-id filtering, the auth gate, or the response envelope. `STATUS.BudgetRequestLine.APPROVED` evaluates to the string `"APPROVED"`, which is exactly what `Engine.js:219` writes to the sheet, so existing data already matches.

## Acceptance criteria

- [ ] `Api.js:128` compares `line_status` against `STATUS.BudgetRequestLine.APPROVED` (not the undefined `STATUS.APPROVED`).
- [ ] For an operator with at least one `BudgetRequestLines` row whose `line_status` is `APPROVED` and whose `request_id` belongs to a `BudgetRequests` row owned by that operator, `api_getMyClaims()` returns `data.budgetLines` containing an entry with that line's `line_id`, `description`, `request_id`, `remaining`, and `overBudget` (`remaining <= 0`).
- [ ] `data.budgetLines` excludes rows whose `line_status` is `PENDING`, `REDUCED`, or `REJECTED` — only `APPROVED` rows pass.
- [ ] `data.budgetLines` excludes `APPROVED` rows whose `request_id` is not owned by the calling operator.
- [ ] `data.claims` and `data.requests` are unchanged (same shape, same fields, same filtering as before the fix).
- [ ] `tests/api.test.js` `describe("api_getMyClaims")` gains a test that mocks one `BUDGET_REQUEST_LINES` row with `line_status = "APPROVED"` and asserts `data.budgetLines` contains that line; the existing "should map claims and requests properly" test still passes; the new test fails on the pre-fix code (i.e. would catch this exact regression).
- [ ] The full `tests/api.test.js` and `tests/engine.test.js` suites pass with `npx jest tests/api.test.js tests/engine.test.js` (or the project's standard test command).
- [ ] `grep -n 'STATUS\.APPROVED[^A-Za-z_.]' Api.js` returns no matches (the bare, undefined form is gone from `Api.js`; only `STATUS.BudgetRequestLine.APPROVED` and any other correctly-namespaced access remain).

## Out of scope

- No changes to `Api.js` functions other than the `STATUS.APPROVED` → `STATUS.BudgetRequestLine.APPROVED` fix on line 128 (e.g. the auth gate at lines 94-100, the request-id filtering, the `claims`/`requests` mapping at lines 141-158, the response envelope, and any other API surface stay exactly as they are).
- No changes to `Constants.js` (the `STATUS` namespace shape is correct; this is purely a call-site fix).
- No changes to `ClaimsView.tsx`, `App.tsx`, or any other frontend file — the existing `budgetLines` consumer already expects the documented shape and will render correctly as soon as the backend stops returning `[]`.
- No changes to `Engine.js`, `CoreDecisions.js`, or any other writer of `line_status` — they already use the correct `STATUS.BudgetRequestLine.APPROVED`.
- No new tests beyond the one named above; the existing `api_getMyClaims` test suite (auth-deny, unknown-user, claims/requests mapping) stays as-is.
- No docs or ADR changes — this is a one-line fix to a known pre-launch blocker from #55, already classified as P0 in that issue's question list.
