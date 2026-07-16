/**
 * Tests.gs — Phase 1 acceptance test, run manually from the script
 * editor after `clasp push` (BUILD-PLAN.md checkpoint CP-D). Exercises
 * Setup idempotency and one full request→approve→claim→verify→payout
 * walkthrough via direct Engine/Payouts calls — no Forms (the Forms
 * path is human-tested at checkpoint CP-E).
 */

/**
 * Run the full Phase 1 acceptance test. Logs PHASE1 PASS and returns
 * the created fixture IDs, or throws with the first failing assertion.
 * @return {string}
 */
function test_phase1() {
  try {
    Tests_testSetupIdempotency();
    var ids = Tests_testFullWalkthrough();
    var chain = Audit.verifyChain();
    Tests_assert(chain.ok === true, 'Audit.verifyChain() failed at seq ' + chain.badSeq);
    Logger.log('PHASE1 PASS — ' + JSON.stringify(ids));
    return 'PHASE1 PASS';
  } catch (e) {
    Logger.log('PHASE1 FAIL: ' + e.message + '\n' + e.stack);
    throw e;
  }
}

/**
 * @param {boolean} condition
 * @param {string} message
 * @private
 */
function Tests_assert(condition, message) {
  if (!condition) throw new Error('Assertion failed: ' + message);
}

/**
 * Double-run setupAll() and confirm the second run creates nothing new.
 * @private
 */
function Tests_testSetupIdempotency() {
  setupAll();
  var ledger = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('LEDGER_ID'));
  var tabCountBefore = ledger.getSheets().length;
  var configRowsBefore = getSheet_(TABS.CONFIG).getLastRow();
  var categoriesRowsBefore = getSheet_(TABS.CATEGORIES).getLastRow();
  var usersRowsBefore = getSheet_(TABS.USERS).getLastRow();

  var second = setupAll();

  Tests_assert(ledger.getSheets().length === tabCountBefore, 'setupAll() created duplicate tabs on re-run');
  Tests_assert(getSheet_(TABS.CONFIG).getLastRow() === configRowsBefore, 'setupAll() duplicated Config rows on re-run');
  Tests_assert(getSheet_(TABS.CATEGORIES).getLastRow() === categoriesRowsBefore, 'setupAll() duplicated Category rows on re-run');
  Tests_assert(getSheet_(TABS.USERS).getLastRow() === usersRowsBefore, 'setupAll() duplicated the Treasurer User row on re-run');
  Tests_assert(second.categoriesSeeded.created === false, 'second setupAll() should report categoriesSeeded.created=false');
  Tests_assert(second.treasurerSeeded.created === false, 'second setupAll() should report treasurerSeeded.created=false');
  Tests_assert(second.incomeSeeded.created === false, 'second setupAll() should report incomeSeeded.created=false');
  Tests_assert(second.configConsistency.ok === true, 'Config.TREASURER_USER_ID should resolve after setupAll(): ' + second.configConsistency.issue);
  Tests_assert(Config.get('TREASURER_USER_ID') === second.treasurerSeeded.userId,
    'Config.TREASURER_USER_ID should match the actual seeded treasurer user_id');
}

/**
 * Create a test committee member, a budget request, approve it, file a
 * claim against it, verify, approve for payout, mark sent, confirm —
 * asserting every status lands where expected.
 * @return {Object} the entity IDs created, for the report
 * @private
 */
