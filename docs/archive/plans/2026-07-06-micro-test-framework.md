# Micro Test Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the monolithic testing architecture into a fast, isolated micro-framework that runs granular tests sequentially from the local runner, bypassing the Google Apps Script 60-second HTTP timeout.

**Architecture:** A local Node.js runner that statically analyzes `Tests.js` to find all `test_*` functions, then hits the `doGet` endpoint for each one sequentially. The Apps Script backend executes the test and wraps it in a fast `try/finally` block that scans and deletes all rows starting with `TEST-` across the ledger.

**Tech Stack:** Node.js, Google Apps Script, Google Sheets API.

## Global Constraints

- NEVER run any `git` commands (e.g. `git add`, `git commit`, etc.) without asking the user first.
- Teardown MUST execute in under 2 seconds (using prefix matching, not full sheet clears).

---

### Task 1: Create TestFramework.js (Teardown & Assertions)

**Files:**
- Create: `TestFramework.js`
- Modify: `Tests.js` (Remove old `Tests_assert`)

**Interfaces:**
- Produces: `TestFramework_teardown()`, `TestFramework_assert(condition, message)`

- [ ] **Step 1: Write TestFramework.js**

```javascript
/**
 * TestFramework.js
 */

function TestFramework_assert(condition, message) {
  if (!condition) throw new Error('Assertion failed: ' + message);
}

function TestFramework_teardown() {
  var ledger = getLedger_();
  var tabsToClear = [
    TABS.USERS, TABS.CATEGORIES, TABS.EVENTS, TABS.BUDGET_REQUESTS,
    TABS.BUDGET_REQUEST_LINES, TABS.EXPENSE_CLAIMS, TABS.CLAIM_LINE_ITEMS,
    TABS.RECEIPTS, TABS.INCOME, TABS.PAYOUTS, TABS.AUDIT_LOG,
    TABS.APPROVALS
  ];
  
  for (var i = 0; i < tabsToClear.length; i++) {
    var sheet = ledger.getSheetByName(tabsToClear[i]);
    if (!sheet) continue;
    var data = sheet.getDataRange().getValues();
    // Scan backwards so row deletion doesn't mess up indexes
    for (var r = data.length - 1; r >= 1; r--) {
      var id = String(data[r][0] || '');
      if (id.indexOf('TEST-') === 0) {
        sheet.deleteRow(r + 1);
      }
    }
  }
}
```

- [ ] **Step 2: Remove old Tests_assert from Tests.js**

In `Tests.js`, delete the `Tests_assert` function block (around line 28-35).

- [ ] **Step 3: Commit**

```bash
# Remember: wait for user approval before git operations
```

### Task 2: Refactor `doGet` Router

**Files:**
- Modify: `Tests.js`

**Interfaces:**
- Consumes: `TestFramework_teardown()`

- [ ] **Step 1: Update doGet in Tests.js**

Replace the current `doGet(e)` with:

```javascript
function doGet(e) {
  var testName = e.parameter.run;
  if (!testName) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'No test specified' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var result = { success: false, message: '' };
  try {
    if (typeof this[testName] !== 'function') {
      throw new Error('Test function not found: ' + testName);
    }
    
    // Run the test
    var out = this[testName]();
    result.success = true;
    result.message = 'PASS: ' + testName;
    if (out) result.data = out;
  } catch (err) {
    result.success = false;
    result.message = 'FAIL: ' + err.message;
    result.stack = err.stack;
  } finally {
    // Fast teardown ensures the spreadsheet is clean for the next test
    try {
      TestFramework_teardown();
    } catch (teardownErr) {
      result.teardownError = teardownErr.message;
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
```

- [ ] **Step 2: Commit**

```bash
# Wait for user approval
```

### Task 3: Refactor Local Orchestrator (`tests/runner.js`)

**Files:**
- Modify: `tests/runner.js`

**Interfaces:**
- Consumes: Google Apps Script Web App `doGet`

- [ ] **Step 1: Rewrite runner.js**

Replace `tests/runner.js` with:

```javascript
const { execSync } = require('child_process');
const fs = require('fs');

console.log('Pushing code...');
execSync('npx clasp push', { stdio: 'inherit' });

console.log('Deploying Web App...');
const deployOutput = execSync('npx clasp deploy').toString();
console.log(deployOutput);

const match = deployOutput.match(/Deployed\s+([A-Za-z0-9_-]+)\s+@/);
if (!match) {
  console.error("Failed to parse deployment ID.");
  process.exit(1);
}
const deploymentId = match[1];
const baseUrl = `https://script.google.com/macros/s/${deploymentId}/exec`;

