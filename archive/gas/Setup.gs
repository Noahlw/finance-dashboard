/**
 * Setup.gs — idempotent builder for the whole Google-side footprint:
 * CF-Ledger tabs, CF-Vault, Drive folders, Config seed, Category seed,
 * the Treasurer's User row, and the D8 opening-balance Income row.
 *
 * Safe to re-run at any time: every step checks for existing state
 * before creating anything, and never overwrites data that already
 * exists (e.g. re-running never clobbers a pasted-in webhook URL).
 *
 * Run this once, manually, from the Apps Script editor bound to the
 * CF-Ledger container spreadsheet (see BUILD-PLAN.md checkpoint CP-B).
 */

/**
 * Entry point. Run this manually from the script editor.
 * @return {Object} summary of what was created vs. already present
 */
function setupAll() {
  var ledger = SpreadsheetApp.getActive();
  PropertiesService.getScriptProperties().setProperty('LEDGER_ID', ledger.getId());

  var createdTabs = Setup_ensureAllTabsExist(ledger);

  var approvalsMigration = Setup_migrateApprovalsColumns(ledger);
  if (approvalsMigration.migrated) {
    Audit.append('SYSTEM', 'Approvals', 'APPROVALS', 'SCHEMA_MIGRATION', {
      addedColumns: ['payout_method', 'payout_reference']
    });
  }

  Setup_installArrayFormulas(ledger);
  Setup_applyValidationsAndProtections(ledger);
  Setup_styleTabHeaders(ledger);
  Setup_styleApprovalsTab(ledger);
  Setup_hideCountersTab(ledger);
  Setup_cleanupDefaultSheet(ledger);

  var vaultInfo = Setup_ensureVaultSpreadsheet();
  var dashboardInfo = Setup_ensureDashboardSpreadsheet();
  var folderInfo = Setup_ensureDriveFolders();

  var configSeeded = Setup_ensureConfigSeeded();
  if (configSeeded.created) {
    Audit.append('SYSTEM', 'Config', 'CONFIG', 'CREATE', { keys: configSeeded.keys });
  }

  var categoriesSeeded = Setup_ensureCategoriesSeeded();
  if (categoriesSeeded.created) {
    Audit.append('SYSTEM', 'Category', 'CATEGORIES', 'CREATE', { count: categoriesSeeded.count });
  }

  var treasurerSeeded = Setup_ensureTreasurerUserSeeded();
  if (treasurerSeeded.created) {
    Audit.append('SYSTEM', 'User', treasurerSeeded.userId, 'CREATE', { role: ROLES.TREASURER });
  }

  var configConsistency = Setup_verifyConfigConsistency();

  var incomeSeeded = Setup_ensureOpeningBalanceSeeded();
  if (incomeSeeded.created) {
    Audit.append('SYSTEM', 'Income', incomeSeeded.incomeId, 'CREATE', {
      amount: incomeSeeded.amount, notes: 'Opening balance per SEM A Statement.xlsx'
    });
  }

  SpreadsheetApp.flush(); // Crucial so a subsequent call in a separate execution (e.g. clasp run) doesn't race a stale read of what was just seeded.

  return {
    ledgerId: ledger.getId(),
    ledgerUrl: ledger.getUrl(),
    vaultId: vaultInfo.id,
    vaultUrl: vaultInfo.url,
    dashboardId: dashboardInfo.id,
    dashboardUrl: dashboardInfo.url,
    tabsCreated: createdTabs,
    approvalsMigration: approvalsMigration,
    folders: folderInfo,
    configSeeded: configSeeded,
    categoriesSeeded: categoriesSeeded,
    treasurerSeeded: treasurerSeeded,
    configConsistency: configConsistency,
    incomeSeeded: incomeSeeded
  };
}

/**
 * Create any CF-Ledger tabs that don't exist yet, with header rows from COLS.
 * @param {Spreadsheet} ledger
 * @return {string[]} names of tabs that were newly created
 */
function Setup_ensureAllTabsExist(ledger) {
  var ledgerTabNames = [
    TABS.USERS, TABS.CATEGORIES, TABS.EVENTS, TABS.BUDGET_REQUESTS,
    TABS.BUDGET_REQUEST_LINES, TABS.EXPENSE_CLAIMS, TABS.CLAIM_LINE_ITEMS,
    TABS.RECEIPTS, TABS.INCOME, TABS.PAYOUTS, TABS.AUDIT_LOG,
    TABS.APPROVALS, TABS.CONFIG, TABS.COUNTERS
  ];
  var created = [];
  for (var i = 0; i < ledgerTabNames.length; i++) {
    var name = ledgerTabNames[i];
    if (!ledger.getSheetByName(name)) {
      var sheet = ledger.insertSheet(name);
      var headers = Object.keys(COLS[name]);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      created.push(name);
    }
  }
  return created;
}