function Tests_testFullWalkthrough() {
  var treasurerId = Config.get('TREASURER_USER_ID');
  var beforeCounters = Tests_readCounters();
  var now = Audit._nowIso();

  var memberId = Ids.nextId('User');
  getSheet_(TABS.USERS).appendRow([memberId, 'Test Member', ROLES.COMMITTEE, 'test-member@example.com', true, now]);
  Audit.append('SYSTEM', 'User', memberId, 'CREATE', { role: ROLES.COMMITTEE, note: 'test_phase1 fixture' });

  // --- Budget request: created directly (bypassing Forms), then approved ---
  var requestId = Ids.nextId('BudgetRequest');
  getSheet_(TABS.BUDGET_REQUESTS).appendRow([
    requestId, memberId, '', 'Test event supplies', 'Needed for the test walkthrough', '2026-08-01',
    STATUS.BudgetRequest.PENDING, now, '', '', '', false, 'TEST-' + requestId
  ]);
  var lineId = Ids.childId(requestId, 1, 'BUDGETLINE');
  getSheet_(TABS.BUDGET_REQUEST_LINES).appendRow([lineId, requestId, 'CAT-ACT', 'Test supplies', 100, 0, STATUS.BudgetRequestLine.PENDING, 0, 0]);
  Audit.append(memberId, 'BudgetRequest', requestId, 'CREATE', { note: 'test_phase1 fixture' });

  var approveResult = Engine.transition('BudgetRequest', requestId, 'APPROVE', treasurerId, {});
  Tests_assert(approveResult.ok === true, 'BudgetRequest APPROVE failed: ' + approveResult.reason);
  Tests_assert(approveResult.to === STATUS.BudgetRequest.APPROVED, 'BudgetRequest did not reach APPROVED, got ' + approveResult.to);

  var lineCheckOk = Engine.validateClaimLineAmount(lineId, 100);
  Tests_assert(lineCheckOk.ok === true, 'Approved line should accept a claim up to its full remaining amount');
  var lineCheckOver = Engine.validateClaimLineAmount(lineId, 999);
  Tests_assert(lineCheckOver.ok === false, 'A claim amount exceeding remaining must be rejected (BUILD-PLAN §4.1 case 5)');

  // --- Expense claim: created directly, then verified + approved for payout ---
  var claimId = Ids.nextId('ExpenseClaim');
  getSheet_(TABS.EXPENSE_CLAIMS).appendRow([
    claimId, memberId, STATUS.ExpenseClaim.SUBMITTED, now, '', '', '', '',
    '', '', 0, false, false, 'Test claim', 'TEST-' + claimId
  ]);
  var receiptId = Ids.nextId('Receipt');
  getSheet_(TABS.RECEIPTS).appendRow([receiptId, '', 'testhash0000', memberId, now, 'Test Vendor', '2026-07-01', 100, '']);
  var cliId = Ids.childId(claimId, 1, 'CLAIMLINE');
  getSheet_(TABS.CLAIM_LINE_ITEMS).appendRow([cliId, claimId, lineId, receiptId, 100, 'Test claim line', false]);
  Audit.append(memberId, 'ExpenseClaim', claimId, 'CREATE', { note: 'test_phase1 fixture' });

  var verifyResult = Engine.transition('ExpenseClaim', claimId, 'VERIFY', treasurerId, {});
  Tests_assert(verifyResult.ok === true, 'ExpenseClaim VERIFY failed: ' + verifyResult.reason);
  Tests_assert(verifyResult.to === STATUS.ExpenseClaim.VERIFIED, 'ExpenseClaim did not reach VERIFIED, got ' + verifyResult.to);

  var payoutApproveResult = Engine.transition('ExpenseClaim', claimId, 'APPROVE_PAYOUT', treasurerId, {});
  Tests_assert(payoutApproveResult.ok === true, 'ExpenseClaim APPROVE_PAYOUT failed: ' + payoutApproveResult.reason);
  Tests_assert(payoutApproveResult.to === STATUS.ExpenseClaim.APPROVED_FOR_PAYOUT, 'ExpenseClaim did not reach APPROVED_FOR_PAYOUT');

  var payoutRows = Engine._findRowsByColumn(getSheet_(TABS.PAYOUTS), COLS.Payouts.claim_id, claimId);
  Tests_assert(payoutRows.length === 1, 'Expected exactly one auto-created Payout row, got ' + payoutRows.length);
  var payoutId = payoutRows[0].values[COLS.Payouts.payout_id - 1];

  var sentResult = Payouts.markPayoutSent(payoutId, 'FPS', 'TEST-REF-001', treasurerId);
  Tests_assert(sentResult.ok === true, 'markPayoutSent failed: ' + sentResult.reason);

  var confirmResult = Payouts.confirmPayout(payoutId);
  Tests_assert(confirmResult.ok === true, 'confirmPayout failed: ' + confirmResult.reason);

  var finalClaim = Engine._loadRow('ExpenseClaim', claimId);
  Tests_assert(finalClaim.values[COLS.ExpenseClaims.status - 1] === STATUS.ExpenseClaim.PAID,
    'Claim did not reach PAID after its only payout was confirmed');

  var afterCounters = Tests_readCounters();
  ['User', 'BudgetRequest', 'ExpenseClaim', 'Payout', 'Receipt'].forEach(function (entity) {
    var before = beforeCounters[entity] || 0;
    var after = afterCounters[entity] || 0;
    Tests_assert(after > before, entity + ' counter did not increment (before=' + before + ', after=' + after + ')');
  });

  return { memberId: memberId, requestId: requestId, lineId: lineId, claimId: claimId, payoutId: payoutId };
}

