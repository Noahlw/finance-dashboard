# Claim and receipt submission is atomic from the operator’s perspective

Status: accepted

The web app will submit Claim data and attached files through one server-side operation. It must link successful files to the Claim, clean up newly created Drive and sheet artifacts when the operation fails, and use an idempotency key so retries do not create duplicate Claims or Receipts.
