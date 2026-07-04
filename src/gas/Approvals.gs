/**
 * Approvals.gs — the treasurer's Phase-1 cockpit (an AppSheet app takes
 * over this role in Phase 3). Lists items awaiting a decision; a human
 * expresses intent in the ACTION/AMOUNT_OVERRIDE/NOTE columns, then
 * ticks CONFIRM. That fires onEditApprovals, which is the ONLY path
 * from this sheet into Engine.transition — nothing here ever writes a
 * status column directly.
 */

/**
 * Rebuild the Approvals tab's data rows from current PENDING requests
 * and SUBMITTED/VERIFIED claims. Wipes and rewrites all data rows
 * (row 1 header untouched). Safe to call any time.
 */
function refreshApprovalsTab() {
  var sheet = getSheet_(TABS.APPROVALS);
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();

  var rows = [].concat(Approvals_pendingRequestRows(), Approvals_claimRows());
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

/**
 * @return {Array<Array>} one row per PENDING BudgetRequest
 * @private
 */
function Approvals_pendingRequestRows() {
  var sheet = getSheet_(TABS.BUDGET_REQUESTS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.BudgetRequests;
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.status - 1] !== STATUS.BudgetRequest.PENDING) continue;
    var requestId = values[i][c.request_id - 1];
    var amount = Engine._sumBudgetRequestLines(requestId, 'requested_amount');
    out.push([
      requestId, 'BudgetRequest', values[i][c.title - 1], values[i][c.requester_id - 1],
      amount, STATUS.BudgetRequest.PENDING, '', '', '', false, ''
    ]);
  }
  return out;
}

/**
 * @return {Array<Array>} one row per SUBMITTED or VERIFIED ExpenseClaim
 * @private
 */
function Approvals_claimRows() {
  var sheet = getSheet_(TABS.EXPENSE_CLAIMS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.ExpenseClaims;
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var status = values[i][c.status - 1];
    if (status !== STATUS.ExpenseClaim.SUBMITTED && status !== STATUS.ExpenseClaim.VERIFIED) continue;
    var claimId = values[i][c.claim_id - 1];
    var amount = Engine._sumClaimLineItems(claimId);
    out.push([
      claimId, 'ExpenseClaim', values[i][c.notes - 1] || claimId, values[i][c.claimant_id - 1],
      amount, status, '', '', '', false, ''
    ]);
  }
  return out;
}

/**
 * Installable onEdit trigger for the whole CF-Ledger spreadsheet. Fires
 * on every edit; only acts when the edit is the CONFIRM checkbox on the
 * Approvals tab flipping to TRUE.
 * @param {Object} e edit event
 */
function onEditApprovals(e) {
  var sheet = e.range.getSheet();
  if (sheet.getName() !== TABS.APPROVALS) return;
  if (e.range.getColumn() !== COLS.Approvals.confirm) return;
  if (e.range.getRow() < 2) return;
  if (e.value !== 'TRUE' && e.value !== true) return;

  var row = e.range.getRow();
  var c = COLS.Approvals;
  var numCols = Object.keys(c).length;
  var rowValues = sheet.getRange(row, 1, 1, numCols).getValues()[0];

  var entityId = rowValues[c.entity_id - 1];
  var entityType = rowValues[c.entity_type - 1];
  var action = rowValues[c.action - 1];
  var amountOverride = rowValues[c.amount_override - 1];
  var note = rowValues[c.note - 1];

  if (!entityId || !entityType || !action) {
    sheet.getRange(row, c.confirm).setValue(false);
    return;
  }

  var actorInfo = Approvals_resolveActor(e);

  var payload = {};
  if (note) payload.decision_note = note;
  if (amountOverride !== '' && amountOverride !== null && amountOverride !== undefined) {
    payload.amount_override = Number(amountOverride);
  }

  var result = Engine.transition(entityType, entityId, action, actorInfo.userId, payload);

  Audit.append(actorInfo.userId, entityType, entityId, 'FIELD_SET', {
    source: 'ApprovalsTab', actorResolution: actorInfo.method, transitionOk: result.ok, reason: result.reason
  });

  sheet.getRange(row, c.action).setValue('');
  sheet.getRange(row, c.amount_override).setValue('');
  sheet.getRange(row, c.note).setValue('');
  sheet.getRange(row, c.confirm).setValue(false);
  sheet.getRange(row, c.intent_actor_email).setValue(actorInfo.email || '');

  refreshApprovalsTab();
}

/**
 * Resolve the editing user to a Users row. Phase 1 runs from the shared
 * owner account, so e.user.getEmail() may be unavailable or may not
 * resolve to any Users row; fall back to Config.TREASURER_USER_ID and
 * record which path was used (audited in onEditApprovals).
 * @param {Object} e edit event
 * @return {{userId: string, email: string, method: string}}
 * @private
 */
function Approvals_resolveActor(e) {
  var email = '';
  try {
    email = e.user ? e.user.getEmail() : '';
  } catch (ex) {
    email = '';
  }
  if (email) {
    var user = IntakeForms_resolveUser(email);
    if (!user.isUnknown) return { userId: user.userId, email: email, method: 'EMAIL_LOOKUP' };
  }
  return { userId: Config.get('TREASURER_USER_ID'), email: email, method: 'TREASURER_FALLBACK' };
}
