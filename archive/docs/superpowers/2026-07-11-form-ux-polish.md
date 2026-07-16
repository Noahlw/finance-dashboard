# Form-UX Polish & Noah-Assisted Browser Verify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the three Google Form intake UIs (Budget Request, Expense Claim,
Onboarding) for clarity and progressive-disclosure line layout, extract the
now-load-bearing line-parsing logic into tested pure code, and verify the result
against the real live forms using the `browse` skill on Noah's Google session.

**Architecture:** `FormSetup.gs` gains FormApp go-to-section branching so Lines 2
and 3 are hidden behind an "Add another line?" gate instead of always visible.
The "which lines did the respondent fill in, and what did they say" logic moves
out of `IntakeForms.gs`'s inline loops into two new pure functions in
`CoreDecisions.js` (Jest-tested), reached via two new one-line wrappers on
`Engine.gs` — mirroring the existing `Engine.validateClaimLineAmount` →
`CoreDecisions.checkClaimLineAmount` pattern. No new files, no new services.
Verification is Noah-assisted: the `browse` skill drives the real published
forms (screenshots + branch-clicking, never Submit), using Google-session cookie
import or a manual handoff for the login wall; the one real submission stays the
existing manual CP-E round-trip (BUILD-PLAN.md §2, P1-11).

**Tech Stack:** Google Apps Script (V8, `.gs`/`.js` files in `src/gas/`, flat
single-namespace root), Jest 30 (`tests/*.test.js`), the `browse` skill
(persistent headless Chromium with cookie import / handoff).

## Global Constraints

- FormApp is the only form builder. Scriptable: titles, descriptions, help text,
  question types, required flags, validation, list choices, page-break sections,
  go-to-section branching. NOT scriptable: theme/color/header/fonts, file-upload
  questions (must stay a manual add, per existing CP-C).
- Prod forms keep `setCollectEmail(true)` + `setRequireLogin(true)` — no login-off
  fork.
- The Engine remains the sole status mutator. No task in this plan writes a
  `status`/`*_by`/`*_at`/`approved_amount` column outside `Engine.gs`.
- Money = `Number`, 2dp, HKD. Timestamps = ISO-8601 via `Audit._nowIso()`. Never a
  raw `Date` object in a ledger cell.
- No file over ~400 lines. `FormSetup.gs` is currently 280 lines; watch it as
  branching is added (Tasks 3–4 estimate +90 lines total, landing ~370 — under
  the cap, but re-check after Task 4 and split builders into a second file if it
  would exceed 400).
