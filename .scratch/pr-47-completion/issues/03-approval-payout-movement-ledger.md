# 03 — Approval, Payout, and Movement Ledger

**What to build:** A Treasurer can review a submitted Claim, approve it, record full or partial Payouts against Finance Accounts, and see balances updated from an append-only Movement Ledger without duplicate or failed movements.

**Blocked by:** 02 — Draft-first Claim submission.

**Status:** ready-for-agent

- [ ] Treasurer verification and payout approval follow explicit server-authoritative state transitions.
- [ ] Treasurer self-verification/self-approval is allowed, flagged as SELF_APPROVED, and fully audited; Committee self-verification is rejected.
- [ ] Full Payout marks the Claim PAID; partial Payout leaves a remainder; repeated confirmation cannot post money twice.
- [ ] Successful Sent Payouts, approved Income, Transfers, and Treasurer Adjustments create idempotent append-only ledger movements.
- [ ] Failed Payout attempts leave balances unchanged and can be retried safely.
- [ ] Finance Account lifecycle and negative adjustments follow Treasurer-only permissions and audit requirements.
- [ ] Payout, Income, balance, lock, self-approval, and failure/retry tests pass.
