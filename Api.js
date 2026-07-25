"use strict";
/**
 * Secure API boundaries for the React Frontend.
 * These functions enforce Session authentication (IDOR prevention)
 * before interacting with the Engine.
 */

var allowedReceiptMimes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "application/pdf",
];
var maxReceiptBytes = 5 * 1024 * 1024;

function doGet(e) {
  return HtmlService.createTemplateFromFile("index")
    .evaluate()
    .setTitle("Finance Workspace")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function _ok(data) {
  return { data, ok: true };
}

function _err(code, message, details) {
  if (code === "UNAUTHORIZED" || code === "NOT_AUTHENTICATED") {
    return {
      error: { code: "AUTH_DENIED", details: {}, message: "Access denied" },
      ok: false,
    };
  }
  return { error: { code, details: details || {}, message }, ok: false };
}

function _auditAuthDenied(reason, user) {
  try {
    Audit.append(
      user && user.userId ? user.userId : "SYSTEM",
      "Authorization",
      "SESSION",
      "AUTH_DENIED",
      { reason: reason || "denied" }
    );
  } catch (e) {
    // A denial must remain minimal even when audit persistence is unavailable.
  }
}

function _denyAccess(reason, user) {
  _auditAuthDenied(reason, user);
  return _err("AUTH_DENIED", "Access denied");
}

function api_resolveSession() {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    _auditAuthDenied("no_session");
    return { allowed: false, reason: "no_session" };
  }

  var user = _resolveUser(email);
  if (user.isUnknown) {
    _auditAuthDenied("unknown_user");
    return { allowed: false, reason: "unknown_user" };
  }

  if (user.role !== ROLES.COMMITTEE && user.role !== ROLES.TREASURER) {
    _auditAuthDenied("unauthorized_role", user);
    return { allowed: false, reason: "unauthorized_role" };
  }

  if (!user.active) {
    _auditAuthDenied("inactive_user", user);
    return { allowed: false, reason: "inactive_user" };
  }

  var views = ["review", "claims", "members", "budget-requests"];
  if (user.role === ROLES.TREASURER) {
    views.push("income", "payouts", "reports", "reconciliation");
  }

  return {
    allowed: true,
    display_name: user.displayName,
    role: user.role,
    user_id: user.userId,
    views,
  };
}

function api_getMyClaims() {
  var user;
  try {
    user = _requireOperator();
  } catch (e) {
    return e.authResponse || _err("AUTH_DENIED", "Access denied");
  }

  var claimsSheet = getSheet_(TABS.EXPENSE_CLAIMS);
  var claimsRows = Engine._findRowsByColumn(
    claimsSheet,
    COLS.ExpenseClaims.created_by,
    user.userId
  );
  var requestsSheet = getSheet_(TABS.BUDGET_REQUESTS);
  var requestsRows = Engine._findRowsByColumn(
    requestsSheet,
    COLS.BudgetRequests.requester_id,
    user.userId
  );
  var requestIds = {};
  for (var i = 0; i < requestsRows.length; i++) {
    requestIds[requestsRows[i].values[0]] = true;
  }

  var linesSheet = getSheet_(TABS.BUDGET_REQUEST_LINES);
  var allLines = linesSheet.getDataRange().getValues();
  var c_brl = COLS.BudgetRequestLines;
  var budgetLines = [];

  for (var i = 1; i < allLines.length; i++) {
    var rId = allLines[i][c_brl.request_id - 1];
    if (requestIds[rId] && allLines[i][c_brl.line_status - 1] === "APPROVED") {
      var remaining = allLines[i][c_brl.remaining - 1];
      budgetLines.push({
        description: allLines[i][c_brl.description - 1],
        line_id: allLines[i][c_brl.line_id - 1],
        overBudget: remaining <= 0,
        remaining,
        request_id: rId,
      });
    }
  }

  var c = COLS.ExpenseClaims;
  return _ok({
    budgetLines,
    claims: claimsRows.map((r) => ({
      claim_id: r.values[c.claim_id - 1],
      claimant_id: r.values[c.claimant_id - 1],
      notes: r.values[c.notes - 1],
      status: r.values[c.status - 1],
      submitted_at: r.values[c.submitted_at - 1],
      total_amount: r.values[c.total_amount - 1],
    })),
    requests: requestsRows.map((r) => ({
      request_id: r.values[COLS.BudgetRequests.request_id - 1],
      status: r.values[COLS.BudgetRequests.status - 1],
      submitted_at: r.values[COLS.BudgetRequests.submitted_at - 1],
      title: r.values[COLS.BudgetRequests.title - 1],
    })),
  });
}

/**
 * Handle Base64 file uploads to Google Drive.
 * Idempotent: same SHA-256 + same user returns existing receiptId.
 */
function api_uploadReceipt(
  fileName,
  mimeType,
  base64Data,
  vendor,
  receiptDate,
  receiptTotal
) {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    return _err("NOT_AUTHENTICATED", "Not authenticated");
  }
  var user = _resolveUser(email);
  if (user.isUnknown) {
    return _err("NOT_AUTHENTICATED", "Unregistered user");
  }

  var bytes = Utilities.base64Decode(base64Data);

  if (bytes.length > maxReceiptBytes) {
    return _err("INVALID_PARAMETER", "File exceeds 5 MB limit.");
  }

  if (allowedReceiptMimes.indexOf(mimeType) === -1) {
    return _err(
      "INVALID_PARAMETER",
      "Unsupported file type. Allowed: PNG, JPEG, GIF, PDF."
    );
  }

  var sha256 = _sha256Hex(bytes);

  var receiptSheet = getSheet_(TABS.RECEIPTS);
  var receiptData = receiptSheet.getDataRange().getValues();
  var hashCol = COLS.Receipts.sha256 - 1;
  var uploaderCol = COLS.Receipts.uploaded_by - 1;
  var idCol = COLS.Receipts.receipt_id - 1;
  var vendorCol = COLS.Receipts.vendor - 1;
  var dateCol = COLS.Receipts.receipt_date - 1;
  var totalCol = COLS.Receipts.receipt_total - 1;

  for (var i = 1; i < receiptData.length; i++) {
    if (receiptData[i][hashCol] === sha256) {
      if (receiptData[i][uploaderCol] === user.userId) {
        return _ok({ receiptId: receiptData[i][idCol] });
      }
      return _err(
        "DUPLICATE_RECEIPT",
        "Duplicate receipt detected (uploaded by another user)."
      );
    }
    if (
      vendor &&
      receiptDate &&
      Number(receiptTotal) > 0 &&
      receiptData[i][vendorCol] === vendor &&
      String(receiptData[i][dateCol]) === String(receiptDate) &&
      Number(receiptData[i][totalCol]) === Number(receiptTotal)
    ) {
      try {
        Discord.postTreasury(
          "⚠️ Soft Warning: Receipt matches existing receipt **" +
            receiptData[i][idCol] +
            "** on Vendor, Date, and Total. Possible duplicate claim."
        );
      } catch (e) {}
    }
  }

  var folderId =
    PropertiesService.getScriptProperties().getProperty("RECEIPTS_FOLDER_ID");
  var folder = DriveApp.getFolderById(folderId);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);

  var receiptId = Ids.nextId("Receipt");
  var newName = receiptId + "_" + fileName;
  blob.setName(newName);
  var file = folder.createFile(blob);
  var driveFileId = file.getId();

  var fileLink =
    '=HYPERLINK("https://drive.google.com/open?id=' +
    driveFileId +
    '", "View Receipt")';
  var now = Audit._nowIso();

  _appendRow(receiptSheet, [
    receiptId,
    driveFileId,
    sha256,
    user.userId,
    now,
    vendor,
    receiptDate,
    Number(receiptTotal),
    fileLink,
  ]);
  return _ok({ receiptId });
}

/**
 * Delete an orphaned receipt (Drive file + Receipts row).
 * Used for rollback when a claim save fails after receipt upload.
 * Only the original uploader may delete.
 */
function api_deleteOrphanedReceipt(receiptId) {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    return _err("NOT_AUTHENTICATED", "Not authenticated");
  }
  var user = _resolveUser(email);
  if (user.isUnknown) {
    return _err("NOT_AUTHENTICATED", "Unregistered user");
  }

  var receiptRow = Engine._loadRow("Receipt", receiptId);
  if (!receiptRow) {
    return _err("NOT_FOUND", "Receipt not found");
  }

  if (receiptRow.values[COLS.Receipts.uploaded_by - 1] !== user.userId) {
    return _err(
      "UNAUTHORIZED",
      "Unauthorized: only the uploader can delete this receipt"
    );
  }

  var driveFileId = receiptRow.values[COLS.Receipts.drive_file_id - 1];
  if (driveFileId) {
    try {
      DriveApp.getFileById(driveFileId).setTrashed(true);
    } catch (e) {
      // File may already be deleted; continue
    }
  }

  var sheet = receiptRow.sheet || getSheet_(TABS.RECEIPTS);
  sheet.deleteRow(receiptRow.rowIndex);
  Audit.append(user.userId, "Receipt", receiptId, "DELETE_ORPHANED", {});
  return _ok({ success: true });
}

/**
 * Submit a new Expense Claim. Idempotent based on `uuid`.
 */
function api_submitClaim(payload) {
  var user;
  try {
    user = _requireOperator();
  } catch (e) {
    return e.authResponse || _err("AUTH_DENIED", "Access denied");
  }
  if (!payload.claimantId) {
    return _err("INVALID_PARAMETER", "Claimant is required");
  }
  if (!_findVaultByUserId(payload.claimantId)) {
    return _err(
      "INVALID_PARAMETER",
      "Claimant SID not found in member directory"
    );
  }

  if (
    _alreadyProcessed(
      TABS.EXPENSE_CLAIMS,
      COLS.ExpenseClaims.processed_response_id,
      payload.uuid
    )
  ) {
    return _ok({ message: "Already processed", success: true }); // Idempotent
  }

  var claimId = Ids.nextId("ExpenseClaim");
  var now = Audit._nowIso();
  var lateFlag = _isLate(payload.expenseDate);
  var total = Number(payload.amount);

  _appendRow(getSheet_(TABS.EXPENSE_CLAIMS), [
    claimId,
    payload.claimantId,
    STATUS.ExpenseClaim.SUBMITTED,
    now,
    "",
    "",
    "",
    "",
    "",
    "",
    total,
    lateFlag,
    false,
    payload.notes,
    payload.uuid,
    user.userId,
    payload.expenseDate || "",
    payload.semester || "",
    payload.eventId || "",
    payload.payoutMethod || "FPS",
    payload.payoutHandle || "",
  ]);

  var receiptIds = payload.receiptIds || [];
  if (payload.receiptId && receiptIds.indexOf(payload.receiptId) === -1) {
    receiptIds.push(payload.receiptId);
  }
  if (receiptIds.length === 0 && payload.receiptId) {
    receiptIds = [payload.receiptId];
  }

  if (receiptIds.length > 0) {
    for (var ri = 0; ri < receiptIds.length; ri++) {
      var cliId2 = Ids.childId(claimId, ri + 1, "CLAIMLINE");
      _appendRow(getSheet_(TABS.CLAIM_LINE_ITEMS), [
        cliId2,
        claimId,
        payload.budgetLineId || "",
        receiptIds[ri] || "",
        total / receiptIds.length,
        payload.notes || "",
        false,
      ]);
    }
  } else {
    var cliId = Ids.childId(claimId, 1, "CLAIMLINE");
    var missingReceipt = !payload.receiptId;
    _appendRow(getSheet_(TABS.CLAIM_LINE_ITEMS), [
      cliId,
      claimId,
      payload.budgetLineId || "",
      payload.receiptId || "",
      total,
      payload.notes,
      missingReceipt,
    ]);
  }

  Audit.append(user.userId, "ExpenseClaim", claimId, "CREATE", {
    lateFlag,
    lines: 1,
    uuid: payload.uuid,
  });
  try {
    Discord.postStatus(
      claimId,
      payload.notes,
      STATUS.ExpenseClaim.SUBMITTED,
      null
    );
  } catch (e) {}

  return _ok({ claimId, success: true });
}

// Helpers
function _resolveUser(email) {
  var sheet = getSheet_(TABS.USERS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Users;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][c.email - 1]).toLowerCase() === email.toLowerCase()) {
      return {
        active:
          String(values[i][c.active - 1])
            .trim()
            .toUpperCase() === "TRUE",
        displayName: values[i][c.display_name - 1],
        isUnknown: false,
        role: values[i][c.role - 1],
        userId: values[i][c.user_id - 1],
      };
    }
  }
  return { isUnknown: true, userId: "USER-UNKNOWN" };
}