- **Question-title lock (derived, essential):** `IntakeForms.gs` reads form
  answers by exact title-string key (`answers['Title']`,
  `answers['Line ' + n + ' — Category']`, etc. — full list in "What Already
  Exists" below). No task in this plan may rename, retitle, or otherwise change
  the *title* string of any question `IntakeForms.gs` reads by key. Help text,
  question order, and required flags may change freely; the title string may not.
- No finished runnable implementation code in this plan — instructions only.

## File Structure & Changes

- **Modify `src/gas/CoreDecisions.js`** — add two pure functions,
  `parseRequestLines` and `parseClaimLines` (Task 1).
- **Modify `src/gas/Engine.gs`** — add two one-line wrappers,
  `parseRequestLines` and `parseClaimLines`, immediately after the existing
  `validateClaimLineAmount` (Task 1).
- **Modify `src/gas/IntakeForms.gs`** — `onFormSubmitRequest` and
  `onFormSubmitClaim` call the new wrappers instead of parsing lines inline
  (Task 2).
- **Modify `src/gas/FormSetup.gs`** — `_buildRequestForm`/`_buildClaimForm` gain
  progressive-disclosure branching (Tasks 3–4) and help-text polish (Task 5).
- **Modify `tests/CoreDecisions.test.js`** — extend with `describe` blocks for
  the two new functions (Task 1).
- No new files.

## What Already Exists (reused, not rebuilt)

- **Delegation pattern**: `Engine.gs` already wraps pure `CoreDecisions.js`
  functions one-to-one (e.g. `Engine.validateClaimLineAmount` at
  `src/gas/Engine.gs:132-139` wraps `CoreDecisions.checkClaimLineAmount`). Tasks
  1–2 extend this exact pattern; no new architecture.
- **Jest conventions**: `tests/CoreDecisions.test.js` already covers
  `CoreDecisions.js` with `describe`/`test` blocks, `var`-style locals, and
  `require('../src/gas/CoreDecisions')`. Task 1 follows this file's existing
  style exactly.
- **`_warnIfClaimFormMissingFileUpload`** (`src/gas/FormSetup.gs:40-49`) already
  posts a `#treasury` Discord warning if the manually-added file-upload question
  is missing. Unchanged; Task 6 verifies it's still correct by checking the live
  form, not by duplicating the guard.
- **BUILD-PLAN.md CP-E** (§2, P1-11) is the existing manual functional
  round-trip (real submit → Sheet rows → Discord → `verifyChain()`). Reused as
  the one real-submission check; not reinvented.
- **`cleanupTestPhase1()`** (`src/gas/Tests.gs:160`), **`setupAll()`**
  (`src/gas/Setup.gs:18`), **`Audit.verifyChain()`** (`src/gas/Audit.gs:47`) all
  already exist and are reused verbatim for the go-live clean-reset checkpoint.
- **The `browse` skill's `cookie-import-browser` mode** (imports logged-in
  session cookies from Noah's real Chromium into the headless `browse` session)
  and **`handoff`/`resume`** (opens a visible Chrome window for anything headless
  can't do — CAPTCHA, MFA — then hands control back) are existing, documented
  `browse` skill features. Task 6 uses them as-is; no custom browser tooling is
  built.
- **FormApp's native go-to-section branching** (`addPageBreakItem()` +
  per-choice `createChoice(value, destination)` on a `ListItem`) is the
  framework-provided mechanism for Tasks 3–4. No custom state machine.

## Not In Scope

- Visual restyling (theme color, header banner, fonts, CSS) — FormApp cannot
  script these; explicitly out of scope per the design spec.
- A scratch Apps Script project, a web-app `doGet` trigger, a login-off form
  fork, or autonomous form submission — rejected by the 2026-07-11 CEO review
  (see `memory/ceo-review-form-ux-approach-a.md`).
- The deferred `#treasury` "silent underparse" notice (when "Add another line?"
  = Yes but the next line parses absent) — named in the design spec as
  deliberately deferred, not built here.
- Fixing the pre-existing gap where `IntakeForms.gs`'s `onFormSubmitClaim` reads
  `answers['Missing receipt?']` but no such question exists anywhere in
  `FormSetup.gs`'s `_buildClaimForm` — this predates this plan and is not one of
  the three named problems (confusing UX / file-upload fragility / untested
  round-trip). Flagged in Failure Modes below for a future, separate task.
- Adding `Tests.gs` GAS-integration coverage for `IntakeForms.gs` — the spec
  names CP-E (manual) as the functional round-trip mechanism, not a new
  automated integration suite.

## ASCII Diagrams

**Data flow — line parsing (both forms, same shape):**

```
Google Form response (getItemResponses())
        |
        v
IntakeForms_answersByTitle(response)        [existing, unchanged]
        |  Object<string,string> -- an absent/skipped question's
        |  title is simply not a key in this object
        v
Engine.parseRequestLines(answers)  /  Engine.parseClaimLines(answers)   [NEW, Task 1]
        |  one-line delegation to
        v
CoreDecisions.parseRequestLines(answers) / parseClaimLines(answers)     [NEW, pure, Jest-tested]
        |  Array<{n, category, description, amount}>       (request)
        |  Array<{n, budgetLineChoice, amount}>             (claim)
        v
onFormSubmitRequest / onFormSubmitClaim loop over the returned array    [Task 2: existing
        |                                                                per-line body unchanged,
        v                                                                just fed by the array]
BudgetRequestLines / ClaimLineItems rows appended via Ids/Audit/Engine  [existing, unchanged]
```

**Form section structure after Tasks 3–4 (Budget Request shown; Claim form is
the identical shape with its own field names):**

```
[Section 1: existing lead questions, then Line 1 fields (required),
 then "Add a second line?" Yes/No]
        | No  -----------------------------------------------> SUBMIT
        | Yes
        v
[Section 2 (page break titled "Line 2"): Line 2 fields (optional),
 then "Add a third line?" Yes/No]
        | No  -----------------------------------------------> SUBMIT
        | Yes
        v
[Section 3 (page break titled "Line 3"): Line 3 fields (optional)]
        |
        v
      SUBMIT (default — last section, no override needed)
```

## Failure Modes & Gaps

- **No automated regression net for `IntakeForms.gs` itself.** `Tests.gs` has
  zero references to `IntakeForms`, `FormSetup`, or `answersByTitle` today
  (confirmed by grep) — the two `onFormSubmit` handlers have never had GAS-level
  test coverage. This plan's safety net is (a) the extracted parser's Jest
  coverage (Task 1) and (b) the manual CP-E round-trip (existing) — not a new
  integration test. Named, not silently left unaddressed.
- **Pre-existing gap, not fixed here:** `answers['Missing receipt?']` is read in
  `onFormSubmitClaim` but no such question exists in `_buildClaimForm`, so
  `missingReceiptFlag` is always `false` today. Out of this plan's scope (see
  "Not In Scope"); a future task should either add the question or remove the
  dead read.
