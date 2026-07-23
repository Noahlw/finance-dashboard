# 04 — Reconciliation and Discord recovery

**What to build:** A Treasurer can reconcile current balances from the Movement Ledger, drill into mismatches and incomplete Payouts, and retry non-blocking Discord follow-up notices from an auditable delivery record.

**Blocked by:** 03 — Approval, Payout, and Movement Ledger.

**Status:** ready-for-agent

- [ ] Reconciliation is Treasurer-only and derives financial totals from the append-only Movement Ledger.
- [ ] The view shows opening-balance comparisons, income/payout/transfer drill-down, failed or incomplete Payouts, and mismatches.
- [ ] Corrections require an explicit Treasurer action, reason, and audit record; normal Claims and Payouts are not silently rewritten.
- [ ] Discord notices contain no payment details and have pending, sent, and failed delivery states.
- [ ] Notification failure does not fail or roll back a successful finance transaction.
- [ ] A Treasurer can retry failed notices and see the delivery outcome.
- [ ] Reconciliation, authorization, notification, retry, and mobile/desktop browser tests pass.
