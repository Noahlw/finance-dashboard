"use strict";
/**
 * TestHelpers.js — reusable data factory functions for GAS integration tests.
 * Every seeded row uses a TEST- prefixed ID so TestFramework_teardown()
 * automatically cleans it up.
 *
 * All factories return the created entity's primary key.
 */

/**
 * Seed a user row. Returns the user_id.
 * @param {string} id - e.g. 'TEST-USER-TREASURER'
 * @param {string} role - one of ROLES.*
 * @param {string} email
 * @return {string} user_id
 */
function TestHelpers_seedUser(id, role, email) {
  var now = Audit._nowIso();
  getSheet_(TABS.USERS).appendRow([id, "Test " + role, role, email, true, now]);
  return id;
}

/**
 * Seed a category row. Returns the category_id.
 * @param {string} id - e.g. 'TEST-CAT-1'
 * @param {string} name
 * @param {string} kind - 'EXPENSE' or 'INCOME'
 * @param {number} semesterCap
 * @return {string} category_id
 */
function TestHelpers_seedCategory(id, name, kind, semesterCap) {
  getSheet_(TABS.CATEGORIES).appendRow([
    id,
    name,
    kind,
    semesterCap || 0,
    true,
  ]);
  return id;
}

/**
 * Seed a BudgetRequest row with the given status and optional line data.
 * Lines are appended to BudgetRequestLines.
 * @param {string} id - e.g. 'TEST-REQ-1'
 * @param {string} userId - requester_id
 * @param {string} status - one of STATUS.BudgetRequest.*
 * @param {Array<{categoryId: string, description: string, amount: number}>} lines
 * @return {string} request_id
 */
function TestHelpers_seedBudgetRequest(id, userId, status, lines) {
  var now = Audit._nowIso();
  var c = COLS.BudgetRequests;
  var row = [];
  row[c.request_id - 1] = id;
  row[c.requester_id - 1] = userId;
  row[c.event_id - 1] = "";
  row[c.title - 1] = "Test Request " + id;
  row[c.justification - 1] = "Auto-seeded for testing";
  row[c.needed_by - 1] = "2026-08-01";
  row[c.status - 1] = status;
  row[c.submitted_at - 1] = status === STATUS.BudgetRequest.DRAFT ? "" : now;
  row[c.decided_at - 1] = "";
  row[c.decided_by - 1] = "";
  row[c.decision_note - 1] = "";
  row[c.self_approved - 1] = false;
  row[c.processed_response_id - 1] = "TEST-RES-" + id;
  getSheet_(TABS.BUDGET_REQUESTS).appendRow(row);

  if (lines && lines.length > 0) {
    var lc = COLS.BudgetRequestLines;
    for (var i = 0; i < lines.length; i++) {
      var lineId = "TEST-BUDGETLINE-" + id + "-" + (i + 1);
      var lineRow = [];
      lineRow[lc.line_id - 1] = lineId;
      lineRow[lc.request_id - 1] = id;
      lineRow[lc.category_id - 1] = lines[i].categoryId || "CAT-ACT";
      lineRow[lc.description - 1] = lines[i].description || "Line " + (i + 1);
      lineRow[lc.requested_amount - 1] = lines[i].amount || 100;
      lineRow[lc.approved_amount - 1] = lines[i].approvedAmount || 0;
      lineRow[lc.line_status - 1] =
        lines[i].lineStatus || STATUS.BudgetRequestLine.PENDING;
      lineRow[lc.claimed_amount - 1] = 0;
      lineRow[lc.remaining - 1] = lines[i].amount || 100;
      getSheet_(TABS.BUDGET_REQUEST_LINES).appendRow(lineRow);
    }
  }
  return id;
}

/**
 * Seed an ExpenseClaim row with the given status and optional claim lines.
 * @param {string} id - e.g. 'TEST-CLAIM-1'
 * @param {string} userId - claimant_id
 * @param {string} status - one of STATUS.ExpenseClaim.*
 * @param {Array<{budgetLineId: string, receiptId: string, amount: number, missingReceipt: boolean}>} lines
 * @return {string} claim_id
 */
