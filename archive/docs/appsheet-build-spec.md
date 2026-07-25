# AppSheet Build Spec — CF Money (committee app)  [SUPERSEDED]

> **This document is superseded.** AppSheet has been abandoned in favor of the code-managed React/Vite web app served by Apps Script HTML Service. See [Committee Finance Web App Specification](../../docs/specs/committee-finance-web-app.md) for the current architecture. This document is retained for historical reference only.

Deterministic, click-by-click instructions for building the Tier-2 committee AppSheet app on top
of CF-Ledger (BUILD-PLAN.md P3-1/P3-4). Written so someone who has never opened AppSheet can follow
it top to bottom without screenshots and without asking a question whose answer isn't in this file
(BUILD-PLAN.md §4.3's own bar). Estimated time: 2-3 hours (CP-G).

## §0. Scope & prerequisites

This app is **read-only over every CF-Ledger tab except the `Approvals` tab's 5 intent columns**
(`action`, `amount_override`, `note`, `confirm`, `intent_actor_email`). It never writes a status
column, an `approved_amount`, or a `self_approved` flag directly — every action below only ever
sets those 5 intent columns then `CONFIRM=TRUE`, which fires the existing `onEditApprovals` trigger.
Nothing new is being trusted; this app is a nicer front door onto a mechanism that's already live
and already tested (`Tests.gs::test_phase1/test_phase2`).

Before starting, confirm: Phase 1 and Phase 2 checkpoints (CP-A through CP-F) are done; both Discord
webhook URLs are pasted into Config; the `dailyJob()` time trigger is installed; the "mark paid"
Approvals-tab mechanism exists (`Approvals_queuedPayoutRows()` / the `MARK_PAID` action — shipped as
part of this same Phase 3 work, before this doc). If any of those aren't true yet, stop and finish
them first — several steps below assume they exist.

## §1. Concepts, not clicks

Canonical terms (reused verbatim from `CONTEXT.md` — don't reinvent this vocabulary anywhere in the
app's UI text):

- **Owner account** — the shared Google account that owns CF-Ledger, CF-Vault, the Apps Script
  project, and this AppSheet app itself. Nobody "acts as" it in workflows.
- **Actor account** — a committee member's personal Google account, used to log into this app and
  attributed on every action they take.
- **Engine** — the Apps Script code that is the sole mutator of status. This app expresses intent;
  the Engine performs transitions.
- **Intent column** — an editable column where a human expresses what they want done. The Engine
  reads it, acts, and clears it.

One sentence to hold onto throughout: **AppSheet never writes `status`.** Every action in §7 only
ever sets the 5 intent columns above, then `CONFIRM=TRUE`.

A hedge before you start clicking: AppSheet's UI labels and menu positions drift release to release.
The steps below describe what to do by *purpose* ("the button that creates a new table connection"),
not by exact pixel position. If a label mentioned here doesn't match what you see, look for the
control that does the same job — the underlying data model (below) is what matters, not the exact
click path to it.

## §2. Create the app

1. Sign in to [appsheet.com](https://appsheet.com) as the **Owner account** — not your personal
   account. This determines who "owns" the app going forward, matching ADR 0001's model.
2. Create → App → **From your data** → select the **CF-Ledger** spreadsheet (not CF-Vault) → name
   it "CF Money".

## §3. Data sources

Add these CF-Ledger tabs as data sources. **Do not add every tab** — `Counters`, `Config`, and
`AuditLog` are never AppSheet data sources at all (matching their owner-only protection in
`Setup.gs`): `BudgetRequests`, `BudgetRequestLines`, `ExpenseClaims`, `ClaimLineItems`, `Receipts`,
`Payouts`, `Users`, `Categories`, `Events`, `Approvals`.

For every column on every one of these tabs, set **Editable? = FALSE**, with exactly one exception:
on the `Approvals` tab only, these 5 columns are `TRUE`: `action`, `amount_override`, `note`,
`confirm`, `intent_actor_email`.

**Must not:** CF-Vault is never added as a data source, under any circumstance. This is the
AppSheet-layer restatement of design §4.2's PII isolation — Vault (student IDs, payout handles)
stays reachable only by the Treasurer's own script execution, never through this app.

## §4. Slices

- **My queue**: `Approvals` rows where `[status] = "PENDING" OR [status] = "SUBMITTED"`.
- **Awaiting payout**: `Approvals` rows where `[entity_type] = "Payout" AND [status] = "QUEUED"`
  (sourced from `Approvals_queuedPayoutRows()`, added to the Approvals tab as part of this phase).
- **Recently decided**: this **cannot** be sourced from `Approvals` — decided items drop off that
  tab the moment `refreshApprovalsTab()` rebuilds it (it only ever lists PENDING/SUBMITTED/VERIFIED/
  QUEUED rows). Build this as two separate views instead, directly over `BudgetRequests`
  (`[decided_at]` within the last N days) and `ExpenseClaims` (`[verified_at]`, `[approved_at]`, or
  `[paid_at]` within the last N days). This is a deliberate simplification, not an oversight —
  AppSheet has no clean way to union two differently-shaped tables into one slice.

## §5. Views

- **Deck view** over `My queue`: primary column = `amount`, secondary = `requester_or_claimant`.
- **Detail view** for a claim, showing the receipt inline: add a **virtual column**, set its
  **Type to `Image`** (not `Text` or `Url` — leaving it `Text` renders a clickable URL, not a
  photo), with this exact formula (the v1 claim form shape is one receipt per claim, so this
  nested lookup is safe):
  ```
  CONCATENATE("https://drive.google.com/uc?id=",
    LOOKUP(
      LOOKUP([entity_id], "ClaimLineItems", "claim_id", "receipt_id"),
      "Receipts", "receipt_id", "drive_file_id"
    )
  )
  ```

## §6. Form view (intent-only)

Bind a form view to the `Approvals` tab's 5 editable columns only. On `intent_actor_email`: set
**Initial value** to `=USEREMAIL()` **and** **Editable? = FALSE** (not just a default — if it stays
editable, a user could spoof who performed the action). This is the exact mechanism that makes
`intent_actor_email` trustworthy for the Engine to attribute the real human, not the shared account.

## §7. Actions

One action per verb: **Approve**, **Reduce**, **Reject**, **Verify**, **Mark paid**. Each is a "set
these column values" action: `action = <ACTIONS enum value>`, `confirm = TRUE`,
`intent_actor_email = USEREMAIL()`.

**Approve**, **Verify**: no extra input needed — a single data action.

**Reject**, **Reduce**, **Mark paid** need a note/amount first — build these as a **composite
form-then-data action** (AppSheet supports chaining a form action into a data action):
- **Reject**: form asks for a required note → data action sets `note`, `action = "REJECT"`,
  `confirm = TRUE`.
- **Reduce**: form asks for a required note and an amount → data action sets `note`,
  `amount_override`, `action = "REDUCE"`, `confirm = TRUE`.
- **Mark paid**: form asks for payout method (dropdown: FPS/PayMe/Bank/Cash) and a transaction
  reference → data action concatenates them into `note` as `"METHOD|reference"` (e.g.
  `"FPS|991234567"` — this exact pipe-delimited convention is what `onEditApprovals` parses, see
  `Approvals.gs`), sets `action = "MARK_PAID"`, `confirm = TRUE`.

## §8. User settings

Add the ≤10 committee/treasurer personal Google accounts as app users (AppSheet's Users list),
matching ADR 0001's ≤10-concurrent model. Each must first submit the onboarding form
(BUILD-PLAN P3-3) so their `Users` row exists before they try to act in this app.

## §9. Branding/UX minimums, and what NOT to touch

App icon/name/color: pick anything reasonable — not load-bearing. What matters:

- **Never** make any column on `BudgetRequests`, `ExpenseClaims`, `ClaimLineItems`, `Receipts`,
  `Payouts`, `Users`, `Categories`, or `Events` editable. Status, stamps, and amounts are the
  Engine's alone to write.
- **Never** add CF-Vault as a data source (§3).
- **Never** make `intent_actor_email` editable (§6).

**Done-when:** every action in §7 round-trips through the real `onEditApprovals` trigger and lands
in `AuditLog` attributed to the acting committee member's own `USER-id`, not the shared owner
account (BUILD-PLAN §4.2's own P3 acceptance bar).