/**
 * @return {Object<string,number>} entity -> last_n from the Counters tab
 * @private
 */
function Tests_readCounters() {
  var sheet = getSheet_(TABS.COUNTERS);
  var values = sheet.getDataRange().getValues();
  var out = {};
  for (var i = 1; i < values.length; i++) {
    out[values[i][COLS.Counters.entity - 1]] = Number(values[i][COLS.Counters.last_n - 1]) || 0;
  }
  return out;
}

/**
 * Utility to clean up test fixtures and reset the spreadsheet to a blank state
 * (keeping only headers and Config). Run this from the editor if a test fails midway.
 */
function cleanupTestPhase1() {
  var ledger = getLedger_();
  var tabsToClear = [
    TABS.USERS, TABS.CATEGORIES, TABS.EVENTS, TABS.BUDGET_REQUESTS,
    TABS.BUDGET_REQUEST_LINES, TABS.EXPENSE_CLAIMS, TABS.CLAIM_LINE_ITEMS,
    TABS.RECEIPTS, TABS.INCOME, TABS.PAYOUTS, TABS.AUDIT_LOG,
    TABS.APPROVALS, TABS.COUNTERS
  ];
  tabsToClear.forEach(function (tabName) {
    var sheet = ledger.getSheetByName(tabName);
    if (sheet && sheet.getMaxRows() > 1) {
      sheet.getRange(2, 1, sheet.getMaxRows() - 1, sheet.getMaxColumns()).clearContent();
    }
  });
  
  try {
    var vaultSheet = getVaultSheet_();
    if (vaultSheet.getMaxRows() > 1) {
      vaultSheet.getRange(2, 1, vaultSheet.getMaxRows() - 1, vaultSheet.getMaxColumns()).clearContent();
    }
  } catch (e) {
    // ignore if vault not found
  }
  
  SpreadsheetApp.flush(); // Crucial so a subsequent setupAll()/test call in a separate execution doesn't race a stale read.
  Logger.log('Cleanup complete. You can now re-run setupAll() then test_phase1().');
}

/**
 * Run the full Phase 2 acceptance test. Logs PHASE2 PASS and returns
 * the created fixture IDs, or throws with the first failing assertion.
 * @return {string}
 */
function test_phase2() {
  try {
    var ids = Tests_testPhase2Walkthrough();
    var chain = Audit.verifyChain();
    Tests_assert(chain.ok === true, 'Audit.verifyChain() failed at seq ' + chain.badSeq);
    Logger.log('PHASE2 PASS — ' + JSON.stringify(ids));
    return 'PHASE2 PASS';
  } catch (e) {
    Logger.log('PHASE2 FAIL: ' + e.message + '\n' + e.stack);
    throw e;
  }
}