// Parse tests from Tests.js
const testsJs = fs.readFileSync('Tests.js', 'utf8');
const testMatches = [...testsJs.matchAll(/function\s+(test_[A-Za-z0-9_]+)\s*\(/g)];
const testNames = testMatches.map(m => m[1]);

console.log(`Found ${testNames.length} tests. Running sequentially...\n`);

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const testName of testNames) {
    process.stdout.write(`Running ${testName}... `);
    try {
      const url = `${baseUrl}?run=${testName}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        console.log('✅ PASS');
        passed++;
      } else {
        console.log(`❌ FAIL\n   ${data.message}`);
        if (data.stack) console.log(`   ${data.stack.split('\n')[1]}`); // Print top of stack
        failed++;
        break; // Stop on first failure
      }
    } catch (e) {
      console.log(`❌ CRASH: ${e.message}`);
      failed++;
      break;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
```

- [ ] **Step 2: Verify Runner script locally**
Run `node tests/runner.js`. It should parse tests from `Tests.js` and hit them sequentially. Note: it might fail immediately if old tests are broken, which is fine.

- [ ] **Step 3: Commit**

```bash
# Wait for user approval
```

### Task 4: Setup & Baseline Tests

**Files:**
- Modify: `Tests.js`

**Interfaces:**
- Produces: `test_Setup_WipeAndReseed()`

- [ ] **Step 1: Rewrite test_Setup_WipeAndReseed in Tests.js**

Delete the massive `test_phase1`, `test_phase2`, `test_phase3` blocks entirely, and replace them with focused functions. 
Start with:

```javascript
function test_Setup_WipeAndReseed() {
  var first = setupAll();
  var second = setupAll();
  TestFramework_assert(second.categoriesSeeded.created === true, 'second setupAll() should report categoriesSeeded.created=true after wipe');
  TestFramework_assert(second.treasurerSeeded.created === true, 'second setupAll() should report treasurerSeeded.created=true after wipe');
  TestFramework_assert(second.incomeSeeded.created === true, 'second setupAll() should report incomeSeeded.created=true after wipe');
}
```

- [ ] **Step 2: Commit**

```bash
# Wait for user approval
```

### Task 5: IntakeForms & User Input Tests

**Files:**
- Modify: `Tests.js`

**Interfaces:**
- Produces: `test_IntakeForms_SingleLineRequest()`, `test_IntakeForms_SingleLineClaim()`

- [ ] **Step 1: Write IntakeForms unit tests in Tests.js**

```javascript
function test_IntakeForms_SingleLineRequest() {
  var memberId = 'TEST-USER-1';
  var now = Audit._nowIso();
  getSheet_(TABS.USERS).appendRow([memberId, 'Test Member', ROLES.MEMBER, 'test@example.com', true, now]);

  var e = {
    namedValues: {
      'Email address': ['test@example.com'],
      'Title': ['TEST-REQ'],
      'Justification': ['For testing'],
      'Needed by': ['2026-08-01'],
      'Line 1 — Category': ['CAT-ACT'],
      'Line 1 — Description': ['Line Item 1'],
      'Line 1 — Amount (HKD)': ['150']
    }
  };
  
  onFormSubmitRequest(e);
  
  // Verify request row
  var reqSheet = getSheet_(TABS.BUDGET_REQUESTS);
  var lastReqRow = reqSheet.getRange(reqSheet.getLastRow(), 1, 1, reqSheet.getLastColumn()).getValues()[0];
  var reqId = lastReqRow[COLS.BudgetRequests.request_id - 1];
  TestFramework_assert(reqId.indexOf('BUDGET') === 0, 'Should create BudgetRequest');
  
  // Clean up the non-TEST prefixed ID so teardown can handle it, or rename it
  reqSheet.getRange(reqSheet.getLastRow(), 1).setValue('TEST-' + reqId);
}

function test_IntakeForms_SingleLineClaim() {
  var memberId = 'TEST-USER-2';
  var now = Audit._nowIso();
  getSheet_(TABS.USERS).appendRow([memberId, 'Test Member', ROLES.MEMBER, 'test2@example.com', true, now]);

  var e = {
    namedValues: {
      'Email address': ['test2@example.com'],
      'What is this claim for? (short description)': ['TEST-CLAIM'],
      'Receipt vendor': ['Test Store'],
      'Receipt date': ['2026-07-01'],
      'Receipt total (HKD)': ['100'],
      'Line 1 — Budget line': ['BUDGETLINE-FAKE'],
      'Line 1 — Amount (HKD)': ['100']
    }
  };
  
  // Since we aren't uploading a real file, onFormSubmitClaim will throw because no receipt link is provided.
  // We expect an error about missing receipt file.
  var caught = false;
  try {
    onFormSubmitClaim(e);
  } catch (err) {
    caught = true;
    TestFramework_assert(err.message.indexOf('Receipt photo') !== -1, 'Should require receipt upload');
  }
  TestFramework_assert(caught, 'Expected claim submission to fail without receipt');
}
```

- [ ] **Step 2: Commit**

```bash
# Wait for user approval
```

### Task 6: Engine Rules & Role Rejection Tests

**Files:**
- Modify: `Tests.js`

**Interfaces:**
- Produces: `test_Engine_MemberVerify()`, `test_Engine_WithdrawnApproval()`

- [ ] **Step 1: Write Engine transition tests in Tests.js**

```javascript
function test_Engine_MemberVerify() {
  var memberId = 'TEST-USER-MEMBER';
  var now = Audit._nowIso();
  getSheet_(TABS.USERS).appendRow([memberId, 'Test Member', ROLES.MEMBER, 'test-member@example.com', true, now]);

  var claimId = 'TEST-CLAIM-1';
  getSheet_(TABS.EXPENSE_CLAIMS).appendRow([
    claimId, memberId, STATUS.ExpenseClaim.SUBMITTED, now, '', '', '', '',
    '', '', 100, false, false, 'Test claim', 'TEST-RES-1'
  ]);
  
  var illegalTransition = Engine.transition('ExpenseClaim', claimId, 'VERIFY', memberId, {});
  TestFramework_assert(illegalTransition.ok === false, 'MEMBER should not be able to VERIFY a claim');
}

function test_Engine_WithdrawnApproval() {
  var treasurerId = 'TEST-USER-TREASURER';
  var now = Audit._nowIso();
  getSheet_(TABS.USERS).appendRow([treasurerId, 'Test Treasurer', ROLES.TREASURER, 'test-treasurer@example.com', true, now]);

  var reqId = 'TEST-REQ-WITHDRAWN';
  getSheet_(TABS.BUDGET_REQUESTS).appendRow([
    reqId, treasurerId, '', 'Test request', 'Just', '2026-08-01',
    STATUS.BudgetRequest.WITHDRAWN, now, '', '', '', false, 'TEST-RES-2'
  ]);
  
  var illegalTransition = Engine.transition('BudgetRequest', reqId, 'APPROVE', treasurerId, {});
  TestFramework_assert(illegalTransition.ok === false, 'Approving a WITHDRAWN request must fail');
}
```

- [ ] **Step 2: Commit**

```bash
# Wait for user approval
```

### Task 7: Security Tests

**Files:**
- Modify: `Tests.js`

**Interfaces:**
- Produces: `test_Security_LockedHashIntegrity()`

- [ ] **Step 1: Write Security Tests in Tests.js**

```javascript
function test_Security_LockedHashIntegrity() {
  var claimId = 'TEST-CLAIM-LOCK';
  var treasurerId = 'TEST-USER-TREASURER';
  var now = Audit._nowIso();

  getSheet_(TABS.EXPENSE_CLAIMS).appendRow([
    claimId, treasurerId, STATUS.ExpenseClaim.PAID, now, now, now, now, '',
    treasurerId, treasurerId, 100, false, false, 'Test claim', 'TEST-RES-3'
  ]);

  var lockResult = Engine.transition('ExpenseClaim', claimId, 'LOCK', 'SYSTEM', {});
  TestFramework_assert(lockResult.ok === true, 'LOCK failed: ' + lockResult.reason);
  
  var claimRow = Engine._loadRow('ExpenseClaim', claimId);
  var notesCol = COLS.ExpenseClaims.notes;
  var originalNotes = claimRow.values[notesCol - 1];
  
  // Tamper
  claimRow.sheet.getRange(claimRow.rowIndex, notesCol).setValue('TAMPERED');
  
  var lockedHash = null;
  var auditValues = getSheet_(TABS.AUDIT_LOG).getDataRange().getValues();
  for (var i = 1; i < auditValues.length; i++) {
    if (auditValues[i][COLS.AuditLog.entity_id - 1] === claimId && auditValues[i][COLS.AuditLog.action - 1] === 'TRANSITION') {
      var detail = JSON.parse(auditValues[i][COLS.AuditLog.detail - 1]);
      if (detail.action === 'LOCK' && detail.lockedHash) lockedHash = detail.lockedHash;
    }
  }
  
  TestFramework_assert(Engine.computeCurrentLockedHash(claimId) !== lockedHash, 'Tampering a locked row should change its recomputed hash');
}
```

- [ ] **Step 2: Commit**

```bash
# Wait for user approval
```
