# Sent Payout completion depends on the paid amount

Status: accepted

For a full-amount Payout, successful `SENT` recording may complete the Payout and transition the Claim to `PAID`. For a partial Payout, `SENT` records the money movement but the Claim remains `APPROVED_FOR_PAYOUT` until the Treasurer manually marks the full amount complete. V1 does not require a separate Claimant receipt-confirmation action.