function _sha256Hex(bytes) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    bytes
  );
  var hex = "";
  for (var i = 0; i < digest.length; i++) {
    var v = (digest[i] < 0 ? digest[i] + 256 : digest[i]).toString(16);
    hex += v.length === 1 ? "0" + v : v;
  }
  return hex;
}

function _isLate(dateStr) {
  if (!dateStr) {
    return false;
  }
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return false;
  }
  var deadlineDays = Config.getNum("CLAIM_DEADLINE_DAYS");
  return (
    new Date() > new Date(d.getTime() + deadlineDays * 24 * 60 * 60 * 1000)
  );
}

function _alreadyProcessed(tabName, colIndex, uuid) {
  var sheet = getSheet_(tabName);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return false;
  }
  var values = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === uuid) {
      return true;
    }
  }
  return false;
}

/**
 * True when uuid already belongs to a non-DRAFT ExpenseClaim (finalized
 * idempotency). Draft rows reuse the same uuid until submit.
 */
function _claimUuidAlreadySubmitted(uuid) {
  var sheet = getSheet_(TABS.EXPENSE_CLAIMS);
  if (!(sheet && typeof sheet.getDataRange === "function")) {
    return null;
  }
  var values = sheet.getDataRange().getValues();
  var c = COLS.ExpenseClaims;
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.processed_response_id - 1] !== uuid) {
      continue;
    }
    if (values[i][c.status - 1] !== STATUS.ExpenseClaim.DRAFT) {
      return {
        claim_id: values[i][c.claim_id - 1],
        status: values[i][c.status - 1],
      };
    }
  }
  return null;
}

function _appendRow(sheet, values) {
  var data = sheet.getRange("A:A").getValues();
  var insertRow = 1;
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][0] !== "" && data[i][0] !== null) {
      insertRow = i + 2;
      break;
    }
  }
  if (insertRow > sheet.getMaxRows()) {
    sheet.insertRowAfter(sheet.getMaxRows());
  }
  sheet.getRange(insertRow, 1, 1, values.length).setValues([values]);
  return insertRow;
}

/**
 * Edit an existing Expense Claim. Only SUBMITTED claims can be edited.
 */
function api_editClaim(payload) {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    return _err("NOT_AUTHENTICATED", "Not authenticated");
  }
  var user = _resolveUser(email);
  if (user.isUnknown) {
    return _err("NOT_AUTHENTICATED", "Unregistered user");
  }

  var sheet = getSheet_(TABS.EXPENSE_CLAIMS);
  var rows = sheet.getDataRange().getValues();
  var c = COLS.ExpenseClaims;

  var rowIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][c.claim_id - 1] === payload.claimId) {
      rowIndex = i + 1; // 1-indexed for getRange
      if (rows[i][c.claimant_id - 1] !== user.userId) {
        return _err("UNAUTHORIZED", "Unauthorized");
      }
      if (rows[i][c.status - 1] !== STATUS.ExpenseClaim.SUBMITTED) {
        return _err("ILLEGAL_STATE", "Only SUBMITTED claims can be edited.");
      }
      break;
    }
  }

  if (rowIndex === -1) {
    return _err("NOT_FOUND", "Claim not found");
  }

  // Update total amount and notes
  var total = Number(payload.amount);
  sheet.getRange(rowIndex, c.total_amount).setValue(total);
  sheet.getRange(rowIndex, c.notes).setValue(payload.notes);

  // We should also update the line item. Assuming 1-to-1 for this simplified frontend.
  var cliSheet = getSheet_(TABS.CLAIM_LINE_ITEMS);
  var cliRows = cliSheet.getDataRange().getValues();
  var cli_c = COLS.ClaimLineItems;
  for (var i = 1; i < cliRows.length; i++) {
    if (cliRows[i][cli_c.claim_id - 1] === payload.claimId) {
      cliSheet.getRange(i + 1, cli_c.amount).setValue(total);
      cliSheet.getRange(i + 1, cli_c.description).setValue(payload.notes);
      break;
    }
  }

  Audit.append(user.userId, "ExpenseClaim", payload.claimId, "UPDATE", {
    amount: total,
  });
  return _ok({ success: true });
}

// ---------------------------------------------------------------------------
// Budget Request API
// ---------------------------------------------------------------------------

/**
 * Get all budget requests and their lines for the current user.
 */
function api_getMyBudgetRequests() {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    return _err(
      "NOT_AUTHENTICATED",
      "User not authenticated (no active session)"
    );
  }

  var user = _resolveUser(email);
  if (
    user.isUnknown ||
    (user.role !== ROLES.COMMITTEE && user.role !== ROLES.TREASURER)
  ) {
    return _ok([]);
  }

  var reqSheet = getSheet_(TABS.BUDGET_REQUESTS);
  var reqRows = Engine._findRowsByColumn(
    reqSheet,
    COLS.BudgetRequests.requester_id,
    user.userId
  );
  var c = COLS.BudgetRequests;
  var lineC = COLS.BudgetRequestLines;
  var lineSheet = getSheet_(TABS.BUDGET_REQUEST_LINES);

  return _ok(
    reqRows.map((r) => {
      var id = r.values[c.request_id - 1];
      var lineRows = Engine._findRowsByColumn(lineSheet, lineC.request_id, id);
      return {
        decided_at: r.values[c.decided_at - 1],
        decided_by: r.values[c.decided_by - 1],
        decision_note: r.values[c.decision_note - 1],
        event_id: r.values[c.event_id - 1],
        justification: r.values[c.justification - 1],
        lines: lineRows.map((l) => ({
          approved_amount: l.values[lineC.approved_amount - 1],
          category_id: l.values[lineC.category_id - 1],
          claimed_amount: l.values[lineC.claimed_amount - 1] || 0,
          description: l.values[lineC.description - 1],
          line_id: l.values[lineC.line_id - 1],
          line_status: l.values[lineC.line_status - 1],
          remaining: l.values[lineC.remaining - 1] || 0,
          requested_amount: l.values[lineC.requested_amount - 1],
        })),
        needed_by: r.values[c.needed_by - 1],
        request_id: id,
        requester_id: r.values[c.requester_id - 1],
        status: r.values[c.status - 1],
        submitted_at: r.values[c.submitted_at - 1],
        title: r.values[c.title - 1],
      };
    })
  );
}

/**
 * Save a Budget Request as DRAFT (new) or update an existing DRAFT/NEEDS_INFO.
 */
function api_saveBudgetRequestDraft(payload) {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    return _err("NOT_AUTHENTICATED", "Not authenticated");
  }
  var user = _resolveUser(email);
  if (user.isUnknown) {
    return _err("NOT_AUTHENTICATED", "Unregistered user");
  }

  var now = Audit._nowIso();
  var c = COLS.BudgetRequests;
  var lineC = COLS.BudgetRequestLines;
  var sheet = getSheet_(TABS.BUDGET_REQUESTS);
  var lineSheet = getSheet_(TABS.BUDGET_REQUEST_LINES);

  var requestId;
  var existingRow = null;

  if (payload.request_id) {
    existingRow = Engine._loadRow("BudgetRequest", payload.request_id);
    if (existingRow) {
      var curStatus = existingRow.values[c.status - 1];
      if (
        curStatus !== STATUS.BudgetRequest.DRAFT &&
        curStatus !== STATUS.BudgetRequest.NEEDS_INFO
      ) {
        return _err(
          "ILLEGAL_STATE",
          "Cannot edit a " + curStatus + " budget request"
        );
      }
      requestId = payload.request_id;
    }
  }

  if (requestId) {
    var idx = existingRow.rowIndex;
    sheet.getRange(idx, c.title).setValue(payload.title || "");
    sheet.getRange(idx, c.justification).setValue(payload.justification || "");
    sheet.getRange(idx, c.needed_by).setValue(payload.needed_by || "");
    sheet.getRange(idx, c.event_id).setValue(payload.event_id || "");
  } else {
    requestId = Ids.nextId("BudgetRequest");
    _appendRow(sheet, [
      requestId,
      user.userId,
      payload.event_id || "",
      payload.title || "",
      payload.justification || "",
      payload.needed_by || "",
      STATUS.BudgetRequest.DRAFT,
      "",
      "",
      "",
      "",
      false,
      payload.uuid || "",
    ]);
  }

  if (payload.lines && payload.lines.length > 0) {
    var existingLines = Engine._findRowsByColumn(
      lineSheet,
      lineC.request_id,
      requestId
    );
    existingLines.forEach((el) => {
      var row = el.rowIndex;
      lineSheet.getRange(row, lineC.description).setValue("");
      lineSheet.getRange(row, lineC.requested_amount).setValue(0);
      lineSheet.getRange(row, lineC.approved_amount).setValue(0);
    });

    payload.lines.forEach((line, i) => {
      var lineId;
      if (existingLines[i]) {
        lineId = existingLines[i].values[lineC.line_id - 1];
        var row = existingLines[i].rowIndex;
        lineSheet
          .getRange(row, lineC.category_id)
          .setValue(line.category_id || "");
        lineSheet.getRange(row, lineC.description).setValue(line.description);
        lineSheet
          .getRange(row, lineC.requested_amount)
          .setValue(Number(line.requested_amount) || 0);
      } else {
        lineId = Ids.childId(requestId, i + 1, "BUDGETLINE");
        _appendRow(lineSheet, [
          lineId,
          requestId,
          line.category_id || "",
          line.description,
          Number(line.requested_amount) || 0,
          0,
          STATUS.BudgetRequestLine.PENDING,
          0,
          0,
        ]);
      }
    });
  }

  Audit.append(
    user.userId,
    "BudgetRequest",
    requestId,
    existingRow ? "DRAFT_UPDATE" : "DRAFT_CREATE",
    {}
  );
  return _ok({ request_id: requestId, status: STATUS.BudgetRequest.DRAFT });
}

/**
 * Submit a DRAFT or resubmit a NEEDS_INFO budget request via Engine.
 */
function api_submitBudgetRequest(requestId) {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    return _err("NOT_AUTHENTICATED", "Not authenticated");
  }
  var user = _resolveUser(email);
  if (user.isUnknown) {
    return _err("NOT_AUTHENTICATED", "Unregistered user");
  }

  var row = Engine._loadRow("BudgetRequest", requestId);
  if (!row) {
    return _err("NOT_FOUND", "Budget request not found");
  }

  var c = COLS.BudgetRequests;
  var curStatus = row.values[c.status - 1];
  var action;
  if (curStatus === STATUS.BudgetRequest.DRAFT) {
    action = "SUBMIT";
  } else if (curStatus === STATUS.BudgetRequest.NEEDS_INFO) {
    action = "RESUBMIT";
  } else {
    return _err(
      "ILLEGAL_STATE",
      "Cannot submit a " + curStatus + " budget request"
    );
  }

  var result = Engine.transition(
    "BudgetRequest",
    requestId,
    action,
    user.userId,
    {}
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }

  return _ok({
    request_id: requestId,
    status: result.to,
    submitted_at: Audit._nowIso(),
  });
}

/**
 * Discard/withdraw a DRAFT budget request.
 */
function api_discardBudgetRequest(requestId) {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    return _err("NOT_AUTHENTICATED", "Not authenticated");
  }
  var user = _resolveUser(email);
  if (user.isUnknown) {
    return _err("NOT_AUTHENTICATED", "Unregistered user");
  }

  var result = Engine.transition(
    "BudgetRequest",
    requestId,
    "WITHDRAW",
    user.userId,
    {}
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({ request_id: requestId, status: result.to });
}

/**
 * Get all PENDING budget requests (Treasurer approvals view).
 */
function api_getPendingBudgetRequests() {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    return _err("NOT_AUTHENTICATED", "Not authenticated");
  }
  var user = _resolveUser(email);
  if (user.isUnknown || user.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }

  var sheet = getSheet_(TABS.BUDGET_REQUESTS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.BudgetRequests;
  var out = [];

  for (var i = 1; i < values.length; i++) {
    if (values[i][c.status - 1] !== STATUS.BudgetRequest.PENDING) {
      continue;
    }
    var id = values[i][c.request_id - 1];
    var amount = Engine._sumBudgetRequestLines(id, "requested_amount");
    out.push({
      justification: values[i][c.justification - 1],
      needed_by: values[i][c.needed_by - 1],
      request_id: id,
      requester_id: values[i][c.requester_id - 1],
      submitted_at: values[i][c.submitted_at - 1],
      title: values[i][c.title - 1],
      total_requested: amount,
    });
  }
  return _ok(out);
}

