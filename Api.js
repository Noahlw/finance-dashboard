/**
 * Secure API boundaries for the React Frontend.
 * These functions enforce Session authentication (IDOR prevention)
 * before interacting with the Engine.
 */

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Finance Workspace')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function api_resolveSession() {
  var email = Session.getActiveUser().getEmail();
  if (!email) return { allowed: false, reason: 'no_session' };

  var user = _resolveUser(email);
  if (user.isUnknown) return { allowed: false, reason: 'unknown_user', email: email };

  if (user.role !== ROLES.COMMITTEE && user.role !== ROLES.TREASURER) {
    return { allowed: false, reason: 'unauthorized_role', role: user.role };
  }

  if (!user.active) return { allowed: false, reason: 'inactive_user' };

  var views = [ 'claims', 'members', 'budget-requests' ];
  if (user.role === ROLES.TREASURER) views.push('income', 'payouts', 'reports');

  return {
    allowed: true,
    user_id: user.userId,
    display_name: user.displayName,
    role: user.role,
    views: views
  };
}

function api_getMyClaims() {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('User not authenticated (no active session)');

  var user = _resolveUser(email);
  if (user.isUnknown || (user.role !== ROLES.COMMITTEE && user.role !== ROLES.TREASURER)) {
    return { claims: [], requests: [], budgetLines: [] };
  }

  var claimsSheet = getSheet_(TABS.EXPENSE_CLAIMS);
  var claimsRows = Engine._findRowsByColumn(claimsSheet, COLS.ExpenseClaims.created_by, user.userId);
  var requestsSheet = getSheet_(TABS.BUDGET_REQUESTS);
  var requestsRows = Engine._findRowsByColumn(requestsSheet, COLS.BudgetRequests.requester_id, user.userId);
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
    if (requestIds[rId] && allLines[i][c_brl.line_status - 1] === 'APPROVED' && allLines[i][c_brl.remaining - 1] > 0) {
      budgetLines.push({
        line_id: allLines[i][c_brl.line_id - 1],
        request_id: rId,
        description: allLines[i][c_brl.description - 1],
        remaining: allLines[i][c_brl.remaining - 1]
      });
    }
  }

  var c = COLS.ExpenseClaims;
  return {
    claims: claimsRows.map(function(r) { return { claim_id: r.values[c.claim_id - 1], status: r.values[c.status - 1], submitted_at: r.values[c.submitted_at - 1], total_amount: r.values[c.total_amount - 1], notes: r.values[c.notes - 1], claimant_id: r.values[c.claimant_id - 1] }; }),
    requests: requestsRows.map(function(r) { return { request_id: r.values[COLS.BudgetRequests.request_id - 1], title: r.values[COLS.BudgetRequests.title - 1], status: r.values[COLS.BudgetRequests.status - 1], submitted_at: r.values[COLS.BudgetRequests.submitted_at - 1] }; }),
    budgetLines: budgetLines
  };
}

/**
 * Handle Base64 file uploads to Google Drive.
 * Idempotent: same SHA-256 + same user returns existing receiptId.
 */
