# Schema migration canonicalizes headers by numeric COLS index, not label text

Status: accepted

`Setup.js:136-137` writes tab headers from `Object.keys(COLS[name])` — JS declaration order — not from `COLS[name]`'s numeric index values. Confirmed live mismatches: `AccountAdjustments` writes `[account_id, adjusted_at, adjusted_by, adjustment_id, amount, direction, reason]` while runtime code reads col1 as `adjustment_id`; `Users` writes `[active, created_at, display_name, email, role, user_id]` against an expected col1 of `user_id`. Existing data may already be numerically correct under a mislabeled header row.

Any schema migration (and the hardened `setupAll()`, per ADR 0178) must canonicalize every tab's header order against `COLS[name]`'s numeric index — never against the current row-1 label text, and never by "the label says X, so move data to X's position." A migration or setup run that finds a duplicate, unknown, or missing header for any tab hard-aborts the entire call before writing anything, with a per-tab/per-column diagnostic (tab, column letter, found header, expected header, classification). No partial apply, no per-tab skip, no auto-resolve from label text.

## Consequences

A brand-new (empty) tab is exempt from this preflight — there is nothing to canonicalize against, so it is initialized directly with the canonical numeric-sorted header. Only pre-existing tabs are preflighted, and only before any write to any tab in the same call (see ADR 0178 for the two-pass ordering this requires).