/**
 * Treasurer decision on a budget request.
 * action: 'APPROVE' | 'REDUCE' | 'REJECT' | 'REQUEST_INFO' | 'CLOSE'
 * payload: { decision_note?, amount_override? }
 */
function api_decisionBudgetRequest(entityId, action, payload) {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    return _err("NOT_AUTHENTICATED", "Not authenticated");
  }
  var user = _resolveUser(email);
  if (user.isUnknown || user.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }

  var result = Engine.transition(
    "BudgetRequest",
    entityId,
    action,
    user.userId,
    payload || {}
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({ from: result.from, request_id: entityId, to: result.to });
}

// ---------------------------------------------------------------------------
// Member Directory API
// ---------------------------------------------------------------------------

function _requireOperator() {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    var noSessionError = new Error("Access denied");
    noSessionError.authResponse = _denyAccess("no_session");
    throw noSessionError;
  }
  var user = _resolveUser(email);
  if (user.isUnknown) {
    var unknownError = new Error("Access denied");
    unknownError.authResponse = _denyAccess("unknown_user");
    throw unknownError;
  }
  if (user.role !== ROLES.COMMITTEE && user.role !== ROLES.TREASURER) {
    var roleError = new Error("Access denied");
    roleError.authResponse = _denyAccess("unauthorized_role", user);
    throw roleError;
  }
  if (!user.active) {
    var inactiveError = new Error("Access denied");
    inactiveError.authResponse = _denyAccess("inactive_user", user);
    throw inactiveError;
  }
  return user;
}

function _getActiveClaimant(userId) {
  var user = _findUserById(userId);
  var vault = _findVaultByUserId(userId);
  if (!(user && vault)) {
    return null;
  }
  var role = user.values[COLS.Users.role - 1];
  var active =
    String(user.values[COLS.Users.active - 1])
      .trim()
      .toUpperCase() === "TRUE";
  var sid = String(vault.values[COLS.Vault.student_id - 1]).trim();
  if (role !== ROLES.MEMBER || !active || !/^\d{8}$/.test(sid)) {
    return null;
  }
  return { sid, user, vault };
}

function _paymentDetails(payload) {
  var method = String(payload.payoutMethod || "").trim();
  var legacyHandle = String(payload.payoutHandle || "").trim();
  if (method === PAYOUT_METHOD.FPS) {
    return {
      account: String(payload.fpsAccount || "").trim(),
      method,
      phone: String(payload.fpsPhone || legacyHandle).trim(),
    };
  }
  if (method === PAYOUT_METHOD.PAYME) {
    return {
      method,
      phone: String(payload.paymePhone || legacyHandle).trim(),
    };
  }
  return {
    details: String(payload.otherDetails || legacyHandle).trim(),
    method,
  };
}

function _paymentHandle(payload, qrDriveFileId) {
  var details = _paymentDetails(payload);
  if (qrDriveFileId) {
    details.qrDriveFileId = qrDriveFileId;
  }
  return JSON.stringify(details);
}

function _findUserById(userId) {
  var sheet = getSheet_(TABS.USERS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Users;
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.user_id - 1] === userId) {
      return { rowIndex: i + 1, values: values[i] };
    }
  }
  return null;
}

function _findVaultByUserId(userId) {
  var sheet = getVaultSheet_();
  var values = sheet.getDataRange().getValues();
  var c = COLS.Vault;
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.user_id - 1] === userId) {
      return { rowIndex: i + 1, values: values[i] };
    }
  }
  return null;
}

function _findVaultByStudentId(studentId) {
  var sheet = getVaultSheet_();
  var values = sheet.getDataRange().getValues();
  var c = COLS.Vault;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][c.student_id - 1]) === String(studentId)) {
      return { rowIndex: i + 1, values: values[i] };
    }
  }
  return null;
}

/**
 * List all members (Users with role=MEMBER). Excludes Vault PII (SID, payout details).
 */
function api_getMembers() {
  try {
    _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }

  var sheet = getSheet_(TABS.USERS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Users;
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.role - 1] === ROLES.MEMBER) {
      out.push({
        active:
          String(values[i][c.active - 1])
            .trim()
            .toUpperCase() === "TRUE",
        display_name: values[i][c.display_name - 1],
        user_id: values[i][c.user_id - 1],
      });
    }
  }
  return _ok(out);
}

/**
 * Add a new member with unique SID. Does not create login access (email blank).
 */
function api_addMember(payload) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  var studentId = String(payload.student_id || "").trim();
  if (!/^\d{8}$/.test(studentId)) {
    return _err("INVALID_PARAMETER", "Student ID must be exactly 8 digits");
  }

  var existing = _findVaultByStudentId(studentId);
  if (existing) {
    var user = _findUserById(existing.values[COLS.Vault.user_id - 1]);
    if (user && user.values[COLS.Users.active - 1] === true) {
      return _err(
        "ILLEGAL_STATE",
        "Active member with this SID already exists"
      );
    }
    return _err(
      "ILLEGAL_STATE",
      "Inactive member with this SID already exists. Use reactivate instead."
    );
  }

  var userId = Ids.nextId("User");
  var now = Audit._nowIso();
  var displayName = String(
    payload.display_name || payload.full_name || ""
  ).trim();
  _appendRow(getSheet_(TABS.USERS), [
    userId,
    displayName,
    ROLES.MEMBER,
    "",
    true,
    now,
  ]);

  var vaultRow = [
    userId,
    String(payload.full_name || displayName).trim(),
    studentId,
    String(payload.payout_method || "FPS").trim(),
    String(payload.payout_handle || "").trim(),
    now,
  ];
  var vaultSheet = getVaultSheet_();
  _appendRow(vaultSheet, vaultRow);
  // Force text format for ID / phone fields to preserve leading zeros
  var targetRow = vaultSheet.getLastRow();
  vaultSheet
    .getRange(targetRow, COLS.Vault.student_id)
    .setNumberFormat("@")
    .setValue(vaultRow[2]);
  vaultSheet
    .getRange(targetRow, COLS.Vault.payout_handle)
    .setNumberFormat("@")
    .setValue(vaultRow[4]);

  Audit.append(operator.userId, "User", userId, "MEMBER_CREATE", {
    sid: studentId,
  });
  return _ok({ active: true, display_name: displayName, user_id: userId });
}

/**
 * Reactivate an inactive member by user_id.
 */
function api_reactivateMember(userId) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  var user = _findUserById(userId);
  if (!user) {
    return _err("NOT_FOUND", "Member not found");
  }
  if (user.values[COLS.Users.role - 1] !== ROLES.MEMBER) {
    return _err("ILLEGAL_STATE", "User is not a member");
  }
  if (user.values[COLS.Users.active - 1] === true) {
    return _err("ILLEGAL_STATE", "Member is already active");
  }

  getSheet_(TABS.USERS)
    .getRange(user.rowIndex, COLS.Users.active)
    .setValue(true);
  Audit.append(operator.userId, "User", userId, "MEMBER_REACTIVATE", {});
  return _ok({ active: true, user_id: userId });
}

// ---------------------------------------------------------------------------
// Claim Draft + Intake API
// ---------------------------------------------------------------------------

/**
 * Save a claim as a DRAFT. operator is the current user; claimant is the member.
 */
function api_saveClaimDraft(payload) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (!payload.claimantId) {
    return _err("INVALID_PARAMETER", "Claimant is required");
  }
  if (!_getActiveClaimant(payload.claimantId)) {
    return _err(
      "INVALID_PARAMETER",
      "Claimant must be an active member with an 8-digit SID"
    );
  }
  if (!payload.uuid) {
    return _err("INVALID_PARAMETER", "uuid is required");
  }

  if (payload.claimId) {
    var existing = Engine._loadRow("ExpenseClaim", payload.claimId);
    if (!existing) {
      return _err("NOT_FOUND", "Claim not found");
    }
    if (
      existing.values[COLS.ExpenseClaims.created_by - 1] !== operator.userId
    ) {
      return _err("UNAUTHORIZED", "Unauthorized");
    }
    if (
      existing.values[COLS.ExpenseClaims.status - 1] !==
      STATUS.ExpenseClaim.DRAFT
    ) {
      return _err("ILLEGAL_STATE", "Only DRAFT claims can be updated as draft");
    }
  }

  var claimId = payload.claimId || Ids.nextId("ExpenseClaim");
  var now = Audit._nowIso();
  var c = COLS.ExpenseClaims;
  var lateFlag = _isLate(payload.expenseDate);
  var total = Number(payload.amount) || 0;

  if (payload.claimId) {
    var row = Engine._loadRow("ExpenseClaim", claimId);
    var sheet = row.sheet;
    sheet.getRange(row.rowIndex, c.claimant_id).setValue(payload.claimantId);
    sheet.getRange(row.rowIndex, c.total_amount).setValue(total);
    sheet.getRange(row.rowIndex, c.notes).setValue(payload.notes || "");
    sheet.getRange(row.rowIndex, c.late_flag).setValue(lateFlag);
    sheet
      .getRange(row.rowIndex, c.expense_date)
      .setValue(payload.expenseDate || "");
    sheet.getRange(row.rowIndex, c.semester).setValue(payload.semester || "");
    sheet.getRange(row.rowIndex, c.event_id).setValue(payload.eventId || "");
    sheet
      .getRange(row.rowIndex, c.payout_method)
      .setValue(payload.payoutMethod || "FPS");
    sheet
      .getRange(row.rowIndex, c.payout_handle)
      .setValue(_paymentHandle(payload));
  } else {
    _appendRow(getSheet_(TABS.EXPENSE_CLAIMS), [
      claimId,
      payload.claimantId,
      STATUS.ExpenseClaim.DRAFT,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      total,
      lateFlag,
      false,
      payload.notes || "",
      payload.uuid,
      operator.userId,
      payload.expenseDate || "",
      payload.semester || "",
      payload.eventId || "",
      payload.payoutMethod || "FPS",
      _paymentHandle(payload),
    ]);
  }

  // Upsert claim line item(s)
  var cliSheet = getSheet_(TABS.CLAIM_LINE_ITEMS);
  var cliRows =
    Engine._findRowsByColumn(cliSheet, COLS.ClaimLineItems.claim_id, claimId) ||
    [];

  var receiptIds = payload.receiptIds || [];
  if (payload.receiptId && receiptIds.indexOf(payload.receiptId) === -1) {
    receiptIds.push(payload.receiptId);
  }

  if (receiptIds.length === 0 && payload.receiptId) {
    receiptIds = [payload.receiptId];
  }

  // Clear existing lines if receiptIds are provided (update path)
  if (cliRows.length > 0 && payload.receiptIds) {
    for (var ci = cliRows.length - 1; ci >= 0; ci--) {
      cliSheet.deleteRow(cliRows[ci].rowIndex);
    }
    cliRows = [];
  }

  if (receiptIds.length > 0) {
    var perLineAmount = total / receiptIds.length;
    for (var ri = 0; ri < receiptIds.length; ri++) {
      // missing_receipt_flag is always false here: receiptIds present means we have receipts
      var cliValues = [
        Ids.childId(claimId, ri + 1, "CLAIMLINE"),
        claimId,
        payload.budgetLineId || "",
        receiptIds[ri] || "",
        perLineAmount,
        payload.notes || "",
        false,
      ];
      _appendRow(cliSheet, cliValues);
    }
  } else {
    var missingReceipt = !payload.receiptId;
    var cliValues = [
      Ids.childId(claimId, 1, "CLAIMLINE"),
      claimId,
      payload.budgetLineId || "",
      payload.receiptId || "",
      total,
      payload.notes || "",
      missingReceipt,
    ];
    if (cliRows.length > 0) {
      var cliC = COLS.ClaimLineItems;
      cliSheet
        .getRange(cliRows[0].rowIndex, 1, 1, cliValues.length)
        .setValues([cliValues]);
    } else {
      _appendRow(cliSheet, cliValues);
    }
  }

  Audit.append(
    operator.userId,
    "ExpenseClaim",
    claimId,
    payload.claimId ? "DRAFT_UPDATE" : "DRAFT_CREATE",
    { uuid: payload.uuid }
  );
  return _ok({ claim_id: claimId, status: STATUS.ExpenseClaim.DRAFT });
}

/**
 * Attach receipt IDs to an existing claim.
 * Allows adding receipts to claims that have not yet reached APPROVED_FOR_PAYOUT.
 * Does not remove existing lines — only appends new ClaimLineItems.
 */