function api_uploadReceipt(fileName, mimeType, base64Data, vendor, receiptDate, receiptTotal) {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Not authenticated');
  var user = _resolveUser(email);
  if (user.isUnknown) throw new Error('Unregistered user');

  var bytes = Utilities.base64Decode(base64Data);

  // Validate file size (5 MB max)
  var maxBytes = 5 * 1024 * 1024;
  if (bytes.length > maxBytes) throw new Error('File exceeds 5 MB limit.');

  // Validate MIME type
  var allowedMime = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf'];
  if (allowedMime.indexOf(mimeType) === -1) throw new Error('Unsupported file type. Allowed: PNG, JPEG, GIF, PDF.');

  var sha256 = _sha256Hex(bytes);

  var receiptSheet = getSheet_(TABS.RECEIPTS);
  var receiptData = receiptSheet.getDataRange().getValues();
  var hashCol = COLS.Receipts.sha256 - 1;
  var uploaderCol = COLS.Receipts.uploaded_by - 1;
  var idCol = COLS.Receipts.receipt_id - 1;

  for (var i = 1; i < receiptData.length; i++) {
    if (receiptData[i][hashCol] === sha256) {
      if (receiptData[i][uploaderCol] === user.userId) return { receiptId: receiptData[i][idCol] };
      else throw new Error('Duplicate receipt detected (uploaded by another user).');
    }
  }

  var folderId = PropertiesService.getScriptProperties().getProperty('RECEIPTS_FOLDER_ID');
  var folder = DriveApp.getFolderById(folderId);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);
  
  var receiptId = Ids.nextId('Receipt');
  var newName = receiptId + '_' + fileName;
  blob.setName(newName);
  var file = folder.createFile(blob);
  var driveFileId = file.getId();

  var fileLink = '=HYPERLINK("https://drive.google.com/open?id=' + driveFileId + '", "View Receipt")';
  var now = Audit._nowIso();

  _appendRow(receiptSheet, [receiptId, driveFileId, sha256, user.userId, now, vendor, receiptDate, Number(receiptTotal), fileLink]);
  return { receiptId: receiptId };
}

/**
 * Delete an orphaned receipt (Drive file + Receipts row).
 * Used for rollback when a claim save fails after receipt upload.
 * Only the original uploader may delete.
 */
function api_deleteOrphanedReceipt(receiptId) {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Not authenticated');
  var user = _resolveUser(email);
  if (user.isUnknown) throw new Error('Unregistered user');

  var receiptRow = Engine._loadRow('Receipt', receiptId);
  if (!receiptRow) throw new Error('Receipt not found');

  if (receiptRow.values[COLS.Receipts.uploaded_by - 1] !== user.userId) {
    throw new Error('Unauthorized: only the uploader can delete this receipt');
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
  Audit.append(user.userId, 'Receipt', receiptId, 'DELETE_ORPHANED', {});
  return { success: true };
}

/**
 * Submit a new Expense Claim. Idempotent based on `uuid`.
 */
function api_submitClaim(payload) {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Not authenticated');
  var user = _resolveUser(email);
  if (user.isUnknown) throw new Error('Unregistered user');
  if (!payload.claimantId) throw new Error('Claimant is required');

  if (_alreadyProcessed(TABS.EXPENSE_CLAIMS, COLS.ExpenseClaims.processed_response_id, payload.uuid)) {
    return { success: true, message: 'Already processed' }; // Idempotent
  }

  var claimId = Ids.nextId('ExpenseClaim');
  var now = Audit._nowIso();
  var lateFlag = _isLate(payload.expenseDate);
  var total = Number(payload.amount);

  _appendRow(getSheet_(TABS.EXPENSE_CLAIMS), [
    claimId, payload.claimantId, STATUS.ExpenseClaim.SUBMITTED, now, '', '', '', '',
    '', '', total, lateFlag, false, payload.notes, payload.uuid, user.userId,
    payload.expenseDate || '', payload.semester || '', payload.eventId || '',
    payload.payoutMethod || 'FPS', payload.payoutHandle || ''
  ]);

  var cliId = Ids.childId(claimId, 1, 'CLAIMLINE');
  var missingReceipt = !payload.receiptId;
  _appendRow(getSheet_(TABS.CLAIM_LINE_ITEMS), [
    cliId, claimId, payload.budgetLineId, payload.receiptId || '', total, payload.notes, missingReceipt
  ]);

  Audit.append(user.userId, 'ExpenseClaim', claimId, 'CREATE', { lines: 1, lateFlag: lateFlag, uuid: payload.uuid });
  try { Discord.postStatus(claimId, payload.notes, STATUS.ExpenseClaim.SUBMITTED, null); } catch(e){}

  return { success: true, claimId: claimId };
}

// Helpers
function _resolveUser(email) {
  var sheet = getSheet_(TABS.USERS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Users;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][c.email - 1]).toLowerCase() === email.toLowerCase()) {
      return {
        userId: values[i][c.user_id - 1],
        displayName: values[i][c.display_name - 1],
        role: values[i][c.role - 1],
        active: String(values[i][c.active - 1]).trim().toUpperCase() === 'TRUE',
        isUnknown: false
      };
    }
  }
  return { userId: 'USER-UNKNOWN', isUnknown: true };
}

