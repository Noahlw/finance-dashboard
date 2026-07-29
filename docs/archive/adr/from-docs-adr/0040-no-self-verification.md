# Claim creators cannot verify their own Claims

Status: accepted

The Committee Operator who creates a Claim cannot perform its `VERIFY` action, and no operator may verify a Claim whose Claimant SID is their own. Another authorized Committee Operator or the Treasurer must verify it; payout approval remains Treasurer-only. This preserves separation of duties for committee-entered Claims.
