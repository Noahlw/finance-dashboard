## Claims

This domain covers the claim lifecycle from draft through payout.

### Key decisions

- Claims are single-claimant, single-currency (HKD), positive-amount records
- Drafts are private, resumable, discardable
- Receipts are recommended but not required; missing receipts are an explicit flag
- Multi-receipt per claim, same-operator hashed receipt reuse
- Claim states: Draft, Submitted, Needs Info, Verified, Approved, Rejected
- State-based mutability with Treasurer-only correction path
- Event association is optional and can be added later


### Source ADRs (23)

| # | Title |
|---|-------|
| 0008 | [Claims separate claimant and operator identity](docs/archive/adr/from-docs-adr/0008-separate-claimant-and-operator-identity.md) |
| 0010 | [Claims remain separate within an event](docs/archive/adr/from-docs-adr/0010-separate-claims-per-claimant.md) |
| 0013 | [Claims use an explicit review and payout lifecycle](docs/archive/adr/from-docs-adr/0013-claim-review-and-payout-lifecycle.md) |
| 0014 | [Claim mutability follows the review lifecycle](docs/archive/adr/from-docs-adr/0014-state-based-claim-mutability.md) |
| 0018 | [Claimant identity is manually entered before attendance inte](docs/archive/adr/from-docs-adr/0018-manual-claimant-identity-before-attendance-integration.md) |
| 0019 | [Claim payment details use conditional methods](docs/archive/adr/from-docs-adr/0019-conditional-claim-payment-methods.md) |
| 0021 | [Claims may have multiple purchase receipts](docs/archive/adr/from-docs-adr/0021-multiple-receipts-per-claim.md) |
| 0023 | [Claim amount is manually entered](docs/archive/adr/from-docs-adr/0023-manual-claim-amount.md) |
| 0026 | [Claim and receipt submission is atomic from the operator’s p](docs/archive/adr/from-docs-adr/0026-atomic-claim-and-receipt-submission.md) |
| 0036 | [SID is required and Claimant name is optional](docs/archive/adr/from-docs-adr/0036-sid-required-name-optional.md) |
| 0039 | [Payouts use the Claim’s saved payment details](docs/archive/adr/from-docs-adr/0039-payout-uses-saved-claim-payment-details.md) |
| 0042 | [Information requests notify a Discord role](docs/archive/adr/from-docs-adr/0042-discord-notice-for-claim-information-requests.md) |
| 0062 | [Claims and Budget Requests use separate UI flows](docs/archive/adr/from-docs-adr/0062-separate-claim-and-budget-request-flows.md) |
| 0065 | [New Claim uses a mobile stepper](docs/archive/adr/from-docs-adr/0065-stepper-based-mobile-claim-form.md) |
| 0066 | [Claims may be saved as Drafts](docs/archive/adr/from-docs-adr/0066-draft-claims-are-resumable.md) |
| 0067 | [Draft Claims remain private until submission](docs/archive/adr/from-docs-adr/0067-drafts-are-private-until-submission.md) |
| 0068 | [Draft Claims can be discarded](docs/archive/adr/from-docs-adr/0068-draft-claims-can-be-discarded.md) |
| 0070 | [Draft files upload only at final submission](docs/archive/adr/from-docs-adr/0070-draft-files-upload-at-final-submission.md) |
| 0080 | [Claim purpose note is required](docs/archive/adr/from-docs-adr/0080-claim-note-is-required.md) |
| 0081 | [Claim Expense Date is required](docs/archive/adr/from-docs-adr/0081-claim-expense-date-is-required.md) |
| 0083 | [Receipt totals cap split Claims when available](docs/archive/adr/from-docs-adr/0083-receipt-total-caps-split-claims.md) |
| 0153 | [Final Receipt upload is atomic with Claim submission](docs/archive/adr/from-docs-adr/0153-final-receipt-upload-is-atomic.md) |
| 0173 | [Claim verification is separate from payout approval](docs/archive/adr/from-docs-adr/0173-claim-verification-is-separate-from-payout-approval.md) |