function _sha256Hex(bytes) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
  var hex = '';
  for (var i = 0; i < digest.length; i++) {
    var v = (digest[i] < 0 ? digest[i] + 256 : digest[i]).toString(16);
    hex += (v.length === 1 ? '0' + v : v);
  }
  return hex;
}

function _isLate(dateStr) {
  if (!dateStr) return false;
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  var deadlineDays = Config.getNum('CLAIM_DEADLINE_DAYS');
  return new Date() > new Date(d.getTime() + deadlineDays * 24 * 60 * 60 * 1000);
}

function _alreadyProcessed(tabName, colIndex, uuid) {
  var sheet = getSheet_(tabName);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;
  var values = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === uuid) return true;
  }
  return false;
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
  if (insertRow > sheet.getMaxRows()) sheet.insertRowAfter(sheet.getMaxRows());
  sheet.getRange(insertRow, 1, 1, values.length).setValues([values]);
}

/**
 * Edit an existing Expense Claim. Only SUBMITTED claims can be edited.
 */
function api_editClaim(payload) {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Not authenticated');
  var user = _resolveUser(email);
  if (user.isUnknown) throw new Error('Unregistered user');

  var sheet = getSheet_(TABS.EXPENSE_CLAIMS);
  var rows = sheet.getDataRange().getValues();
  var c = COLS.ExpenseClaims;
  
  var rowIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][c.claim_id - 1] === payload.claimId) {
      rowIndex = i + 1; // 1-indexed for getRange
      if (rows[i][c.claimant_id - 1] !== user.userId) throw new Error('Unauthorized');
      if (rows[i][c.status - 1] !== STATUS.ExpenseClaim.SUBMITTED) {
        throw new Error('Only SUBMITTED claims can be edited.');
      }
      break;
    }
  }

  if (rowIndex === -1) throw new Error('Claim not found');

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

  Audit.append(user.userId, 'ExpenseClaim', payload.claimId, 'UPDATE', { amount: total });
  return { success: true };
}

// ---------------------------------------------------------------------------
// Budget Request API
// ---------------------------------------------------------------------------

/**
 * Get all budget requests and their lines for the current user.
 */
function api_getMyBudgetRequests() {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('User not authenticated (no active session)');

  var user = _resolveUser(email);
  if (user.isUnknown || (user.role !== ROLES.COMMITTEE && user.role !== ROLES.TREASURER)) {
    return [];
  }

  var reqSheet = getSheet_(TABS.BUDGET_REQUESTS);
  var reqRows = Engine._findRowsByColumn(reqSheet, COLS.BudgetRequests.requester_id, user.userId);
  var c = COLS.BudgetRequests;
  var lineC = COLS.BudgetRequestLines;
  var lineSheet = getSheet_(TABS.BUDGET_REQUEST_LINES);

  return reqRows.map(function (r) {
    var id = r.values[c.request_id - 1];
    var lineRows = Engine._findRowsByColumn(lineSheet, lineC.request_id, id);
    return {
      request_id: id,
      requester_id: r.values[c.requester_id - 1],
      event_id: r.values[c.event_id - 1],
      title: r.values[c.title - 1],
      justification: r.values[c.justification - 1],
      needed_by: r.values[c.needed_by - 1],
      status: r.values[c.status - 1],
      submitted_at: r.values[c.submitted_at - 1],
      decided_at: r.values[c.decided_at - 1],
      decided_by: r.values[c.decided_by - 1],
      decision_note: r.values[c.decision_note - 1],
      lines: lineRows.map(function (l) {
        return {
          line_id: l.values[lineC.line_id - 1],
          category_id: l.values[lineC.category_id - 1],
          description: l.values[lineC.description - 1],
          requested_amount: l.values[lineC.requested_amount - 1],
          approved_amount: l.values[lineC.approved_amount - 1],
          line_status: l.values[lineC.line_status - 1],
          claimed_amount: l.values[lineC.claimed_amount - 1] || 0,
          remaining: l.values[lineC.remaining - 1] || 0
        };
      })
    };
  });
}