/**
 * Install ARRAYFORMULA logic for derived columns in BudgetRequestLines.
 * claimed_amount uses MAP+SUMIF to dynamically sum ClaimLineItems.
 * remaining uses ARRAYFORMULA to subtract claimed from approved.
 * @param {Spreadsheet} ledger
 */
function Setup_installArrayFormulas(ledger) {
  var sheet = ledger.getSheetByName(TABS.BUDGET_REQUEST_LINES);
  if (!sheet) return;
  var claimedCol = COLS.BudgetRequestLines.claimed_amount;
  var remainingCol = COLS.BudgetRequestLines.remaining;
  
  var claimedFormula = '={"claimed_amount"; MAP(A2:A, LAMBDA(id, IF(ISBLANK(id), "", SUMIF(ClaimLineItems!C:C, id, ClaimLineItems!E:E))))}';
  sheet.getRange(1, claimedCol).setFormula(claimedFormula);
  
  var remainingFormula = '={"remaining"; ARRAYFORMULA(IF(ISBLANK(A2:A), "", F2:F - H2:H))}';
  sheet.getRange(1, remainingCol).setFormula(remainingFormula);
}

/** Remove the default 'Sheet1' left over from spreadsheet creation, if harmless to do so. */
function Setup_cleanupDefaultSheet(ledger) {
  var sheet1 = ledger.getSheetByName('Sheet1');
  if (sheet1 && ledger.getSheets().length > 1) {
    try {
      ledger.deleteSheet(sheet1);
    } catch (e) {
      // last sheet or otherwise undeletable; leave it, harmless
    }
  }
}

/** Hide the Counters tab — it's implementation detail, not for humans to edit. */
function Setup_hideCountersTab(ledger) {
  var sheet = ledger.getSheetByName(TABS.COUNTERS);
  if (sheet && !sheet.isSheetHidden()) sheet.hideSheet();
}

/**
 * Apply dropdown/checkbox data validation and protected ranges.
 * Re-runnable: validation rules are simply reapplied; protections are
 * only created if not already present (idempotency guard on protect()).
 * @param {Spreadsheet} ledger
 */
function Setup_applyValidationsAndProtections(ledger) {
  Setup_applyDropdown(ledger, TABS.BUDGET_REQUESTS, COLS.BudgetRequests.status, Object.keys(STATUS.BudgetRequest).map(function (k) { return STATUS.BudgetRequest[k]; }));
  Setup_applyDropdown(ledger, TABS.BUDGET_REQUEST_LINES, COLS.BudgetRequestLines.line_status, Setup_values(STATUS.BudgetRequestLine));
  Setup_applyDropdown(ledger, TABS.EXPENSE_CLAIMS, COLS.ExpenseClaims.status, Setup_values(STATUS.ExpenseClaim));
  Setup_applyDropdown(ledger, TABS.PAYOUTS, COLS.Payouts.status, Setup_values(STATUS.Payout));
  Setup_applyDropdown(ledger, TABS.USERS, COLS.Users.role, Setup_values(ROLES));
  Setup_applyDropdown(ledger, TABS.CATEGORIES, COLS.Categories.kind, ['EXPENSE', 'INCOME']);
  Setup_applyDropdown(ledger, TABS.APPROVALS, COLS.Approvals.action, Setup_values(ACTIONS));
  Setup_applyDropdown(ledger, TABS.APPROVALS, COLS.Approvals.payout_method, Setup_values(PAYOUT_METHOD));

  Setup_applyCheckbox(ledger, TABS.USERS, COLS.Users.active);
  Setup_applyCheckbox(ledger, TABS.CATEGORIES, COLS.Categories.active);
  Setup_applyCheckbox(ledger, TABS.BUDGET_REQUESTS, COLS.BudgetRequests.self_approved);
  Setup_applyCheckbox(ledger, TABS.EXPENSE_CLAIMS, COLS.ExpenseClaims.self_approved);
  Setup_applyCheckbox(ledger, TABS.EXPENSE_CLAIMS, COLS.ExpenseClaims.late_flag);
  Setup_applyCheckbox(ledger, TABS.CLAIM_LINE_ITEMS, COLS.ClaimLineItems.missing_receipt_flag);
  Setup_applyCheckbox(ledger, TABS.APPROVALS, COLS.Approvals.confirm);

  var ownerOnlyTabs = [TABS.AUDIT_LOG, TABS.CONFIG, TABS.COUNTERS];
  for (var i = 0; i < ownerOnlyTabs.length; i++) {
    Setup_protectOwnerOnly(ledger.getSheetByName(ownerOnlyTabs[i]));
  }

  var warnOnlyTabs = [
    TABS.USERS, TABS.CATEGORIES, TABS.EVENTS, TABS.BUDGET_REQUESTS,
    TABS.BUDGET_REQUEST_LINES, TABS.EXPENSE_CLAIMS, TABS.CLAIM_LINE_ITEMS,
    TABS.RECEIPTS, TABS.INCOME, TABS.PAYOUTS
  ];
  for (var j = 0; j < warnOnlyTabs.length; j++) {
    Setup_protectWarnOnly(ledger.getSheetByName(warnOnlyTabs[j]));
  }

  Setup_protectApprovalsIntentOnly(ledger.getSheetByName(TABS.APPROVALS));
}

