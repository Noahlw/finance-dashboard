# Claims use an explicit review and payout lifecycle

Status: accepted

Claims will use the existing multi-stage lifecycle: `SUBMITTED`, `NEEDS_INFO`, `VERIFIED`, `REJECTED`, `APPROVED_FOR_PAYOUT`, `PAID`, and `LOCKED`. Committee users can request information and verify Claims; the Treasurer approves payout; payout confirmation and the later lock are recorded separately. This replaces the earlier one-step status assumption and makes review, payout responsibility, and final immutability explicit.