/**
 * Save a Budget Request as DRAFT (new) or update an existing DRAFT/NEEDS_INFO.
 */
function api_saveBudgetRequestDraft(payload) {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Not authenticated');
  var user = _resolveUser(email);
  if (user.isUnknown) throw new Error('Unregistered user');

  var now = Audit._nowIso();
  var c = COLS.BudgetRequests;
  var lineC = COLS.BudgetRequestLines;
  var sheet = getSheet_(TABS.BUDGET_REQUESTS);
  var lineSheet = getSheet_(TABS.BUDGET_REQUEST_LINES);

  var requestId;
  var existingRow = null;

  if (payload.request_id) {
    existingRow = Engine._loadRow('BudgetRequest', payload.request_id);
    if (existingRow) {
      var curStatus = existingRow.values[c.status - 1];
      if (curStatus !== STATUS.BudgetRequest.DRAFT && curStatus !== STATUS.BudgetRequest.NEEDS_INFO) {
        throw new Error('Cannot edit a ' + curStatus + ' budget request');
      }
      requestId = payload.request_id;
    }
  }

  if (!requestId) {
    requestId = Ids.nextId('BudgetRequest');
    _appendRow(sheet, [
      requestId, user.userId, payload.event_id || '', payload.title || '',
      payload.justification || '', payload.needed_by || '', STATUS.BudgetRequest.DRAFT,
      '', '', '', '', false, payload.uuid || ''
    ]);
  } else {
    var idx = existingRow.rowIndex;
    sheet.getRange(idx, c.title).setValue(payload.title || '');
    sheet.getRange(idx, c.justification).setValue(payload.justification || '');
    sheet.getRange(idx, c.needed_by).setValue(payload.needed_by || '');
    sheet.getRange(idx, c.event_id).setValue(payload.event_id || '');
  }

  if (payload.lines && payload.lines.length > 0) {
    var existingLines = Engine._findRowsByColumn(lineSheet, lineC.request_id, requestId);
    existingLines.forEach(function (el) {
      var row = el.rowIndex;
      lineSheet.getRange(row, lineC.description).setValue('');
      lineSheet.getRange(row, lineC.requested_amount).setValue(0);
      lineSheet.getRange(row, lineC.approved_amount).setValue(0);
    });

    payload.lines.forEach(function (line, i) {
      var lineId;
      if (existingLines[i]) {
        lineId = existingLines[i].values[lineC.line_id - 1];
        var row = existingLines[i].rowIndex;
        lineSheet.getRange(row, lineC.category_id).setValue(line.category_id || '');
        lineSheet.getRange(row, lineC.description).setValue(line.description);
        lineSheet.getRange(row, lineC.requested_amount).setValue(Number(line.requested_amount) || 0);
      } else {
        lineId = Ids.childId(requestId, i + 1, 'BUDGETLINE');
        _appendRow(lineSheet, [
          lineId, requestId, line.category_id || '', line.description,
          Number(line.requested_amount) || 0, 0, STATUS.BudgetRequestLine.PENDING, 0, 0
        ]);
      }
    });
  }

  Audit.append(user.userId, 'BudgetRequest', requestId, existingRow ? 'DRAFT_UPDATE' : 'DRAFT_CREATE', {});
  return { request_id: requestId, status: STATUS.BudgetRequest.DRAFT };
}

/**
 * Submit a DRAFT or resubmit a NEEDS_INFO budget request via Engine.
 */