/** @return {string[]} the values of an enum-like object, in declaration order */
function Setup_values(obj) {
  return Object.keys(obj).map(function (k) { return obj[k]; });
}

/**
 * Apply a dropdown (requireValueInList) to rows 2-1000 of one column.
 * @param {Spreadsheet} ledger
 * @param {string} tabName
 * @param {number} col1Indexed
 * @param {string[]} values
 */
function Setup_applyDropdown(ledger, tabName, col1Indexed, values) {
  var sheet = ledger.getSheetByName(tabName);
  if (!sheet) return;
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
  sheet.getRange(2, col1Indexed, 999, 1).setDataValidation(rule);
}

/**
 * Apply a checkbox to rows 2-1000 of one column.
 * @param {Spreadsheet} ledger
 * @param {string} tabName
 * @param {number} col1Indexed
 */
function Setup_applyCheckbox(ledger, tabName, col1Indexed) {
  var sheet = ledger.getSheetByName(tabName);
  if (!sheet) return;
  var rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  sheet.getRange(2, col1Indexed, 999, 1).setDataValidation(rule);
}

/**
 * Protect an entire sheet so only the owner (the account running this
 * script) may edit it. Idempotent: skips if a sheet protection already
 * exists.
 * @param {?Sheet} sheet
 */
function Setup_protectOwnerOnly(sheet) {
  if (!sheet) return;
  var existing = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  if (existing.length > 0) return;
  var protection = sheet.protect().setDescription('owner-only: ' + sheet.getName());
  var me = Session.getEffectiveUser();
  var editors = protection.getEditors();
  for (var i = 0; i < editors.length; i++) {
    if (editors[i].getEmail() !== me.getEmail()) protection.removeEditor(editors[i]);
  }
  if (protection.canDomainEdit()) protection.setDomainEdit(false);
}

/**
 * Protect an entire sheet as warn-only (editors see a confirmation
 * dialog but are not blocked). Idempotent.
 * @param {?Sheet} sheet
 */
function Setup_protectWarnOnly(sheet) {
  if (!sheet) return;
  var existing = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  if (existing.length > 0) return;
  var protection = sheet.protect().setDescription('warn-only: ' + sheet.getName());
  protection.setWarningOnly(true);
}

/**
 * Protect the Approvals sheet except its intent columns (action,
 * amount_override, note, payout_method, payout_reference, confirm,
 * intent_actor_email), which stay freely editable so committee members
 * can express intent there. Idempotent: always recreates the protection
 * from the current COLS.Approvals values, so it self-heals if the
 * intent-column range ever changes (e.g. new columns inserted) rather
 * than permanently freezing whatever range existed on first run.
 * @param {?Sheet} sheet
 */
function Setup_protectApprovalsIntentOnly(sheet) {
  if (!sheet) return;
  var existing = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  for (var i = 0; i < existing.length; i++) existing[i].remove();

  var protection = sheet.protect().setDescription('Approvals: intent columns only editable');
  var c = COLS.Approvals;
  var firstIntentCol = c.action;
  var lastIntentCol = c.intent_actor_email;
  var numCols = lastIntentCol - firstIntentCol + 1;
  var unprotected = sheet.getRange(2, firstIntentCol, 999, numCols);
  protection.setUnprotectedRanges([unprotected]);
}