function TestHelpers_seedExpenseClaim(id, userId, status, lines) {
  var now = Audit._nowIso();
  var c = COLS.ExpenseClaims;
  var row = [];
  row[c.claim_id - 1] = id;
  row[c.claimant_id - 1] = userId;
  row[c.status - 1] = status;
  row[c.submitted_at - 1] =
    status !== STATUS.ExpenseClaim.SUBMITTED && status !== "" ? now : now;
  row[c.verified_at - 1] =
    status === STATUS.ExpenseClaim.VERIFIED ||
    status === STATUS.ExpenseClaim.APPROVED_FOR_PAYOUT ||
    status === STATUS.ExpenseClaim.PAID ||
    status === STATUS.ExpenseClaim.LOCKED
      ? now
      : "";
  row[c.approved_at - 1] =
    status === STATUS.ExpenseClaim.APPROVED_FOR_PAYOUT ||
    status === STATUS.ExpenseClaim.PAID ||
    status === STATUS.ExpenseClaim.LOCKED
      ? now
      : "";
  row[c.paid_at - 1] =
    status === STATUS.ExpenseClaim.PAID || status === STATUS.ExpenseClaim.LOCKED
      ? now
      : "";
  row[c.locked_at - 1] = status === STATUS.ExpenseClaim.LOCKED ? now : "";
  row[c.verified_by - 1] = "";
  row[c.approved_by - 1] = "";
  var totalAmount = 0;
  if (lines) {
    for (var i = 0; i < lines.length; i++) {
      totalAmount += lines[i].amount || 0;
    }
  }
  row[c.total_amount - 1] = totalAmount;
  row[c.late_flag - 1] = false;
  row[c.self_approved - 1] = false;
  row[c.notes - 1] = "Test Claim " + id;
  row[c.processed_response_id - 1] = "TEST-RES-" + id;
  getSheet_(TABS.EXPENSE_CLAIMS).appendRow(row);

  if (lines && lines.length > 0) {
    var clic = COLS.ClaimLineItems;
    for (var j = 0; j < lines.length; j++) {
      var cliId = "TEST-CLAIMLINE-" + id + "-" + (j + 1);
      var cliRow = [];
      cliRow[clic.claim_line_id - 1] = cliId;
      cliRow[clic.claim_id - 1] = id;
      cliRow[clic.budget_line_id - 1] = lines[j].budgetLineId || "";
      cliRow[clic.receipt_id - 1] = lines[j].receiptId || "";
      cliRow[clic.amount - 1] = lines[j].amount || 0;
      cliRow[clic.description - 1] = lines[j].description || "Line " + (j + 1);
      cliRow[clic.missing_receipt_flag - 1] = lines[j].missingReceipt;
      getSheet_(TABS.CLAIM_LINE_ITEMS).appendRow(cliRow);
    }
  }
  return id;
}

/**
 * Seed a Receipt row. Returns the receipt_id.
 * @param {string} id - e.g. 'TEST-RECEIPT-1'
 * @param {string} userId - uploaded_by
 * @param {string} sha256 - file hash
 * @param {number} total - receipt_total
 * @param {string} vendor
 * @param {string} receiptDate
 * @return {string} receipt_id
 */
function TestHelpers_seedReceipt(
  id,
  userId,
  sha256,
  total,
  vendor,
  receiptDate
) {
  var now = Audit._nowIso();
  var c = COLS.Receipts;
  var row = [];
  row[c.receipt_id - 1] = id;
  row[c.drive_file_id - 1] = "TEST-DRIVE-" + id;
  row[c.sha256 - 1] = sha256 || "testhash-" + id;
  row[c.uploaded_by - 1] = userId;
  row[c.uploaded_at - 1] = now;
  row[c.vendor - 1] = vendor || "Test Vendor";
  row[c.receipt_date - 1] = receiptDate || "2026-07-01";
  row[c.receipt_total - 1] = total || 100;
  row[c.file_link - 1] = "";
  getSheet_(TABS.RECEIPTS).appendRow(row);
  return id;
}

/**
 * Seed a Payout row. Returns the payout_id.
 * @param {string} id - e.g. 'TEST-PAYOUT-1'
 * @param {string} claimId
 * @param {string} userId - payee_user_id
 * @param {number} amount
 * @param {string} status - one of STATUS.Payout.*
 * @param {string} method - 'FPS', 'PAYME', 'BANK', or 'CASH'
 * @param {string} paidAtIso - ISO timestamp for paid_at (for auto-confirm testing)
 * @return {string} payout_id
 */
function TestHelpers_seedPayout(
  id,
  claimId,
  userId,
  amount,
  status,
  method,
  paidAtIso
) {
  var now = Audit._nowIso();
  var c = COLS.Payouts;
  var row = [];
  row[c.payout_id - 1] = id;
  row[c.claim_id - 1] = claimId;
  row[c.payee_user_id - 1] = userId;
  row[c.amount - 1] = amount || 100;
  row[c.method - 1] = method || "";
  row[c.txn_reference - 1] = method ? "TEST-TXN-" + id : "";
  row[c.paid_by - 1] =
    status === STATUS.Payout.SENT || status === STATUS.Payout.CONFIRMED
      ? "TEST-USER-TREASURER"
      : "";
  row[c.status - 1] = status;
  row[c.paid_at - 1] =
    paidAtIso ||
    (status === STATUS.Payout.SENT || status === STATUS.Payout.CONFIRMED
      ? now
      : "");
  row[c.confirmed_at - 1] = status === STATUS.Payout.CONFIRMED ? now : "";
  getSheet_(TABS.PAYOUTS).appendRow(row);
  return id;
}

/**
 * Seed a Vault row in CF-Vault. Returns the user_id.
 * @param {string} userId
 * @param {string} fullName
 * @param {string} studentId
 * @param {string} payoutMethod
 * @param {string} payoutHandle
 * @return {string} user_id
 */
