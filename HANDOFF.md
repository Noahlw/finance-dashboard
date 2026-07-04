# HANDOFF — CF Fellowship Finance System

Read this first if you're picking up this session cold. It tells you what exists,
what's proven vs. unproven, what's blocked, and exactly what to do next.

## Read in this order

1. This file.
2. `BUILD-PLAN.md` — the authoritative execution plan (§0 briefing, §2 phase/task specs, §3 Config keys, §4 verification). **All D1–D9 decisions there are locked; don't re-litigate them.**
3. `FINANCE-SYSTEM-DESIGN.md` — full architecture rationale (only needed for "why", not "what to do next").
4. `CONTEXT.md` + `docs/adr/0001-*.md` + `docs/adr/0002-*.md` — glossary + the two hard-to-reverse decisions (shared owner account / personal actor accounts; treasurer-only approval with self-dealing disclosure).

## How this session has been working (important — don't deviate without asking)

- The user (Noah) explicitly said **"all inline"** — do NOT delegate to background subagents via the Agent tool. Two earlier attempts to run Phase 1 via a subagent were killed by the user before producing output. All code since has been written directly in the main session with Write/Edit/Bash, one task at a time, committing after each.
- User's session model preference has flipped a few times (Sonnet 5 medium → Opus → Sonnet 5). Don't assume; check the current session model if it matters, but it hasn't affected how work is done — everything is written directly, no model-specific behavior depended on.
- Task tool (TaskCreate/TaskUpdate) has been used to track P1-1..P1-10 as a checklist. All 10 are marked `completed`. Check `TaskList` if you want to see them, but the git log below is the ground truth of what's actually done.
- Git workflow: one commit per completed task, message format `P1-<n>: <summary>`, plus a couple of standalone `Fix:` commits for bugs caught during build. No pushes to any remote (there is no remote — this is a local-only repo so far).

## Current state (verified, not assumed)

**Repo**: `/Users/noahklw/Desktop/Coding/CF-Budget`, git-initialized, branch `main`, working tree clean as of the last commit below.

```
f7ce09a Fix: add userinfo.email OAuth scope (required by Session.getEffectiveUser/getActiveUser)
b0895f5 P1-10: Tests.gs (test_phase1: setup idempotency + full request-to-payout walkthrough)
a130430 Fix: register U-0001 in Counters to prevent ID collision on next User allocation
b3f3a85 P1-9: Payouts.gs (minimal payout lifecycle) + Engine hook on APPROVE_PAYOUT
1200ab7 P1-8: Approvals.gs (treasurer cockpit, onEdit intent handler)
ff1da62 P1-7: FormSetup.gs (form builders + trigger install) + IntakeForms.gs (onFormSubmit handlers)
7d0c40d P1-6: Engine.gs (transition core, TRANSITIONS table, D4/D5 role+self-approval logic)
853213d P1-3: Setup.gs (idempotent workbook/folder builder + seed data)
c0243fb P1-5: Discord.gs (webhook notifier, never throws)
e30181b P1-4: Audit.gs (hash-chained append + verifyChain)
4986e70 P1-2: Config.gs (Config tab reader + spreadsheet accessors) + Ids.gs (ID generation)
6824a8b P1-1: project skeleton + appsscript.json + Constants.gs
9359565 Initial planning docs: design, build plan, context, ADRs
```

**Phase 1 code (`src/gas/`)** — all 10 BUILD-PLAN.md Phase 1 tasks (P1-1 through P1-10) are written, syntax-checked (`node --check`, individually and concatenated), and cross-checked for column-count/schema consistency against `Constants.gs`'s `COLS` maps and for duplicate top-level identifiers (none found):

