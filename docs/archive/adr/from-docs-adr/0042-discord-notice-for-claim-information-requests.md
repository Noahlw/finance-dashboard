# Information requests notify a Discord role

Status: accepted

When a Claim enters `NEEDS_INFO`, the web app will record the request and post a notice to a configured Discord server role. The notice includes Claim ID, SID, optional Claimant name, amount, Event when available, the request note, and a Claim link, but excludes payment details and receipt files. The notified role member contacts the Claimant through the existing WhatsApp process; v1 does not require a WhatsApp API integration.

Discord delivery is best-effort: a webhook failure must not roll back the Claim’s `NEEDS_INFO` state. The failure is logged for retry or Treasurer attention.
