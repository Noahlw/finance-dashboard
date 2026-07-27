Part of #27
Cross-linked: #55, #59

## Context

When a Treasurer approves a VERIFIED claim, the backend has had the ability to
bind the resulting QUEUED Payout to a specific Finance Account since the
Payouts V2 work (see `Payouts.js:7` doc comment and the `account_id` column
introduced on the Payouts tab at `Constants.js:214`). Likewise, the backend
has always had a payment-method-conditional transaction-reference contract on
`markPayoutSent`: `FPS` and `PAYME` require a non-empty `txnReference`;
`OTHER` does not (`Payouts.js:152-160`, `Api.js:2639-2677`).

The Phase-2 web workspace UI has never been updated to expose either of these
to the Treasurer. The claim-approval flow goes straight from "Approve for
Payout" to a no-account, no-method, no-reference state, and the mark-sent
modal only ever works for the few cases where the Treasurer happens to know
the answer from memory. This is one of the "Partial UI gaps" items that #55
called out for pre-launch closure.

## What the backend already supports (do not change)

These are the contracts the new UI must match, not replace. Implementation
must NOT alter the wire format.

### Account selection on approval

- `api_approvePayout(claimId, accountId)` (`Api.js:2570-2597`) accepts an
  optional `accountId`. When supplied, it is passed as
  `payload.account_id` to `Engine.transition("ExpenseClaim", claimId,
  "APPROVE_PAYOUT", ...)` (line 2586-2592). The Engine forwards it to
  `Payouts.onClaimApprovedForPayout(claimId, accountId)`
  (`Payouts.js:299-323`), which writes the value into the new Payout row at
  `Payouts.account_id` (column 11, `Constants.js:214`).
- The account binding is consumed at `markPayoutSent` time, where
  `MovementLedgerForPayouts_.post({ accountId: row.values[pc.account_id -
  1], ... })` (`Payouts.js:273-285`) deducts the payout amount from the
  account's balance.
- `api_approvePayout(claimId)` is still callable with no `accountId`; the
  Payout is created with `account_id = ""` and `markPayoutSent` simply
  skips the balance deduction (`Payouts.js:273-285`, the `if (accountId)`
  guard). The new UI must keep "no account selected" a valid path so the
  existing flow does not regress.
- `api_getAccounts()` (`Api.js:2117`) returns the list of Finance Accounts
  the approver should pick from. The PayoutsView already calls it
  (`PayoutsView.tsx:20`), so the pattern is established in this codebase.

### Payment-method-conditional transaction reference

- `api_markPayoutSent(payoutId, payload)` (`Api.js:2639-2677`) accepts
  `payload.method` and `payload.txnReference`. The `method` defaults to
  the value already on the Payout row if `payload.method` is not supplied
  (line 2654), so callers can choose to set it or to keep what is there.
  `txnReference` is required server-side for `FPS` and `PAYME` only
  (`Payouts.js:152-160`).
- The valid `method` enum is `FPS | PAYME | OTHER` (`Constants.js:313-319`,
  `Api.js:328-330`, `Api.js:1499-1501`).
- The Payout stores `method` (column 5) and `txn_reference` (column 6) in
  **separate columns** on the Payouts tab (`Constants.js:213-227`). The
  backend never stores them in a single concatenated field. (The "METHOD|txn_reference"
  pipe-encoding is a separate, Phase-1-only shortcut in
  `Approvals.js:252-256` for the legacy spreadsheet `onEdit` trigger —
  it does not apply to the Phase-2 web UI and must not be introduced
  there.)

## Current UI behavior (the gap)

### On claim approval — `src/frontend/src/ReviewDashboard.tsx`

- `handleAction("approve-payout")` calls
  `apiService.approvePayout(selectedClaim.claim_id)` with no `accountId`
  (`ReviewDashboard.tsx:99-101`).
- The component imports no `FinanceAccount` data and has no account
  selection control in its state. There is no `getAccounts()` call.
- The service layer already has the right shape: `api.ts:104-128`
  (`approvePayout`) and `api.ts:130-157` (`approvePayoutWithAccount`).
  The latter is defined but never called from anywhere in the
  `src/frontend/src` tree.

