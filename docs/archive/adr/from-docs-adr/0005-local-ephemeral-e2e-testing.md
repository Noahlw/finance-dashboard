# 5. Local Ephemeral E2E Testing

Date: 2026-07-16

## Status

Accepted

## Context

We need an End-to-End (E2E) testing pipeline to verify our React SPA integrates correctly with the Google Apps Script backend and Google Sheets database. 

Two massive constraints exist:
1. **Authentication:** The Web App executes as `USER_ACCESSING` to securely capture the user's email via `Session.getActiveUser()`. This means E2E tools (like Playwright) will hit a Google Sign-In wall. Automating Google login programmatically is highly brittle due to Captchas and 2FA. While Google session cookies can be extracted and injected into the test context, they expire rapidly, making CI-based testing (e.g. GitHub Actions) an enormous maintenance burden.
2. **Data Integrity:** Running E2E tests against the production CF-Ledger spreadsheet risks corrupting real financial data. Even running tests against a single persistent "Staging" spreadsheet causes test collisions when developers run tests in parallel.

## Decision

We will build a **Local, Ephemeral E2E Testing Pipeline** using Playwright.

1. **Local Execution Only:** Tests will only execute locally on the developer's machine, relying on a locally-generated `.auth.json` file (Playwright `storageState`) containing a valid Google session cookie. We will *not* attempt to run these in CI/CD.
2. **Ephemeral Environments:** The E2E setup script will use the Google Drive API to clone a template spreadsheet, deploy a brand new Apps Script Web App tied to that specific spreadsheet instance, run the Playwright tests, and then tear the entire environment down.

## Consequences

- **Positive:** We guarantee zero test collisions and zero risk of polluting production data.
- **Positive:** We avoid the immense friction of maintaining expiring Google Auth cookies in GitHub Secrets.
- **Negative:** PRs will not have automated E2E test enforcement in GitHub Actions. Developers must be disciplined enough to run the E2E suite locally before merging.
- **Negative:** Setup and teardown of Google Apps Script projects takes ~20 seconds, slowing down the local test cycle.