| File | Role |
|---|---|
| `appsscript.json` | V8 manifest, Asia/Hong_Kong timezone, oauthScopes (see below — this took two fixes) |
| `Constants.gs` | Single source of truth: `TABS`, `COLS` (1-indexed column maps), `ROLES`, `STATUS`, `ENTITY_PREFIX`, `ACTIONS` |
| `Config.gs` | Config-tab reader (`Config.get/getNum/getBool/getOptional`, 60s cache) + shared spreadsheet accessors (`getLedger_`, `getVault_`, `getSheet_`, `getVaultSheet_`) |
| `Ids.gs` | `Ids.nextId(entityType)` / `Ids.childId(parentId, seq, prefix)`, lock-guarded via the `Counters` tab |
| `Audit.gs` | `Audit.append(...)` (hash-chained, append-only) + `Audit.verifyChain()` |
| `Discord.gs` | `Discord.postTreasury/postStatus/postSelfApproved`, webhook POST with one retry, **never throws** |
| `Setup.gs` | `setupAll()` — idempotent: creates all 14 CF-Ledger tabs + CF-Vault + Drive folder tree, applies validations/protections, seeds Config/Categories/Treasurer(U-0001)/opening-balance Income row |
| `Engine.gs` | The transition core: declarative `TRANSITIONS` table (covers every FINANCE-SYSTEM-DESIGN.md §1.5 edge), `Engine.transition(...)`, D4 role checks, D5 self-approval flagging, `Engine.validateClaimLineAmount(...)` |
| `FormSetup.gs` | `FormSetup.createForms()` / `installTriggers()` / `refreshClaimFormChoices()` — builds the Budget Request + Expense Claim Google Forms in code (file-upload question is a manual step, see CP-C below) |
| `IntakeForms.gs` | `onFormSubmitRequest`/`onFormSubmitClaim` — idempotent on form response ID, resolves submitter email → User, moves+hashes receipts, late-flagging |
| `Approvals.gs` | The treasurer's cockpit tab: `refreshApprovalsTab()` + `onEditApprovals(e)` — the ONLY path from the sheet UI into `Engine.transition` |
| `Payouts.gs` | Payout lifecycle QUEUED→SENT→CONFIRMED, auto-creates a Payout row when a claim reaches APPROVED_FOR_PAYOUT (hooked from `Engine.gs`), auto-marks the claim PAID when all its payouts are CONFIRMED |
| `Tests.gs` | `test_phase1()` — setup idempotency check + full request→approve→claim→verify→payout walkthrough, asserts `Audit.verifyChain().ok` |

Two real bugs were caught and fixed during the build (not hypothetical — both would have caused silent data corruption or a hard crash):
1. `Setup_ensureTreasurerUserSeeded` hardcoded `U-0001` without registering it in `Counters`, which would've caused the next real `Ids.nextId('User')` call to also produce `U-0001` (ID collision). Fixed: added `Setup_registerCounter(entityType, n)` and it's called after seeding.
2. `appsscript.json` declares explicit `oauthScopes` (required since we don't want Apps Script's auto-detected scope list), but the original list omitted `https://www.googleapis.com/auth/userinfo.email`, which `Session.getEffectiveUser()`/`getActiveUser()` need. This surfaced as a live runtime error (see below) and was fixed + repushed.

## Deployed Google-side state (already created — do not recreate)

