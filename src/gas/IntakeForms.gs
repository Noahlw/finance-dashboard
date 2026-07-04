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
  var receipt = IntakeForms_storeReceipt(receiptFile, user.userId, answers);

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
    var check = Engine.validateClaimLineAmount(budgetLineId, amount);
    if (!check.ok) {
      rejectedLines.push(budgetLineId + ' (HK$' + amount + ' > remaining HK$' + check.remaining + ')');
      continue;
    }
    lineCount++;
    var cliId = Ids.childId(claimId, lineCount, 'CLI');
    getSheet_(TABS.CLAIM_LINE_ITEMS).appendRow([
      cliId, claimId, budgetLineId, receipt ? receipt.receiptId : '', amount, notes, false
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
