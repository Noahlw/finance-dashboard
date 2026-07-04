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
  var lineId = Ids.childId(requestId, 1, 'BRL');
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
  var cliId = Ids.childId(claimId, 1, 'CLI');
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