function Tests_testPhase2Walkthrough() {
  var treasurerId = Config.get('TREASURER_USER_ID');
  var now = Audit._nowIso();

  var memberId = Ids.nextId('User');
  getSheet_(TABS.USERS).appendRow([memberId, 'Test Member 2', ROLES.MEMBER, 'test-member2@example.com', true, now]);
  
  var committeeId = Ids.nextId('User');
  getSheet_(TABS.USERS).appendRow([committeeId, 'Test Committee', ROLES.COMMITTEE, 'test-com@example.com', true, now]);

  // 1. Approving a WITHDRAWN request is DENIED.
  var req1Id = Ids.nextId('BudgetRequest');
  getSheet_(TABS.BUDGET_REQUESTS).appendRow([
    req1Id, memberId, '', 'Test request 1', 'Just', '2026-08-01',
    STATUS.BudgetRequest.WITHDRAWN, now, '', '', '', false, 'TEST-' + req1Id
  ]);
  var illegal1 = Engine.transition('BudgetRequest', req1Id, 'APPROVE', treasurerId, {});
  Tests_assert(illegal1.ok === false, 'Illegal transition 1: Approving a WITHDRAWN request must fail');

  // Create a valid request and approve it
  var req2Id = Ids.nextId('BudgetRequest');
  getSheet_(TABS.BUDGET_REQUESTS).appendRow([
    req2Id, memberId, '', 'Test request 2', 'Just', '2026-08-01',
    STATUS.BudgetRequest.PENDING, now, '', '', '', false, 'TEST-' + req2Id
  ]);
  var lineId = Ids.childId(req2Id, 1, 'BUDGETLINE');
  getSheet_(TABS.BUDGET_REQUEST_LINES).appendRow([lineId, req2Id, 'CAT-ACT', 'Test', 100, 0, STATUS.BudgetRequestLine.PENDING, 0, 0]);
  
  Engine.transition('BudgetRequest', req2Id, 'APPROVE', treasurerId, {});

  // 5. Submitting a claim that exceeds remaining budget line amount is handled at Forms intake, 
  // but let's test Engine validateClaimLineAmount
  var lineCheckOver = Engine.validateClaimLineAmount(lineId, 999);
  Tests_assert(lineCheckOver.ok === false, 'Illegal transition 5: Claim amount exceeding remaining must be rejected');

  // Create a valid claim
  var claimId = Ids.nextId('ExpenseClaim');
  getSheet_(TABS.EXPENSE_CLAIMS).appendRow([
    claimId, memberId, STATUS.ExpenseClaim.SUBMITTED, now, '', '', '', '',
    '', '', 0, false, false, 'Test claim', 'TEST-' + claimId
  ]);
  var receiptId = Ids.nextId('Receipt');
  getSheet_(TABS.RECEIPTS).appendRow([receiptId, '', 'testhash123', memberId, now, 'Vendor', '2026-07-01', 50, '']);
  var cliId = Ids.childId(claimId, 1, 'CLAIMLINE');
  getSheet_(TABS.CLAIM_LINE_ITEMS).appendRow([cliId, claimId, lineId, receiptId, 50, 'Line', false]);

  // 2. Verifying a claim by a MEMBER is DENIED
  var illegal2 = Engine.transition('ExpenseClaim', claimId, 'VERIFY', memberId, {});
  Tests_assert(illegal2.ok === false, 'Illegal transition 2: Verifying a claim by a MEMBER must fail');

  // Verify by Committee
  var verifyOk = Engine.transition('ExpenseClaim', claimId, 'VERIFY', committeeId, {});
  Tests_assert(verifyOk.ok === true, 'Committee should be able to verify');

  // 3. Approving a payout by a COMMITTEE member is DENIED
  var illegal3 = Engine.transition('ExpenseClaim', claimId, 'APPROVE_PAYOUT', committeeId, {});
  Tests_assert(illegal3.ok === false, 'Illegal transition 3: Approving payout by COMMITTEE must fail');

  // Approve payout by Treasurer
  Engine.transition('ExpenseClaim', claimId, 'APPROVE_PAYOUT', treasurerId, {});
  
  var payoutRows = Engine._findRowsByColumn(getSheet_(TABS.PAYOUTS), COLS.Payouts.claim_id, claimId);
  var payoutId = payoutRows[0].values[COLS.Payouts.payout_id - 1];
  Payouts.markPayoutSent(payoutId, 'FPS', 'REF-001', treasurerId);
  Payouts.confirmPayout(payoutId);

  // Lock the claim
  var lockRes = Engine.transition('ExpenseClaim', claimId, 'LOCK', 'SYSTEM', {});
  Tests_assert(lockRes.ok === true, 'Should lock claim');

  // 4. Mutating a LOCKED claim is DENIED
  var illegal4 = Engine.transition('ExpenseClaim', claimId, 'REJECT', treasurerId, {decision_note: 'test'});
  Tests_assert(illegal4.ok === false, 'Illegal transition 4: Mutating a LOCKED claim must fail');

  return { req1Id: req1Id, req2Id: req2Id, claimId: claimId };
}

