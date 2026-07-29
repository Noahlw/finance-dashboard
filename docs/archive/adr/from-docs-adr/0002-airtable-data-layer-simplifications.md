# 2. Airtable Data Layer Simplifications

Date: 2026-07-16

## Status
Accepted

## Context
The legacy system relied on Google Sheets and Apps Script, which required complex custom logic to handle concurrent ID generation (using `LockService` and a `Counters` sheet) and auditability (using cryptographic hashes appended to an `AuditLog` sheet).

By moving to Airtable, we have the opportunity to replace this custom code with native database features.

## Decision
We will completely eliminate the custom code for ID generation and Auditing in favor of Airtable's native capabilities:
1.  **ID Generation:** We will use Airtable's native `Autonumber` field combined with a `Formula` (e.g., `CONCATENATE("BUDGET-", {Semester}, "-", {Autonumber})`). We accept that deleting a record will result in a skipped sequence number.
2.  **Auditability:** We will rely exclusively on Airtable's native Revision History. We will not rebuild the cryptographic `AuditLog` ledger, as native history is sufficient for our security profile.

## Consequences
### Positive
*   Massive reduction in codebase size and complexity.
*   Zero risk of race conditions or script lock timeouts (which were critical errors in the old system).
*   Faster performance (no need to compute SHA256 hashes on every edit).

### Negative
*   Sequence numbers may have gaps if records are deleted.
*   Audit history retention is bound by the Airtable billing plan rather than being indefinite.
