# Micro Test Framework Design Spec

## 1. Goal
Rewrite the existing monolithic testing architecture for the CF Budget system into a fast, isolated micro-framework to prevent Google Apps Script 60-second timeouts and ensure comprehensive, edge-case coverage of all features (including single-line intake, over-budget top-ups, and deduplication).

## 2. Architecture
The system consists of two main components:
1. **Local Orchestrator (`tests/runner.js`)**: A Node.js script that parses `Tests.js` to dynamically discover all functions starting with `test_`, executes them sequentially via HTTP calls to the Apps Script Web App, and reports success/failure in the terminal.
2. **Apps Script Backend (`TestFramework.js` & `Tests.js`)**: The Google Apps Script environment containing the test logic, assertion utilities, and rapid teardown mechanisms.

## 3. Test Isolation & Teardown
Instead of a destructive `setupAll()` wipe that takes >60 seconds, tests will be fully isolated using a fast teardown approach:
- **Prefixing**: All test data (users, requests, claims) will be injected using a dedicated `TEST-` prefix on their IDs.
- **Teardown**: A new `Tests_teardown()` function will rapidly scan all ledger tabs and delete any rows where the first column starts with `TEST-`. This operation completes in < 1 second.
- **Execution Flow**: The `doGet()` Web App router will wrap every test execution in a `try/finally` block that automatically runs `Tests_teardown()` to ensure the ledger is pristine even if an assertion fails midway.

## 4. Comprehensive Test Coverage
`Tests.js` will be broken down from 3 massive blocks into highly specific, granular unit/integration tests:

### Setup & Baseline
- `test_Setup_WipeAndReseed`: Verifies `setupAll()` idempotency/clean rebuilding.

### IntakeForms & User Input
- `test_IntakeForms_SingleLineRequest`: Submits a mocked Google Form payload for a single-line budget request.
- `test_IntakeForms_SingleLineClaim`: Submits a mocked Google Form payload for a single-line expense claim.
- `test_IntakeForms_DuplicateReceiptDetection`: Submits the exact same receipt SHA twice from different users and verifies rejection.
- `test_IntakeForms_DuplicateReceiptSameUser`: Submits the exact same receipt SHA twice from the same user and verifies idempotency (returns same receipt ID).

### Financial Engine Rules
- `test_Engine_OverBudgetClaim`: Submits a claim that exceeds the remaining budget line amount and verifies rejection.
- `test_Engine_WithdrawnApproval`: Attempts to approve a WITHDRAWN request and verifies rejection.
- `test_Engine_MemberVerify`: Attempts to have a standard MEMBER verify a claim and verifies role rejection.
- `test_Engine_CommitteePayout`: Attempts to have a COMMITTEE member approve a payout and verifies role rejection.

### Security & Integrity
- `test_Security_LockedHashIntegrity`: Verifies that tampering with a LOCKED claim is detected by the hash recalculation.
- `test_Security_LockedMutation`: Attempts to transition a LOCKED claim and verifies rejection.

## 5. Development Workflow
1. Run `node tests/runner.js` locally.
2. The orchestrator pushes code, deploys, and iterates through every test.
3. Tests run in complete isolation.
4. Output is generated in the console indicating Passes, Fails, and specific assertion line numbers.
