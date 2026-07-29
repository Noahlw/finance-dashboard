# ADR 0003 — Extract-and-strangle over Big Bang Clean Architecture

**Status:** accepted (2026-07-04) — supersedes the architecture in
`docs/superpowers/specs/2026-07-04-clean-architecture-revamp-design.md` and
`docs/superpowers/plans/2026-07-04-clean-architecture-revamp.md`

## Context

An earlier session designed and began implementing a full "Clean Architecture" split: a pure
`src/core/` domain (`CoreEngine.js`, `CoreValidations.js`, `CoreAudit.js`) returning explicit Command
Objects, executed by `src/gas/GasSheetRepository.js` under a new `GasRouter.js` entry point, with the
existing `Engine.gs`/`Constants.gs` to be deleted once the rewrite was complete. `HANDOFF.md` asked the
next agent to finish this as one "Big Bang" integration.

By the time this was picked back up, `CoreEngine.js` was a 32-line proof-of-concept implementing 1 of
Engine.gs's 16 real transitions, `CoreValidations.js` was an 8-line stub, and `GasSheetRepository.js`
was empty command-dispatch scaffolding — yet the project's own Jest coverage reported "100%", masking
that the 561 lines of working, already-debugged business logic in `Engine.gs` (the full transition
table, four-eyes checks, validation math) had zero tests. Separately, the plan's own duplicate
`Constants.gs`/`Constants.js` files were about to collide under `clasp push`'s flat global namespace.

## Decision

Reject the Big Bang rewrite. Instead: extract only the *pure* decision logic already inside
`Engine.gs` (the TRANSITIONS table, ownership/role/note/amount authorization, the REDUCE proportional
split, etc.) into `src/gas/CoreDecisions.js`, function by function, each one delegated to via a
one-line wrapper so no caller signature changes. `Engine.gs` keeps all I/O (`SpreadsheetApp`,
`LockService`, Discord) and remains the sole mutator of status — it is never deleted, only thinned.
`CoreEngine.js`, `CoreValidations.js`, and `GasSheetRepository.js` were deleted; no Command Object
layer or `GasRouter` was built.

## Consequences

- The old design spec and plan under `docs/superpowers/` are superseded, not deleted — they remain as
  a record of the architecture that was tried and rejected, and why.
- Each extraction is small, independently testable against *real* business rules (not a stub), and
  reversible on its own — there is no single high-risk cutover commit.
- `Engine.gs` remains the mutator of record per `CONTEXT.md`'s **Engine** definition; anything
  extracted into `CoreDecisions.js` must stay pure (no `SpreadsheetApp`/`LockService`/Discord calls) so
  it can keep running under Jest without a GAS runtime.
- A future agent seeing `src/core/` referenced in old docs should treat those docs as historical, not
  as the current architecture — this ADR is the current source of truth.