function api_submitBudgetRequest(requestId) {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Not authenticated');
  var user = _resolveUser(email);
  if (user.isUnknown) throw new Error('Unregistered user');

  var row = Engine._loadRow('BudgetRequest', requestId);
  if (!row) throw new Error('Budget request not found');

  var c = COLS.BudgetRequests;
  var curStatus = row.values[c.status - 1];
  var action;
  if (curStatus === STATUS.BudgetRequest.DRAFT) {
    action = 'SUBMIT';
  } else if (curStatus === STATUS.BudgetRequest.NEEDS_INFO) {
    action = 'RESUBMIT';
  } else {
    throw new Error('Cannot submit a ' + curStatus + ' budget request');
  }

  var result = Engine.transition('BudgetRequest', requestId, action, user.userId, {});
  if (!result.ok) throw new Error(result.reason);

  return { request_id: requestId, status: result.to, submitted_at: Audit._nowIso() };
}

/**
 * Discard/withdraw a DRAFT budget request.
 */
function api_discardBudgetRequest(requestId) {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Not authenticated');
  var user = _resolveUser(email);
  if (user.isUnknown) throw new Error('Unregistered user');

  var result = Engine.transition('BudgetRequest', requestId, 'WITHDRAW', user.userId, {});
  if (!result.ok) throw new Error(result.reason);
  return { request_id: requestId, status: result.to };
}

/**
 * Get all PENDING budget requests (Treasurer approvals view).
 */
function api_getPendingBudgetRequests() {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Not authenticated');
  var user = _resolveUser(email);
  if (user.isUnknown || user.role !== ROLES.TREASURER) {
    throw new Error('Unauthorized');
  }

  var sheet = getSheet_(TABS.BUDGET_REQUESTS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.BudgetRequests;
  var out = [];

  for (var i = 1; i < values.length; i++) {
    if (values[i][c.status - 1] !== STATUS.BudgetRequest.PENDING) continue;
    var id = values[i][c.request_id - 1];
    var amount = Engine._sumBudgetRequestLines(id, 'requested_amount');
    out.push({
      request_id: id,
      title: values[i][c.title - 1],
      requester_id: values[i][c.requester_id - 1],
      justification: values[i][c.justification - 1],
      needed_by: values[i][c.needed_by - 1],
      submitted_at: values[i][c.submitted_at - 1],
      total_requested: amount
    });
  }
  return out;
}

/**
 * Treasurer decision on a budget request.
 * action: 'APPROVE' | 'REDUCE' | 'REJECT' | 'REQUEST_INFO' | 'CLOSE'
 * payload: { decision_note?, amount_override? }
 */
function api_decisionBudgetRequest(entityId, action, payload) {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Not authenticated');
  var user = _resolveUser(email);
  if (user.isUnknown || user.role !== ROLES.TREASURER) {
    throw new Error('Unauthorized');
  }

  var result = Engine.transition('BudgetRequest', entityId, action, user.userId, payload || {});
  if (!result.ok) throw new Error(result.reason);
  return { request_id: entityId, from: result.from, to: result.to };
}

// ---------------------------------------------------------------------------
// Member Directory API
// ---------------------------------------------------------------------------

function _requireOperator() {
  var email = Session.getActiveUser().getEmail();
  if (!email) throw new Error('Not authenticated');
  var user = _resolveUser(email);
  if (user.isUnknown) throw new Error('Unregistered user');
  if (user.role !== ROLES.COMMITTEE && user.role !== ROLES.TREASURER) {
    throw new Error('Unauthorized');
  }
  return user;
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
  _requireOperator();

  var sheet = getSheet_(TABS.USERS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Users;
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.role - 1] === ROLES.MEMBER) {
      out.push({
        user_id: values[i][c.user_id - 1],
        display_name: values[i][c.display_name - 1],
        active: String(values[i][c.active - 1]).trim().toUpperCase() === 'TRUE'
      });
    }
  }
  return out;
}

/**
 * Add a new member with unique SID. Does not create login access (email blank).
 */
