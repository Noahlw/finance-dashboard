# Add Missing Edge Case Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two critical edge case tests (Duplicate Receipt Detection and Over-Budget Claim Rejection) to the micro-test framework.

**Architecture:** Append two new isolated test functions to `Tests.js`. Each uses the fast `TEST-` prefix pattern so they can be cleaned up automatically by `TestFramework_teardown`.

**Tech Stack:** Google Apps Script

## Global Constraints

- NEVER run any `git` commands (e.g. `git add`, `git commit`, etc.) without asking the user first.

---

### Task 1: Duplicate Receipt Detection Test

**Files:**
- Modify: `Tests.js`

**Interfaces:**
- Produces: `test_IntakeForms_DuplicateReceiptDetection()`

- [ ] **Step 1: Write the Duplicate Receipt test**

Add the following function to `Tests.js`:

```javascript
function test_IntakeForms_DuplicateReceiptDetection() {
  var userA = 'TEST-USER-A';
  var userB = 'TEST-USER-B';
  var now = Audit._nowIso();
  
  getSheet_(TABS.USERS).appendRow([userA, 'User A', ROLES.MEMBER, 'a@example.com', true, now]);
  getSheet_(TABS.USERS).appendRow([userB, 'User B', ROLES.MEMBER, 'b@example.com', true, now]);

  var fakeHash = 'testhash-duplicate-123';
  var firstReceiptId = 'TEST-RECEIPT-ORIGINAL';
  getSheet_(TABS.RECEIPTS).appendRow([
    firstReceiptId, 'fake-drive-id', fakeHash, userA, now, 'Test Vendor', '2026-07-01', 100, ''
  ]);
  
  // Mock a File object that returns the same hash bytes
  var mockBytes = [];
  // IntakeForms_sha256Hex converts bytes to hex. We don't actually need to match the mockBytes to the hex 
  // because IntakeForms_storeReceipt computes the hash from the blob. Let's just create a mock file,
  // let it compute A hash, and then we'll intercept or we'll just test the IntakeForms_storeReceipt logic.
  // Actually, to test exactly the same hash, we can stub IntakeForms_sha256Hex briefly or just let it hash a string.
  var mockFile = {
    getName: function() { return 'test.jpg'; },
    getId: function() { return 'test-id'; },
    getBlob: function() {
      return {
        getBytes: function() {
          return Utilities.base64Decode('dGVzdA=='); // "test"
        }
      };
    },
    moveTo: function() {},
    setName: function() {}
  };
  
  // We need to inject the exact hash of "test" into the receipt sheet to trigger a collision.
  var actualHash = IntakeForms_sha256Hex(Utilities.base64Decode('dGVzdA=='));
  var actualReceiptId = 'TEST-RECEIPT-ACTUAL';
  getSheet_(TABS.RECEIPTS).appendRow([
    actualReceiptId, 'fake-drive-id', actualHash, userA, now, 'Test Vendor', '2026-07-01', 100, ''
  ]);

  var answers = {
    'Receipt vendor': 'Test Vendor',
    'Receipt date': '2026-07-01',
    'Receipt total (HKD)': '100'
  };
  
  // 1. Same user uploads the exact same file -> returns existing ID (idempotency)
  var resultA = IntakeForms_storeReceipt(mockFile, userA, answers);
  TestFramework_assert(resultA.receiptId === actualReceiptId, 'Same user uploading same file should return existing receipt ID');

  // 2. Different user uploads the exact same file -> throws duplicate error
  var caught = false;
  try {
    IntakeForms_storeReceipt(mockFile, userB, answers);
  } catch (err) {
    caught = true;
    TestFramework_assert(err.message.indexOf('Duplicate receipt detected') !== -1, 'Should throw duplicate receipt error');
  }
  TestFramework_assert(caught, 'Expected error when User B uploads User A\'s exact receipt');
}
```

- [ ] **Step 2: Commit**

```bash
# Remember: wait for user approval
```

### Task 2: Over-Budget Claim Rejection Test

**Files:**
- Modify: `Tests.js`

**Interfaces:**
- Produces: `test_Engine_OverBudgetClaim()`

- [ ] **Step 1: Write the Over-Budget Claim test**

Add the following function to `Tests.js`:

```javascript
function test_Engine_OverBudgetClaim() {
  var memberId = 'TEST-USER-MEMBER';
  var treasurerId = 'TEST-USER-TREASURER';
  var now = Audit._nowIso();
  
  getSheet_(TABS.USERS).appendRow([memberId, 'Test Member', ROLES.MEMBER, 'member@example.com', true, now]);
  getSheet_(TABS.USERS).appendRow([treasurerId, 'Test Treasurer', ROLES.TREASURER, 'treasurer@example.com', true, now]);

  var reqId = 'TEST-REQ-OVERBUDGET';
  getSheet_(TABS.BUDGET_REQUESTS).appendRow([
    reqId, memberId, '', 'Test request', 'Just', '2026-08-01',
    STATUS.BudgetRequest.APPROVED, now, now, treasurerId, '', false, 'TEST-RES-4'
  ]);
  
  var lineId = 'TEST-BUDGETLINE-1';
  // Columns: line_id, req_id, cat, desc, est_amount, actual, status, claim_queued, remaining
  // Est=100, Remaining=100
  getSheet_(TABS.BUDGET_REQUEST_LINES).appendRow([
    lineId, reqId, 'CAT-ACT', 'Test', 100, 0, STATUS.BudgetRequestLine.APPROVED, 0, 100
  ]);

  var claimId = 'TEST-CLAIM-OVERBUDGET';
  getSheet_(TABS.EXPENSE_CLAIMS).appendRow([
    claimId, memberId, STATUS.ExpenseClaim.SUBMITTED, now, '', '', '', '',
    '', '', 0, false, false, 'Test claim over', 'TEST-RES-5'
  ]);
  
  var receiptId = 'TEST-RECEIPT-OVER';
  getSheet_(TABS.RECEIPTS).appendRow([
    receiptId, '', 'testhash-over', memberId, now, 'Vendor', '2026-07-01', 150, ''
  ]);

  var cliId = 'TEST-CLAIMLINE-OVER';
  // ClaimLine amounts to 150 against a remaining budget of 100
  getSheet_(TABS.CLAIM_LINE_ITEMS).appendRow([
    cliId, claimId, lineId, receiptId, 150, 'Line', false
  ]);
  
  // Transition should fail due to exceeding the budget line
  var verifyResult = Engine.transition('ExpenseClaim', claimId, 'VERIFY', treasurerId, {});
  TestFramework_assert(verifyResult.ok === false, 'Transition to VERIFY should fail if claim exceeds remaining budget');
  TestFramework_assert(verifyResult.reason.indexOf('over-claimed') !== -1, 'Reason should mention over-claimed budget line');
}
```

- [ ] **Step 2: Commit**

```bash
# Remember: wait for user approval
```