function api_attachReceipts(claimId, receiptIds) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (!(receiptIds && Array.isArray(receiptIds)) || receiptIds.length === 0) {
    return _err("INVALID_PARAMETER", "receiptIds array is required");
  }

  var existing = Engine._loadRow("ExpenseClaim", claimId);
  if (!existing) {
    return _err("NOT_FOUND", "Claim not found");
  }
  if (existing.values[COLS.ExpenseClaims.created_by - 1] !== operator.userId) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }

  var attachableStatuses = [
    STATUS.ExpenseClaim.DRAFT,
    STATUS.ExpenseClaim.SUBMITTED,
    STATUS.ExpenseClaim.NEEDS_INFO,
    STATUS.ExpenseClaim.VERIFIED,
  ];
  var claimStatus = existing.values[COLS.ExpenseClaims.status - 1];
  if (attachableStatuses.indexOf(claimStatus) === -1) {
    return _err(
      "ILLEGAL_STATE",
      "Receipts can only be attached to DRAFT, SUBMITTED, NEEDS_INFO, or VERIFIED claims"
    );
  }

  var cliSheet = getSheet_(TABS.CLAIM_LINE_ITEMS);
  var existingLines = Engine._findRowsByColumn(
    cliSheet,
    COLS.ClaimLineItems.claim_id,
    claimId
  );
  var budgetLineId =
    existingLines.length > 0
      ? existingLines[0].values[COLS.ClaimLineItems.budget_line_id - 1]
      : "";

  for (var i = 0; i < receiptIds.length; i++) {
    var nextLineNum = existingLines.length + i + 1;
    _appendRow(cliSheet, [
      Ids.childId(claimId, nextLineNum, "CLAIMLINE"),
      claimId,
      budgetLineId,
      receiptIds[i],
      0,
      "",
      false,
    ]);
  }

  Audit.append(operator.userId, "ExpenseClaim", claimId, "RECEIPTS_ATTACHED", {
    receiptIds,
  });
  return _ok({ claim_id: claimId, status: claimStatus });
}

/**
 * Submit a DRAFT claim for review.
 */
function api_submitDraftClaim(claimId) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  var existing = Engine._loadRow("ExpenseClaim", claimId);
  if (!existing) {
    return _err("NOT_FOUND", "Claim not found");
  }
  if (existing.values[COLS.ExpenseClaims.created_by - 1] !== operator.userId) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }
  if (
    existing.values[COLS.ExpenseClaims.status - 1] !== STATUS.ExpenseClaim.DRAFT
  ) {
    return _err("ILLEGAL_STATE", "Only DRAFT claims can be submitted");
  }

  var result = Engine.transition(
    "ExpenseClaim",
    claimId,
    "SUBMIT",
    operator.userId,
    {}
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({
    claim_id: claimId,
    status: result.to,
    submitted_at: Audit._nowIso(),
  });
}

/**
 * Atomic draft-first submission: validate everything, upload files, create
 * the claim row and line items, and submit — all in one operation with
 * rollback on failure.
 */
function api_atomicSubmitClaim(payload) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }

  // ── Upfront validation ─────────────────────────────────────────────
  var errors = []; // { field: String, message: String }

  if (!payload.claimantId) {
    errors.push({ field: "claimantId", message: "Claimant is required" });
  } else if (!_getActiveClaimant(payload.claimantId)) {
    errors.push({
      field: "claimantId",
      message: "Claimant must be an active member with an 8-digit SID",
    });
  }

  var total = Number(payload.amount) || 0;
  if (total <= 0) {
    errors.push({ field: "amount", message: "Amount must be greater than 0" });
  }
  if (total > 0 && total !== Math.round(total * 100) / 100) {
    errors.push({
      field: "amount",
      message: "Amount must have at most two decimal places",
    });
  }

  if (!payload.expenseDate) {
    errors.push({ field: "expenseDate", message: "Expense date is required" });
  }
  if (!payload.notes) {
    errors.push({ field: "notes", message: "Notes are required" });
  }
  if (!payload.uuid) {
    errors.push({
      field: "uuid",
      message: "Idempotency key (uuid) is required",
    });
  }

  if (payload.budgetLineId) {
    var budgetLine = Engine._loadRow("BudgetRequestLine", payload.budgetLineId);
    if (
      !budgetLine ||
      budgetLine.values[COLS.BudgetRequestLines.line_status - 1] !==
        STATUS.BudgetRequestLine.APPROVED
    ) {
      errors.push({
        field: "budgetLineId",
        message: "Selected Budget Line is not approved",
      });
    }
  } else {
    errors.push({
      field: "budgetLineId",
      message: "An approved Budget Line is required",
    });
  }

  var validMethods = [
    PAYOUT_METHOD.FPS,
    PAYOUT_METHOD.PAYME,
    PAYOUT_METHOD.OTHER,
  ];
  if (validMethods.indexOf(payload.payoutMethod) === -1) {
    errors.push({
      field: "payoutMethod",
      message: "Invalid payout method: " + payload.payoutMethod,
    });
  }
  var fpsPhone = String(payload.fpsPhone || "").trim();
  var fpsAccount = String(payload.fpsAccount || "").trim();
  var paymePhone = String(payload.paymePhone || "").trim();
  var otherDetails = String(payload.otherDetails || "").trim();
  if (payload.payoutMethod === PAYOUT_METHOD.FPS && !(fpsPhone && fpsAccount)) {
    errors.push({
      field: "payment",
      message: "FPS requires a phone number and destination account",
    });
  }
  if (
    payload.payoutMethod === PAYOUT_METHOD.PAYME &&
    Boolean(paymePhone) === Boolean(payload.qrFile)
  ) {
    errors.push({
      field: "payment",
      message: "PayMe requires exactly one phone number or Payment QR Code",
    });
  }
  if (payload.payoutMethod === PAYOUT_METHOD.OTHER && !otherDetails) {
    errors.push({
      field: "otherDetails",
      message: "OTHER payment method requires payment details",
    });
  }

  // Validate receipt files upfront
  var receipts = payload.receipts || [];
  for (var ri = 0; ri < receipts.length; ri++) {
    var rf = receipts[ri];
    if (!(rf.fileName && rf.mimeType && rf.base64Data)) {
      errors.push({
        field: "receipts[" + ri + "]",
        message: "Receipt " + (ri + 1) + " is missing file data",
      });
      continue;
    }
    if (allowedReceiptMimes.indexOf(rf.mimeType) === -1) {
      errors.push({
        field: "receipts[" + ri + "]",
        message:
          "Unsupported file type for receipt " +
          (ri + 1) +
          ". Allowed: PNG, JPEG, GIF, PDF.",
      });
    }
    var receiptBytes = Utilities.base64Decode(rf.base64Data);
    if (receiptBytes.length > maxReceiptBytes) {
      errors.push({
        field: "receipts[" + ri + "]",
        message: "Receipt " + (ri + 1) + " exceeds 5 MB limit.",
      });
    }
  }

  // Validate QR file if present
  var qrFile = payload.qrFile || null;
  if (qrFile) {
    if (qrFile.fileName && qrFile.mimeType && qrFile.base64Data) {
      var qrMimes = ["image/png", "image/jpeg", "image/jpg"];
      if (qrMimes.indexOf(qrFile.mimeType) === -1) {
        errors.push({
          field: "qrFile",
          message: "QR file must be PNG or JPEG",
        });
      }
      var qrBytes = Utilities.base64Decode(qrFile.base64Data);
      if (qrBytes.length > maxReceiptBytes) {
        errors.push({
          field: "qrFile",
          message: "QR file exceeds 5 MB limit.",
        });
      }
    } else {
      errors.push({ field: "qrFile", message: "QR file is missing file data" });
    }
  }

  if (errors.length > 0) {
    return _err("VALIDATION_ERROR", "Multiple validation errors", { errors });
  }

  // ── Idempotency check ──────────────────────────────────────────────
  var prior = _claimUuidAlreadySubmitted(payload.uuid);
  if (prior) {
    return _ok({
      claim_id: prior.claim_id,
      message: "Already processed",
      status: prior.status,
      success: true,
    });
  }

  // ── Track created artifacts for rollback ────────────────────────────
  var createdIds = []; // { type: 'receipt'|'claim'|'drivefile', entityId: String, driveFileId: String? }

  function _cleanup() {
    for (var ci = createdIds.length - 1; ci >= 0; ci--) {
      var art = createdIds[ci];
      try {
        if (art.type === "claim") {
          var claimSheet = getSheet_(TABS.EXPENSE_CLAIMS);
          var claimRows = Engine._findRowsByColumn(
            claimSheet,
            COLS.ExpenseClaims.claim_id,
            art.entityId
          );
          for (var cdi = claimRows.length - 1; cdi >= 0; cdi--) {
            claimSheet.deleteRow(claimRows[cdi].rowIndex);
          }
        }
        if (art.type === "claimline") {
          var cliSheet = getSheet_(TABS.CLAIM_LINE_ITEMS);
          var cliRows = Engine._findRowsByColumn(
            cliSheet,
            COLS.ClaimLineItems.claim_id,
            art.entityId
          );
          for (var li = cliRows.length - 1; li >= 0; li--) {
            cliSheet.deleteRow(cliRows[li].rowIndex);
          }
        }
        if (art.type === "receipt") {
          var rcSheet = getSheet_(TABS.RECEIPTS);
          var rcRows = Engine._findRowsByColumn(
            rcSheet,
            COLS.Receipts.receipt_id,
            art.entityId
          );
          for (var rdi = rcRows.length - 1; rdi >= 0; rdi--) {
            rcSheet.deleteRow(rcRows[rdi].rowIndex);
          }
        }
        if (art.type === "drivefile" && art.driveFileId) {
          try {
            DriveApp.getFileById(art.driveFileId).setTrashed(true);
          } catch (e) {}
        }
        if (art.type === "drivefolder" && art.driveFileId) {
          try {
            DriveApp.getFolderById(art.driveFileId).setTrashed(true);
          } catch (e) {}
        }
      } catch (e) {
        // Best-effort cleanup
      }
    }
  }

  try {
    // ── Claim row ──────────────────────────────────────────────────────
    var claimId = payload.claimId || Ids.nextId("ExpenseClaim");
    var now = Audit._nowIso();
    var lateFlag = _isLate(payload.expenseDate);
    var c = COLS.ExpenseClaims;
    var claimRowIndex;
    var claimRowSheet;

    if (payload.claimId) {
      var existing = Engine._loadRow("ExpenseClaim", claimId);
      if (!existing) {
        throw new Error("Claim not found");
      }
      if (
        existing.values[COLS.ExpenseClaims.created_by - 1] !== operator.userId
      ) {
        throw new Error("Unauthorized");
      }
      if (
        existing.values[COLS.ExpenseClaims.status - 1] !==
        STATUS.ExpenseClaim.DRAFT
      ) {
        throw new Error("Only DRAFT claims can be submitted");
      }
      // Update existing draft
      var sheet = existing.sheet;
      claimRowIndex = existing.rowIndex;
      claimRowSheet = sheet;
      sheet
        .getRange(existing.rowIndex, c.claimant_id)
        .setValue(payload.claimantId);
      sheet.getRange(existing.rowIndex, c.total_amount).setValue(total);
      sheet.getRange(existing.rowIndex, c.notes).setValue(payload.notes || "");
      sheet.getRange(existing.rowIndex, c.late_flag).setValue(lateFlag);
      sheet
        .getRange(existing.rowIndex, c.expense_date)
        .setValue(payload.expenseDate || "");
      sheet
        .getRange(existing.rowIndex, c.semester)
        .setValue(payload.semester || "");
      sheet
        .getRange(existing.rowIndex, c.event_id)
        .setValue(payload.eventId || "");
      sheet
        .getRange(existing.rowIndex, c.payout_method)
        .setValue(payload.payoutMethod || "FPS");
      sheet
        .getRange(existing.rowIndex, c.payout_handle)
        .setValue(_paymentHandle(payload));
    } else {
      claimRowSheet = getSheet_(TABS.EXPENSE_CLAIMS);
      claimRowIndex = _appendRow(claimRowSheet, [
        claimId,
        payload.claimantId,
        STATUS.ExpenseClaim.DRAFT,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        total,
        lateFlag,
        false,
        payload.notes || "",
        payload.uuid,
        operator.userId,
        payload.expenseDate || "",
        payload.semester || "",
        payload.eventId || "",
        payload.payoutMethod || "FPS",
        _paymentHandle(payload),
      ]);
      createdIds.push({ entityId: claimId, type: "claim" });
    }

    // ── Upload receipt files ──────────────────────────────────────────
    var receiptIdList = [];
    var folderId =
      PropertiesService.getScriptProperties().getProperty("RECEIPTS_FOLDER_ID");
    var receiptFolder = folderId ? DriveApp.getFolderById(folderId) : null;

    for (var i = 0; i < receipts.length; i++) {
      var rf = receipts[i];
      var bytes = Utilities.base64Decode(rf.base64Data);
      var sha256 = _sha256Hex(bytes);

      // Check for duplicate hash by same user
      var rcSheet = getSheet_(TABS.RECEIPTS);
      var rcData = rcSheet.getDataRange().getValues();
      var rcHashCol = COLS.Receipts.sha256 - 1;
      var rcUploaderCol = COLS.Receipts.uploaded_by - 1;
      var rcIdCol = COLS.Receipts.receipt_id - 1;
      var foundDup = false;
      for (var d = 1; d < rcData.length; d++) {
        if (rcData[d][rcHashCol] === sha256) {
          if (rcData[d][rcUploaderCol] === operator.userId) {
            receiptIdList.push(rcData[d][rcIdCol]);
            foundDup = true;
          } else {
            _cleanup();
            return _err(
              "UNAUTHORIZED",
              "Duplicate receipt detected (receipt " +
                (i + 1) +
                " uploaded by another user)."
            );
          }
          break;
        }
      }
      if (foundDup) {
        continue;
      }

      // Upload to Drive
      var blob = Utilities.newBlob(bytes, rf.mimeType, rf.fileName);
      var receiptId = Ids.nextId("Receipt");
      var newName = receiptId + "_" + rf.fileName;
      blob.setName(newName);
      var file = receiptFolder.createFile(blob);
      var driveFileId = file.getId();
      createdIds.push({ driveFileId, entityId: receiptId, type: "drivefile" });

      var fileLink =
        '=HYPERLINK("https://drive.google.com/open?id=' +
        driveFileId +
        '", "View Receipt")';

      _appendRow(rcSheet, [
        receiptId,
        driveFileId,
        sha256,
        operator.userId,
        now,
        rf.vendor || "",
        rf.receiptDate || "",
        Number(rf.receiptTotal) || 0,
        fileLink,
      ]);
      createdIds.push({ entityId: receiptId, type: "receipt" });
      receiptIdList.push(receiptId);
    }

    // ── Upload QR file if present (separate record, NOT a purchase receipt) ─
    var qrDriveFileId = "";
    if (qrFile) {
      var qrBytes = Utilities.base64Decode(qrFile.base64Data);
      var qrBlob = Utilities.newBlob(qrBytes, qrFile.mimeType, qrFile.fileName);
      var qrNewName = claimId + "_PAYMENT_QR_" + qrFile.fileName;
      qrBlob.setName(qrNewName);
      var qrFolderId = PropertiesService.getScriptProperties().getProperty(
        "PAYMENT_QR_CODES_FOLDER_ID"
      );
      var qrFolder = qrFolderId ? DriveApp.getFolderById(qrFolderId) : null;
      if (!qrFolder) {
        throw new Error("Payment QR Code folder is not configured");
      }
      var qrDriveFile = qrFolder.createFile(qrBlob);
      qrDriveFileId = qrDriveFile.getId();
      createdIds.push({
        driveFileId: qrDriveFileId,
        entityId: claimId,
        type: "drivefile",
      });
      claimRowSheet
        .getRange(claimRowIndex, c.payout_handle)
        .setValue(_paymentHandle(payload, qrDriveFileId));
    }

    // ── Create ClaimLineItems ─────────────────────────────────────────
    if (receiptIdList.length > 0) {
      var perLineAmount = total / receiptIdList.length;
      for (var ri2 = 0; ri2 < receiptIdList.length; ri2++) {
        var cliId = Ids.childId(claimId, ri2 + 1, "CLAIMLINE");
        _appendRow(getSheet_(TABS.CLAIM_LINE_ITEMS), [
          cliId,
          claimId,
          payload.budgetLineId || "",
          receiptIdList[ri2] || "",
          perLineAmount,
          payload.notes || "",
          false,
        ]);
      }
    } else {
      var cliId = Ids.childId(claimId, 1, "CLAIMLINE");
      _appendRow(getSheet_(TABS.CLAIM_LINE_ITEMS), [
        cliId,
        claimId,
        payload.budgetLineId || "",
        "",
        total,
        payload.notes || "",
        true,
      ]);
    }
    createdIds.push({ entityId: claimId, type: "claimline" });

    // ── Transition DRAFT → SUBMITTED ──────────────────────────────────
    var transitionResult = Engine.transition(
      "ExpenseClaim",
      claimId,
      "SUBMIT",
      operator.userId,
      {}
    );
    if (!transitionResult.ok) {
      _cleanup();
      return _err("ENGINE_ERROR", transitionResult.reason);
    }
    if (payload.claimId) {
      existing.sheet
        .getRange(existing.rowIndex, c.processed_response_id)
        .setValue(payload.uuid);
    }

    // ── Success: discard cleanup list, return result ──────────────────
    createdIds = [];

    Audit.append(operator.userId, "ExpenseClaim", claimId, "ATOMIC_SUBMIT", {
      hasQr: !!qrFile,
      lines: receiptIdList.length,
      uuid: payload.uuid,
    });
    try {
      Discord.postStatus(claimId, payload.notes, transitionResult.to, null);
    } catch (e) {}

    return _ok({
      claim_id: claimId,
      receipt_ids: receiptIdList,
      status: transitionResult.to,
      submitted_at: Audit._nowIso(),
    });
  } catch (e) {
    _cleanup();
    return _err(
      "ATOMIC_SUBMIT_FAILED",
      "Atomic submission failed: " + e.message
    );
  }
}