### On payout mark-sent — `src/frontend/src/PayoutsView.tsx`

- `MarkSentModal` (`PayoutsView.tsx:281-403`) does already render a
  `txnReference` text input (line 384-386) and a "required for FPS/PAYME"
  guard (`needsTxnRef` at line 295, validation at line 298-301). That part
  is in place and is **not** the gap.
- The mark-sent modal reads the method from the existing Payout row
  (`payout.method`), and `api_getQueuedPayouts` (`Api.js:2620-2631`)
  returns whatever is in `Payouts.method` (column 5). Because
  `Payouts.onClaimApprovedForPayout` creates the row with `method = ""`
  (`Payouts.js:318`), the modal currently displays an empty method for
  every freshly-approved Payout and offers no path for the Treasurer to
  set one.

### On the claim itself

- The claimant picks the payout method at claim time, via
  `ClaimsView.tsx:524-635` (FPS phone + account, PayMe phone OR QR, Other
  details). That data lands in `Vault.payout_method` and
  `Vault.payout_handle` (`Api.js:374-377`, `Api.js:1222-1226`,
  `Api.js:1703-1707`) and is NOT propagated to the Payout row when the
  Engine approves the claim.

## What to build

Two coupled pieces. Implement them together; they are the same Treasurer
moment and the data flow is one direction.

### 1. Claim-intake side: propagate payout method to the Payout row

- When `Payouts.onClaimApprovedForPayout(claimId, accountId)` creates the
  Payout row (`Payouts.js:311-323`), read the claim's `payout_method`
  and `payout_handle` from the Vault (via the claimant's user_id, which
  is already on the claim row at `claimRow.values[c.claimant_id - 1]`).
  Write `method` and a derived `txn_reference` seed into the Payout row:
    - `method` = the Vault payout method string (`FPS` / `PAYME` /
      `OTHER`).
    - `txn_reference` = empty string on creation. The Treasurer
      supplies the real reference at mark-sent time, or — per option 2
      below — confirms it on the approve step itself.
- Update the `Audit.append` event for the `CREATE` so the new fields
  show up in the audit log (line 325-330).
- This is a non-breaking change: existing mark-sent logic still
  defaults `method` from the Payout row when the caller does not
  supply one (`Api.js:2654`).

### 2. Approve action: add an account picker and a payment-method-conditional reference field

In `src/frontend/src/ReviewDashboard.tsx`:

- On mount, alongside the existing `loadQueue()` call, also call
  `apiService.getAccounts()` and store the result in local state
  (mirroring the pattern in `PayoutsView.tsx:12,20`).
