/**
 * IntakeForms.gs — onFormSubmit handlers for the Budget Request and
 * Expense Claim forms. Idempotent on the form response ID: re-delivery
 * of the same submission (e.g. a duplicate trigger fire) is a no-op.
 */

/**
 * Installable onFormSubmit trigger for the Budget Request form.
 * @param {Object} e form submit event
 */
function onFormSubmitRequest(e) {
  var responseId = e.response.getId();
  if (IntakeForms_alreadyProcessed(TABS.BUDGET_REQUESTS, COLS.BudgetRequests.processed_response_id, responseId)) return;

  var answers = IntakeForms_answersByTitle(e.response);
  var email = e.response.getRespondentEmail() || '';
  var user = IntakeForms_resolveUser(email);

  var requestId = Ids.nextId('BudgetRequest');
  var now = Audit._nowIso();
  var title = answers['Title'] || '(untitled)';
  var justification = answers['Justification'] || '';
  var neededBy = answers['Needed by'] || '';

  getSheet_(TABS.BUDGET_REQUESTS).appendRow([
    requestId, user.userId, '', title, justification, neededBy,
    STATUS.BudgetRequest.PENDING, now, '', '', '', false, responseId
  ]);

  var lineCount = 0;
  for (var n = 1; n <= 3; n++) {
    var category = answers['Line ' + n + ' — Category'];
    var desc = answers['Line ' + n + ' — Description'];
    var amount = Number(answers['Line ' + n + ' — Amount (HKD)']);
    if (!category || !desc || !amount) continue;
    lineCount++;
    var lineId = Ids.childId(requestId, lineCount, 'BRL');
    getSheet_(TABS.BUDGET_REQUEST_LINES).appendRow([
      lineId, requestId, IntakeForms_categoryIdByName(category), desc, amount, 0, STATUS.BudgetRequestLine.PENDING, 0, 0
    ]);
  }

  Audit.append(user.userId, 'BudgetRequest', requestId, 'CREATE', {
    title: title, lines: lineCount, unknownEmail: user.isUnknown
  });
  Discord.postTreasury('**' + requestId + '** — ' + title + ' — new PENDING request from ' + user.userId +
    (user.isUnknown ? ' (⚠️ unrecognized email: ' + email + ')' : ''));
  Discord.postStatus(requestId, title, STATUS.BudgetRequest.PENDING, null);
}

/**
 * Installable onFormSubmit trigger for the Expense Claim form.
 * @param {Object} e form submit event
 */
