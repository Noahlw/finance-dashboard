## Payout

This domain covers payout methods, payment details, and payout lifecycle.

### Key decisions

- One payout per claim
- Payout methods: FPS (HK phone + destination account), PAYME (phone or QR code), OTHER (free text)
- Payment QR stored separately from receipts
- Payout uses saved claim payment details
- Partial payouts allowed, require manual completion
- Sent payout is immediately paid (balance deducted)
- Failed payouts do not deduct balances
- Transaction reference required for electronic methods


### Source ADRs (19)

| # | Title |
|---|-------|
| 0015 | [Treasurer controls pre-payment claim corrections](docs/archive/adr/from-docs-adr/0015-treasurer-only-correction-path.md) |
| 0020 | [Legacy payout methods are abandoned](docs/archive/adr/from-docs-adr/0020-abandon-legacy-payout-methods.md) |
| 0022 | [Claims use HKD only](docs/archive/adr/from-docs-adr/0022-hkd-only-claims.md) |
| 0025 | [Receipt and payment files use a bounded upload contract](docs/archive/adr/from-docs-adr/0025-receipt-and-payment-file-contract.md) |
| 0037 | [Each Claim produces one payout](docs/archive/adr/from-docs-adr/0037-one-payout-per-claim.md) |
| 0038 | [Payouts are recorded and confirmed manually](docs/archive/adr/from-docs-adr/0038-manual-payout-recording-and-confirmation.md) |
| 0046 | [Authorized operators may view full Claim payment details](docs/archive/adr/from-docs-adr/0046-authorized-operators-see-full-payment-details.md) |
| 0084 | [Payment QR Codes use separate storage from Receipts](docs/archive/adr/from-docs-adr/0084-separate-payment-qr-storage.md) |
| 0085 | [Payment methods require complete conditional details](docs/archive/adr/from-docs-adr/0085-strict-payment-method-validation.md) |
| 0086 | [FPS and PayMe use normalized Hong Kong phone numbers](docs/archive/adr/from-docs-adr/0086-hong-kong-phone-validation.md) |
| 0087 | [FPS destination accounts are free-form](docs/archive/adr/from-docs-adr/0087-free-form-fps-destination-account.md) |
| 0101 | [Payouts deduct balances when sent](docs/archive/adr/from-docs-adr/0101-payout-deducts-balance-when-sent.md) |
| 0150 | [Missing Receipt does not block payout](docs/archive/adr/from-docs-adr/0150-missing-receipt-does-not-block-payout.md) |
| 0151 | [Receipts attach until payout approval](docs/archive/adr/from-docs-adr/0151-receipts-attach-until-payout-approval.md) |
| 0155 | [Payout reference is required for electronic methods](docs/archive/adr/from-docs-adr/0155-payout-reference-required-for-electronic-methods.md) |
| 0156 | [Partial Payouts are allowed](docs/archive/adr/from-docs-adr/0156-partial-payouts-are-allowed.md) |
| 0157 | [Failed Payouts do not deduct balances](docs/archive/adr/from-docs-adr/0157-failed-payouts-do-not-deduct-balances.md) |
| 0158 | [Sent Payout completion depends on the paid amount](docs/archive/adr/from-docs-adr/0158-sent-payout-is-immediately-paid.md) |
| 0159 | [Partial Payouts require manual completion](docs/archive/adr/from-docs-adr/0159-partial-payouts-require-manual-completion.md) |