function TestHelpers_seedVaultRow(
  userId,
  fullName,
  studentId,
  payoutMethod,
  payoutHandle
) {
  var now = Audit._nowIso();
  var c = COLS.Vault;
  var row = [];
  row[c.user_id - 1] = userId;
  row[c.full_name - 1] = fullName || "Test User";
  row[c.student_id - 1] = studentId || "12345678";
  row[c.payout_method - 1] = payoutMethod || "FPS";
  row[c.payout_handle - 1] = payoutHandle || "12345678";
  row[c.consent_ts - 1] = now;
  getVaultSheet_().appendRow(row);
  return userId;
}

/**
 * Build a mock Google Form submit event object for tests.
 * @param {string} email
 * @param {Object<string, string>} fieldValues - key: field title, value: answer
 * @return {Object} mock event with namedValues
 */
function TestHelpers_mockFormEvent(email, fieldValues) {
  var namedValues = {};
  if (email) {
    namedValues["Email address"] = [email];
  }
  for (var key in fieldValues) {
    if (Object.hasOwn(fieldValues, key)) {
      namedValues[key] = [String(fieldValues[key])];
    }
  }
  return { namedValues };
}

/**
 * Seed a row in the Approvals tab to simulate the treasurer cockpit.
 * @param {string} entityType - 'BudgetRequest' or 'ExpenseClaim'
 * @param {string} entityId
 * @param {string} action - e.g. 'APPROVE', 'VERIFY'
 * @param {Object} opts - {amountOverride, note, status, title, requester}
 * @return {number} row index in Approvals sheet
 */
function TestHelpers_seedApprovalRow(entityType, entityId, action, opts) {
  opts = opts || {};
  var c = COLS.Approvals;
  var row = [];
  row[c.entity_id - 1] = entityId;
  row[c.entity_type - 1] = entityType;
  row[c.title - 1] = opts.title || "Test Entity";
  row[c.requester_or_claimant - 1] = opts.requester || "TEST-USER-MEMBER";
  row[c.amount - 1] = opts.amount || 100;
  row[c.status - 1] = opts.status || STATUS.BudgetRequest.PENDING;
  row[c.action - 1] = action;
  row[c.amount_override - 1] = opts.amountOverride || "";
  row[c.note - 1] = opts.note || "";
  row[c.confirm - 1] = false;
  row[c.intent_actor_email - 1] = "";
  row[c.receipt_link - 1] = "";
  getSheet_(TABS.APPROVALS).appendRow(row);
  return getSheet_(TABS.APPROVALS).getLastRow();
}

/**
 * Simulate an onEdit event for the Approvals tab by manually calling the
 * handler with the appropriate row. This avoids needing a real Google Sheets
 * edit event.
 *
 * @param {string} entityType - 'BudgetRequest' or 'ExpenseClaim'
 * @param {string} entityId
 * @param {string} action - e.g. 'APPROVE', 'VERIFY', 'APPROVE_PAYOUT'
 * @param {string} actorUserId
 * @param {Object} payload - {decision_note, amount_override}
 * @return {{ok: boolean, reason: ?string}}
 */
function TestHelpers_performApproval(
  entityType,
  entityId,
  action,
  actorUserId,
  payload
) {
  return Engine.transition(
    entityType,
    entityId,
    action,
    actorUserId,
    payload || {}
  );
}

/**
 * Sum all claim line item amounts for a claim.
 * @param {string} claimId
 * @return {number}
 */
function TestHelpers_sumClaimLines(claimId) {
  var sheet = getSheet_(TABS.CLAIM_LINE_ITEMS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.ClaimLineItems;
  var total = 0;
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.claim_id - 1] === claimId) {
      total += Number(values[i][c.amount - 1]) || 0;
    }
  }
  return total;
}

/**
 * Count the number of audit log entries for a given entity.
 * @param {string} entityId
 * @return {number}
 */
function TestHelpers_countAuditEntries(entityId) {
  var sheet = getSheet_(TABS.AUDIT_LOG);
  var values = sheet.getDataRange().getValues();
  var c = COLS.AuditLog;
  var count = 0;
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.entity_id - 1] === entityId) {
      count++;
    }
  }
  return count;
}

/**
 * Get the current status of an entity from its sheet.
 * @param {string} entityType - 'BudgetRequest' or 'ExpenseClaim'
 * @param {string} entityId
 * @return {?string} status or null if not found
 */
function TestHelpers_getEntityStatus(entityType, entityId) {
  var row = Engine._loadRow(entityType, entityId);
  if (!row) {
    return null;
  }
  var cols = COLS[entityType + "s"];
  return row.values[cols.status - 1];
}

/**
 * Count Discord notification attempts for a given entity ID by scanning
 * the AuditLog for NOTIFY_FAIL entries. Note: successful Discord posts
 * don't leave an audit trail (only failures do).
 * @param {string} entityId
 * @return {number} count of failed notifications
 */
function TestHelpers_countDiscordFailures(entityId) {
  var sheet = getSheet_(TABS.AUDIT_LOG);
  var values = sheet.getDataRange().getValues();
  var c = COLS.AuditLog;
  var count = 0;
  for (var i = 1; i < values.length; i++) {
    if (
      values[i][c.entity_id - 1] === entityId &&
      values[i][c.action - 1] === "NOTIFY_FAIL"
    ) {
      count++;
    }
  }
  return count;
}
