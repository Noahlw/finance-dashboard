# Design Spec — Form-UX Polish & Noah-Assisted Browser Verify (Approach A)

**Date:** 2026-07-11 (rev. after CEO review)
**Status:** Approved (design phase); pending user review before writing-plans
**Supersedes:** the earlier Approach-B draft of this file (scratch project + web-app
`doGet` + 3-layer autonomous pipeline), which the 2026-07-11 CEO review rejected as
over-investment. See `memory/ceo-review-form-ux-approach-a.md`.

## Problem

The Google Forms intake UI is the last blocker to production. Three concrete
issues (Noah, 2026-07-11):

1. **Confusing / bad UX** — question order, wording, weak validation, and the
   rigid always-visible "Line 1 / Line 2 / Line 3" layout are awkward.
2. **File-upload gap / fragile** — FormApp cannot create the receipt file-upload
   question; it is added manually and can silently disappear.
3. **Untested end-to-end** — no real submit → Sheet row → Engine → status
   round-trip has ever been verified from the form itself.

**Out of scope:** visual restyling (theme color, header banner, fonts, CSS).
FormApp cannot script these; the blocker is structural/UX, not aesthetic. We stay
inside Google Forms — no custom web front-end.

## Approach (A — minimal, Noah-assisted)

Chosen over the autonomous test-rig because the forms are edited rarely, and the
riskiest path (receipt file upload) can't be auto-tested — Google forces sign-in on
file-upload questions. So we do NOT build: a scratch Apps Script project, a web-app
`doGet` trigger, a login-off form fork, or autonomous submit-testing.

- **Edit** `FormSetup.gs` (and, minimally, `IntakeForms.gs`) for the UX/validation/
  branching fixes.
- **Verify visually** with the `pair-agent` skill driving Noah's already-logged-in
  browser against the REAL forms — **render/interaction only, never presses
  Submit** (exercise branching, screenshot desktop + mobile). Login wall is
  satisfied by Noah's session, so no login-off fork is needed.
- **Verify functionally** with the existing manual **CP-E** round-trip (Noah
  submits one real request+claim; confirms Sheet rows + Discord + `verifyChain`).

## Prerequisite (DONE)

The `clasp pull` fork was reconciled 2026-07-11: local git is canonical, the
remote Approach-B fork (web-app/`executionApi` manifest, conflicting Approvals/
Receipts schema, `TestFramework`/`TestHelpers`, `doGet`) was discarded, working
tree clean, `npm test` green (67/67). Form editing builds on the canonical
`FormSetup.gs`/`IntakeForms.gs`.

## Constraints (inherited, must not violate)

- FormApp is the only form builder. Scriptable: titles, descriptions, help text,
  question types, required flags, validation, list choices, page-break sections,
  go-to-section branching. NOT scriptable: theme/color/header/fonts, file-upload
  questions.
- Prod forms keep `setCollectEmail(true)` + `setRequireLogin(true)`.
- Engine remains sole status mutator; no form change writes a `status`/`*_by`/
  `*_at` column directly.
- Money = Number, 2dp, HKD; timestamps ISO-8601 via `Audit._nowIso()`.
- No file over ~400 lines (`FormSetup.gs` is 280 — watch the cap when adding
  sections; split builders if needed).
- Plan/spec discipline: no finished runnable implementation code in this doc.

## Work items

### 1. UX polish (FormApp-scriptable) — `FormSetup.gs`
- Reorder/reword questions and help text across all three forms (Budget Request,
  Expense Claim, Onboarding) for clarity.
- Tighten validation: keep `requireNumberGreaterThan(0)` on EVERY amount field
  after restructuring; sanity-check date fields (`Needed by`, `Receipt date`);
  review required flags.

### 2. Progressive-disclosure line layout
- Keep up to 3 lines, but present Line 1 immediately and gate Lines 2 & 3 behind an
  "Add another line?" yes/no using FormApp **go-to-section** (`addPageBreakItem` +
  `setGoToPage`). "No" routes straight to Submit. Applies to both
  `_addRequestLineQuestions` and `_addClaimLineQuestions`.