/**
 * Run the full Phase 3 acceptance test. Logs PHASE3 PASS and returns the
 * created fixture IDs, or throws with the first failing assertion.
 * @return {string}
 */
function test_phase3() {
  try {
    var lockIds = Tests_testLockedHashIntegrity();
    Tests_testIntegritySweepClean();
    var onboardIds = Tests_testOnboardingHandler();
    var chain = Audit.verifyChain();
    Tests_assert(chain.ok === true, 'Audit.verifyChain() failed at seq ' + chain.badSeq);
    var ids = { lock: lockIds, onboard: onboardIds };
    Logger.log('PHASE3 PASS — ' + JSON.stringify(ids));
    return 'PHASE3 PASS';
  } catch (e) {
    Logger.log('PHASE3 FAIL: ' + e.message + '\n' + e.stack);
    throw e;
  }
}

/**
 * Drive a fresh claim to PAID, then LOCK it, then assert the stored
 * lockedHash matches computeCurrentLockedHash — and that deliberately
 * tampering the row afterward makes the recomputed hash differ.
 * @return {{claimId: string}}
 * @private
 */
function Tests_testLockedHashIntegrity() {
  var treasurerId = Config.get('TREASURER_USER_ID');
  var now = Audit._nowIso();

  var memberId = Ids.nextId('User');
  getSheet_(TABS.USERS).appendRow([memberId, 'Test Lock Member', ROLES.COMMITTEE, 'test-lock@example.com', true, now]);

  var requestId = Ids.nextId('BudgetRequest');
  getSheet_(TABS.BUDGET_REQUESTS).appendRow([
    requestId, memberId, '', 'Test lock request', 'Just', '2026-08-01',
    STATUS.BudgetRequest.PENDING, now, '', '', '', false, 'TEST-' + requestId
  ]);
  var lineId = Ids.childId(requestId, 1, 'BUDGETLINE');
  getSheet_(TABS.BUDGET_REQUEST_LINES).appendRow([lineId, requestId, 'CAT-ACT', 'Test', 80, 0, STATUS.BudgetRequestLine.PENDING, 0, 0]);
  Engine.transition('BudgetRequest', requestId, 'APPROVE', treasurerId, {});

  var claimId = Ids.nextId('ExpenseClaim');
  getSheet_(TABS.EXPENSE_CLAIMS).appendRow([
    claimId, memberId, STATUS.ExpenseClaim.SUBMITTED, now, '', '', '', '',
    '', '', 0, false, false, 'Test lock claim', 'TEST-' + claimId
  ]);
  var receiptId = Ids.nextId('Receipt');
  getSheet_(TABS.RECEIPTS).appendRow([receiptId, '', 'testhashlock', memberId, now, 'Vendor', '2026-07-01', 80, '']);
  var cliId = Ids.childId(claimId, 1, 'CLAIMLINE');
  getSheet_(TABS.CLAIM_LINE_ITEMS).appendRow([cliId, claimId, lineId, receiptId, 80, 'Test line', false]);

  Engine.transition('ExpenseClaim', claimId, 'VERIFY', treasurerId, {});
  Engine.transition('ExpenseClaim', claimId, 'APPROVE_PAYOUT', treasurerId, {});
  var payoutRows = Engine._findRowsByColumn(getSheet_(TABS.PAYOUTS), COLS.Payouts.claim_id, claimId);
  var payoutId = payoutRows[0].values[COLS.Payouts.payout_id - 1];
  Payouts.markPayoutSent(payoutId, 'FPS', 'TEST-LOCK-REF', treasurerId);
  Payouts.confirmPayout(payoutId);

  var lockResult = Engine.transition('ExpenseClaim', claimId, 'LOCK', 'SYSTEM', {});
  Tests_assert(lockResult.ok === true, 'LOCK failed: ' + lockResult.reason);

  var lockedHash = Tests_findLockedHash_(claimId);
  Tests_assert(!!lockedHash, 'No lockedHash found on the LOCK transition audit row for ' + claimId);
  Tests_assert(Engine.computeCurrentLockedHash(claimId) === lockedHash,
    'computeCurrentLockedHash does not match the hash stored at LOCK time');

  // Deliberately tamper a cell on the (protected) row, from the script's
  // own authority as the protection owner, then assert the mismatch is
  // detected — then revert so later fixtures/sweeps stay consistent.
  var claimRow = Engine._loadRow('ExpenseClaim', claimId);
  var notesCol = COLS.ExpenseClaims.notes;
  var originalNotes = claimRow.values[notesCol - 1];
  claimRow.sheet.getRange(claimRow.rowIndex, notesCol).setValue('TAMPERED');
  Tests_assert(Engine.computeCurrentLockedHash(claimId) !== lockedHash,
    'Tampering a locked row should change its recomputed hash, but did not');
  claimRow.sheet.getRange(claimRow.rowIndex, notesCol).setValue(originalNotes);
  Tests_assert(Engine.computeCurrentLockedHash(claimId) === lockedHash,
    'Reverting the tamper should restore the original hash, but did not');

  return { claimId: claimId };
}

