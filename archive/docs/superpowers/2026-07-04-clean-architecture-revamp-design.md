# CF-Budget Clean Architecture Revamp Design

> **Superseded by [ADR 0003](/docs/adr/0003-extract-and-strangle-over-big-bang-clean-architecture.md).**
> The `src/core/` Command Object architecture described below was abandoned in favor of an
> extract-and-strangle approach: pure logic is pulled out of `Engine.gs` into `src/gas/CoreDecisions.js`
> function-by-function, and `Engine.gs` remains the sole mutator. Kept here as historical record of
> what was tried and why it didn't proceed.

## Purpose
The main Google Sheet was deleted, creating an opportunity to rebuild the Apps Script backend using a "Clean Architecture" approach. The primary goal is to enable local Test-Driven Development (TDD) using standard Node.js tools (Jest) without relying on brittle Google Apps Script (GAS) API mocks (`SpreadsheetApp`, `DriveApp`, etc.).

## Constraints & Assumptions
- We remain on the $0-budget constraint, relying entirely on Google Apps Script and Google Sheets.
- The system logic remains largely unchanged from the original `FINANCE-SYSTEM-DESIGN.md`.
- `clasp` will be used to deploy local `.js` files to `.gs` files on Apps Script.
- The project will be initialized as a Node project locally just for testing/development.

## Architecture & Components

The codebase will be strictly separated into two domains: **Core Domain** (Pure Logic) and **Infrastructure Adapters** (GAS specific).

### 1. Core Domain (`src/core/`)
Pure JavaScript functions that know nothing about Google APIs. 
- **Data Boundary**: They take plain, structured JSON objects/arrays as state (e.g. `[{ id: "BR-001", status: "PENDING" }]`), mapped by the Infrastructure layer.
- **Return Boundary**: They return explicit Command Objects representing mutations (e.g. `[{ action: 'UPDATE', entity: 'BudgetRequest', id: 'BR-001', field: 'status', value: 'APPROVED' }]`), rather than mutating objects directly.

Modules:
- **`CoreEngine.js`**: Contains the state machines. Evaluates a transition request (entityType, entityId, action, payload, currentState) and returns a `{ success, commands, error }` object.
- **`CoreValidations.js`**: Pure functions for checking business invariants (e.g. HK$200 missing receipt caps, deadline checks).
- **`CoreAudit.js`**: Handles hashing logic. The Core Engine dictates the audit trail by returning explicit `APPEND_AUDIT` commands that include the required cryptographic row hashes.

### 2. Infrastructure Adapters (`src/gas/`)
The glue code that interacts with `SpreadsheetApp` and calls the Core Domain.

- **`GasSheetRepository.js`**: Wraps `SpreadsheetApp`. Translates raw 2D arrays into structured JS objects for the core. Takes Command Objects from the core and executes them as `setValue()` operations.
- **`GasRouter.js`**: The entry point for triggers (e.g., `onFormSubmit`, `onEdit`). It coordinates fetching state via the Repository, invoking `CoreEngine`, and executing the returned commands.

## Testing Strategy
- **Node.js Compatibility**: To allow Jest to test the `.js` files without breaking Google Apps Script, we will append a protective `typeof module` check at the bottom of each core file (e.g., `if (typeof module !== 'undefined') { module.exports = { CoreEngine }; }`).
- `npm init -y` and `npm install --save-dev jest`.
- `npm test` to run tests locally.
- Tests will strictly cover files in `src/core/`. No mocking of `SpreadsheetApp` is required.

## Data Flow (Example: Approving a Request)
1. `onEdit` fires in GAS. `GasRouter` receives the event.
2. `GasRouter` identifies the intent to APPROVE.
3. `GasRouter` asks `GasSheetRepository` for the BudgetRequest row, receiving a structured object.
4. `GasRouter` passes the object and the `APPROVE` intent to `CoreEngine.calculateTransition()`.
5. `CoreEngine` validates the rules, computes the new AuditLog hash, and returns two commands: `UPDATE` (status) and `APPEND_AUDIT` (hash chain).
6. `GasRouter` passes these commands to `GasSheetRepository` to apply the updates to the spreadsheet.
