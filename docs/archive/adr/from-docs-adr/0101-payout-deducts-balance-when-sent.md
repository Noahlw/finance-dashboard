# Payouts deduct balances when sent

Status: accepted

An `APPROVED_FOR_PAYOUT` Payout is shown as reserved but does not reduce its Finance Account’s current balance. When the Treasurer records it as `SENT`, the system posts one audited money-out entry and deducts the amount exactly once. Confirmation later records receipt without deducting again.
