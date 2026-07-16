# Finance System Spec (Apps Script + React)

## Problem Statement

The current finance system relies on fragmented Google Forms (`IntakeForms.js`) for data entry. This provides a poor UX for students, as they have no visibility into their past claims, cannot easily track approval statuses, and cannot edit typos without submitting duplicate forms. While the backend engine (`Engine.js`) is robust and highly developed, the frontend is severely lacking.

## Solution

A Google Apps Script Web App serving a bundled React Single Page Application (SPA). This replaces all Google Forms with a unified, modern Dashboard where students can submit, track, and edit their Budget Requests and Expense Claims. The backend remains 100% inside the Google ecosystem, preserving the battle-tested `Engine.js` state machine and the Treasurer's raw spreadsheet `Approvals.js` cockpit, but exposes a secure API layer to the React frontend.

## User Stories

1. As a Submitter, I want to access a unified React Dashboard so I can view the real-time status of all my past Budget Requests and Expense Claims.
2. As a Submitter, I want to authenticate seamlessly via my Google Workspace account so the system securely identifies me.
3. As a Submitter, I want to submit new Expense Claims and Budget Requests through the React UI rather than scattered Google Forms.
4. As a Submitter, I want to edit my submitted claims before the Treasurer reviews them, so I can fix mistakes without needing manual intervention.
5. As a System, I want to extract critical business logic (receipt duplicate hashing, late claim detection) out of `IntakeForms.js` and into `Api.js`, so the legacy Google Forms infrastructure can be safely deleted.
6. As a System, I want to strictly verify the Submitter's email against the backend session (`Session.getActiveUser().getEmail()`) on every API call, so that students cannot maliciously edit or view other students' claims (IDOR prevention).
7. As a Treasurer, I want to continue using the `Approvals.js` raw Google Sheet cockpit to approve claims, so my existing workflow is uninterrupted.
8. As a Developer, I want to rebuild the entire test pipeline into a modern local Jest environment, abandoning the legacy `Tests.js` Apps Script-based runner.

## Implementation Decisions

- **Architecture**: Google Apps Script Web App (`HtmlService`). No external hosting (Vercel/Next.js) is used.
- **Frontend**: A React SPA built with Vite (in `src/frontend`). It will be configured to compile all assets into a single inline `index.html` and served by a modified `doGet` function.
- **Backend Data Layer**: The existing `Engine.js`, `CoreDecisions.js`, and `Approvals.js` remain the absolute source of truth for all data mutation and state transitions.
- **API Seam**: A new `Api.js` file will expose wrapper functions (e.g., `api_submitClaim`, `api_editClaim`) to `google.script.run`. These wrappers MUST enforce IDOR security checks (verifying the session email) before safely passing the action to `Engine.transition()`.
- **Deprecation**: `FormSetup.js` and `IntakeForms.js` will be completely deleted once their core business logic is relocated.

## Testing Decisions

A good test only tests external behavior, not implementation details. We are completely rebuilding the test pipeline.

- **Frontend Seam**: React Components will be tested locally using Jest and React Testing Library. We will aggressively mock the `google.script.run` object to ensure UI states (loading, errors, success) behave correctly without backend dependencies.
- **Backend Seam**: We will retire the legacy `Tests.js` framework. Instead, we will test the `.js` backend files locally using Jest in a Node environment. We will mock the Google Apps Script global services (`SpreadsheetApp`, `Session`, `DriveApp`) to ensure our `Api.js` IDOR checks and `Engine.js` state transitions are rigorous without hitting live Google APIs.

## Out of Scope

- Modifying the core `Engine.js` transition rules (we are strictly keeping the existing state machine).
- Building a custom Admin UI for the Treasurer (they will continue to use the raw spreadsheet `Approvals.js` flow).

## Further Notes
- Triage Label: `ready-for-agent`
