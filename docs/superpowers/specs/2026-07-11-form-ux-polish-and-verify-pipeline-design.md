# Design Spec — Self-Driving Form-UX Polish & Browser Verify Pipeline

**Date:** 2026-07-11
**Status:** Approved (design phase); pending user review before writing-plans
**Author:** brainstorming session with Noah

## Problem

The Google Forms intake UI is the last blocker to production. Three concrete
issues (from Noah, 2026-07-11):

1. **Confusing / bad UX** — question order, wording, weak validation, and the
   rigid always-visible "Line 1 / Line 2 / Line 3" layout are awkward.
2. **File-upload gap / fragile** — FormApp cannot create the receipt file-upload
   question; it is added manually and can silently disappear.
3. **Untested end-to-end** — no real submit → Sheet row → Engine → status
   round-trip has ever been verified from the form itself.

Explicitly **out of scope:** visual restyling (theme color, header banner, fonts,
CSS). FormApp cannot script these and Google Forms has a hard visual ceiling;
Noah confirmed the blocker is *structural/UX*, not aesthetic. We stay inside
Google Forms — no custom web front-end.

## Goal

Polish the three intake forms (Budget Request, Expense Claim, Onboarding) for
clarity and correctness, and stand up a **browser-driven verify pipeline** that
lets Claude test the forms itself each iteration without pulling Noah into every
cycle. Batch-at-checkpoints cadence: Claude iterates autonomously against a
scratch harness, commits each verified change locally, and stops only for prod
deployment.

## Constraints (inherited, must not violate)

- FormApp (Apps Script) is the only form builder in use. Scriptable: titles,
  descriptions, help text, question types, required flags, validation, list/
  dropdown choices, page-break sections, and go-to-section branching. NOT
  scriptable: theme/color/header/fonts, and file-upload questions.
- Prod forms keep `setCollectEmail(true)` + `setRequireLogin(true)`. Only the
  **scratch** forms run with login OFF for anonymous browser testing.
- The Engine remains the sole status mutator; form handlers only express intent.
  No form change may write a `status`/`*_by`/`*_at` column directly.
- Final `FormSetup.gs` ported to prod must contain **no scratch-only config**
  (no login-off, no test webhook, no scratch IDs). Scratch differences live in a
  separate seam (see Component 1).
- Plan/spec discipline: no finished runnable implementation code in this doc.

## Architecture

### Component 1 — Scratch harness

A disposable Apps Script container-bound project with its own scratch `CF-Ledger`,
fully isolated from prod.

- **Own `.clasp.json`** (own `scriptId`, own `parentId`) living OUTSIDE the prod
  `src/gas/` tree — proposed at `scratch/gas/` with a copy of the `.gs`/`.js`
  files, so `clasp push` to scratch never touches prod's `src/gas/.clasp.json`.
  Per CLAUDE.md, `clasp create` silently overwrites the manifest at its rootDir —
  the scratch manifest MUST be an isolated copy, never shared with prod.
- **Config seam for login-off:** `FormSetup._buildRequestForm/_buildClaimForm/
  _buildOnboardingForm` currently call `setRequireLogin(true)`. Introduce a single
  indirection — a `Config`-driven or Script-Property flag (e.g.
  `FORM_REQUIRE_LOGIN`, default TRUE) read once and applied to all three builders.
  Scratch sets it FALSE; prod leaves it unset/TRUE. This is the ONLY behavioral
  fork between scratch and prod, and it lives in data (Config/Script Property),
  not in code branches — so the committed `FormSetup.gs` is identical for both.
- **Scratch Ledger** is initialized by the existing `setupAll()` so the Engine has
  real tabs to write into. Discord `TREASURY_WEBHOOK_URL`/`STATUS_WEBHOOK_URL`
  point at a throwaway test webhook (or stay `PASTE_ME`, which `Discord.gs`
  already treats as skip-and-log).

### Component 2 — Rebuild trigger (web-app doGet)

Chosen mechanism: deploy the scratch project as a web app so Claude can trigger a
form rebuild over HTTP with no GCP/OAuth console setup.