function api_addMember(payload) {
  var operator = _requireOperator();
  if (!payload.student_id || !String(payload.student_id).trim()) {
    throw new Error('Student ID is required');
  }
  if (!payload.display_name || !String(payload.display_name).trim()) {
    throw new Error('Display name is required');
  }

  var existing = _findVaultByStudentId(payload.student_id);
  if (existing) {
    var user = _findUserById(existing.values[COLS.Vault.user_id - 1]);
    if (user && user.values[COLS.Users.active - 1] === true) {
      throw new Error('Active member with this SID already exists');
    }
    throw new Error('Inactive member with this SID already exists. Use reactivate instead.');
  }

  var userId = Ids.nextId('User');
  var now = Audit._nowIso();
  var displayName = String(payload.display_name).trim();
  _appendRow(getSheet_(TABS.USERS), [userId, displayName, ROLES.MEMBER, '', true, now]);

  var vaultRow = [
    userId,
    String(payload.full_name || displayName).trim(),
    String(payload.student_id).trim(),
    String(payload.payout_method || 'FPS').trim(),
    String(payload.payout_handle || '').trim(),
    now
  ];
  var vaultSheet = getVaultSheet_();
  _appendRow(vaultSheet, vaultRow);
  // Force text format for ID / phone fields to preserve leading zeros
  var targetRow = vaultSheet.getLastRow();
  vaultSheet.getRange(targetRow, COLS.Vault.student_id).setNumberFormat('@').setValue(vaultRow[2]);
  vaultSheet.getRange(targetRow, COLS.Vault.payout_handle).setNumberFormat('@').setValue(vaultRow[4]);

  Audit.append(operator.userId, 'User', userId, 'MEMBER_CREATE', { sid: String(payload.student_id).trim() });
  return { user_id: userId, display_name: displayName, active: true };
}

/**
 * Reactivate an inactive member by user_id.
 */
function api_reactivateMember(userId) {
  var operator = _requireOperator();
  var user = _findUserById(userId);
  if (!user) throw new Error('Member not found');
  if (user.values[COLS.Users.role - 1] !== ROLES.MEMBER) {
    throw new Error('User is not a member');
  }
  if (user.values[COLS.Users.active - 1] === true) {
    throw new Error('Member is already active');
  }

  getSheet_(TABS.USERS).getRange(user.rowIndex, COLS.Users.active).setValue(true);
  Audit.append(operator.userId, 'User', userId, 'MEMBER_REACTIVATE', {});
  return { user_id: userId, active: true };
}

// ---------------------------------------------------------------------------
// Claim Draft + Intake API
// ---------------------------------------------------------------------------

/**
 * Save a claim as a DRAFT. operator is the current user; claimant is the member.
 */