// ---------------------------------------------------------------------------
// Claim Review API
// ---------------------------------------------------------------------------

function api_getClaimsQueue(filters) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  filters = filters || {};

  var sheet = getSheet_(TABS.EXPENSE_CLAIMS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.ExpenseClaims;
  var out = [];

  var queueStatuses = [
    STATUS.ExpenseClaim.SUBMITTED,
    STATUS.ExpenseClaim.NEEDS_INFO,
    STATUS.ExpenseClaim.VERIFIED,
  ];
  var filterStatus = filters.status;
  var filterEvent = filters.eventId;
  var filterCreator = filters.creator;
  var filterBudgetLine = filters.budgetLine;
  var filterSid = filters.sid;

  var claimIdsByBudgetLine = null;
  if (filterBudgetLine) {
    claimIdsByBudgetLine = {};
    var cliSheet = getSheet_(TABS.CLAIM_LINE_ITEMS);
    var cliValues = cliSheet.getDataRange().getValues();
    var cliC = COLS.ClaimLineItems;
    for (var j = 1; j < cliValues.length; j++) {
      if (cliValues[j][cliC.budget_line_id - 1] === filterBudgetLine) {
        claimIdsByBudgetLine[cliValues[j][cliC.claim_id - 1]] = true;
      }
    }
  }

  var userIdBySid = null;
  if (filterSid) {
    var vaultSheet = getVaultSheet_();
    var vaultValues = vaultSheet.getDataRange().getValues();
    var vaultC = COLS.Vault;
    for (var k = 1; k < vaultValues.length; k++) {
      if (String(vaultValues[k][vaultC.student_id - 1]) === String(filterSid)) {
        userIdBySid = vaultValues[k][vaultC.user_id - 1];
        break;
      }
    }
  }

  for (var i = 1; i < values.length; i++) {
    var status = values[i][c.status - 1];
    if (queueStatuses.indexOf(status) === -1) {
      continue;
    }
    if (filterStatus && status !== filterStatus) {
      continue;
    }
    if (filterEvent && values[i][c.event_id - 1] !== filterEvent) {
      continue;
    }
    if (filterCreator && values[i][c.created_by - 1] !== filterCreator) {
      continue;
    }
    if (filterBudgetLine && !claimIdsByBudgetLine[values[i][c.claim_id - 1]]) {
      continue;
    }
    if (filterSid && values[i][c.claimant_id - 1] !== userIdBySid) {
      continue;
    }

    out.push({
      claim_id: values[i][c.claim_id - 1],
      claimant_id: values[i][c.claimant_id - 1],
      created_by: values[i][c.created_by - 1],
      event_id: values[i][c.event_id - 1],
      notes: values[i][c.notes - 1],
      status,
      submitted_at: values[i][c.submitted_at - 1],
      total_amount: values[i][c.total_amount - 1],
      verified_at: values[i][c.verified_at - 1],
    });
  }
  return _ok(out);
}

/**
 * Verify a SUBMITTED claim. Calls Engine.transition with VERIFY action.
 */
function api_verifyClaim(claimId, payload) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  payload = payload || {};

  var result = Engine.transition(
    "ExpenseClaim",
    claimId,
    "VERIFY",
    operator.userId,
    payload
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({ claim_id: claimId, from: result.from, to: result.to });
}

/**
 * Reject a claim with a required reason. Calls Engine.transition with REJECT action.
 */
function api_rejectClaim(claimId, reason) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (!(reason && String(reason).trim())) {
    return _err("INVALID_PARAMETER", "Rejection reason is required");
  }

  var result = Engine.transition(
    "ExpenseClaim",
    claimId,
    "REJECT",
    operator.userId,
    { decision_note: reason }
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({ claim_id: claimId, from: result.from, to: result.to });
}

/**
 * Request more information on a SUBMITTED claim. Calls Engine.transition with REQUEST_INFO action.
 */
function api_requestInfo(claimId, reason) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (!(reason && String(reason).trim())) {
    return _err("INVALID_PARAMETER", "Request note is required");
  }

  var result = Engine.transition(
    "ExpenseClaim",
    claimId,
    "REQUEST_INFO",
    operator.userId,
    { decision_note: reason }
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({ claim_id: claimId, from: result.from, to: result.to });
}

/**
 * Resubmit a NEEDS_INFO claim. Calls Engine.transition with RESUBMIT action.
 */
function api_resubmitClaim(claimId) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }

  var existing = Engine._loadRow("ExpenseClaim", claimId);
  if (!existing) {
    return _err("NOT_FOUND", "Claim not found");
  }
  if (existing.values[COLS.ExpenseClaims.created_by - 1] !== operator.userId) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }

  var result = Engine.transition(
    "ExpenseClaim",
    claimId,
    "RESUBMIT",
    operator.userId,
    {}
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({ claim_id: claimId, from: result.from, to: result.to });
}

/**
 * Approve a VERIFIED claim for payout (Treasurer only).
 */
// ---------------------------------------------------------------------------
// Finance Accounts API
// ---------------------------------------------------------------------------

/**
 * Get all Finance Accounts with their balances.
 * Available to all operators (COMMITTEE and TREASURER).
 */
function api_getAccounts() {
  try {
    _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  var sheet = getSheet_(TABS.FINANCE_ACCOUNTS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.FinanceAccounts;
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][c.account_id - 1]) {
      continue;
    }
    out.push({
      account_id: values[i][c.account_id - 1],
      created_at: values[i][c.created_at - 1] || "",
      current_balance: Number(values[i][c.current_balance - 1]) || 0,
      deactivated_at: values[i][c.deactivated_at - 1] || "",
      name: values[i][c.name - 1],
      opening_balance: Number(values[i][c.opening_balance - 1]) || 0,
      pending_income: Number(values[i][c.pending_income - 1]) || 0,
      reserved_payouts: Number(values[i][c.reserved_payouts - 1]) || 0,
      status: values[i][c.status - 1],
    });
  }
  return _ok(out);
}

/**
 * Add a new Finance Account (Treasurer only).
 */
function api_addAccount(payload) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }
  if (!(payload.name && String(payload.name).trim())) {
    return _err("INVALID_PARAMETER", "Account name is required");
  }

  var accountId = Ids.nextId("FinanceAccount");
  var now = Audit._nowIso();
  var c = COLS.FinanceAccounts;
  var openingBalance = Number(payload.opening_balance) || 0;
  _appendRow(getSheet_(TABS.FINANCE_ACCOUNTS), [
    accountId,
    String(payload.name).trim(),
    openingBalance,
    openingBalance,
    0,
    0,
    STATUS.FinanceAccount.ACTIVE,
    now,
    "",
  ]);

  Audit.append(operator.userId, "FinanceAccount", accountId, "CREATE", {
    name: payload.name,
    openingBalance,
  });
  return _ok({
    account_id: accountId,
    name: String(payload.name).trim(),
    status: STATUS.FinanceAccount.ACTIVE,
  });
}

/**
 * Rename an active Finance Account (Treasurer only).
 */