/**
 * Create the CF-Vault spreadsheet if it doesn't exist yet (checked via
 * Script Properties, since it's a separate file from the container).
 * @return {{id: string, url: string}}
 */
function Setup_ensureVaultSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty('VAULT_ID');
  var vault;
  if (existingId) {
    vault = SpreadsheetApp.openById(existingId);
  } else {
    vault = SpreadsheetApp.create('CF-Vault');
    props.setProperty('VAULT_ID', vault.getId());
  }
  var sheet = vault.getSheetByName(TABS.VAULT);
  if (!sheet) {
    sheet = vault.getSheets()[0];
    sheet.setName(TABS.VAULT);
    var headers = Object.keys(COLS.Vault);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  if (protections.length === 0) {
    var protection = sheet.protect().setDescription('CF-Vault: treasurer-only, PII');
    var me = Session.getEffectiveUser();
    var editors = protection.getEditors();
    for (var i = 0; i < editors.length; i++) {
      if (editors[i].getEmail() !== me.getEmail()) protection.removeEditor(editors[i]);
    }
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
  }
  return { id: vault.getId(), url: vault.getUrl() };
}

/**
 * Create the Dashboard spreadsheet if it doesn't exist yet.
 * Sets up IMPORTRANGE formulas for Budget Requests, Expense Claims, and Income.
 * Note: The owner may need to click 'Allow Access' on the #REF! errors once.
 * @return {{id: string, url: string}}
 */
function Setup_ensureDashboardSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty('DASHBOARD_ID');
  var dash;
  if (existingId) {
    try {
      dash = SpreadsheetApp.openById(existingId);
    } catch (e) {
      dash = null;
    }
  }
  
  if (!dash) {
    dash = SpreadsheetApp.create('CF-Budget-Dashboard');
    props.setProperty('DASHBOARD_ID', dash.getId());
    
    var ledgerId = props.getProperty('LEDGER_ID') || SpreadsheetApp.getActive().getId();
    
    var tabs = [TABS.BUDGET_REQUESTS, TABS.EXPENSE_CLAIMS, TABS.INCOME];
    for (var i = 0; i < tabs.length; i++) {
      var tabName = tabs[i];
      var sheet = dash.getSheetByName(tabName);
      if (!sheet) {
        if (i === 0) {
          sheet = dash.getSheets()[0];
          sheet.setName(tabName);
        } else {
          sheet = dash.insertSheet(tabName);
        }
      }
      var formula = '=IMPORTRANGE("' + ledgerId + '", "' + tabName + '!A:Z")';
      sheet.getRange('A1').setFormula(formula);
    }
    
    var sheets = dash.getSheets();
    for (var j = 0; j < sheets.length; j++) {
      if (tabs.indexOf(sheets[j].getName()) === -1) {
        try { dash.deleteSheet(sheets[j]); } catch (e) {}
      }
    }
    
    var allSheets = dash.getSheets();
    var me = Session.getEffectiveUser();
    for (var k = 0; k < allSheets.length; k++) {
      var p = allSheets[k].protect().setDescription('Dashboard is read-only IMPORTRANGE');
      var editors = p.getEditors();
      for (var e = 0; e < editors.length; e++) {
        if (editors[e].getEmail() !== me.getEmail()) p.removeEditor(editors[e]);
      }
      if (p.canDomainEdit()) p.setDomainEdit(false);
    }
  }
  return { id: dash.getId(), url: dash.getUrl() };
}

/**
 * Create the /CF-Finance Drive folder tree if missing. Stores every
 * folder ID in Script Properties for use by IntakeForms.gs and Jobs.gs.
 * @return {Object<string,string>} folder name -> id
 */
function Setup_ensureDriveFolders() {
  var props = PropertiesService.getScriptProperties();
  var root = Setup_getOrCreateFolder(DriveApp.getRootFolder(), 'CF-Finance');
  props.setProperty('CF_FINANCE_FOLDER_ID', root.getId());
  var names = ['Receipts', 'Snapshots', 'Statements', 'Archive'];
  var ids = { CF_Finance: root.getId() };
  for (var i = 0; i < names.length; i++) {
    var folder = Setup_getOrCreateFolder(root, names[i]);
    var propKey = names[i].toUpperCase() + '_FOLDER_ID';
    props.setProperty(propKey, folder.getId());
    ids[names[i]] = folder.getId();
  }
  return ids;
}