- **FormApp branching cannot be exercised by Jest** (GAS-only API surface) — it
  is verified solely by Task 6's live-form check, which itself depends on either
  successful Google-session cookie import or a human handoff completing. If both
  the automated cookie import and the handoff/resume flow fail for some reason,
  Task 6 falls back to Noah manually clicking through the real form and
  confirming by voice/text — this is the spec's own documented contingency
  ("If it can't reach Noah's browser session, fall back to Noah pasting
  screenshots; do not skip visual verification"), not a plan gap.
- **The "Add another line?" gate answers are never read downstream** (by
  design — the spec's grounded finding is that this is harmless). This means a
  respondent who answers "Yes" but then leaves the next line blank is
  indistinguishable from one who never intended a second line. This is exactly
  the spec's deferred `#treasury` notice item — intentionally out of scope here.

## Parallelization / Worktree Strategy

Sequential, single worktree, one agent. Task 1 → Task 2 is a hard dependency
(Task 2 calls the wrappers Task 1 creates). Tasks 3, 4, and 5 all modify the
same file (`src/gas/FormSetup.gs`); running them in separate worktrees would
create merge conflicts on nearly every line, so they run in order in the same
worktree. Task 6 depends on Tasks 3–5 being committed (it verifies the final
live form). Do not parallelize this plan.

---

### Task 1: Extract and test the line-presence parser

**Files:**
- Modify: `src/gas/CoreDecisions.js`
- Modify: `src/gas/Engine.gs:132-139` (insert after `validateClaimLineAmount`)
- Test: `tests/CoreDecisions.test.js`

**Interfaces:**
- Produces: `CoreDecisions.parseRequestLines(answers)` → `Array<{n: number,
  category: string, description: string, amount: number}>`. Only includes an
  entry for line `n` (1, 2, or 3, checked in that order) when
  `answers['Line ' + n + ' — Category']` is truthy AND
  `answers['Line ' + n + ' — Description']` is truthy AND
  `Number(answers['Line ' + n + ' — Amount (HKD)'])` is a truthy number (i.e.
  not `0`, not `NaN` — this exactly mirrors the existing check
  `if (!category || !desc || !amount) continue;` in
  `src/gas/IntakeForms.gs:43`). `amount` in the returned object is the `Number(...)`
  value, not the raw string.
- Produces: `CoreDecisions.parseClaimLines(answers)` → `Array<{n: number,
  budgetLineChoice: string, amount: number}>`. Only includes an entry for line
  `n` (1, 2, or 3) when `answers['Line ' + n + ' — Budget line']` is truthy AND
  `Number(answers['Line ' + n + ' — Amount (HKD)'])` is truthy — mirrors the
  existing check `if (!budgetLineChoice || !amount) continue;` in
  `src/gas/IntakeForms.gs:107`. `amount` is the `Number(...)` value.
- Consumes: nothing from other tasks (pure functions, no dependencies beyond
  plain JS).

- [ ] **Step 1: Write failing tests for `parseRequestLines`**

Test intent, in `tests/CoreDecisions.test.js`, new `describe('parseRequestLines', () => { ... })`
block appended after the existing `describe('resolveTreasurerIdDrift', ...)`
block:
  - `'all three lines present and valid returns all three in order'`: build an
    `answers` object with `'Line 1 — Category'`, `'Line 1 — Description'`,
    `'Line 1 — Amount (HKD)'` (e.g. `'50'`), and the same for lines 2 and 3 with
    distinct values; assert the result is an array of length 3, and
    `result[0].n === 1`, `result[0].amount === 50` (a `Number`, not `'50'`), and
    similarly for entries 1 and 2 of the array.
  - `'only line 1 present returns a single-entry array'`: `answers` has only the
    three Line-1 keys; assert `result.length === 1` and `result[0].n === 1`.
  - `'line 1 and line 3 present, line 2 absent, returns both in order (line 2 missing from input)'`:
    `answers` has Line 1 and Line 3 keys but no Line 2 keys at all; assert
    `result.length === 2`, `result[0].n === 1`, `result[1].n === 3`.
  - `'no lines present returns an empty array'`: `answers = {}`; assert
    `result` deep-equals `[]`.
  - `'amount of 0 is treated as absent'`: Line 1 has Category and Description set
    but `'Line 1 — Amount (HKD)'` is `'0'`; assert `result.length === 0`.
  - `'a non-numeric amount is treated as absent'`: Line 1 Amount is `'abc'`;
    assert `result.length === 0`.
  - `'category present but description missing is treated as absent'`: Line 1 has
    Category and Amount but no Description key; assert `result.length === 0`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CoreDecisions.test.js`
Expected: FAIL with `TypeError: CoreDecisions.parseRequestLines is not a function`
(or equivalent "not a function" error) for every new test in the block.

- [ ] **Step 3: Implement `CoreDecisions.parseRequestLines`**

Location: `src/gas/CoreDecisions.js`, add as a new property on the `CoreDecisions`
object literal, immediately after `checkClaimLineAmount` (which currently ends
at line 149, right before the `computeReduceSplit` JSDoc block).
Function name: `parseRequestLines(answers)` → returns
`Array<{n, category, description, amount}>` as specified in Interfaces above.
Behavior: loop `n` from 1 to 3 inclusive (hardcoded, matching the existing
3-line cap — do not parameterize this, nothing else in the codebase varies it);
for each `n`, read `answers['Line ' + n + ' — Category']`,
`answers['Line ' + n + ' — Description']`, and
`Number(answers['Line ' + n + ' — Amount (HKD)'])`; if category and description
are both truthy and the numeric amount is truthy, push `{n: n, category:
category, description: description, amount: amount}` onto the result array;
otherwise skip that `n` and continue to the next. Return the accumulated array.
No sheet access, no GAS globals — plain JS only, matching the file's existing
pure-function style.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CoreDecisions.test.js`
Expected: PASS for all `parseRequestLines` tests.

- [ ] **Step 5: Write failing tests for `parseClaimLines`**

Test intent, in `tests/CoreDecisions.test.js`, new `describe('parseClaimLines', () => { ... })`
block appended after the `parseRequestLines` block:
  - `'all three lines present and valid returns all three in order'`: `answers`
    has `'Line 1 — Budget line'` (e.g. `'BUDGETLINE-26A-001-01 — BBQ — remaining HK$300.00'`)
    and `'Line 1 — Amount (HKD)'` (e.g. `'50'`), and the same shape for lines 2
    and 3; assert `result.length === 3`, `result[0].n === 1`,
    `result[0].amount === 50` (a `Number`), `result[0].budgetLineChoice` equals
    the exact string passed in.
  - `'only line 1 present returns a single-entry array'`: only Line-1 keys set;
    assert `result.length === 1`.
  - `'line 1 and line 3 present, line 2 absent, returns both in order'`: Line 1
    and Line 3 keys set, no Line 2 keys; assert `result.length === 2`,
    `result[0].n === 1`, `result[1].n === 3`.
  - `'no lines present returns an empty array'`: `answers = {}`; assert deep
    equals `[]`.
  - `'amount of 0 is treated as absent'`: Line 1 has a Budget line choice but
    Amount is `'0'`; assert `result.length === 0`.
  - `'a non-numeric amount is treated as absent'`: Line 1 Amount is `'abc'`;
    assert `result.length === 0`.
  - `'budget line choice missing but amount present is treated as absent'`: Line 1
    has Amount but no `'Line 1 — Budget line'` key; assert `result.length === 0`.

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- CoreDecisions.test.js`
Expected: FAIL with `TypeError: CoreDecisions.parseClaimLines is not a function`
for every new test in the block.

- [ ] **Step 7: Implement `CoreDecisions.parseClaimLines`**

Location: `src/gas/CoreDecisions.js`, add as a new property on the
`CoreDecisions` object literal, immediately after the new `parseRequestLines`.
Function name: `parseClaimLines(answers)` → returns `Array<{n,
budgetLineChoice, amount}>`. Behavior: loop `n` from 1 to 3 inclusive
(hardcoded); for each `n`, read `answers['Line ' + n + ' — Budget line']` and
`Number(answers['Line ' + n + ' — Amount (HKD)'])`; if the budget-line choice is
truthy and the numeric amount is truthy, push `{n: n, budgetLineChoice:
budgetLineChoice, amount: amount}`; otherwise skip. Return the accumulated
array. Pure — no sheet access, no GAS globals.

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- CoreDecisions.test.js`
Expected: PASS for all `parseClaimLines` tests, and PASS for the full suite:
run `npm test` (no filter) and confirm the summary line reads `Tests: 81 passed, 81 total`
(67 existing + 7 `parseRequestLines` + 7 `parseClaimLines` = 81; if the actual
count differs because a slightly different number of test cases was written,
confirm instead that the count equals 67 plus however many new `test(...)`
blocks were actually added, and that zero tests fail).

- [ ] **Step 9: Add the Engine.gs wrappers**

Location: `src/gas/Engine.gs`, insert two new properties on the `Engine` object
literal immediately after `validateClaimLineAmount` (which currently ends at
line 139) and before the `/** P2 Engine completeness checks...` JSDoc block at
line 141.
Function 1: `parseRequestLines: function (answers) { return
CoreDecisions.parseRequestLines(answers); }` — a one-line delegation, exactly
mirroring how `validateClaimLineAmount` delegates to
`CoreDecisions.checkClaimLineAmount`. Add a JSDoc comment above it: `@param
{Object<string,string>} answers @return {Array<{n:number, category:string,
description:string, amount:number}>}`.
Function 2: `parseClaimLines: function (answers) { return
CoreDecisions.parseClaimLines(answers); }` — same pattern. JSDoc: `@param
{Object<string,string>} answers @return {Array<{n:number,
budgetLineChoice:string, amount:number}>}`.
Note: these wrappers are GAS-only code and cannot be exercised under Jest
(`Engine.gs` has no `module.exports` guard, unlike `CoreDecisions.js` —
consistent with every other `Engine.gs` wrapper, none of which have direct Jest
coverage; their correctness is covered transitively by Task 1's tests on the
`CoreDecisions` functions they delegate to, plus code review).

- [ ] **Step 10: Commit**

Commit message: `feat: extract line-presence parsing to CoreDecisions, add Engine wrappers`
Stage: `src/gas/CoreDecisions.js`, `src/gas/Engine.gs`, `tests/CoreDecisions.test.js`

---

### Task 2: Wire `IntakeForms.gs` to the new parsers

**Files:**
- Modify: `src/gas/IntakeForms.gs:38-49` (request-line loop inside `onFormSubmitRequest`)
- Modify: `src/gas/IntakeForms.gs:102-176` (claim-line loop inside `onFormSubmitClaim`)

**Interfaces:**
- Consumes: `Engine.parseRequestLines(answers)` and `Engine.parseClaimLines(answers)`
  from Task 1, with the exact return shapes documented there.
- Produces: no new interface — `onFormSubmitRequest`/`onFormSubmitClaim` keep
  their existing signatures and side effects (appended rows, `Audit.append`
  calls, Discord posts) unchanged; only how the line array is *obtained*
  changes, not what happens per line.

**Note on testing this task:** `IntakeForms.gs` cannot be unit-tested under
Jest — it has no `module.exports` guard and depends on live GAS globals
(`LockService`, `PropertiesService`, `DriveApp`, `getSheet_`, etc.), consistent
with this project's two-layer testing model (Jest for pure logic only, `Tests.gs`
for GAS integration — see `CLAUDE.md` "Testing model"). There is no failing-test
step for this task. Correctness is verified by (a) a careful line-by-line diff
against the exact before/after behavior specified below, and (b) `npm test`
staying green (nothing in this task touches `CoreDecisions.js`, but running the
suite catches any accidental syntax breakage if `Constants.js`/`CoreDecisions.js`
were touched by mistake), and (c) the Task 6 live-form verification later.

- [ ] **Step 1: Replace the request-line loop**

Location: `src/gas/IntakeForms.gs:38-49`, inside `onFormSubmitRequest`.
Current code loops `for (var n = 1; n <= 3; n++)`, reads the three
`answers[...]` keys inline, skips absent lines via
`if (!category || !desc || !amount) continue;`, then on a present line
increments `lineCount`, builds `lineId` via `Ids.childId(requestId, lineCount,
'BUDGETLINE')`, and appends a `BudgetRequestLines` row using `category`, `desc`,
`amount` and `IntakeForms_categoryIdByName(category)`.
New behavior: call `var lines = Engine.parseRequestLines(answers);` once before
the loop. Replace the `for (var n = 1; n <= 3; n++) { ... }` loop with
`for (var i = 0; i < lines.length; i++) { var line = lines[i]; ... }` where the
loop body performs exactly the same work as before but reads `line.category`,
`line.description`, `line.amount` instead of the old locals `category`, `desc`,
`amount` — no other change to the body (same `lineCount++`, same
`Ids.childId(requestId, lineCount, 'BUDGETLINE')` call, same
`getSheet_(TABS.BUDGET_REQUEST_LINES).appendRow([...])` call with the same
column order and the same `IntakeForms_categoryIdByName(line.category)` call).
The `continue`-based skip logic is removed entirely since `lines` already
excludes absent lines.

- [ ] **Step 2: Replace the claim-line loop's presence check only**

Location: `src/gas/IntakeForms.gs:102-176`, inside `onFormSubmitClaim`. This
loop is substantially more complex than the request-line loop (it also handles
over-budget top-up creation and receipt-check logic) — only the
presence-detection/parsing part changes; the top-up and per-line processing
logic is untouched.
Current code loops `for (var n = 1; n <= 3; n++)`, reads
`answers['Line ' + n + ' — Budget line']` and
`Number(answers['Line ' + n + ' — Amount (HKD)'])` into `budgetLineChoice` and
`amount`, skips via `if (!budgetLineChoice || !amount) continue;`, then does
the top-up/validation/append work using those two values.
New behavior: call `var claimLines = Engine.parseClaimLines(answers);` once
before the loop. Replace `for (var n = 1; n <= 3; n++) { ... }` with
`for (var i = 0; i < claimLines.length; i++) { var claimLine = claimLines[i]; ... }`
where the loop body is otherwise byte-for-byte identical to the current body,
except every read of the old locals `budgetLineChoice` and `amount` becomes
`claimLine.budgetLineChoice` and `claimLine.amount`. The
`missingReceiptFlag = (answers['Missing receipt?'] === 'Yes');` line stays
exactly as-is (reads the answers object directly, unrelated to line parsing —
see the "Failure Modes & Gaps" note on this pre-existing question-doesn't-exist
gap; do not attempt to fix it in this task). The `continue`-based skip logic at
the top of the old loop body is removed (already filtered by `parseClaimLines`);
the `continue` used later in the loop body for the top-up path (after appending
the top-up rows) stays exactly as-is, since that's unrelated flow-control, not
presence detection.

- [ ] **Step 3: Run the existing Jest suite as a regression check**

Run: `npm test`
Expected: PASS, `Tests: 81 passed, 81 total` (or whatever the exact count from
Task 1 Step 8 was) — this task doesn't touch any Jest-covered file, so this step
just confirms nothing was accidentally broken.

- [ ] **Step 4: Commit**

Commit message: `refactor: wire IntakeForms.gs onFormSubmit handlers to the extracted line parsers`
Stage: `src/gas/IntakeForms.gs`

---

### Task 3: Progressive-disclosure branching — Budget Request form

**Files:**
- Modify: `src/gas/FormSetup.gs:97-128` (`_buildRequestForm` and `_addRequestLineQuestions`)

**Interfaces:**
- Consumes: nothing from other tasks (FormApp-only code).
- Produces: a new private helper `FormSetup._buildRequestLines(form)` that
  `_buildRequestForm` calls in place of its current three separate
  `FormSetup._addRequestLineQuestions(form, 1..3, ...)` calls. `_addRequestLineQuestions`
  itself is kept (still does the actual per-line question creation) but is now
  called only from inside `_buildRequestLines`, not directly from
  `_buildRequestForm`.

**Note on testing this task:** FormApp is GAS-only and cannot run under Jest.
There is no failing-test step. Verification is (a) code review against the
exact structure specified below, and (b) Task 6's live-form check.

- [ ] **Step 1: Implement `_buildRequestLines`**

Location: `src/gas/FormSetup.gs`, add a new private helper
`_buildRequestLines: function (form) { ... }` on the `FormSetup` object,
placed immediately after `_addRequestLineQuestions` (which stays unchanged,
currently ending at line 128).
Behavior, in this exact order:
  1. Call `FormSetup._addRequestLineQuestions(form, 1, true)` (Line 1, required
     — unchanged from today).
  2. Add a list (dropdown) question titled exactly `'Add a second line?'`, with
     choices `'Yes'` and `'No'`, `setRequired(true)`. Hold a reference to this
     item (needed in step 5).
  3. Add a page-break item via `form.addPageBreakItem()`, titled `'Line 2'`.
     Hold a reference to it (needed in step 5).
  4. Call `FormSetup._addRequestLineQuestions(form, 2, false)` (Line 2,
     optional — unchanged from today's required flag).
  5. Wire the "Add a second line?" item's choices so that answering `'Yes'`
     navigates to the Line-2 page-break item created in step 3, and answering
     `'No'` navigates to `FormApp.PageNavigationType.SUBMIT`. (Use the list
     item's per-choice branching: build each choice with the item's
     `createChoice(value, destination)` method, one choice per navigation
     target, then apply both choices to the item.)
  6. Add a second list question titled exactly `'Add a third line?'`, choices
     `'Yes'`/`'No'`, `setRequired(true)`. Hold a reference to it.
  7. Add a second page-break item via `form.addPageBreakItem()`, titled
     `'Line 3'`. Hold a reference to it.
  8. Call `FormSetup._addRequestLineQuestions(form, 3, false)` (Line 3,
     optional — unchanged).
  9. Wire the "Add a third line?" item the same way as step 5: `'Yes'` →
     the Line-3 page-break from step 7, `'No'` → `FormApp.PageNavigationType.SUBMIT`.
  10. No explicit navigation is set for what happens after Line 3's questions —
      FormApp defaults the last section to submit on completion, matching the
      diagram in "ASCII Diagrams" above.

- [ ] **Step 2: Wire `_buildRequestForm` to the new helper**

Location: `src/gas/FormSetup.gs:97-113` (`_buildRequestForm`). Replace the three
lines:
```
FormSetup._addRequestLineQuestions(form, 1, true);
FormSetup._addRequestLineQuestions(form, 2, false);
FormSetup._addRequestLineQuestions(form, 3, false);
```
with a single call: `FormSetup._buildRequestLines(form);`. No other change to
`_buildRequestForm` (title, description, confirmation message, email/login
settings, and the lead questions Title/Justification/Needed by all stay exactly
as they are today).

- [ ] **Step 3: Verify the question-title lock**

Re-read the modified `_buildRequestForm` and `_buildRequestLines` and confirm
every question `IntakeForms.gs` reads by key (`'Title'`, `'Justification'`,
`'Needed by'`, `'Line ' + n + ' — Category'`, `'Line ' + n + ' — Description'`,
`'Line ' + n + ' — Amount (HKD)'`) still has that exact title string, unchanged.
The two new gate questions (`'Add a second line?'`, `'Add a third line?'`) are
new titles, not renames — confirm they don't collide with any existing title
string used elsewhere in `IntakeForms.gs`.

- [ ] **Step 4: Run the Jest suite as a regression check**

Run: `npm test`
Expected: PASS (this task doesn't touch any Jest-covered file).

- [ ] **Step 5: Commit**

Commit message: `feat: progressive-disclosure line branching for the Budget Request form`
Stage: `src/gas/FormSetup.gs`

---

### Task 4: Progressive-disclosure branching — Expense Claim form

**Files:**
- Modify: `src/gas/FormSetup.gs:131-166` (`_buildClaimForm` and `_addClaimLineQuestions`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: a new private helper `FormSetup._buildClaimLines(form)`, same shape
  as Task 3's `_buildRequestLines` but for the Claim form's line fields.

- [ ] **Step 1: Implement `_buildClaimLines`**

Location: `src/gas/FormSetup.gs`, add a new private helper
`_buildClaimLines: function (form) { ... }`, placed immediately after
`_addClaimLineQuestions` (unchanged, currently ending at line 166).
Behavior, in this exact order:
  1. Call `FormSetup._addClaimLineQuestions(form, 1, true)` (Line 1, required
     — unchanged from today).
  2. Add a list (dropdown) question titled exactly `'Add a second line?'`, with
     choices `'Yes'` and `'No'`, `setRequired(true)`. Hold a reference to this
     item (needed in step 5).
  3. Add a page-break item via `form.addPageBreakItem()`, titled `'Line 2'`.
     Hold a reference to it (needed in step 5).
  4. Call `FormSetup._addClaimLineQuestions(form, 2, false)` (Line 2,
     optional — unchanged from today's required flag).
  5. Wire the "Add a second line?" item's choices so that answering `'Yes'`
     navigates to the Line-2 page-break item created in step 3, and answering
     `'No'` navigates to `FormApp.PageNavigationType.SUBMIT`. (Use the list
     item's per-choice branching: build each choice with the item's
     `createChoice(value, destination)` method, one choice per navigation
     target, then apply both choices to the item.)
  6. Add a second list question titled exactly `'Add a third line?'`, choices
     `'Yes'`/`'No'`, `setRequired(true)`. Hold a reference to it.
  7. Add a second page-break item via `form.addPageBreakItem()`, titled
     `'Line 3'`. Hold a reference to it.
  8. Call `FormSetup._addClaimLineQuestions(form, 3, false)` (Line 3,
     optional — unchanged).
  9. Wire the "Add a third line?" item the same way as step 5: `'Yes'` →
     the Line-3 page-break from step 7, `'No'` → `FormApp.PageNavigationType.SUBMIT`.
  10. No explicit navigation is set for what happens after Line 3's questions —
      FormApp defaults the last section to submit on completion.

Using identical gate wording (`'Add a second line?'`, `'Add a third line?'`)
and page-break titles (`'Line 2'`, `'Line 3'`) across both the Request and
Claim forms is intentional: each form's handler reads only its own form's
response independently, so there is no cross-form confusion —
`IntakeForms_answersByTitle` only ever sees one form's response at a time.

- [ ] **Step 2: Wire `_buildClaimForm` to the new helper**

Location: `src/gas/FormSetup.gs:131-151` (`_buildClaimForm`). Replace the three
lines:
```
FormSetup._addClaimLineQuestions(form, 1, true);
FormSetup._addClaimLineQuestions(form, 2, false);
FormSetup._addClaimLineQuestions(form, 3, false);
```
with `FormSetup._buildClaimLines(form);`. No other change — the lead questions
(claim description, receipt vendor/date/total) and the
`// "Receipt photo" file-upload question: ADD MANUALLY, see CP-C.` comment
stay exactly where they are today, i.e. still in Section 1, before the line
questions.

- [ ] **Step 3: Verify the question-title lock**

Confirm every title `IntakeForms.gs` reads by key for the claim form
(`'What is this claim for? (short description)'`, `'Receipt vendor'`,
`'Receipt date'`, `'Receipt total (HKD)'`, `'Line ' + n + ' — Budget line'`,
`'Line ' + n + ' — Amount (HKD)'`) is unchanged.

- [ ] **Step 4: Check the ~400-line file cap**

Run: `wc -l src/gas/FormSetup.gs`
Expected: under 400. If it's at or over 400, split `_buildRequestLines`,
`_buildClaimLines`, and their line-question helpers out into a new
`src/gas/FormLines.gs` file (same flat `src/gas/` root, no subdirectory) before
continuing — do not proceed to Task 5 with an oversized file.

- [ ] **Step 5: Run the Jest suite as a regression check**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: progressive-disclosure line branching for the Expense Claim form`
Stage: `src/gas/FormSetup.gs` (and `src/gas/FormLines.gs` if Step 4 required the split)

---

### Task 5: Wording and validation polish (help-text only)

**Files:**
- Modify: `src/gas/FormSetup.gs` (`_buildRequestForm`, `_buildClaimForm`, and
  the amount-field help text inside `_addRequestLineQuestions`/`_addClaimLineQuestions`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing new — help-text-only edits, no new functions or interfaces.

This task makes no question-title changes (all titles are locked per the Global
Constraints question-title lock) and no required-flag changes (reviewed below,
already correct). It is help text only, addressing the "weak validation" and
"confusing wording" complaints at the copy level where FormApp offers no
stronger enforcement.

- [ ] **Step 1: Extend amount-field help text for 2dp/HKD clarity**

Location: `src/gas/FormSetup.gs`, inside `_addRequestLineQuestions` (the
`'Line ' + n + ' — Amount (HKD)'` question) and `_addClaimLineQuestions` (the
same-named question). Both currently have help text
`'Enter numbers only, e.g. 150.50'` / `'Amount from this receipt to charge to
this budget line.'` respectively — change the request-line amount help text to
`'HKD, numbers only, 2 decimal places max, e.g. 150.50'` and the claim-line
amount help text to `'Amount from this receipt to charge to this budget line.
HKD, numbers only, 2 decimal places max, e.g. 150.50'` (append the same
2dp/HKD clause, keep the existing sentence). The `requireNumberGreaterThan(0)`
validation on both fields is unchanged (FormApp has no built-in decimal-place
validator; this is a copy-level mitigation only — note this limitation is
inherent to FormApp, not a gap in this task).

- [ ] **Step 2: Extend the Receipt total help text the same way**

Location: `src/gas/FormSetup.gs`, inside `_buildClaimForm`, the
`'Receipt total (HKD)'` question. Current help text: `'Must match the receipt
exactly. Numbers only.'` — change to `'Must match the receipt exactly. HKD,
numbers only, 2 decimal places max, e.g. 88.50'`.

- [ ] **Step 3: Review required flags (no change expected, confirm and document)**

Re-read `_buildRequestForm`, `_buildClaimForm`, `_buildOnboardingForm` and
confirm every question's `setRequired(...)` value is intentional: Title,
Justification, Needed by, Line 1 fields (all forms), and all Onboarding
questions are `true`; Receipt vendor and Line 2/3 fields are `false`. No changes
expected — if any required flag looks wrong during this review, do not silently
fix it; note it in the task's commit message or as a follow-up rather than
changing behavior beyond what's specified here.

- [ ] **Step 4: Review date-field validation (no change expected, confirm and document)**

Confirm `'Needed by'` and `'Receipt date'` use `form.addDateItem()`, which
already constrains input to a real calendar date via Google's native date
picker — there is no further FormApp-level date validation available (e.g. no
"must not be in the past" constraint exists in the FormApp API). No change
needed; this satisfies the spec's "sanity-check date fields" item by
confirming the existing constraint is already the strongest available, not by
adding new validation.

- [ ] **Step 5: Run the Jest suite as a regression check**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `polish: clarify amount-field help text with 2dp/HKD guidance`
Stage: `src/gas/FormSetup.gs`

---

### Task 6: Noah-assisted browser verification

**Files:** none modified (verification-only task; may loop back to Tasks 3-5 if
issues are found — see Step 7).

**Interfaces:**
- Consumes: the three published form URLs (Budget Request, Expense Claim,
  Onboarding). These are returned by `FormSetup.createForms()` and
  `FormSetup.createOnboardingForm()` when Noah runs them in the Apps Script
  editor (per the existing CP-C checkpoint) — this task does not have programmatic
  access to Script Properties, so ask Noah for the three URLs if they aren't
  already known from a prior CP-C run.
- Produces: a findings report (pass/fail per check below) for Noah to review
  before the deployment checkpoint.

- [ ] **Step 1: Confirm the `browse` skill is set up**

Run the SETUP check from the `browse` skill (locate the `browse` binary at
`<repo-root>/.claude/skills/gstack/browse/dist/browse` or
`~/.claude/skills/gstack/browse/dist/browse`; if neither is executable, follow
the skill's one-time build step). Confirm with `$B status` that the daemon is
reachable.

- [ ] **Step 2: Establish a Google-authenticated session**

Run `$B status 2>/dev/null | grep -q "Mode: cdp"` to check whether `browse` is
already connected to Noah's real browser via CDP — if so, skip to Step 3 (his
session is already available). Otherwise, run the `browse` skill's
`cookie-import-browser` flow, scoped to `--domain google.com` (or the domain
covering `docs.google.com`/`accounts.google.com`), which opens a picker UI for
Noah to select his Google cookies to import into the headless session. If
cookie import fails, is unavailable, or the imported session still hits a
sign-in/MFA wall when Step 3 navigates to a form, use
`$B handoff "Need to sign in to Google to view the intake forms"` to open a
visible Chrome window, ask Noah (via a direct question, not silently) to
complete sign-in there, then run `$B resume` once he confirms — this exactly
matches the design spec's documented fallback.

- [ ] **Step 3: Visual + branching check — Budget Request form**

`$B goto <requestFormUrl>`. Run `$B screenshot` to a file (desktop viewport,
default size) and note the result. Run `$B viewport 390x844` (a common mobile
size) then `$B screenshot` again for the mobile view. Run `$B snapshot -i` to
list interactive elements; confirm the visible questions match Task 3's Section
1 (Title question, Justification, Needed by, Line 1 — Category/Description/Amount,
"Add a second line?") and that Line 2/Line 3 questions are NOT visible yet.
Use `$B fill`/`$B click` to answer "Add a second line?" = Yes and confirm
(`$B snapshot -D` diff) that Line 2 questions and "Add a third line?" now
appear. Answer "Add a third line?" = Yes and confirm Line 3 questions appear.
**Do not click Submit at any point.** Record pass/fail for: desktop layout
legible, mobile layout legible, Line 2 hidden until "Yes", Line 3 hidden until
"Yes", help text from Task 5 visible on the amount fields.

- [ ] **Step 4: Visual + branching check — Expense Claim form**

Same procedure as Step 3, against `<claimFormUrl>`, checking Task 4's branching
structure. Additionally: run `$B snapshot -i` and confirm a file-upload
question (labeled "Receipt photo" per the existing manual-add convention) is
present somewhere in Section 1 — if it is missing, this is expected only if
Noah hasn't yet re-added it after this round of `createForms()`/edits (FormApp
edits don't remove a manually-added question, but a fresh `createForms()` run
on a brand-new form would lack it); note this as a checklist item for the
deployment checkpoint below rather than a bug in this plan's code. **Do not
click Submit.**

- [ ] **Step 5: Visual check — Onboarding form**

`$B goto <onboardingFormUrl>`, screenshot desktop + mobile, confirm all
questions from `_buildOnboardingForm` render (Consent, Full name, Student ID,
Payout method, Payout handle) with their existing help text. This form has no
branching (out of scope for Tasks 3-4) — this is a render-only sanity check.
**Do not click Submit.**

- [ ] **Step 6: Compile and present the findings report**

Summarize pass/fail for every check in Steps 3-5, including any screenshots
that showed a problem. Present this to Noah before proceeding — if anything
failed, loop back to the relevant task (3, 4, or 5), fix, recommit, and re-run
this task's checks for the affected form only (not a full re-run of all three
forms unless the fix could plausibly affect more than one).

- [ ] **Step 7: No commit for this task**

This task produces a findings report, not a code change (unless Step 6 looped
back into an earlier task's fix, in which case that task's own commit step
covers it). Proceed to the Deployment Checkpoint below once findings are clean.

---

## Deployment Checkpoint (human gate — not a numbered task)

This mirrors BUILD-PLAN.md §1.2's HUMAN CHECKPOINT format. Run once all six
tasks above are committed and Task 6's findings are clean.

### HUMAN CHECKPOINT — Deploy and verify the polished forms

Do exactly:
1. `cd src/gas && clasp push --force` (deploys the canonical, reconciled
   project — see `memory/ceo-review-form-ux-approach-a.md` for why this is safe
   post-reconciliation).
2. In the Apps Script editor, run `FormSetup.createForms()` then
   `FormSetup.createOnboardingForm()`, then `FormSetup.installTriggers()` (and
   `FormSetup.installOnboardingTrigger()` if not already installed).
3. Manually (re-)add the "Receipt photo" file-upload question to the Claim
   form's Section 1 if Task 6 Step 4 flagged it missing (FormApp cannot script
   this question — existing CP-C limitation, unchanged by this plan).
4. Confirm both public forms: collect email ON, sign-in required ON (per Global
   Constraints — unchanged by this plan).
5. Run one CP-E round-trip (BUILD-PLAN.md §2, P1-11): submit a real budget
   request through the polished form (exercise the new branching for real this
   time — add a second line), approve it, submit a claim with a real receipt
   photo, verify + approve payout, `markPayoutSent`. Confirm the expected
   Discord messages appear in `#treasury`/`#finance-status` and
   `Audit.verifyChain().ok === true`.
6. **Before real semester use**, run the verified clean reset: call
   `cleanupTestPhase1()` (`src/gas/Tests.gs:160`), then `setupAll()`
   (`src/gas/Setup.gs:18`), then confirm `Audit.verifyChain().ok === true`
   starting from `GENESIS` — this wipes every test submission made during Task
   6 and the CP-E round-trip above, so no test data survives into the real
   semester's ledger.

Paste back: confirmation of each numbered step, plus any Discord message
screenshots from step 5 if anything looked wrong.

Blocks: nothing further in this plan — this is the plan's exit checkpoint.