/**
 * @param {string} claimId
 * @return {?string} the lockedHash stored on this claim's LOCK transition
 *   audit row, or null if none is found
 * @private
 */
function Tests_findLockedHash_(claimId) {
  var values = getSheet_(TABS.AUDIT_LOG).getDataRange().getValues();
  var c = COLS.AuditLog;
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.entity_type - 1] !== 'ExpenseClaim' || values[i][c.entity_id - 1] !== claimId) continue;
    if (values[i][c.action - 1] !== 'TRANSITION') continue;
    var detail;
    try { detail = JSON.parse(values[i][c.detail - 1]); } catch (e) { continue; }
    if (detail.action === 'LOCK' && detail.lockedHash) return detail.lockedHash;
  }
  return null;
}

/**
 * Assert the integrity sweep is clean on current fixture data, then add a
 * deliberately-broken ClaimLineItem (sum over its receipt's total) and
 * assert the sweep flags it — proves the negative path, not just clean.
 * @private
 */
function Tests_testIntegritySweepClean() {
  var cleanResult = Jobs_integritySweep();
  Tests_assert(cleanResult.ok === true, 'Integrity sweep should be clean on valid fixture data, got: ' + JSON.stringify(cleanResult.issues));

  var now = Audit._nowIso();
  var memberId = Ids.nextId('User');
  getSheet_(TABS.USERS).appendRow([memberId, 'Test Sweep Member', ROLES.MEMBER, 'test-sweep@example.com', true, now]);

  var requestId = Ids.nextId('BudgetRequest');
  getSheet_(TABS.BUDGET_REQUESTS).appendRow([
    requestId, memberId, '', 'Test sweep request', 'Just', '2026-08-01',
    STATUS.BudgetRequest.APPROVED, now, now, memberId, '', false, 'TEST-' + requestId
  ]);
  var lineId = Ids.childId(requestId, 1, 'BUDGETLINE');
  getSheet_(TABS.BUDGET_REQUEST_LINES).appendRow([lineId, requestId, 'CAT-ACT', 'Test', 100, 100, STATUS.BudgetRequestLine.APPROVED, 0, 100]);

  var claimId = Ids.nextId('ExpenseClaim');
  getSheet_(TABS.EXPENSE_CLAIMS).appendRow([
    claimId, memberId, STATUS.ExpenseClaim.SUBMITTED, now, '', '', '', '',
    '', '', 0, false, false, 'Test sweep claim', 'TEST-' + claimId
  ]);

  var receiptId = Ids.nextId('Receipt');
  getSheet_(TABS.RECEIPTS).appendRow([receiptId, '', 'testhashsweep', memberId, now, 'Vendor', '2026-07-01', 50, '']);
  // Two ClaimLineItems against the same receipt, 30 + 30 = 60 > receipt_total 50.
  var cli1 = Ids.childId(claimId, 1, 'CLAIMLINE');
  getSheet_(TABS.CLAIM_LINE_ITEMS).appendRow([cli1, claimId, lineId, receiptId, 30, 'Broken line 1', false]);
  var cli2 = Ids.childId(claimId, 2, 'CLAIMLINE');
  getSheet_(TABS.CLAIM_LINE_ITEMS).appendRow([cli2, claimId, lineId, receiptId, 30, 'Broken line 2', false]);

  var brokenResult = Jobs_integritySweep();
  Tests_assert(brokenResult.ok === false, 'Integrity sweep should flag the over-total receipt, but reported clean');
  var found = brokenResult.issues.some(function (issue) { return issue.indexOf(receiptId) !== -1; });
  Tests_assert(found, 'Integrity sweep issues should mention ' + receiptId + ', got: ' + JSON.stringify(brokenResult.issues));
}