function api_renameAccount(accountId, newName) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }
  if (!(newName && String(newName).trim())) {
    return _err("INVALID_PARAMETER", "Account name is required");
  }

  var row = Engine._loadRow("FinanceAccount", accountId);
  if (!row) {
    return _err("NOT_FOUND", "Account not found");
  }
  if (
    row.values[COLS.FinanceAccounts.status - 1] !== STATUS.FinanceAccount.ACTIVE
  ) {
    return _err("ILLEGAL_STATE", "Only active accounts can be renamed");
  }

  row.sheet
    .getRange(row.rowIndex, COLS.FinanceAccounts.name)
    .setValue(String(newName).trim());
  Audit.append(operator.userId, "FinanceAccount", accountId, "RENAME", {
    newName,
  });
  return _ok({ account_id: accountId, name: String(newName).trim() });
}

/**
 * Deactivate a Finance Account (Treasurer only). Historical data retained.
 */
function api_deactivateAccount(accountId) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }

  var row = Engine._loadRow("FinanceAccount", accountId);
  if (!row) {
    return _err("NOT_FOUND", "Account not found");
  }
  if (
    row.values[COLS.FinanceAccounts.status - 1] !== STATUS.FinanceAccount.ACTIVE
  ) {
    return _err("ILLEGAL_STATE", "Account is already inactive");
  }

  var now = Audit._nowIso();
  row.sheet
    .getRange(row.rowIndex, COLS.FinanceAccounts.status)
    .setValue(STATUS.FinanceAccount.INACTIVE);
  row.sheet
    .getRange(row.rowIndex, COLS.FinanceAccounts.deactivated_at)
    .setValue(now);
  Audit.append(operator.userId, "FinanceAccount", accountId, "DEACTIVATE", {});
  return _ok({ account_id: accountId, status: STATUS.FinanceAccount.INACTIVE });
}

// ---------------------------------------------------------------------------
// Income Workflow API
// ---------------------------------------------------------------------------

/**
 * Record new income. Available to all operators (COMMITTEE, TREASURER).
 * The income starts as PENDING and must be confirmed by a Treasurer.
 */
function api_recordIncome(payload) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (!payload.date) {
    return _err("INVALID_PARAMETER", "Date is required");
  }
  if (!payload.categoryId) {
    return _err("INVALID_PARAMETER", "Category is required");
  }
  if (!payload.amount || Number(payload.amount) <= 0) {
    return _err("INVALID_PARAMETER", "Amount must be positive");
  }
  if (!payload.accountId && payload.proposedAccountId) {
    payload.accountId = payload.proposedAccountId;
  }

  var result = Engine.recordIncome(
    payload.date,
    payload.categoryId,
    Number(payload.amount),
    payload.sourceRef || "",
    payload.eventId || "",
    payload.notes || "",
    operator.userId,
    payload.accountId || "",
    payload.uuid || ""
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason || "Failed to record income");
  }
  return _ok({ income_id: result.incomeId, status: STATUS.Income.PENDING });
}

/**
 * Get all pending income (Treasurer review queue).
 */
function api_getPendingIncome() {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }

  var sheet = getSheet_(TABS.INCOME);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Income;
  var out = [];

  var queueStatuses = [STATUS.Income.PENDING, STATUS.Income.NEEDS_INFO];
  for (var i = 1; i < values.length; i++) {
    var status = values[i][c.status - 1];
    if (queueStatuses.indexOf(status) === -1) {
      continue;
    }
    out.push({
      account_id: values[i][c.account_id - 1] || "",
      amount: Number(values[i][c.amount - 1]) || 0,
      category_id: values[i][c.category_id - 1],
      date: values[i][c.date - 1],
      decided_at: values[i][c.decided_at - 1] || "",
      decided_by: values[i][c.decided_by - 1] || "",
      decision_note: values[i][c.decision_note - 1] || "",
      event_id: values[i][c.event_id - 1] || "",
      income_id: values[i][c.income_id - 1],
      notes: values[i][c.notes - 1] || "",
      received_by: values[i][c.received_by - 1],
      source_ref: values[i][c.source_ref - 1] || "",
      status,
    });
  }
  return _ok(out);
}

/**
 * Confirm pending income and post to account balance (Treasurer only).
 */
function api_confirmIncome(incomeId, accountId) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }

  var result = Engine.confirmIncome(incomeId, accountId, operator.userId);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({
    account_id: result.accountId,
    income_id: incomeId,
    status: STATUS.Income.CONFIRMED,
  });
}

/**
 * Reject pending income (Treasurer only).
 */
function api_rejectIncome(incomeId, reason) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }
  if (!(reason && String(reason).trim())) {
    return _err("INVALID_PARAMETER", "Rejection reason is required");
  }

  var result = Engine.rejectIncome(incomeId, operator.userId, reason);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({ income_id: incomeId, status: STATUS.Income.REJECTED });
}

/**
 * Request info on pending income (Treasurer only).
 */
function api_requestIncomeInfo(incomeId, reason) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }
  if (!(reason && String(reason).trim())) {
    return _err("INVALID_PARAMETER", "Note is required");
  }

  var result = Engine.requestIncomeInfo(incomeId, operator.userId, reason);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({ income_id: incomeId, status: STATUS.Income.NEEDS_INFO });
}

/**
 * Record an account adjustment (correction) — Treasurer only.
 * direction: 'CREDIT' (add money) or 'DEBIT' (subtract money)
 */
function api_recordAdjustment(payload) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }
  if (!payload.amount || Number(payload.amount) <= 0) {
    return _err("INVALID_PARAMETER", "Amount must be positive");
  }
  if (payload.direction !== "CREDIT" && payload.direction !== "DEBIT") {
    return _err("INVALID_PARAMETER", "Direction must be CREDIT or DEBIT");
  }
  if (!(payload.reason && String(payload.reason).trim())) {
    return _err("INVALID_PARAMETER", "Reason is required");
  }

  var result = Engine.adjustAccount(
    payload.accountId,
    Number(payload.amount),
    payload.direction,
    payload.reason,
    operator.userId
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({
    account_id: payload.accountId,
    adjustment_id: result.adjustmentId,
  });
}

/**
 * Record a transfer between accounts — Treasurer only.
 */
function api_recordTransfer(payload) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }
  if (!payload.amount || Number(payload.amount) <= 0) {
    return _err("INVALID_PARAMETER", "Amount must be positive");
  }
  if (!(payload.reason && String(payload.reason).trim())) {
    return _err("INVALID_PARAMETER", "Reason is required");
  }

  var result = Engine.transferBetweenAccounts(
    payload.fromAccountId,
    payload.toAccountId,
    Number(payload.amount),
    payload.reason,
    operator.userId
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({
    from: payload.fromAccountId,
    to: payload.toAccountId,
    transfer_id: result.transferId,
  });
}

/**
 * Get all account transfers.
 */
function api_getTransfers() {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  var sheet = getSheet_(TABS.ACCOUNT_TRANSFERS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.AccountTransfers;
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][c.transfer_id - 1]) {
      continue;
    }
    out.push({
      amount: Number(values[i][c.amount - 1]) || 0,
      from_account_id: values[i][c.from_account_id - 1],
      reason: values[i][c.reason - 1] || "",
      to_account_id: values[i][c.to_account_id - 1],
      transfer_id: values[i][c.transfer_id - 1],
      transferred_at: values[i][c.transferred_at - 1],
      transferred_by: values[i][c.transferred_by - 1],
    });
  }
  return _ok(out);
}

/**
 * Get all account adjustments.
 */
function api_getAdjustments(accountId) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  var sheet = getSheet_(TABS.ACCOUNT_ADJUSTMENTS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.AccountAdjustments;
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][c.adjustment_id - 1]) {
      continue;
    }
    if (accountId && values[i][c.account_id - 1] !== accountId) {
      continue;
    }
    out.push({
      account_id: values[i][c.account_id - 1],
      adjusted_at: values[i][c.adjusted_at - 1],
      adjusted_by: values[i][c.adjusted_by - 1],
      adjustment_id: values[i][c.adjustment_id - 1],
      amount: Number(values[i][c.amount - 1]) || 0,
      direction: values[i][c.direction - 1],
      reason: values[i][c.reason - 1] || "",
    });
  }
  return _ok(out);
}

// ---------------------------------------------------------------------------
// Payout Lifecycle API
// ---------------------------------------------------------------------------

/**
 * Approve a VERIFIED claim for payout (Treasurer only).
 * Optionally specify the Finance Account to deduct from.
 */
function api_approvePayout(claimId, accountId) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }

  var payload = {};
  if (accountId) {
    payload.account_id = accountId;
  }

  var result = Engine.transition(
    "ExpenseClaim",
    claimId,
    "APPROVE_PAYOUT",
    operator.userId,
    payload
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({ claim_id: claimId, from: result.from, to: result.to });
}

/**
 * Get queued payouts (QUEUED and FAILED) for Treasurer action.
 */
function api_getQueuedPayouts() {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  var sheet = getSheet_(TABS.PAYOUTS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Payouts;
  var out = [];

  var relevantStatuses = [STATUS.Payout.QUEUED, STATUS.Payout.FAILED];
  for (var i = 1; i < values.length; i++) {
    var status = values[i][c.status - 1];
    if (relevantStatuses.indexOf(status) === -1) {
      continue;
    }
    out.push({
      account_id: values[i][c.account_id - 1] || "",
      amount: Number(values[i][c.amount - 1]) || 0,
      claim_id: values[i][c.claim_id - 1],
      failure_reason: values[i][c.failure_reason - 1] || "",
      method: values[i][c.method - 1] || "",
      parent_payout_id: values[i][c.parent_payout_id - 1] || "",
      payee_user_id: values[i][c.payee_user_id - 1],
      payout_id: values[i][c.payout_id - 1],
      status,
      txn_reference: values[i][c.txn_reference - 1] || "",
    });
  }
  return _ok(out);
}

/**
 * Mark a queued payout as sent, deduct from account (Treasurer only).
 */
function api_markPayoutSent(payoutId, payload) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }
  var payoutRow = Engine._loadRow("Payout", payoutId);
  if (!payoutRow) {
    return _err("NOT_FOUND", "Payout not found");
  }
  var c = COLS.Payouts;
  var method = payload.method || payoutRow.values[c.method - 1];
  if (!method) {
    return _err("INVALID_PARAMETER", "Payment method is required");
  }
  var sentAmount =
    payload.amount == null
      ? Number(payoutRow.values[c.amount - 1]) || 0
      : Number(payload.amount);
  if (sentAmount <= 0) {
    return _err("INVALID_PARAMETER", "Amount must be positive");
  }

  var result = Payouts.markPayoutSent(
    payoutId,
    sentAmount,
    method,
    payload.txnReference || "",
    operator.userId
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({ payout_id: payoutId, status: STATUS.Payout.SENT });
}

/**
 * Record a failed payout attempt (Treasurer only).
 */
function api_recordPayoutFailed(payoutId, failureReason) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }
  if (!(failureReason && String(failureReason).trim())) {
    return _err("INVALID_PARAMETER", "Failure reason is required");
  }

  var result = Payouts.recordPayoutFailed(
    payoutId,
    failureReason,
    operator.userId
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({ payout_id: payoutId, status: STATUS.Payout.FAILED });
}

/**
 * Retry a failed payout (Treasurer only).
 */
function api_retryPayout(payoutId) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized");
  }

  var result = Payouts.retryPayout(payoutId, operator.userId);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({ payout_id: result.newPayoutId, status: STATUS.Payout.QUEUED });
}

// ---------------------------------------------------------------------------
// Dashboard + Reports API
// ---------------------------------------------------------------------------

/**
 * Returns a needs-attention summary for the dashboard.
 * Surfaces: missing receipts, over-budget claims, needs-info, failed payouts, pending requests.
 */
