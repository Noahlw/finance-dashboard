# 3. Deep Module Script Architecture

Date: 2026-07-16

## Status
Accepted

## Context
As part of our Airtable Native fresh start, the complex business logic (e.g., verifying budget limits and blocking receipt fraud) will be executed via Airtable Scripts attached to Interface buttons. 

If we write these scripts as monolithic blocks of code that directly mix Airtable API calls (`record.getCellValue()`) with business logic, the code will be impossible to test locally, highly brittle, and lack any meaningful internal seams.

We need to apply the principles of **Codebase Design** to ensure leverage, locality, and testability.

## Decision
We will separate the Airtable Script into a **Deep Module** with a strict internal seam.

1.  **The Adapter (The Airtable Runner):** A thin layer that interfaces directly with Airtable. It reads the current record, fetches linked records via `table.selectRecordsAsync()`, and maps the Airtable specific objects into generic JavaScript objects (DTOs).
2.  **The Interface (The Seam):** A pure function signature that accepts dependencies and data, and returns side-effect-free results.
    ```typescript
    // Interface: Small surface area, accepts dependencies, returns results.
    function validateApproval(
      claim: ClaimData, 
      linkedBudgetLine: BudgetLineData, 
      linkedReceipt: ReceiptData
    ): { ok: boolean, error?: string, statusToApply?: string }
    ```
3.  **The Implementation (The Engine):** A deep module containing all the complex validation logic. It does *not* know it is running inside Airtable. It simply computes the rules and returns the result.

## Consequences
### Positive
*   **Testability:** The core `ValidationEngine` can be fully unit-tested locally using Jest by passing in standard JavaScript objects. We do not need to mock the complex Airtable Scripting environment.
*   **Locality:** All business rules are isolated in one place, totally decoupled from how Airtable stores or retrieves data.
*   **Leverage:** The validation engine can be reused across different scripts (e.g., if we ever need to run validation in a background Automation instead of a Button).

### Negative
*   Requires a build step (e.g., Webpack or esbuild) locally to bundle the Adapter and the Implementation into a single vanilla JavaScript file that can be copy-pasted into the Airtable UI.