function api_saveClaimDraft(payload) {
  var operator = _requireOperator();
  if (!payload.claimantId) throw new Error('Claimant is required');
  if (!payload.uuid) throw new Error('uuid is required');

  if (payload.claimId) {
    var existing = Engine._loadRow('ExpenseClaim', payload.claimId);
    if (!existing) throw new Error('Claim not found');
    if (existing.values[COLS.ExpenseClaims.created_by - 1] !== operator.userId) {
      throw new Error('Unauthorized');
    }
    if (existing.values[COLS.ExpenseClaims.status - 1] !== STATUS.ExpenseClaim.DRAFT) {
      throw new Error('Only DRAFT claims can be updated as draft');
    }
  }

  var claimId = payload.claimId || Ids.nextId('ExpenseClaim');
  var now = Audit._nowIso();
  var c = COLS.ExpenseClaims;
  var lateFlag = _isLate(payload.expenseDate);
  var total = Number(payload.amount) || 0;

  if (!payload.claimId) {
    _appendRow(getSheet_(TABS.EXPENSE_CLAIMS), [
      claimId, payload.claimantId, STATUS.ExpenseClaim.DRAFT, '', '', '', '', '',
      '', '', total, lateFlag, false, payload.notes || '', payload.uuid, operator.userId,
      payload.expenseDate || '', payload.semester || '', payload.eventId || '',
      payload.payoutMethod || 'FPS', payload.payoutHandle || ''
    ]);
  } else {
    var row = Engine._loadRow('ExpenseClaim', claimId);
    var sheet = row.sheet;
    sheet.getRange(row.rowIndex, c.claimant_id).setValue(payload.claimantId);
    sheet.getRange(row.rowIndex, c.total_amount).setValue(total);
    sheet.getRange(row.rowIndex, c.notes).setValue(payload.notes || '');
    sheet.getRange(row.rowIndex, c.late_flag).setValue(lateFlag);
    sheet.getRange(row.rowIndex, c.expense_date).setValue(payload.expenseDate || '');
    sheet.getRange(row.rowIndex, c.semester).setValue(payload.semester || '');
    sheet.getRange(row.rowIndex, c.event_id).setValue(payload.eventId || '');
    sheet.getRange(row.rowIndex, c.payout_method).setValue(payload.payoutMethod || 'FPS');
    sheet.getRange(row.rowIndex, c.payout_handle).setValue(payload.payoutHandle || '');
  }

  // Upsert claim line item(s)
  var cliSheet = getSheet_(TABS.CLAIM_LINE_ITEMS);
  var cliRows = Engine._findRowsByColumn(cliSheet, COLS.ClaimLineItems.claim_id, claimId);

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
      var cliValues = [Ids.childId(claimId, ri + 1, 'CLAIMLINE'), claimId, payload.budgetLineId || '', receiptIds[ri] || '', perLineAmount, payload.notes || '', false];
      _appendRow(cliSheet, cliValues);
    }
  } else {
    var missingReceipt = !payload.receiptId;
    var cliValues = [Ids.childId(claimId, 1, 'CLAIMLINE'), claimId, payload.budgetLineId || '', payload.receiptId || '', total, payload.notes || '', missingReceipt];
    if (cliRows.length > 0) {
      var cliC = COLS.ClaimLineItems;
      cliSheet.getRange(cliRows[0].rowIndex, 1, 1, cliValues.length).setValues([cliValues]);
    } else {
      _appendRow(cliSheet, cliValues);
    }
  }

  Audit.append(operator.userId, 'ExpenseClaim', claimId, payload.claimId ? 'DRAFT_UPDATE' : 'DRAFT_CREATE', { uuid: payload.uuid });
  return { claim_id: claimId, status: STATUS.ExpenseClaim.DRAFT };
}

/**
 * Submit a DRAFT claim for review.
 */
function api_submitDraftClaim(claimId) {
  var operator = _requireOperator();
  var existing = Engine._loadRow('ExpenseClaim', claimId);
  if (!existing) throw new Error('Claim not found');
  if (existing.values[COLS.ExpenseClaims.created_by - 1] !== operator.userId) {
    throw new Error('Unauthorized');
  }
  if (existing.values[COLS.ExpenseClaims.status - 1] !== STATUS.ExpenseClaim.DRAFT) {
    throw new Error('Only DRAFT claims can be submitted');
  }

  var result = Engine.transition('ExpenseClaim', claimId, 'SUBMIT', operator.userId, {});
  if (!result.ok) throw new Error(result.reason);
  return { claim_id: claimId, status: result.to, submitted_at: Audit._nowIso() };
}

if (typeof module !== 'undefined') {
  module.exports = {
    api_resolveSession, api_getMyClaims, api_uploadReceipt, api_submitClaim, api_editClaim,
    api_getMyBudgetRequests, api_saveBudgetRequestDraft, api_submitBudgetRequest,
    api_discardBudgetRequest, api_getPendingBudgetRequests, api_decisionBudgetRequest,
    api_getMembers, api_addMember, api_reactivateMember, api_saveClaimDraft, api_submitDraftClaim,
    api_deleteOrphanedReceipt,
    _sha256Hex, _isLate, _resolveUser
  };
}