/**
 * @param {Folder} parent
 * @param {string} name
 * @return {Folder} existing or newly created subfolder
 */
function Setup_getOrCreateFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

/**
 * Seed the Config tab with every policy key from BUILD-PLAN.md §3, but
 * never overwrite a key that's already present (so a pasted-in webhook
 * URL survives re-runs).
 * @return {{created: boolean, keys: string[]}}
 */
function Setup_ensureConfigSeeded() {
  var sheet = getSheet_(TABS.CONFIG);
  var defaults = {
    CURRENT_SEMESTER: '26A',
    TREASURER_USER_ID: 'USER-0001',
    TREASURY_WEBHOOK_URL: 'PASTE_ME',
    STATUS_WEBHOOK_URL: 'PASTE_ME',
    PUBLIC_SHOW_AMOUNTS: 'FALSE',
    CLAIM_DEADLINE_DAYS: '30',
    SEMESTER_HARD_STOP_DAYS: '14',
    MISSING_RECEIPT_CAP: '200',
    MISSING_RECEIPT_MAX_PER_SEM: '2',
    APPROVAL_SLA_HOURS: '72',
    PAYOUT_AUTOCONFIRM_HOURS: '72',
    LOCK_AFTER_PAID_HOURS: '24',
    BACKUP_ACCOUNT_EMAIL: 'PASTE_ME'
  };
  var lastRow = sheet.getLastRow();
  var existingKeys = {};
  if (lastRow > 1) {
    var values = sheet.getRange(2, COLS.Config.key, lastRow - 1, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      if (values[i][0]) existingKeys[values[i][0]] = true;
    }
  }
  var added = [];
  for (var key in defaults) {
    if (!existingKeys[key]) {
      sheet.appendRow([key, defaults[key]]);
      added.push(key);
    }
  }
  if (added.length > 0) Config.invalidate();
  return { created: added.length > 0, keys: added };
}

/**
 * Detect and auto-heal Config.TREASURER_USER_ID drift (BUILD-PLAN P3
 * hardening): the stored ID can survive an ID-scheme change across
 * upgrades (e.g. 'U-0001' -> 'USER-0001' during the Phase 3 ID-prefix
 * rework) while the real Users row moves to the new ID, silently breaking
 * every transition that resolves the treasurer with ACTOR_NOT_FOUND. Safe
 * to call on every setupAll() run — a no-op once Config is consistent.
 * @return {{ok: boolean, corrected: boolean, issue: ?string}}
 */
function Setup_verifyConfigConsistency() {
  var configuredId = Config.getOptional('TREASURER_USER_ID');
  var usersValues = getSheet_(TABS.USERS).getDataRange().getValues();
  var c = COLS.Users;
  var treasurerUserIds = [];
  for (var i = 1; i < usersValues.length; i++) {
    var userId = usersValues[i][c.user_id - 1];
    if (userId && usersValues[i][c.role - 1] === ROLES.TREASURER) treasurerUserIds.push(userId);
  }

  var resolution = CoreDecisions.resolveTreasurerIdDrift(configuredId, treasurerUserIds);

  if (resolution.action === 'ok') {
    return { ok: true, corrected: false, issue: null };
  }
  if (resolution.action === 'correct') {
    Setup_setConfigValue_('TREASURER_USER_ID', resolution.correctedId);
    var issue = 'Config.TREASURER_USER_ID (' + (configuredId || '(unset)') +
      ') did not resolve to a real Users row; auto-corrected to ' + resolution.correctedId + '.';
    Discord.postTreasury('⚠️ ' + issue);
    return { ok: true, corrected: true, issue: issue };
  }
  var unresolvableIssue = 'Config.TREASURER_USER_ID (' + (configuredId || '(unset)') + ') does not resolve, and ' +
    treasurerUserIds.length + ' TREASURER-role Users exist (need exactly 1 to auto-correct). Fix manually in the Config tab.';
  Discord.postTreasury('🚨 ' + unresolvableIssue);
  return { ok: false, corrected: false, issue: unresolvableIssue };
}

/**
 * Update an existing Config row's value (creates the row if missing).
 * @param {string} key
 * @param {string} value
 * @private
 */
function Setup_setConfigValue_(key, value) {
  var sheet = getSheet_(TABS.CONFIG);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Config;
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.key - 1] === key) {
      sheet.getRange(i + 1, c.value).setValue(value);
      Config.invalidate();
      return;
    }
  }
  sheet.appendRow([key, value]);
  Config.invalidate();
}