/**
 * Call the onboarding handler's logic directly (bypassing the Forms event,
 * same convention as the rest of this file): first submission creates a
 * new COMMITTEE user + Vault row; second submission with the same email
 * is a no-op on Users but updates the Vault row in place; the onboarding
 * audit detail must never contain the literal PII strings.
 * @return {{userId: string}}
 * @private
 */
function Tests_testOnboardingHandler() {
  var email = 'test-onboard@example.com';
  var studentId = 'S1234567';
  var payoutHandle = '91234567';

  var first = Onboarding_resolveOrCreateUser_(email, 'Test Onboard');
  Tests_assert(first.isNew === true, 'First onboarding of a new email should create a user');
  Tests_assert(first.role === ROLES.COMMITTEE, 'Onboarding should default new users to COMMITTEE');

  Onboarding_writeVaultRow_(first.userId, {
    full_name: 'Test Onboard', student_id: studentId, payout_method: PAYOUT_METHOD.FPS,
    payout_handle: payoutHandle, consent_ts: Audit._nowIso()
  });
  Audit.append(first.userId, 'User', first.userId, 'ONBOARDED', {
    userId: first.userId, isNew: first.isNew, role: first.role, source: 'ONBOARDING_FORM'
  });

  var vaultRowsAfterFirst = Tests_countVaultRows_(first.userId);
  Tests_assert(vaultRowsAfterFirst === 1, 'Expected exactly one Vault row after first onboarding, got ' + vaultRowsAfterFirst);

  var second = Onboarding_resolveOrCreateUser_(email, 'Test Onboard');
  Tests_assert(second.isNew === false, 'Resubmitting the same email should not create a second user');
  Tests_assert(second.userId === first.userId, 'Resubmitting the same email should resolve to the same user');

  var newHandle = '99998888';
  Onboarding_writeVaultRow_(second.userId, {
    full_name: 'Test Onboard', student_id: studentId, payout_method: PAYOUT_METHOD.PAYME,
    payout_handle: newHandle, consent_ts: Audit._nowIso()
  });
  var vaultRowsAfterSecond = Tests_countVaultRows_(second.userId);
  Tests_assert(vaultRowsAfterSecond === 1, 'Resubmitting should update the Vault row in place, not append a second one');

  var vaultValues = getVaultSheet_().getDataRange().getValues();
  var vc = COLS.Vault;
  var updatedHandle = null;
  for (var i = 1; i < vaultValues.length; i++) {
    if (vaultValues[i][vc.user_id - 1] === second.userId) updatedHandle = vaultValues[i][vc.payout_handle - 1];
  }
  Tests_assert(updatedHandle === newHandle, 'Vault row should reflect the updated payout_handle, got ' + updatedHandle);

  var auditValues = getSheet_(TABS.AUDIT_LOG).getDataRange().getValues();
  var ac = COLS.AuditLog;
  for (var j = 1; j < auditValues.length; j++) {
    var detailStr = String(auditValues[j][ac.detail - 1]);
    Tests_assert(detailStr.indexOf(studentId) === -1, 'AuditLog must never contain the literal student_id (row ' + (j + 1) + ')');
    Tests_assert(detailStr.indexOf(payoutHandle) === -1, 'AuditLog must never contain the literal payout_handle (row ' + (j + 1) + ')');
  }

  return { userId: first.userId };
}

/**
 * @param {string} userId
 * @return {number} how many Vault rows exist for this user_id
 * @private
 */
function Tests_countVaultRows_(userId) {
  var values = getVaultSheet_().getDataRange().getValues();
  var c = COLS.Vault;
  var count = 0;
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.user_id - 1] === userId) count++;
  }
  return count;
}