- The detail modal that renders for a `VERIFIED` claim (the same modal
  that currently shows the "Approve for Payout" button at line 452-457)
  must add:
    - A required **Finance Account** picker, populated from the
      accounts fetched above. Default to empty. Reject submission with
      a visible error if the Treasurer tries to approve with no
      account chosen (this is the only valid path: the mark-sent
      balance deduction needs an `account_id` and the silent-skip
      behavior is the gap we are closing).
    - A read-only summary of the claim's payout method and handle
      (FPS phone + account, PayMe phone OR QR filename, or Other
      details), pulled from the `ClaimQueueItem`. The Treasurer must
      see what the claimant asked for before approving.
    - For claims whose `payout_method` is `FPS` or `PAYME`, a
      **Transaction reference** text input. Mark it required. Pass
      the value through to the approve call so the mark-sent step is
      one click later. (For `OTHER`, do not show the field — matching
      `Payouts.js:152-160`'s "required only for FPS/PAYME" rule.)
- Wire the picker and reference input into `handleAction("approve-payout")`
  (line 99-101) so it calls
  `apiService.approvePayoutWithAccount(claimId, accountId)` (which is
  already implemented in `api.ts:130-157`) and, for FPS/PAYME claims,
  pre-populates the Payout's `txn_reference` via the same API path.
  The cleanest way to set the reference at approve time is to extend
  `api_approvePayout` to accept an optional `txnReference` in its
  payload and have the Engine forward it into
  `Payouts.onClaimApprovedForPayout` — keep the pipe-encoding
  (Approvals.js) out of this. If the engine is hard to extend here,
  an acceptable alternative is to have the Treasurer's "Approve for
  Payout" submission call `api_approvePayout(claimId, accountId)` and
  then call `api_markPayoutSent`-style logic to write the reference —
  but the cleaner path is to extend `api_approvePayout`'s payload
  contract; whichever you pick, the Payout row's `txn_reference` must
  be non-empty for FPS/PAYME claims by the time the Treasurer moves
  on.

## Acceptance criteria

- [ ] A Treasurer viewing a `VERIFIED` claim in
      `src/frontend/src/ReviewDashboard.tsx` sees, in the approve
      modal: (a) a Finance Account select with all `ACTIVE` accounts
      from `api_getAccounts()`, (b) a read-only summary of the
      claimant's chosen payout method and handle, (c) for `FPS` and
      `PAYME` claims, a required text input labelled "Transaction
      reference", (d) for `OTHER` claims, no transaction-reference
      field.
- [ ] The "Approve for Payout" button is disabled until a Finance
      Account is selected. For `FPS` and `PAYME` claims, it is also
      disabled until the reference input is non-empty after trim.
- [ ] Approving a `VERIFIED` claim with all required inputs calls
      `api_approvePayout(claimId, accountId, txnReference)` (or the
      equivalent two-step `approvePayout` + reference-write path) and
      the resulting Payout row has: `status=QUEUED`,
      `account_id=<the chosen account>`, `method=<the claim's
      payout_method>`, and — for FPS/PAYME — `txn_reference=<the
      entered reference>`. Verify by reading the row back via
      `api_getQueuedPayouts`.
- [ ] A subsequent `api_markPayoutSent(payoutId, { method,
      txnReference })` call with no `txnReference` for an FPS/PAYME
      payout still returns the existing
      `"FPS requires a transaction reference."` / `"PAYME requires
      a transaction reference."` error (i.e. the new UI did not
      weaken the server-side check). Verify by sending the call
      with `txnReference=""` and asserting the error.
- [ ] The Payouts tab `account_id` column is populated for every
      newly-approved Payout (no more empty `account_id` rows created
      through the Phase-2 UI). A new integration test
      (`tests/api.test.js` or a sibling) exercises the full path:
      submit a claim, verify it, approve-with-account-and-reference,
      then `api_getQueuedPayouts` and assert the row carries both
      values.
- [ ] Audit.append for the Payout `CREATE` event
      (`Payouts.js:325-330`) includes `method` and (for FPS/PAYME)
      `txnReference` so the audit log shows what was bound at
      approve time, not just at mark-sent.
- [ ] `Payouts.onClaimApprovedForPayout` no longer leaves `method`
      blank on the Payout row. Existing tests that construct Payout
      rows with empty `method` must be updated; the integration test
      added in the previous bullet is the canonical replacement.
- [ ] The pre-existing `MarkSentModal` in `PayoutsView.tsx` still
      works: it shows the propagated method and the reference, lets
      the Treasurer edit either before sending, and rejects
      `txnReference=""` for FPS/PAYME. Its current
      `needsTxnRef`/`handleSubmit` validation is the model the new
      approve-modal code must follow.

## Out of scope

- Changing the payout-method encoding scheme (i.e. still two separate
  columns on the Payouts tab, not a single concatenated field). The
  Phase-1 `Approvals.js:252-256` pipe-encoding stays where it is and
  is not generalised to the new path.
- Refunding the `api_approvePayout(claimId, accountId)` no-account
  fallback in `Api.js:2581-2584`. The backend keeps accepting
  no-account; the UI simply stops using that path.
- Changing the claim intake form. The Treasurer is confirming, not
  re-entering, the claimant's method.
- Re-papering the existing Payouts that are already in the sheet
  with empty `method`/`txn_reference`. A one-shot backfill
  migration is a separate ticket; this one only fixes the create
  path going forward.
- Anything to do with `Payout.parent_payout_id` / partial payments.
  The partial-payment flow already works through `markPayoutSent`
  and is unaffected.
- Adding account selection to non-approval flows (e.g. member
  intake, income recording, transfer recording). Those flows either
  already have account pickers or are out of scope for this ticket.
