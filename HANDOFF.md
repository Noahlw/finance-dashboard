# CF-Budget: Handoff Document

## Current State (July 2026)
We have successfully bootstrapped the "Clean Architecture" refactor for the CF-Budget Google Apps Script project.
- **Completed:** Created pure JS domain logic in `src/core/` (`Constants.js`, `CoreAudit.js`, `CoreValidations.js`, `CoreEngine.js`) that runs seamlessly in both Node.js (via Jest) and Google Apps Script (via a `typeof module !== 'undefined'` hack).
- **Tests:** A full Jest suite (`npm test`) is running and passing locally, with 100% coverage on the new files.
- **The Catch:** The new `CoreEngine.js` is currently a proof-of-concept that only implements one transition path (`BudgetRequest` `APPROVE`). The old tightly-coupled Google Apps Script files (`src/gas/Engine.gs` and `src/gas/Constants.gs`) are still intact. 
- **Blocker:** If we run `clasp push` right now, the system will crash due to global namespace collisions between the old and new Constants files.

## The Goal
Before proceeding to "Phase 3" (Onboarding & Snapshot Automation) of the master roadmap, we must execute the **"Big Bang" Integration**. This means fully porting all remaining logic into the Clean Architecture and deleting the old engine.

## The Approved Architectural Design

### 1. The Pure State Machine (`src/core/CoreEngine.js` & `CoreValidations.js`)
- Port the entire `TRANSITIONS` table (all 16 rules for Budget Requests and Expense Claims) from the old `Engine.gs` into `CoreEngine.js`. 
- Move all complex business validations—such as verifying a claim doesn't exceed the approved budget line, or enforcing the 3-per-semester Missing Receipt Cap limit—into `CoreValidations.js`. 
- **Requirement:** These files must remain pure JS with 0 dependencies on `SpreadsheetApp`. All paths must be heavily tested in Jest.

### 2. The Data Boundary (`src/gas/GasRouter.gs` & `GasSheetRepository.js`)
Because `CoreEngine` is pure, it needs state handed to it.
- Create a lightweight `GasRouter.gs`. When a transition is triggered (e.g., from `Approvals.gs` or `IntakeForms.gs`), the router intercepts it.
- The router determines what data is needed for the action (e.g. `VERIFY` on `ExpenseClaim` requires the claim row, its line items, the associated budget lines, and historical claims for the user).
- It uses `GasSheetRepository` to fetch these as pure JS objects/arrays, and passes this massive context object into `CoreEngine.transition(..., contextData)`.

### 3. The Command Interpreter (`src/gas/GasSheetRepository.js`)
`CoreEngine` will return an array of explicit command objects `{ success: true, commands: [...] }`.
- Fully implement `GasSheetRepository.executeCommands(commands)` to translate these into GAS side-effects:
  - `UPDATE`: Overwrite specific columns (`getRange().setValue()`).
  - `APPEND_AUDIT`: Add rows to the Audit tab.
  - `APPEND_ROW`: (Used for `recordIncome`).
  - `PROTECT_ROW`: Lock a row to prevent further edits (used when a claim is `PAID`).
  - `NOTIFY`: Dispatch Discord webhook payloads.

### 4. Integration and Cleanup
- Replace all `Engine.transition()` and `Engine.recordIncome()` calls in existing files (`Approvals.gs`, `IntakeForms.gs`, `Jobs.gs`) with `GasRouter.transition()`.
- Delete the legacy `Engine.gs` and `Constants.gs` entirely.

## Instructions for the Next Agent
1. Read this `HANDOFF.md` file.
2. Use the `superpowers:writing-plans` skill to generate a step-by-step implementation plan for this "Big Bang" integration.
3. Present the plan to the user for approval.
4. Once approved, use `superpowers:subagent-driven-development` to execute the integration task-by-task.
5. Ensure `npm test` passes completely and all old `Engine.gs` logic is safely ported before concluding.