- **clasp** is logged in as the shared/owner Google account (confirmed with the user before creating anything — this matters per ADR 0001, D1: the shared account must own everything).
- `clasp create --type sheets --title "CF-Finance Engine"` was run **from inside `src/gas/`** (this is correct — `.clasp.json`'s `rootDir` is `""`, i.e. relative to `src/gas` itself, which is where all the `.gs` files already live).
- Resulting IDs (also in `src/gas/.clasp.json`, which is gitignored — this is the only place they're recorded on disk other than this file):
  - **Spreadsheet (CF-Ledger container)**: `1FXF_B6aLnUJDjM4xVX04tajA4cRgBLyko-y6jVrs3ys` — https://drive.google.com/open?id=1FXF_B6aLnUJDjM4xVX04tajA4cRgBLyko-y6jVrs3ys
  - **Apps Script project**: `1OUiI9HsTri_F_5Xte0Nraw23E0Q-56Tmp7PDkEw7iIZUHEUtH4_5KHF-` — https://script.google.com/d/1OUiI9HsTri_F_5Xte0Nraw23E0Q-56Tmp7PDkEw7iIZUHEUtH4_5KHF-/edit
- `clasp push -f` has been run twice (once initially, once after the OAuth scope fix). The deployed code currently matches the `f7ce09a` commit exactly. **If you make any further code changes, `cd src/gas && clasp push -f` to redeploy — the user cannot see your edits until you do this.**
- **CF-Vault spreadsheet does not exist yet** — it's created by `setupAll()` on first successful run (not yet confirmed successful, see Current Blocker).

## Current blocker (pick up here)

This is a `/loop`-free, single-session, "run it together" workflow: the user runs functions in the Apps Script editor UI (I have no browser access) and pastes back the result; I read/fix/repush code as needed.

**Sequence so far:**
1. User ran `setupAll()` in the script editor → got: `Exception: Specified permissions are not sufficient to call Session.getEffectiveUser. Required permissions: https://www.googleapis.com/auth/userinfo.email` at `Setup_protectOwnerOnly @ Setup.gs:193`.
2. Diagnosed: missing OAuth scope in `appsscript.json` (bug #2 above). Fixed and repushed (commit `f7ce09a`).
3. **User has NOT yet reported back the result of re-running `setupAll()` after the fix.** This is the very next thing to happen — likely a new authorization prompt (since the scope list changed) that the user needs to click through, then the actual execution result.

**Your immediate next step:** ask the user (or check chat history if you have it) whether they've re-run `setupAll()` yet. If not, tell them to:
1. Go back to the Apps Script editor (link above).
2. Select `setupAll` in the function dropdown, click ▶️ Run.
3. If prompted again for authorization (likely, since scopes changed): Review permissions → choose the shared account → Advanced → "Go to CF-Finance Engine (unsafe)" → Allow.
4. Paste back the execution log or any error.

If it succeeds, `setupAll()` returns a summary object (ledgerUrl, vaultUrl, tabsCreated, folders, configSeeded, categoriesSeeded, treasurerSeeded, incomeSeeded) — sanity check it against `Setup.gs`'s `setupAll()` return shape, then proceed to CP-C.

If it errors again: read the stack trace carefully — it'll cite a `Setup.gs` line number. Cross-reference against the current pushed code (re-pull with `clasp pull` if there's ANY doubt the local repo and deployed code have diverged — they shouldn't have, but verify rather than assume). Fix locally, `git commit`, `clasp push -f`, ask user to retry.

## Remaining checkpoints (BUILD-PLAN.md §2, Phase 1, task P1-11)

Do these one at a time, in order, waiting for the user's result each time before moving on — do not batch instructions ahead of where the user actually is:

- **CP-A** (Discord webhooks + 2FA + clasp login): **Discord webhook URLs still not confirmed captured.** Ask the user for the `#treasury` and `#finance-status` webhook URLs — they'll need to be pasted into the `Config` tab (`TREASURY_WEBHOOK_URL`, `STATUS_WEBHOOK_URL` keys) before Discord notifications will actually send (until then, `Discord.gs` silently no-ops and logs `NOTIFY_FAIL`-style skips — this is by design, not a bug, but it means no Discord messages will appear during early testing).
- **CP-B** (deploy): mostly done (see above) — pending only the successful `setupAll()` run.
- **CP-C** (forms): run `FormSetup.createForms()` then `FormSetup.installTriggers()` from the script editor. Then the user must MANUALLY add a "Receipt photo" file-upload question to the Claim form in the Google Forms UI (FormApp cannot create `FILE_UPLOAD` items — this is a known Apps Script limitation, not an oversight). Also set both forms to collect email + require login (should already be set by `_buildRequestForm`/`_buildClaimForm`, but verify in the UI).
- **CP-D** (engine test): run `test_phase1()`. It should log `PHASE1 PASS`. If it throws, the error message names the failing assertion — `Tests.gs` has one assertion per invariant, so the message is diagnostic, not just "something failed".
- **CP-E** (live round-trip): paste real webhook URLs into Config (overwriting `PASTE_ME`), then submit a real Budget Request via the form, approve it via the Approvals tab, submit a real Expense Claim with a real receipt photo, verify + approve payout, `Payouts.markPayoutSent(...)`, confirm. Check Discord for ~4 messages in each channel and re-run `Audit.verifyChain()` to confirm it's still `{ok: true}`.

## After Phase 1 exit

BUILD-PLAN.md §2 Phase 2 starts at **P2-1**: full state machines (NEEDS_INFO loops already exist in the TRANSITIONS table; what's missing is the missing-receipt declaration flow with caps, duplicate-receipt detection, top-up request linkage). Read BUILD-PLAN.md's Phase 2 row before starting — don't re-derive it from FINANCE-SYSTEM-DESIGN.md alone, since BUILD-PLAN.md's D1–D9 decisions override/narrow some of the design doc's Tier-3/email/Telegram assumptions (Phase 2 is Discord-only, treasurer-only-approval, per the locked decisions).

## Things NOT to do

- Don't re-ask the six grilling questions (identity model, approval authority, self-dealing, notification channel, timeline, migration) — they're answered and recorded as D1–D9 in `BUILD-PLAN.md` §0.3 and in the two ADRs. Re-litigating them wastes the user's time.
- Don't spawn a background Agent/subagent for this work unless the user explicitly asks again — they killed two subagent runs and said "all inline." Work directly in the main session.
- Don't recreate the CF-Ledger spreadsheet or Apps Script project — they already exist (IDs above). If `clasp` ever seems disconnected from them, fix `.clasp.json` (recreate it by hand with the scriptId/parentId above) rather than running `clasp create` again.
- Don't commit `.clasp.json`, `node_modules/`, or any file containing the Discord webhook URLs in plaintext if you ever export/print Config contents somewhere persistent — treat webhook URLs as low-sensitivity secrets (not PII, but not for public commit messages either).