- **Grounded finding:** the existing parser already tolerates absent lines —
  `IntakeForms_answersByTitle` builds its map from `response.getItemResponses()`,
  which omits unanswered/skipped questions, and Lines 2 & 3 are already
  `required=false`. So branching does NOT change the response shape the handler
  sees. The new "Add another line?" answer lands as an unused key — harmless. Risk
  shifts to building the section/branch structure correctly (branch must HIDE later
  lines, not just paginate) — caught by the `pair-agent` visual verify.
- The implementation plan must PIN: exact question order, section boundaries, each
  branch target, and that "No" → Submit.

### 3. Extract + test the line parser — `CoreDecisions.js` + Jest
- Pull the "which of lines 1–3 are present, and parse each line's category/amount"
  logic out of `IntakeForms.gs` into a pure helper in `CoreDecisions.js` (per ADR
  0003 extract-and-strangle), delegated to via a one-line wrapper.
- Jest-test the absent / partial (line 1 only, lines 1+3) / full cases. This is the
  regression net for the branching change, since Jest can't touch FormApp.
- Only extract the genuinely-named invariant (line-presence + parse), not trivial
  control flow.

### 4. File-upload hardening
- Keep the manual-add of the "Receipt photo" file-upload question (FormApp can't
  create it) and the existing `_warnIfClaimFormMissingFileUpload` Discord guard.
- The `pair-agent` visual verify asserts the receipt-upload question actually
  renders on the live Claim form, so a silently-removed upload question is caught.

### Deferred (written down, NOT in this scope)
- Post a `#treasury` notice when "Add another line? = Yes" but the following line
  parses absent (silent-underparse guard mirroring the upload-missing guard).

## Verification pipeline (Approach A)

1. **Visual/interaction** — `pair-agent` on Noah's logged-in browser: load each
   real form, exercise the "Add another line?" branch, screenshot desktop + mobile.
   Never submits. Catches: layout, branch show/hide, upload-question presence,
   wording, mobile.
2. **Pure logic** — `npm test` (the extracted parser + existing suite). Catches:
   line-presence/parse regressions.
3. **Functional round-trip** — the existing CP-E, run by Noah: one real
   request+claim submit → Sheet rows via Engine → Discord → `verifyChain().ok`.

## Test-data isolation

Pre-production only, so no isolation infra: submit freely during development, then
**verified clean reset is a REQUIRED go-live task** — `cleanupTestPhase1()` →
fresh `setupAll()` → assert `verifyChain().ok === true` from `GENESIS`, so zero test
residue survives into the real semester.

## Error handling

- Any verification layer failing = item not done; fix and re-run; never commit red.
- If `pair-agent` can't reach Noah's browser session, fall back to Noah pasting
  screenshots; do not skip visual verification.

## Prod deployment checkpoint (the one human gate)

Batched at the end. Noah:
1. `cd src/gas && clasp push --force` (to the canonical project).
2. Run `FormSetup.createForms()` (+ `createOnboardingForm()`), then
   `installTriggers()`.
3. Manually (re)add the "Receipt photo" file-upload question to the Claim form and
   set theme/header if desired.
4. Confirm both forms: collect email ON, sign-in required ON.
5. Run one CP-E round-trip.
6. Before real semester use: run the verified clean reset (above).

## First tasks (for writing-plans to sequence)

1. Extract the line-presence+parse helper to `CoreDecisions.js` + Jest (regression
   net first, before changing the form).
2. Restructure `FormSetup.gs`: wording/order/validation pass + progressive-
   disclosure branching, keeping the parser contract intact.
3. `pair-agent` visual verify pass (Noah's browser) on all three forms.
4. Add the file-upload render assertion to the verify pass.
5. Emit the prod deployment checkpoint + the verified-clean-reset go-live task.

## Decisions locked (CEO review, 2026-07-11)

- Approach **A** (Noah-assisted, minimal); mode HOLD SCOPE.
- Verification: `pair-agent` render/interaction-only + existing CP-E.
- Test isolation: pre-prod submit-freely, then verified clean reset at go-live.
- Line parser extracted to `CoreDecisions.js` + Jest.
- Multi-line: progressive disclosure via go-to-section branching.
- NOT in scope: visual restyling, scratch project, web-app `doGet`, login-off fork,
  autonomous submit-testing.