function api_getDashboardSummary() {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }

  var claimsSheet = getSheet_(TABS.EXPENSE_CLAIMS);
  var claimsValues = claimsSheet.getDataRange().getValues();
  var cc = COLS.ExpenseClaims;

  var cliSheet = getSheet_(TABS.CLAIM_LINE_ITEMS);
  var cliValues = cliSheet.getDataRange().getValues();
  var cliC = COLS.ClaimLineItems;

  var budgetLineSheet = getSheet_(TABS.BUDGET_REQUEST_LINES);
  var blValues = budgetLineSheet.getDataRange().getValues();
  var blC = COLS.BudgetRequestLines;

  var payoutSheet = getSheet_(TABS.PAYOUTS);
  var payoutValues = payoutSheet.getDataRange().getValues();
  var pc = COLS.Payouts;

  var requestSheet = getSheet_(TABS.BUDGET_REQUESTS);
  var requestValues = requestSheet.getDataRange().getValues();
  var rc = COLS.BudgetRequests;

  var missingReceipt = [];
  var overBudget = [];
  var needsInfo = [];
  var failedPayouts = [];
  var pendingRequests = [];

  var activeClaimStatuses = [
    STATUS.ExpenseClaim.SUBMITTED,
    STATUS.ExpenseClaim.NEEDS_INFO,
    STATUS.ExpenseClaim.VERIFIED,
  ];
  var unresolvedRequestStatuses = [STATUS.BudgetRequest.PENDING];

  // Build budget line remaining lookup
  var budgetLineRemaining = {};
  for (var bi = 1; bi < blValues.length; bi++) {
    var blId = blValues[bi][blC.line_id - 1];
    if (blId) {
      budgetLineRemaining[blId] = Number(blValues[bi][blC.remaining - 1]) || 0;
    }
  }

  // Check claims for missing receipts
  for (var ci = 1; ci < cliValues.length; ci++) {
    if (cliValues[ci][cliC.missing_receipt_flag - 1] === true) {
      var claimId = cliValues[ci][cliC.claim_id - 1];
      for (var cj = 1; cj < claimsValues.length; cj++) {
        if (claimsValues[cj][cc.claim_id - 1] === claimId) {
          var cStatus = claimsValues[cj][cc.status - 1];
          if (
            cStatus !== STATUS.ExpenseClaim.DRAFT &&
            cStatus !== STATUS.ExpenseClaim.REJECTED
          ) {
            missingReceipt.push({
              claim_id: claimId,
              claim_status: cStatus,
              notes: claimsValues[cj][cc.notes - 1],
              total_amount: Number(claimsValues[cj][cc.total_amount - 1]) || 0,
            });
          }
          break;
        }
      }
    }
  }

  // Check claims for over-budget lines and needs-info
  for (var i = 1; i < claimsValues.length; i++) {
    var status = claimsValues[i][cc.status - 1];
    if (!status) {
      continue;
    }

    if (status === STATUS.ExpenseClaim.NEEDS_INFO) {
      needsInfo.push({
        claim_id: claimsValues[i][cc.claim_id - 1],
        notes: claimsValues[i][cc.notes - 1],
        submitted_at: claimsValues[i][cc.submitted_at - 1],
        total_amount: Number(claimsValues[i][cc.total_amount - 1]) || 0,
      });
    }

    if (activeClaimStatuses.indexOf(status) >= 0) {
      var claimId = claimsValues[i][cc.claim_id - 1];
      var claimTotal = Number(claimsValues[i][cc.total_amount - 1]) || 0;
      // Sum claimed against each budget line for this claim
      var claimedByLine = {};
      for (var j = 1; j < cliValues.length; j++) {
        if (cliValues[j][cliC.claim_id - 1] === claimId) {
          var blId = cliValues[j][cliC.budget_line_id - 1];
          if (blId) {
            claimedByLine[blId] =
              (claimedByLine[blId] || 0) +
              (Number(cliValues[j][cliC.amount - 1]) || 0);
          }
        }
      }
      for (var bl in claimedByLine) {
        var remaining = budgetLineRemaining[bl];
        if (remaining !== undefined && claimedByLine[bl] > remaining) {
          overBudget.push({
            budget_line_id: bl,
            claim_id: claimId,
            claim_status: status,
            claimed: claimedByLine[bl],
            remaining,
          });
        }
      }
    }
  }

  // Failed payouts
  for (var pi = 1; pi < payoutValues.length; pi++) {
    if (payoutValues[pi][pc.status - 1] === STATUS.Payout.FAILED) {
      failedPayouts.push({
        amount: Number(payoutValues[pi][pc.amount - 1]) || 0,
        claim_id: payoutValues[pi][pc.claim_id - 1],
        failure_reason: payoutValues[pi][pc.failure_reason - 1] || "",
        payout_id: payoutValues[pi][pc.payout_id - 1],
      });
    }
  }

  // Pending budget requests
  for (var ri = 1; ri < requestValues.length; ri++) {
    if (
      unresolvedRequestStatuses.indexOf(requestValues[ri][rc.status - 1]) >= 0
    ) {
      pendingRequests.push({
        request_id: requestValues[ri][rc.request_id - 1],
        requester_id: requestValues[ri][rc.requester_id - 1],
        submitted_at: requestValues[ri][rc.submitted_at - 1],
        title: requestValues[ri][rc.title - 1],
      });
    }
  }

  return _ok({
    counts: {
      failed_payouts: failedPayouts.length,
      missing_receipts: missingReceipt.length,
      needs_info: needsInfo.length,
      over_budget: overBudget.length,
      pending_requests: pendingRequests.length,
      total_attention:
        missingReceipt.length +
        overBudget.length +
        needsInfo.length +
        failedPayouts.length +
        pendingRequests.length,
    },
    failed_payouts: failedPayouts,
    missing_receipts: missingReceipt,
    needs_info_claims: needsInfo,
    over_budget_claims: overBudget,
    pending_requests: pendingRequests,
  });
}

/**
 * Get report data for a given entity type with optional filters.
 * type: 'claims' | 'budget' | 'income' | 'payouts' | 'accounts'
 * filters: { status?, fromDate?, toDate?, budgetLine?, eventId? }
 */
function api_getReportsData(reportType, filters) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  filters = filters || {};

  switch (reportType) {
    case "claims":
      return _ok(_buildClaimsReport(filters));
    case "budget":
      return _ok(_buildBudgetReport(filters));
    case "income":
      return _ok(_buildIncomeReport(filters));
    case "payouts":
      return _ok(_buildPayoutsReport(filters));
    case "accounts":
      return _ok(_buildAccountsReport());
    default:
      return _err("INVALID_PARAMETER", "Unknown report type: " + reportType);
  }
}