function onFormSubmitClaim(e) {
  var responseId = e.response.getId();
  if (IntakeForms_alreadyProcessed(TABS.EXPENSE_CLAIMS, COLS.ExpenseClaims.processed_response_id, responseId)) return;

  var answers = IntakeForms_answersByTitle(e.response);
  var email = e.response.getRespondentEmail() || '';
  var user = IntakeForms_resolveUser(email);

  var receiptFile = IntakeForms_extractUploadedFile(e.response);
  var receipt = null;
  try {
    receipt = IntakeForms_storeReceipt(receiptFile, user.userId, answers);
  } catch (err) {
    Audit.append(user.userId, 'ExpenseClaim', 'NEW', 'CREATE_FAILED', { reason: err.message });
    Discord.postTreasury('🚫 Rejected submission from ' + user.userId + ': ' + err.message);
    return;
  }

  var claimId = Ids.nextId('ExpenseClaim');
  var now = Audit._nowIso();
  var notes = answers['What is this claim for? (short description)'] || '';
  var lateFlag = IntakeForms_isLate(answers['Receipt date']);

  getSheet_(TABS.EXPENSE_CLAIMS).appendRow([
    claimId, user.userId, STATUS.ExpenseClaim.SUBMITTED, now, '', '', '', '',
    '', '', 0, lateFlag, false, notes, responseId
  ]);

  var lineCount = 0;
  var rejectedLines = [];
  for (var n = 1; n <= 3; n++) {
    var budgetLineChoice = answers['Line ' + n + ' — Budget line'];
    var amount = Number(answers['Line ' + n + ' — Amount (HKD)']);
    if (!budgetLineChoice || !amount) continue;
    var budgetLineId = IntakeForms_parseBudgetLineId(budgetLineChoice);
    var missingReceiptFlag = (answers['Missing receipt?'] === 'Yes');
    
    var check = Engine.validateClaimLineAmount(budgetLineId, amount);
    if (!check.ok) {
      if (check.remaining < 0) check.remaining = 0; // sanity
      var excessAmount = amount - check.remaining;
      
      var topUpRequestId = Ids.nextId('BudgetRequest');
      var topUpLineId = Ids.childId(topUpRequestId, 1, 'BRL');
      
      var bLineSheet = getSheet_(TABS.BUDGET_REQUEST_LINES);
      var bLineRows = bLineSheet.getDataRange().getValues();
      var categoryId = '';
      var reqId = '';
      for (var i=1; i<bLineRows.length; i++) {
        if (bLineRows[i][0] === budgetLineId) {
          reqId = bLineRows[i][COLS.BudgetRequestLines.request_id - 1];
          categoryId = bLineRows[i][COLS.BudgetRequestLines.category_id - 1];
          break;
        }
      }
      var bReqSheet = getSheet_(TABS.BUDGET_REQUESTS);
      var bReqRows = bReqSheet.getDataRange().getValues();
      var eventId = '';
      for (var i=1; i<bReqRows.length; i++) {
        if (bReqRows[i][0] === reqId) {
          eventId = bReqRows[i][COLS.BudgetRequests.event_id - 1];
          break;
        }
      }
      
      var topUpTitle = '[OVERBUDGET TOP-UP] for ' + budgetLineId;
      var topUpJustification = 'Auto-generated top-up. User claimed HK$' + amount + ' but remaining was HK$' + check.remaining + '.';
      
      bReqSheet.appendRow([
        topUpRequestId, user.userId, eventId, topUpTitle, topUpJustification, '',
        STATUS.BudgetRequest.PENDING, now, '', '', '', false, ''
      ]);
      bLineSheet.appendRow([
        topUpLineId, topUpRequestId, categoryId, 'Excess cover for claim', excessAmount, 0, STATUS.BudgetRequestLine.PENDING, 0, 0
      ]);
      Audit.append('SYSTEM', 'BudgetRequest', topUpRequestId, 'CREATE', { autoTopUpFor: budgetLineId });
      Discord.postTreasury('**' + topUpRequestId + '** — Auto-generated top-up for ' + budgetLineId + ' (HK$' + excessAmount + ')');

      if (check.remaining > 0) {
        lineCount++;
        var cliId1 = Ids.childId(claimId, lineCount, 'CLI');
        getSheet_(TABS.CLAIM_LINE_ITEMS).appendRow([
          cliId1, claimId, budgetLineId, receipt ? receipt.receiptId : '', check.remaining, notes, missingReceiptFlag
        ]);
      }
      
      lineCount++;
      var cliId2 = Ids.childId(claimId, lineCount, 'CLI');
      getSheet_(TABS.CLAIM_LINE_ITEMS).appendRow([
        cliId2, claimId, topUpLineId, receipt ? receipt.receiptId : '', excessAmount, notes + ' (Top-Up)', missingReceiptFlag
      ]);
      
      rejectedLines.push(budgetLineId + ' (auto-created top-up ' + topUpRequestId + ' for excess HK$' + excessAmount + ')');
      continue;
    }
    
    lineCount++;
    var cliId = Ids.childId(claimId, lineCount, 'CLI');
    getSheet_(TABS.CLAIM_LINE_ITEMS).appendRow([
      cliId, claimId, budgetLineId, receipt ? receipt.receiptId : '', amount, notes, missingReceiptFlag
    ]);
  }

  Audit.append(user.userId, 'ExpenseClaim', claimId, 'CREATE', {
    lines: lineCount, lateFlag: lateFlag, unknownEmail: user.isUnknown, rejectedLines: rejectedLines
  });
  Discord.postTreasury('**' + claimId + '** — ' + notes + ' — new SUBMITTED claim from ' + user.userId +
    (lateFlag ? ' ⚠️ LATE' : '') +
    (user.isUnknown ? ' (⚠️ unrecognized email: ' + email + ')' : '') +
    (rejectedLines.length ? ' (⚠️ lines skipped, over remaining: ' + rejectedLines.join('; ') + ')' : ''));
  Discord.postStatus(claimId, notes, STATUS.ExpenseClaim.SUBMITTED, null);
}

/**
 * @param {string} tabName
 * @param {number} responseIdCol 1-indexed column holding processed_response_id
 * @param {string} responseId
 * @return {boolean} true if this response was already processed
 */
function IntakeForms_alreadyProcessed(tabName, responseIdCol, responseId) {
  var sheet = getSheet_(tabName);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;
  var values = sheet.getRange(2, responseIdCol, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === responseId) return true;
  }
  return false;
}

/**
 * @param {FormResponse} response
 * @return {Object<string,string>} question title -> answer string
 */
function IntakeForms_answersByTitle(response) {
  var out = {};
  var itemResponses = response.getItemResponses();
  for (var i = 0; i < itemResponses.length; i++) {
    out[itemResponses[i].getItem().getTitle()] = itemResponses[i].getResponse();
  }
  return out;
}