/**
 * Seed Categories only if the tab is currently empty.
 * @return {{created: boolean, count: number}}
 */
function Setup_ensureCategoriesSeeded() {
  var sheet = getSheet_(TABS.CATEGORIES);
  var values = sheet.getRange(2, 1, Math.max(1, sheet.getMaxRows() - 1), 1).getValues();
  var hasContent = false;
  for (var i = 0; i < values.length; i++) {
    if (values[i][0]) { hasContent = true; break; }
  }
  if (hasContent) return { created: false, count: 0 };

  var rows = [
    ['CAT-ACT', 'Activities', 'EXPENSE', '', true],
    ['CAT-FOOD', 'Food', 'EXPENSE', '', true],
    ['CAT-TRAN', 'Transportation', 'EXPENSE', '', true],
    ['CAT-CAMP', 'Camp', 'EXPENSE', '', true],
    ['CAT-ADMIN', 'Admin', 'EXPENSE', '', true],
    ['CAT-DON', 'Donations', 'INCOME', '', true],
    ['CAT-RET', 'Retained Earnings', 'INCOME', '', true],
    ['CAT-FEE', 'Camp Fees', 'INCOME', '', true],
    ['CAT-OTH', 'Other', 'INCOME', '', true]
  ];
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  return { created: true, count: rows.length };
}

/**
 * Seed the Treasurer's User row (USER-0001) only if Users is currently empty.
 * @return {{created: boolean, userId: ?string}}
 */
function Setup_ensureTreasurerUserSeeded() {
  var sheet = getSheet_(TABS.USERS);
  var values = sheet.getRange(2, 1, Math.max(1, sheet.getMaxRows() - 1), 1).getValues();
  var insertRow = 2;
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === 'USER-0001') {
      Setup_registerCounter('User', 1);
      return { created: false, userId: 'USER-0001' };
    }
    if (values[i][0]) insertRow = i + 3;
  }
  var email = '';
  try {
    email = Session.getActiveUser().getEmail() || '';
  } catch (e) {
    email = '';
  }
  var userId = 'USER-0001';
  var now = Utilities.formatDate(new Date(), 'Asia/Hong_Kong', "yyyy-MM-dd'T'HH:mm:ssXXX");
  sheet.getRange(insertRow, 1, 1, 6).setValues([[userId, 'Treasurer', ROLES.TREASURER, email, true, now]]);
  // USER-0001 is seeded directly, bypassing Ids.nextId — register it in
  // Counters so the next real nextId('User') call starts at 2, not 1.
  Setup_registerCounter('User', 1);
  return { created: true, userId: userId };
}

/**
 * Ensure the Counters tab records at least `n` for entityType. Used
 * when a row is seeded directly (bypassing Ids.nextId) so future
 * nextId() calls never collide with the seeded ID.
 * @param {string} entityType
 * @param {number} n
 */
function Setup_registerCounter(entityType, n) {
  var sheet = getSheet_(TABS.COUNTERS);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][COLS.Counters.entity - 1] === entityType) {
      var current = Number(values[i][COLS.Counters.last_n - 1]) || 0;
      if (current < n) sheet.getRange(i + 1, COLS.Counters.last_n).setValue(n);
      return;
    }
  }
  sheet.appendRow([entityType, n]);
}

/**
 * Write the D8 opening-balance Income row only if Income is currently
 * empty. No legacy row-by-row import — see docs/adr and D8.
 * @return {{created: boolean, incomeId: ?string, amount: ?number}}
 */
function Setup_ensureOpeningBalanceSeeded() {
  var sheet = getSheet_(TABS.INCOME);
  var values = sheet.getRange(2, 1, Math.max(1, sheet.getMaxRows() - 1), 1).getValues();
  var insertRow = 2;
  for (var i = 0; i < values.length; i++) {
    if (values[i][0]) insertRow = i + 3;
  }
  if (insertRow > 2) return { created: false, incomeId: null, amount: null };
  var incomeId = Ids.nextId('Income');
  var today = Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyy-MM-dd');
  var amount = 10167.35;
  sheet.getRange(insertRow, 1, 1, 8).setValues([[
    incomeId, today, 'CAT-RET', amount, 'USER-0001',
    'Opening balance import', '', 'Opening balance per SEM A Statement.xlsx'
  ]]);
  return { created: true, incomeId: incomeId, amount: amount };
}
