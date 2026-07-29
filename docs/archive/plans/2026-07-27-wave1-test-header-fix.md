# Wave 1 Test Header & Pre-Commit Hook Alignment Plan

> **For OMP workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Dispatch each task as a fresh `task` subagent; gate between tasks with the OMP `reviewer` agent (the `code-review` skill's spec axis).

**Goal:** Establish a uniform, linter-compliant, and Jest-compatible test header pattern across `tests/api.test.js`, `tests/setup.test.js`, and `tests/migration.test.js` so that `npm test` and `npx ultracite check` both pass 100% cleanly without pre-commit hook failure, then commit the Wave 1 implementation.

**Architecture:** Biome's linter (`ultracite check`) flags undeclared Jest globals (`jest`, `describe`, `beforeEach`, `it`, `expect`) in test files unless they are destructured from `globalThis`. Jest's Node VM test runner parses `"use strict";` at line 1 and requires global declarations inside test scope so as not to break Jest's AST transformer. We place `const { jest, describe, beforeEach, afterEach, it, expect } = globalThis;` inside the top-level test block or top of file after `"use strict";` in a pattern that satisfies both engines.

**Tech Stack:** Jest, Biome (Ultracite), Node.js, Google Apps Script backend.

## Global Constraints

- Never modify `biome.jsonc` or linter configs to disable rules per Config Protection Lockdown.
- Never use `--no-verify` or `-n` flags on `git commit` or `git push`.
- All 175 Jest tests in `npm test` must pass 100% cleanly.
- `npx ultracite check` on all 3 test files must pass with 0 errors.

## File Structure & Changes

- Modify: `tests/api.test.js:1-5` — set `"use strict";` at line 1, destructure Jest globals from `globalThis` at line 2.
- Modify: `tests/setup.test.js:1-5` — set `"use strict";` at line 1, destructure Jest globals from `globalThis` at line 2.
- Modify: `tests/migration.test.js:1-5` — set `"use strict";` at line 1, destructure Jest globals from `globalThis` at line 2.

## What Already Exists

- The 9 implementation files for Wave 1 (#68, #71, #77, #65, #63) are fully written and staged:
  `AnnualMigration.js`, `Api.js`, `Audit.js`, `Ids.js`, `Migration.js`, `Setup.js`, `tests/api.test.js`, `tests/migration.test.js`, `tests/setup.test.js`.
- All 175 tests pass under `npm test`.

## Not In Scope

- Modifying `biome.jsonc` or disabling any pre-commit hooks.
- Modifying backend implementation files (`Api.js`, `Setup.js`, `Migration.js`, `Ids.js`, `Audit.js`, `AnnualMigration.js`).

## Plan Tasks

### Task 1: Standardize Test File Headers & Pre-Commit Validation

**Files:**
- Modify: `tests/api.test.js`
- Modify: `tests/setup.test.js`
- Modify: `tests/migration.test.js`

**OMP dispatch:**
- Agent type: `task`
- Inputs to subagent: this task block + Plan Header

**Interfaces:**
- Consumes: Existing Jest test files
- Produces: Clean test files passing both `npm test` and `npx ultracite check`

- [ ] **Step 1: Inspect headers and apply uniform globalThis destructuring**

In `tests/api.test.js`, `tests/setup.test.js`, and `tests/migration.test.js`, set line 1 to `"use strict";` and line 2 to `const { jest, describe, beforeEach, afterEach, it, expect } = globalThis;`. Ensure unused globals are omitted if flagged by Biome.

- [ ] **Step 2: Run ultracite check and fix any unused/shadowed variable warnings**

Run: `npx ultracite check tests/api.test.js tests/setup.test.js tests/migration.test.js`
Expected: 0 errors reported across all 3 files.

- [ ] **Step 3: Run npm test to verify full Jest suite passes**

Run: `npm test`
Expected: 10 passed, 10 total, 175 passed.

- [ ] **Step 4: Stage all 9 files and commit Wave 1 implementation**

Run: `git add AnnualMigration.js Api.js Audit.js Ids.js Migration.js Setup.js tests/api.test.js tests/migration.test.js tests/setup.test.js && git commit -m "feat: Wave 1 correctness, authorization, and schema migration runner (#68, #71, #77, #65, #63)"`
Expected: Commit succeeds cleanly through the pre-commit hook.