/**
 * Resolve a respondent email to a Users row. Unknown emails still
 * produce a usable actor id ('U-UNKNOWN') so the row is created and
 * flagged for treasurer follow-up, rather than silently dropped.
 * @param {string} email
 * @return {{userId: string, isUnknown: boolean}}
 */
function IntakeForms_resolveUser(email) {
  if (!email) return { userId: 'U-UNKNOWN', isUnknown: true };
  var sheet = getSheet_(TABS.USERS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Users;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][c.email - 1]).toLowerCase() === email.toLowerCase()) {
      return { userId: values[i][c.user_id - 1], isUnknown: false };
    }
  }
  return { userId: 'U-UNKNOWN', isUnknown: true };
}

/**
 * @param {string} categoryName
 * @return {string} category_id, or '' if not found
 */
function IntakeForms_categoryIdByName(categoryName) {
  var sheet = getSheet_(TABS.CATEGORIES);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Categories;
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.name - 1] === categoryName) return values[i][c.category_id - 1];
  }
  return '';
}

/**
 * @param {string} choiceText e.g. 'BRL-26A-001-01 — BBQ food — remaining HK$300.00'
 * @return {string} the leading BRL id
 */
function IntakeForms_parseBudgetLineId(choiceText) {
  return String(choiceText).split(' — ')[0].trim();
}

/**
 * @param {string} receiptDateStr answer text from the 'Receipt date' question
 * @return {boolean} true if today is more than CLAIM_DEADLINE_DAYS after the receipt date
 */
function IntakeForms_isLate(receiptDateStr) {
  if (!receiptDateStr) return false;
  var receiptDate = new Date(receiptDateStr);
  if (isNaN(receiptDate.getTime())) return false;
  var deadlineDays = Config.getNum('CLAIM_DEADLINE_DAYS');
  var deadline = new Date(receiptDate.getTime() + deadlineDays * 24 * 60 * 60 * 1000);
  return new Date() > deadline;
}

/**
 * Extract the uploaded file from a form response, if the (manually
 * added, per CP-C) file-upload question was answered.
 * @param {FormResponse} response
 * @return {?File}
 */
function IntakeForms_extractUploadedFile(response) {
  var itemResponses = response.getItemResponses();
  for (var i = 0; i < itemResponses.length; i++) {
    var item = itemResponses[i];
    if (item.getItem().getType() === FormApp.ItemType.FILE_UPLOAD) {
      var ids = item.getResponse();
      if (ids && ids.length > 0) {
        try {
          return DriveApp.getFileById(ids[0]);
        } catch (e) {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Move an uploaded receipt into /CF-Finance/Receipts, rename it, hash
 * it, and create its Receipt row.
 * @param {?File} file
 * @param {string} uploaderUserId
 * @param {Object<string,string>} answers
 * @return {?{receiptId: string}}
 */
function IntakeForms_storeReceipt(file, uploaderUserId, answers) {
  var receiptId = Ids.nextId('Receipt');
  var now = Audit._nowIso();
  var vendor = answers['Receipt vendor'] || '';
  var receiptDate = answers['Receipt date'] || '';
  var receiptTotal = Number(answers['Receipt total (HKD)']) || 0;
  var driveFileId = '';
  var sha256 = '';

  if (file) {
    var folderId = PropertiesService.getScriptProperties().getProperty('RECEIPTS_FOLDER_ID');
    var folder = DriveApp.getFolderById(folderId);
    var bytes = file.getBlob().getBytes();
    sha256 = IntakeForms_sha256Hex(bytes);
    
    var receiptSheet = getSheet_(TABS.RECEIPTS);
    var receiptData = receiptSheet.getDataRange().getValues();
    var hashCol = COLS.Receipts.sha256 - 1;
    for (var i = 1; i < receiptData.length; i++) {
      if (receiptData[i][hashCol] === sha256) {
        throw new Error('Duplicate receipt detected. This exact file was already uploaded.');
      }
    }

    var newName = receiptId + '_' + file.getName();
    file.moveTo(folder);
    file.setName(newName);
    driveFileId = file.getId();
  }

  getSheet_(TABS.RECEIPTS).appendRow([receiptId, driveFileId, sha256, uploaderUserId, now, vendor, receiptDate, receiptTotal, '']);
  return { receiptId: receiptId };
}

/**
 * @param {number[]} bytes
 * @return {string} lowercase hex SHA-256
 */
function IntakeForms_sha256Hex(bytes) {
  var digestBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
  var hex = '';
  for (var i = 0; i < digestBytes.length; i++) {
    var b = digestBytes[i];
    var v = (b < 0 ? b + 256 : b).toString(16);
    hex += (v.length === 1 ? '0' + v : v);
  }
  return hex;
}
