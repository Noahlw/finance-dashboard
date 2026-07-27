Part of #27
Blocked by: #55

## Question

How will production schema migrations and code updates be executed safely without risking data corruption, row header misalignment, or database pointer drift?

## Decisions locked so far (from #55)

- Upgrades run through versioned migrations that physically move column data to match the new COLS layout.
- Migration Authority: Spreadsheet owner only (same gate as resetAllData).

## Hard requirements surfaced by CEO-review blind-spot pass (2026-07-26)

A reviewer sub-agent independently read the migration-relevant code (Setup.js, Config.js, AnnualMigration.js, Api.js) and found the naive "versioned migration that moves column data" design is unsafe as originally scoped. These are non-negotiable additions, not optional expansions:

1. **Canonical header preflight, not row-1 trust.** Setup.js:136-137 writes headers via `Object.keys(COLS[name])` (source-literal/insertion order), not the numeric COLS index. Concrete proof: AccountAdjustments writes `[account_id, adjusted_at, adjusted_by, adjustment_id, amount, direction, reason]` while runtime code reads col1 as `adjustment_id`; Users writes `[active, created_at, display_name, email, role, user_id]` vs expected col1 `user_id`. Existing data may already be numerically correct under mislabeled headers. A migration that trusts Row 1 to decide how to reorder values will move already-correct data into the wrong columns. The migration runner must canonicalize headers against the numeric COLS index, reject ambiguous/duplicate/missing/unknown headers outright, and never guess a reorder from label text.

2. **Migration must be locked, journaled, and rollback-capable.** No LockService lock, no per-step journal, no rollback path exists in the current design. Multi-sheet writes are not atomic. Audit.append already takes a ScriptLock — the migration lock must not nest into a deadlock with it. Wrap the whole migration in LockService.getScriptLock() with a timeout; write a per-step idempotent journal; support resuming or rolling back a partial migration.

3. **Formula registry required — setValues destroys array formulas.** BudgetRequestLines.claimed_amount is a MAP/LAMBDA/SUMIF array formula. A migration that writes rows via setValues without re-applying formulas leaves that column blank. Maintain a per-tab formula registry (column -> formula template) and re-apply after any data rewrite.

4. **Protections and validations are not truly reapplied today.** Setup_applyProtections skips re-applying protections that already exist; Setup_applyDropdown only validates rows 2-1000. After a column reorder, validation ranges may not cover the full data range and protections may not follow the moved columns. The migration must drop-and-recreate protections and validations against the post-migration column layout, not assume they carry over.

5. **setupAll must abort before any write if the active spreadsheet doesn't match LEDGER_ID.** Currently getSheet_() reads via the LEDGER_ID script property, but setupAll's early logic can write to the active spreadsheet before any guard fires. If the active spreadsheet differs from the stored LEDGER_ID (e.g. post-Annual Migration, script still bound to last year's container), the first writes silently land in the wrong ledger. Add an explicit reconciliation check at the very top of setupAll: if LEDGER_ID is set and differs from the active spreadsheet ID, abort with a clear error before any header or seed write.

6. **SCHEMA_VERSION must be per-ledger, not a single global ScriptProperty.** A single global schema version conflates the state of prior-year and current-year ledgers, which coexist post-Annual-Migration (prior year stays viewable read-only). Store schema version as a property scoped to (or read from a Config-tab row within) the specific ledger being migrated.

7. **AnnualMigration wiring gap.** AnnualMigration.js creates fresh tabs on the new ledger but never runs Setup's formula/validation/protection application, and its health check only verifies CONFIG/USERS/AUDIT_LOG exist — not that formulas, validations, and protections are in place. Activation must be blocked until Migrate_run (or the equivalent Setup_* pass) completes successfully on the new ledger; extend the health check accordingly.

8. **Related race conditions found in the same pass (see #59 for the P0-severity one).** setMemberSelections (AnnualMigration) does read-modify-write on selection JSON without a lock; activateMigration performs _setConfig ACTIVATE + setProperty LEDGER_ID + health check without an atomic lock, so concurrent activation attempts can leave mismatched state. Both need LockService wrapping as part of this migration-safety work.

## Questions to resolve

1. How is SCHEMA_VERSION tracked per-ledger and validated against live Google Sheets tabs, given requirement 6 above?
2. What does the canonical-header preflight algorithm do when it finds an ambiguous state (duplicate header text, unknown column, or missing required column) — hard abort with what operator-facing message?
3. What does the migration journal record per step, and what does a resume-after-partial-failure look like operationally for the owner running it?
4. What audit log or verification record (manifest, checksums, Audit.verifyChain call) is generated upon a successful schema migration, and does it feed the staging evidence checklist from #59?
