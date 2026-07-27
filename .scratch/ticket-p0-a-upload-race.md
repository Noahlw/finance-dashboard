Part of #27
Cross-linked: #55, #59

## What to build

Make `api_uploadReceipt`'s duplicate-hash check and receipt-row write one atomic critical section under a single Apps Script script-lock acquisition.

The race is confirmed in the current code at `Api.js:165-263`:

- The file bytes are decoded and hashed before any lock at `Api.js:182-195`.
- The Receipts tab is read at `Api.js:197-205`, and the duplicate SHA-256 scan runs at `Api.js:206-232`. No `LockService` lock is acquired around that read or scan.
- A new receipt ID is allocated by `Ids.nextId("Receipt")` at `Api.js:239`. `Ids.nextId` acquires `LockService.getScriptLock()` at `Ids.js:73-75`, but that lock covers only the Counters-tab read/update at `Ids.js:83-101` and is released at `Ids.js:102-103` before control returns to `api_uploadReceipt`.
- After that short ID-allocation lock has already been released, the function creates the Drive file at `Api.js:240-243` and persists the receipt with `_appendRow(receiptSheet, ...)` at `Api.js:251-261`. `_appendRow` itself (`Api.js:520-533`) has no lock.
- `Audit.append` does have its own script lock at `Audit.js:60-102`, but `api_uploadReceipt` does not call `Audit.append`; it provides no serialization for this path. The relevant write is the Receipts-row `_appendRow`, not an audit append.

Therefore the defect is still present: two executions can both read the same pre-write Receipts snapshot, both find no matching hash, then sequentially allocate different IDs and append two rows with the same hash.

Acquire the script lock after the existing authentication/input validation and SHA-256 calculation, then re-read the Receipts tab inside that lock. Keep the hash-existence decision, receipt ID allocation, and Receipts-row append within that same acquisition. Do not nest the existing locking `Ids.nextId()` call under an outer script lock; adapt ID allocation so this path can allocate the Receipt ID while the caller already holds the one script lock, while preserving `Ids.nextId()`'s locking contract for existing callers. Release the lock in `finally` on every return and exception path.

## Acceptance criteria

- [ ] `api_uploadReceipt` acquires `LockService.getScriptLock()` once for the receipt-creation critical section and waits with the project's existing 30-second timeout convention.
- [ ] After acquiring that lock, the function performs a fresh `Receipts` read and completes the SHA-256 existence check before allocating an ID or creating a Drive file. The pre-lock hash calculation may remain outside the critical section.
- [ ] The hash-existence check, Receipt counter allocation, Drive-file creation, and `_appendRow` receipt-row write all complete before that same lock is released. The new-upload path does not acquire a second/nested script lock through `Ids.nextId()`.
- [ ] Receipt ID allocation still updates the `Counters` tab exactly once and remains collision-safe for this path. Existing `Ids.nextId(entityType)` callers retain their current lock-protected behavior.
- [ ] Two concurrent uploads of identical bytes by different users produce exactly one Receipts row with that SHA-256. The winning call returns its new `receiptId`; after acquiring the lock and observing the winner's row, the losing call returns `DUPLICATE_RECEIPT` and creates neither a second Receipt ID nor a second Drive file.
- [ ] Existing same-user idempotency remains unchanged under the lock: a concurrent or later upload with the same hash and the same `uploaded_by` returns the existing row's `receiptId` without allocating an ID, creating another Drive file, or appending another row.
- [ ] Lock release is guaranteed with `try/finally` for successful creation, same-user idempotent return, cross-user duplicate rejection, Drive errors, and sheet-write errors.
- [ ] `tests/api.test.js` gains a regression test for the critical-section ordering and a deterministic concurrent/interleaved duplicate scenario backed by one shared mocked Receipts sheet. The test asserts one row for two same-hash/different-user calls, one ID allocation, one Drive-file creation, and a `DUPLICATE_RECEIPT` loser; it fails against the current unlocked `Api.js:197-262` implementation.
- [ ] The existing `tests/api.test.js:2103-2401` upload tests still pass, including successful upload, same-user hash idempotency, cross-user duplicate rejection, unsupported MIME rejection, and file-size rejection.

## Out of scope

- Changing `_sha256Hex`, the SHA-256 hash algorithm, or which file bytes are hashed.
- Changing deduplication semantics: same hash + same user still returns the existing receipt ID; same hash + different user still returns `DUPLICATE_RECEIPT`; the existing vendor/date/total match remains a soft warning only.
- Adding or changing `Audit.append` behavior for receipt uploads; this ticket protects the Receipts-row write.
- Changing receipt metadata, Drive naming/link format, upload size/MIME validation, frontend upload UX, or the separate `_requireOperator` authorization gap tracked in #71.
- General lock refactors for unrelated entity creation paths.
