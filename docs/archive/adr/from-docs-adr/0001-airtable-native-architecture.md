# 1. 100% Airtable Native Architecture

Date: 2026-07-16

## Status
Accepted

## Context
We are migrating the budget tracking system from a Google Apps Script (GAS) + Google Sheets backend to Airtable to establish a fresh codebase and a more robust relational data model. The system requires complex business logic (e.g., budget limits, receipt splitting fraud prevention) and role-based access control.

We considered three architectures:
1. **GAS + Airtable REST API:** Keep the current codebase and swap the database.
2. **Dedicated Node.js/Next.js Backend:** Build a custom frontend and API server, using Airtable exclusively as a headless database via `airtable.js`.
3. **100% Airtable Native:** Use Airtable Interfaces for the frontend and Airtable Automations + Scripting for the backend logic.

## Decision
We decided to adopt a **100% Airtable Native** architecture (Option 3). 
Additionally, we decided to maintain a **Local Repo as the Source of Truth** for all Airtable Scripts (managing version control via Git) and manually deploying scripts into Airtable.

## Consequences
### Positive
*   **Zero Infrastructure:** No need to host, deploy, or maintain external servers (like Vercel or AWS).
*   **Unified Ecosystem:** The frontend (Interfaces), database (Tables), and backend (Automations) are tightly coupled and managed in one product.
*   **Version History:** By keeping the scripts in the local repo, we retain Git history, linting, and local testability for pure functions.

### Negative
*   **Scripting Constraints:** We are constrained by the execution limits and ES6 capabilities of Airtable's scripting environment (e.g., no Node.js packages).
*   **Manual Deployment:** Scripts must be manually copied from the local repository and pasted into Airtable Automations to be deployed.