function _buildClaimsReport(filters) {
  var sheet = getSheet_(TABS.EXPENSE_CLAIMS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.ExpenseClaims;
  var out = [];
  var fromDate = filters.fromDate || "";
  var toDate = filters.toDate || "";
  var filterStatus = filters.status || "";
  var filterEvent = filters.eventId || "";
  var filterBudgetLine = filters.budgetLine || "";

  // Pre-filter by budget line if needed
  var claimIdsByLine = null;
  if (filterBudgetLine) {
    claimIdsByLine = {};
    var cliSheet = getSheet_(TABS.CLAIM_LINE_ITEMS);
    var cliValues = cliSheet.getDataRange().getValues();
    var cliC = COLS.ClaimLineItems;
    for (var j = 1; j < cliValues.length; j++) {
      if (cliValues[j][cliC.budget_line_id - 1] === filterBudgetLine) {
        claimIdsByLine[cliValues[j][cliC.claim_id - 1]] = true;
      }
    }
  }

  for (var i = 1; i < values.length; i++) {
    var status = values[i][c.status - 1];
    if (!status) {
      continue;
    }
    if (status === STATUS.ExpenseClaim.DRAFT) {
      continue;
    }
    if (filterStatus && status !== filterStatus) {
      continue;
    }
    if (filterEvent && values[i][c.event_id - 1] !== filterEvent) {
      continue;
    }
    if (filterBudgetLine && !claimIdsByLine[values[i][c.claim_id - 1]]) {
      continue;
    }

    var submittedAt = String(values[i][c.submitted_at - 1] || "");
    if (fromDate && submittedAt < fromDate) {
      continue;
    }
    if (toDate && submittedAt > toDate) {
      continue;
    }

    out.push({
      approved_at: values[i][c.approved_at - 1] || "",
      claim_id: values[i][c.claim_id - 1],
      claimant_id: values[i][c.claimant_id - 1],
      created_by: values[i][c.created_by - 1],
      event_id: values[i][c.event_id - 1] || "",
      expense_date: values[i][c.expense_date - 1] || "",
      notes: values[i][c.notes - 1] || "",
      paid_at: values[i][c.paid_at - 1] || "",
      payout_method: values[i][c.payout_method - 1] || "",
      self_approval_flag:
        values[i][c.self_approved - 1] === true ? "SELF_APPROVED" : "",
      self_approved: values[i][c.self_approved - 1] === true,
      semester: values[i][c.semester - 1] || "",
      status,
      submitted_at: submittedAt,
      total_amount: Number(values[i][c.total_amount - 1]) || 0,
      verified_at: values[i][c.verified_at - 1] || "",
    });
  }
  return { count: out.length, rows: out, type: "claims" };
}

function _buildBudgetReport(filters) {
  var reqSheet = getSheet_(TABS.BUDGET_REQUESTS);
  var reqValues = reqSheet.getDataRange().getValues();
  var rc = COLS.BudgetRequests;

  var lineSheet = getSheet_(TABS.BUDGET_REQUEST_LINES);
  var lineValues = lineSheet.getDataRange().getValues();
  var lc = COLS.BudgetRequestLines;

  var filterStatus = filters.status || "";
  var fromDate = filters.fromDate || "";
  var toDate = filters.toDate || "";

  var requestLines = {};
  for (var i = 1; i < lineValues.length; i++) {
    var reqId = lineValues[i][lc.request_id - 1];
    if (!reqId) {
      continue;
    }
    if (!requestLines[reqId]) {
      requestLines[reqId] = [];
    }
    requestLines[reqId].push({
      approved_amount: Number(lineValues[i][lc.approved_amount - 1]) || 0,
      category_id: lineValues[i][lc.category_id - 1],
      description: lineValues[i][lc.description - 1],
      line_id: lineValues[i][lc.line_id - 1],
      line_status: lineValues[i][lc.line_status - 1],
      remaining: Number(lineValues[i][lc.remaining - 1]) || 0,
      requested_amount: Number(lineValues[i][lc.requested_amount - 1]) || 0,
    });
  }

  var out = [];
  for (var j = 1; j < reqValues.length; j++) {
    var status = reqValues[j][rc.status - 1];
    if (!status) {
      continue;
    }
    if (status === STATUS.BudgetRequest.DRAFT) {
      continue;
    }
    if (filterStatus && status !== filterStatus) {
      continue;
    }

    var submittedAt = String(reqValues[j][rc.submitted_at - 1] || "");
    if (fromDate && submittedAt < fromDate) {
      continue;
    }
    if (toDate && submittedAt > toDate) {
      continue;
    }

    var id = reqValues[j][rc.request_id - 1];
    var lines = requestLines[id] || [];
    var totalRequested = 0;
    var totalApproved = 0;
    for (var k = 0; k < lines.length; k++) {
      totalRequested += lines[k].requested_amount;
      totalApproved += lines[k].approved_amount;
    }

    out.push({
      decided_at: reqValues[j][rc.decided_at - 1] || "",
      lines,
      request_id: id,
      status,
      submitted_at: submittedAt,
      title: reqValues[j][rc.title - 1],
      total_approved: totalApproved,
      total_requested: totalRequested,
    });
  }
  return { count: out.length, rows: out, type: "budget" };
}

function _buildIncomeReport(filters) {
  var sheet = getSheet_(TABS.INCOME);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Income;
  var out = [];
  var filterStatus = filters.status || "";
  var fromDate = filters.fromDate || "";
  var toDate = filters.toDate || "";

  for (var i = 1; i < values.length; i++) {
    if (!values[i][c.income_id - 1]) {
      continue;
    }
    var status = values[i][c.status - 1];
    if (filterStatus && status !== filterStatus) {
      continue;
    }

    var date = String(values[i][c.date - 1] || "");
    if (fromDate && date < fromDate) {
      continue;
    }
    if (toDate && date > toDate) {
      continue;
    }

    out.push({
      account_id: values[i][c.account_id - 1] || "",
      amount: Number(values[i][c.amount - 1]) || 0,
      category_id: values[i][c.category_id - 1],
      date,
      income_id: values[i][c.income_id - 1],
      notes: values[i][c.notes - 1] || "",
      received_by: values[i][c.received_by - 1],
      source_ref: values[i][c.source_ref - 1] || "",
      status,
    });
  }
  return { count: out.length, rows: out, type: "income" };
}

function _buildPayoutsReport(filters) {
  var sheet = getSheet_(TABS.PAYOUTS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Payouts;
  var out = [];
  var filterStatus = filters.status || "";
  var fromDate = filters.fromDate || "";
  var toDate = filters.toDate || "";

  for (var i = 1; i < values.length; i++) {
    if (!values[i][c.payout_id - 1]) {
      continue;
    }
    var status = values[i][c.status - 1];
    if (filterStatus && status !== filterStatus) {
      continue;
    }

    var paidAt = String(values[i][c.paid_at - 1] || "");
    if (fromDate && paidAt < fromDate) {
      continue;
    }
    if (toDate && paidAt > toDate) {
      continue;
    }

    out.push({
      account_id: values[i][c.account_id - 1] || "",
      amount: Number(values[i][c.amount - 1]) || 0,
      claim_id: values[i][c.claim_id - 1],
      confirmed_at: values[i][c.confirmed_at - 1] || "",
      failure_reason: values[i][c.failure_reason - 1] || "",
      method: values[i][c.method - 1] || "",
      paid_at: paidAt,
      payout_id: values[i][c.payout_id - 1],
      status,
      txn_reference: values[i][c.txn_reference - 1] || "",
    });
  }
  return { count: out.length, rows: out, type: "payouts" };
}

function _buildAccountsReport() {
  var accountsResp = api_getAccounts();
  var transfersResp = api_getTransfers();
  var adjustmentsResp = api_getAdjustments();
  var accounts = accountsResp && accountsResp.ok ? accountsResp.data || [] : [];
  var transfers =
    transfersResp && transfersResp.ok ? transfersResp.data || [] : [];
  var adjustments =
    adjustmentsResp && adjustmentsResp.ok ? adjustmentsResp.data || [] : [];

  return {
    accounts,
    adjustments,
    total_current_balance: accounts.reduce(
      (sum, a) => sum + (Number(a.current_balance) || 0),
      0
    ),
    transfers,
    type: "accounts",
  };
}

/**
 * Generate CSV export for the given report type and filters.
 * Returns a downloadable CSV string.
 */
function api_exportCsv(reportType, filters) {
  try {
    _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  var report = api_getReportsData(reportType, filters);
  if (!(report && report.ok)) {
    return report;
  }
  var rows = (report.data && report.data.rows) || [];
  if (rows.length === 0) {
    return _ok("");
  }

  var headers;
  switch (reportType) {
    case "claims":
      headers = [
        "Claim ID",
        "Claimant",
        "Status",
        "Submitted",
        "Verified",
        "Paid",
        "Amount",
        "Notes",
        "Event",
        "Semester",
        "Expense Date",
        "Method",
      ];
      return _ok(
        _csvRows(
          headers,
          rows.map((r) => [
            r.claim_id,
            r.claimant_id,
            r.status,
            r.submitted_at,
            r.verified_at,
            r.paid_at,
            r.total_amount,
            _csvEscape(r.notes),
            r.event_id,
            r.semester,
            r.expense_date,
            r.payout_method,
          ])
        )
      );
    case "budget":
      headers = [
        "Request ID",
        "Title",
        "Status",
        "Submitted",
        "Decided",
        "Total Requested",
        "Total Approved",
      ];
      return _ok(
        _csvRows(
          headers,
          rows.map((r) => [
            r.request_id,
            r.title,
            r.status,
            r.submitted_at,
            r.decided_at,
            r.total_requested,
            r.total_approved,
          ])
        )
      );
    case "income":
      headers = [
        "Income ID",
        "Date",
        "Category",
        "Amount",
        "Received By",
        "Source",
        "Notes",
        "Account",
        "Status",
      ];
      return _ok(
        _csvRows(
          headers,
          rows.map((r) => [
            r.income_id,
            r.date,
            r.category_id,
            r.amount,
            r.received_by,
            r.source_ref,
            _csvEscape(r.notes),
            r.account_id,
            r.status,
          ])
        )
      );
    case "payouts":
      headers = [
        "Payout ID",
        "Claim ID",
        "Amount",
        "Method",
        "TXN Ref",
        "Status",
        "Account",
        "Paid",
        "Confirmed",
        "Failure Reason",
      ];
      return _ok(
        _csvRows(
          headers,
          rows.map((r) => [
            r.payout_id,
            r.claim_id,
            r.amount,
            r.method,
            r.txn_reference,
            r.status,
            r.account_id,
            r.paid_at,
            r.confirmed_at,
            _csvEscape(r.failure_reason),
          ])
        )
      );
    default:
      return _ok("");
  }
}

function _csvRows(headers, rows) {
  var out = headers.join(",") + "\n";
  for (var i = 0; i < rows.length; i++) {
    out += rows[i].join(",") + "\n";
  }
  return out;
}

function _csvEscape(val) {
  if (val === null || val === undefined) {
    return "";
  }
  var s = String(val);
  if (s.indexOf(",") >= 0 || s.indexOf('"') >= 0 || s.indexOf("\n") >= 0) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ---------------------------------------------------------------------------
// Semester Close API
// ---------------------------------------------------------------------------

/**
 * Get the current semester status, including close blockers.
 */
function api_getSemesterStatus() {
  try {
    _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  return _ok(Engine.getSemesterStatus());
}

/**
 * Suggest a semester for a given expense date.
 */
function api_suggestSemester(expenseDate) {
  try {
    _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  return _ok({ semester: Engine.suggestSemester(expenseDate) });
}

/**
 * Correct the semester assignment on a claim or budget request.
 */
function api_correctSemester(entityType, entityId, newSemester) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  var result = Engine.correctSemester(
    entityType,
    entityId,
    newSemester,
    operator.userId
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok(result);
}

/**
 * Close the current semester. Treasurer only.
 */
function api_closeSemester() {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  var currentSemester = Config.getOptional("CURRENT_SEMESTER") || "26A";
  var result = Engine.closeSemester(currentSemester, operator.userId);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok(result);
}

// ---------------------------------------------------------------------------
// Annual Migration API
// ---------------------------------------------------------------------------

/**
 * Get the current migration state (null if none in progress).
 */
function api_getMigrationState() {
  try {
    _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  return _ok(Migration.getState());
}

/**
 * Get a preview of what would be migrated.
 */
function api_getMigrationPreview() {
  try {
    _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  return _ok(Migration.getPreview());
}

/**
 * Start a migration (creates year folder and new spreadsheet).
 * Treasurer only.
 */
function api_startMigration() {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  var result = Migration.startMigration(operator.userId);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok(result);
}

/**
 * Set selections for what to include in the migration.
 * Treasurer only.
 */
function api_setMigrationSelections(selections) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  var result = Migration.setSelections(operator.userId, selections);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok(result);
}

/**
 * Save member selections only (per-entity step in the 8-stage flow).
 * Treasurer only.
 */
function api_setMemberSelections(memberIds) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  var result = Migration.setMemberSelections(operator.userId, memberIds);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok(result);
}

/**
 * Save account selections + opening balances (per-entity step).
 * Treasurer only.
 */
function api_setAccountSelections(payload) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  var result = Migration.setAccountSelections(operator.userId, payload);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok(result);
}

/**
 * Save event selections (per-entity step).
 * Treasurer only.
 */
function api_setEventSelections(eventIds) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  var result = Migration.setEventSelections(operator.userId, eventIds);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok(result);
}

/**
 * Save category selections (per-entity step).
 * Treasurer only.
 */
function api_setCategorySelections(categoryIds) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  var result = Migration.setCategorySelections(operator.userId, categoryIds);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok(result);
}

/**
 * Save allowlisted operator selections for the new annual file (USERS step).
 * Treasurer only.
 */
function api_setUserSelections(userIds) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  var result = Migration.setUserSelections(operator.userId, userIds);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok(result);
}

/**
 * Run the migration validation gate.
 * Treasurer only.
 */
function api_validateMigration() {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  var result = Migration.validateMigration(operator.userId);
  if (!result.ok) {
    return _err("VALIDATION_FAILED", result.reason || "Validation failed", {
      errors: result.errors,
      warnings: result.warnings,
    });
  }
  return _ok(result);
}

/**
 * Get the current selections for review.
 */
function api_getMigrationSelections() {
  try {
    _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  return _ok(Migration.getSelections());
}

/**
 * Execute the migration (populate the new spreadsheet).
 * Treasurer only.
 */
function api_executeMigration() {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  var result = Migration.executeMigration(operator.userId);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok(result);
}

/**
 * Activate the migration (set new spreadsheet as production).
 * Treasurer only.
 */
function api_activateMigration() {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  var result = Migration.activateMigration(operator.userId);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok(result);
}

/**
 * Cancel an in-progress migration.
 * Treasurer only.
 */
function api_cancelMigration() {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  var result = Migration.cancelMigration(operator.userId);
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok(result);
}

/** Treasurer-only ledger reconciliation summary. */
function api_getReconciliation() {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  return _ok(Reconciliation.build());
}

/** Explicit audited correction for a reconciliation mismatch. */
function api_correctReconciliation(payload) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  if (!(payload.reason && String(payload.reason).trim())) {
    return _err("INVALID_PARAMETER", "Correction reason is required");
  }
  var result = Reconciliation.correct(
    payload.accountId,
    Number(payload.amount),
    payload.direction,
    payload.reason,
    operator.userId
  );
  if (!result.ok) {
    return _err("ENGINE_ERROR", result.reason);
  }
  return _ok({
    account_id: payload.accountId,
    adjustment_id: result.adjustmentId,
  });
}

/** Treasurer-only list of failed Discord delivery records. */
function api_getFailedNotifications() {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  return _ok(NotificationDeliveries.listFailed());
}

/** Retry one failed Discord delivery without touching its finance source. */
function api_retryNotification(deliveryId) {
  var operator;
  try {
    operator = _requireOperator();
  } catch (e) {
    return _err("UNAUTHORIZED", e.message);
  }
  if (operator.role !== ROLES.TREASURER) {
    return _err("UNAUTHORIZED", "Unauthorized: Treasurer only");
  }
  var result = Discord.retry(deliveryId);
  Audit.append(
    operator.userId,
    "NotificationDelivery",
    deliveryId,
    "RETRY_REQUESTED",
    { ok: result.ok, reason: result.reason || null }
  );
  if (!result.ok) {
    return _err("DELIVERY_FAILED", result.reason);
  }
  return _ok({ delivery_id: deliveryId, status: "SENT" });
}

function api_resetAllData() {
  var ledger = SpreadsheetApp.getActive();
  var owner = ledger.getOwner();
  var ownerEmail = owner ? owner.getEmail() : "";
  var activeEmail = Session.getActiveUser().getEmail();
  if (
    !(ownerEmail && activeEmail) ||
    ownerEmail.toLowerCase() !== activeEmail.toLowerCase()
  ) {
    return _denyAccess("owner_required");
  }
  try {
    return _ok(resetAllData());
  } catch (e) {
    if (e && e.message === "AUTH_DENIED") {
      return _denyAccess("owner_required");
    }
    return _err("RESET_FAILED", "Reset failed");
  }
}

if (typeof module !== "undefined") {
  module.exports = {
    _err,
    _isLate,
    _ok,
    _resolveUser,
    _sha256Hex,
    api_activateMigration,
    api_addAccount,
    api_addMember,
    api_approvePayout,
    api_atomicSubmitClaim,
    api_attachReceipts,
    api_cancelMigration,
    api_closeSemester,
    api_confirmIncome,
    api_correctReconciliation,
    api_correctSemester,
    api_deactivateAccount,
    api_decisionBudgetRequest,
    api_deleteOrphanedReceipt,
    api_discardBudgetRequest,
    api_editClaim,
    api_executeMigration,
    api_exportCsv,
    api_getAccounts,
    api_getAdjustments,
    api_getClaimsQueue,
    api_getDashboardSummary,
    api_getFailedNotifications,
    api_getMembers,
    api_getMigrationPreview,
    api_getMigrationSelections,
    api_getMigrationState,
    api_getMyBudgetRequests,
    api_getMyClaims,
    api_getPendingBudgetRequests,
    api_getPendingIncome,
    api_getQueuedPayouts,
    api_getReconciliation,
    api_getReportsData,
    api_getSemesterStatus,
    api_getTransfers,
    api_markPayoutSent,
    api_reactivateMember,
    api_recordAdjustment,
    api_recordIncome,
    api_recordPayoutFailed,
    api_recordTransfer,
    api_rejectClaim,
    api_rejectIncome,
    api_renameAccount,
    api_requestIncomeInfo,
    api_requestInfo,
    api_resetAllData,
    api_resolveSession,
    api_resubmitClaim,
    api_retryNotification,
    api_retryPayout,
    api_saveBudgetRequestDraft,
    api_saveClaimDraft,
    api_setAccountSelections,
    api_setCategorySelections,
    api_setEventSelections,
    api_setMemberSelections,
    api_setMigrationSelections,
    api_setUserSelections,
    api_startMigration,
    api_submitBudgetRequest,
    api_submitClaim,
    api_submitDraftClaim,
    api_suggestSemester,
    api_uploadReceipt,
    api_validateMigration,
    api_verifyClaim,
  };
}
