# Treasurer controls pre-payment claim corrections

Status: accepted

Only the Treasurer may reopen a `VERIFIED` or `APPROVED_FOR_PAYOUT` Claim before payment. The correction requires a reason and an audit entry; `PAID`, `LOCKED`, and `REJECTED` Claims cannot be reopened in v1. This keeps normal committee data entry separate from exceptional post-verification changes.