- Add a `doGet(e)` entry point (scratch-only file, NOT ported to prod, or guarded
  so prod's deployment ignores it) that dispatches on `e.parameter.action`:
  - `action=rebuildForms` → deletes/recreates (or edits-in-place) the scratch
    forms via `FormSetup`, returns JSON `{requestFormUrl, claimFormUrl,
    onboardingFormUrl}` as `ContentService` text.
  - `action=introspect` → returns a JSON dump of each form's items
    (title, type, required, validation summary) for the structural assertion layer.
  - `action=lastRow&entity=BudgetRequests|ExpenseClaims` → returns the most recent
    row + its status, for the functional round-trip assertion.
- Deployed "execute as me (owner), accessible to anyone with the link" so an
  anonymous `curl`/`browse` GET runs it as the scratch owner.
- **First task is a spike** to nail the deployment-refresh mechanic: whether the
  stable `/exec` URL needs `clasp redeploy <deploymentId>` after each `clasp push`,
  or a `/dev` head URL suffices. Document the exact command sequence as the
  pipeline's "deploy step" before building on it.

### Component 3 — Verify pipeline, three layers

Run by Claude via the `browse` skill against the scratch form URLs:

1. **Visual** — screenshot each `/viewform` at a desktop width and a mobile width;
   keep before/after pairs for diffing when a change lands.
2. **Structural** — call `?action=introspect`, assert every expected question
   (title, type, required, validation) is present and correctly ordered; also
   assert via `browse` DOM that branching sections show/hide as designed.
3. **Functional round-trip** — `browse` fills and submits the scratch **Budget
   Request** form (no file upload), then `?action=lastRow&entity=BudgetRequests`
   asserts a row was created by the Engine with the expected PENDING status and
   parsed line amounts.
   - **Known limit (honest):** Google requires sign-in for **file-upload**
     questions, so the Claim form's *receipt-upload* submit path cannot be tested
     fully anonymously. Options for that one path: (a) test Claim submission
     without the upload question on scratch and assert the non-upload fields +
     validation; (b) use `pair-agent` against Noah's already-logged-in browser for
     a one-off upload round-trip; (c) manual test at the prod checkpoint. Default:
     (a) for the loop, (c) at deployment. This limit is specific to the upload
     field only — all other Claim fields test anonymously.

### Component 4 — UX polish backlog (all FormApp-scriptable)

Applied to `FormSetup.gs` and verified through Components 2–3:

- **Progressive disclosure for multi-line** (chosen): keep up to 3 lines, but
  present Line 1 immediately and gate Lines 2 & 3 behind an "Add another line?"
  yes/no that uses Forms **go-to-section** (page-break) branching. Simple claims/
  requests see one clean line. Applies to both Request lines
  (`_addRequestLineQuestions`) and Claim lines (`_addClaimLineQuestions`).
  - Handler impact: `IntakeForms.gs` (`onFormSubmitRequest`/`onFormSubmitClaim`)
    must still correctly map responses when Lines 2/3 are absent because the user
    said "no" — verify blank/skipped-section responses parse as "unused line", not
    as an error. This is a required regression check, not just a form change.
- **Wording / order / help text** pass across all three forms for clarity.
- **Validation tightening**: amount fields (already `requireNumberGreaterThan(0)`)
  reviewed for 2dp/HKD sanity; date fields (`Needed by`, `Receipt date`) sanity-
  checked; required flags reviewed.
- **File-upload hardening**: keep the manual-add + existing
  `_warnIfClaimFormMissingFileUpload` Discord guard; ADD a `browse` assertion in
  the pipeline that the receipt-upload question actually renders on the live form,
  so a silently-removed upload question is caught by the verify run.
- **Onboarding form** gets the same clarity/validation pass.

## Data flow (one iteration)

```
edit FormSetup.gs (prod repo)
  → copy to scratch/gas/  → clasp push (scratch)  → deploy-refresh step
  → browse GET ?action=rebuildForms  → scratch form URLs
  → Layer 1 screenshot  → Layer 2 introspect+assert  → Layer 3 submit+lastRow assert
  → npm test (pure logic unaffected but guards regressions)
  → git commit locally (prod repo; scratch/ gitignored or committed separately)
  → next item
STOP → prod deployment checkpoint (Noah)
```

## Error handling

- Any pipeline layer failing = item not done; Claude fixes and re-runs, does not
  commit red.
- `browse` cannot reach the web app (deploy stale) → re-run the deploy-refresh
  step from the Component 2 spike; do not silently skip verification.
- Functional round-trip needs the scratch Ledger initialized; if `lastRow` errors
  with "no such tab," re-run `setupAll()` on scratch.

## Testing

- **Jest** (`npm test`) still guards all pure logic in `CoreDecisions.js`/
  `CoreAudit.js`; form changes shouldn't regress it, but the branching-response
  parsing change in `IntakeForms.gs` may warrant a new pure-logic test if a
  parse/normalize helper is extracted (only if it's a real named invariant, per
  ADR 0003 extract-and-strangle discipline).
- **Browser pipeline** (Components 2–3) is the new integration layer for the forms.
- **`Tests.gs`** integration cases updated for any new handler behavior; run by
  Noah at the prod checkpoint.

## Prod deployment checkpoint (the one human gate)

Batched at the end of the autonomous run. Noah:
1. `cd src/gas && clasp push --force` (prod).
2. Run `FormSetup.createForms()` (and `createOnboardingForm()`), then
   `installTriggers()`.
3. Manually add the "Receipt photo" file-upload question to the Claim form
   (FormApp limitation) and set theme/header if desired.
4. Set both forms: collect email ON, sign-in required ON (prod default).
5. Confirm one real round-trip per BUILD-PLAN CP-E.

## Open decisions resolved this session

- Rebuild trigger: **web-app doGet** (lightest, no GCP/OAuth setup).
- Multi-line layout: **progressive disclosure** via go-to-section branching.
- Visual restyling: **out of scope** (Forms ceiling; blocker is structural).

## First tasks (for writing-plans to sequence)

1. **Spike** the Component 2 deploy-refresh mechanic + `doGet` dispatcher; prove
   `browse` can trigger a rebuild and read back form URLs.
2. Stand up the scratch harness (Component 1): isolated `scratch/gas/.clasp.json`,
   `FORM_REQUIRE_LOGIN` seam, scratch Ledger via `setupAll()`.
3. Build the three-layer verify pipeline (Component 2–3) and prove it green on the
   CURRENT forms before changing any UX (baseline).
4. Then work the Component 4 UX backlog item-by-item through the pipeline.
```
