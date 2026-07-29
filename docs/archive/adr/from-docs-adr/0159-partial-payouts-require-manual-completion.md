# Partial Payouts require manual completion

Status: accepted

Each Claim has one Payout record with an amount-paid field. The Treasurer may record a partial amount and later update it as additional money is sent. A partial Payout remains `APPROVED_FOR_PAYOUT`; the Treasurer manually marks the Payout complete once the cumulative amount equals the Claim amount, which transitions the Claim to `PAID`. Payout details become correction-protected after `SENT`.
