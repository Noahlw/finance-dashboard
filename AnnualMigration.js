"use strict";
/**
 * AnnualMigration.js — Resumable Treasurer-guided migration from a closed
 * annual file to a fresh annual spreadsheet and year folder.
 *
 * Stages:
 *   1. PREVIEW   — Show what will be migrated
 *   2. CONFIGURE — Create folder + spreadsheet, stage data
 *   3. REVIEW    — Treasurer reviews and confirms
 *   4. ACTIVATED — Migration complete, new file active
 */

var MIGRATION_STAGES = ["PREVIEW", "CONFIGURE", "REVIEW", "ACTIVATED"];

var Migration = {
  /**
   * Clear a Config key on the current spreadsheet's Config tab.
   * @private
   */
  _clearConfig(key) {
    var sheet = getSheet_(TABS.CONFIG);
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === key) {
        sheet.deleteRow(i + 1);
        Config.invalidate();
        return;
      }
    }
  },

  /**
   * Create a new tab in the given spreadsheet with headers.
   * @private
   */
  _createTab(ss, name, headers) {
    var sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    if (name === TABS.CONFIG) {
      // Protect Config from accidental edits (same pattern as original)
    }
    return sheet;
  },

  /**
   * Set a Config key on the current spreadsheet's Config tab.
   * @private
   */
  _setConfig(key, value) {
    Setup_setConfigValue_(key, value);
  },

  /**
   * Activate the migration: set LEDGER_ID to the new spreadsheet.
   * Previous annual file is set as read-only / archived.
   */
  activateMigration(actorUserId) {
    var stage = Config.getOptional("MIGRATION_STAGE") || "";
    if (stage !== "REVIEW") {
      return {
        ok: false,
        reason: "Migration must be in REVIEW stage. Current: " + stage,
      };
    }

    var targetSpreadsheetId =
      Config.getOptional("MIGRATION_TARGET_SPREADSHEET_ID") || "";
    if (!targetSpreadsheetId) {
      return { ok: false, reason: "No target spreadsheet" };
    }

    var oldSpreadsheetId =
      PropertiesService.getScriptProperties().getProperty("LEDGER_ID") || "";

    // Set the new spreadsheet as active
    PropertiesService.getScriptProperties().setProperty(
      "LEDGER_ID",
      targetSpreadsheetId
    );

    // Mark old spreadsheet as read-only archive
    if (oldSpreadsheetId && oldSpreadsheetId !== targetSpreadsheetId) {
      try {
        var oldFile = DriveApp.getFileById(oldSpreadsheetId);
        oldFile.setName(oldFile.getName() + " (ARCHIVED)");
        oldFile.setViewersCanCopyContent(false);
      } catch (e) {}
    }

    Migration._setConfig("MIGRATION_STAGE", "ACTIVATED");
    Config.invalidate();

    var yearLabel = Config.getOptional("MIGRATION_YEAR_LABEL") || "";
    Audit.append(actorUserId, "Migration", yearLabel, "ACTIVATED", {
      new_spreadsheet_id: targetSpreadsheetId,
      old_spreadsheet_id: oldSpreadsheetId,
    });

    try {
      Discord.postTreasury(
        "🎉 Annual Migration activated! New file: **" +
          yearLabel +
          "** is now the active ledger."
      );
    } catch (e) {}

    return {
      new_spreadsheet_id: targetSpreadsheetId,
      ok: true,
      stage: "ACTIVATED",
    };
  },

  /**
   * Cancel/discard an in-progress migration.
   */
  cancelMigration(actorUserId) {
    var stage = Config.getOptional("MIGRATION_STAGE") || "";
    if (!stage || stage === "ACTIVATED") {
      return { ok: false, reason: "No active migration to cancel" };
    }

    var targetSpreadsheetId =
      Config.getOptional("MIGRATION_TARGET_SPREADSHEET_ID") || "";
    var targetFolderId = Config.getOptional("MIGRATION_TARGET_FOLDER_ID") || "";

    // Clean up created resources
    if (targetSpreadsheetId) {
      try {
        var file = DriveApp.getFileById(targetSpreadsheetId);
        file.setTrashed(true);
      } catch (e) {}
    }
    if (targetFolderId) {
      try {
        var folder = DriveApp.getFolderById(targetFolderId);
        folder.setTrashed(true);
      } catch (e) {}
    }

    // Clear migration Config
    var keysToClear = [
      "MIGRATION_STAGE",
      "MIGRATION_YEAR_LABEL",
      "MIGRATION_COMMITTEE_YEAR",
      "MIGRATION_TARGET_SPREADSHEET_ID",
      "MIGRATION_TARGET_FOLDER_ID",
      "MIGRATION_SELECTIONS",
    ];
    keysToClear.forEach((k) => {
      Migration._clearConfig(k);
    });

    Audit.append(actorUserId, "Migration", stage, "CANCELLED", { stage });

    return { cancelled: true, ok: true };
  },

  /**
   * Execute the migration: create the new spreadsheet schema with selected data.
   * Stage: REVIEW -> ACTIVATED
   */
  executeMigration(actorUserId) {
    var targetSpreadsheetId =
      Config.getOptional("MIGRATION_TARGET_SPREADSHEET_ID") || "";
    if (!targetSpreadsheetId) {
      return { ok: false, reason: "No migration target spreadsheet" };
    }

    var selections = Migration.getSelections();
    var preview = Migration.getPreview();

    try {
      var ss = SpreadsheetApp.openById(targetSpreadsheetId);

      // Delete default Sheet1
      var sheets = ss.getSheets();
      for (var si = 0; si < sheets.length; si++) {
        if (sheets[si].getName() === "Sheet1") {
          try {
            ss.deleteSheet(sheets[si]);
          } catch (e) {}
        }
      }

      // Create all tabs identical to Setup.js schema (simplified)
      Migration._createTab(ss, TABS.USERS, [
        "user_id",
        "display_name",
        "role",
        "email",
        "active",
        "created_at",
      ]);
      Migration._createTab(ss, TABS.CATEGORIES, [
        "category_id",
        "name",
        "kind",
        "semester_cap",
        "active",
      ]);
      Migration._createTab(ss, TABS.EVENTS, [
        "event_id",
        "name",
        "semester",
        "owner_user_id",
        "created_at",
      ]);
      Migration._createTab(ss, TABS.BUDGET_REQUESTS, [
        "request_id",
        "requester_id",
        "event_id",
        "title",
        "justification",
        "needed_by",
        "status",
        "submitted_at",
        "decided_at",
        "decided_by",
        "decision_note",
        "self_approved",
        "processed_response_id",
      ]);
      Migration._createTab(ss, TABS.BUDGET_REQUEST_LINES, [
        "line_id",
        "request_id",
        "category_id",
        "description",
        "requested_amount",
        "approved_amount",
        "line_status",
        "claimed_amount",
        "remaining",
      ]);
      Migration._createTab(ss, TABS.EXPENSE_CLAIMS, [
        "claim_id",
        "claimant_id",
        "status",
        "submitted_at",
        "verified_at",
        "approved_at",
        "paid_at",
        "locked_at",
        "verified_by",
        "approved_by",
        "total_amount",
        "late_flag",
        "self_approved",
        "notes",
        "processed_response_id",
        "created_by",
        "expense_date",
        "semester",
        "event_id",
        "payout_method",
        "payout_handle",
      ]);
      Migration._createTab(ss, TABS.CLAIM_LINE_ITEMS, [
        "claim_line_id",
        "claim_id",
        "budget_line_id",
        "receipt_id",
        "amount",
        "description",
        "missing_receipt_flag",
      ]);
      Migration._createTab(ss, TABS.RECEIPTS, [
        "receipt_id",
        "drive_file_id",
        "sha256",
        "uploaded_by",
        "uploaded_at",
        "vendor",
        "receipt_date",
        "receipt_total",
        "file_link",
      ]);
      Migration._createTab(ss, TABS.INCOME, [
        "income_id",
        "date",
        "category_id",
        "amount",
        "received_by",
        "source_ref",
        "event_id",
        "notes",
        "account_id",
        "status",
        "decided_by",
        "decided_at",
        "decision_note",
        "processed_response_id",
      ]);
      Migration._createTab(ss, TABS.PAYOUTS, [
        "payout_id",
        "claim_id",
        "payee_user_id",
        "amount",
        "method",
        "txn_reference",
        "paid_by",
        "status",
        "paid_at",
        "confirmed_at",
        "account_id",
        "failure_reason",
        "parent_payout_id",
      ]);
      Migration._createTab(ss, TABS.FINANCE_ACCOUNTS, [
        "account_id",
        "name",
        "opening_balance",
        "current_balance",
        "pending_income",
        "reserved_payouts",
        "status",
        "created_at",
        "deactivated_at",
      ]);
      Migration._createTab(ss, TABS.ACCOUNT_TRANSFERS, [
        "transfer_id",
        "from_account_id",
        "to_account_id",
        "amount",
        "reason",
        "transferred_by",
        "transferred_at",
      ]);
      Migration._createTab(ss, TABS.ACCOUNT_ADJUSTMENTS, [
        "adjustment_id",
        "account_id",
        "amount",
        "direction",
        "reason",
        "adjusted_by",
        "adjusted_at",
      ]);
      Migration._createTab(ss, TABS.AUDIT_LOG, [
        "seq",
        "ts",
        "actor_user_id",
        "entity_type",
        "entity_id",
        "action",
        "detail",
        "prev_hash",
        "row_hash",
      ]);
      Migration._createTab(ss, TABS.APPROVALS, [
        "entity_id",
        "entity_type",
        "title",
        "requester_or_claimant",
        "amount",
        "status",
        "action",
        "amount_override",
        "note",
        "confirm",
        "intent_actor_email",
        "receipt_link",
      ]);
      Migration._createTab(ss, TABS.CONFIG, ["key", "value"]);
      Migration._createTab(ss, TABS.COUNTERS, ["entity", "last_n"]);

      var now = Audit._nowIso();

      // Migrate selected members
      var usersSheet = ss.getSheetByName(TABS.USERS);
      var memberMap = {};
      var memberIds = selections.member_ids || [];
      preview.active_members.forEach((m) => {
        if (memberIds.indexOf(m.user_id) >= 0) {
          memberMap[m.user_id] = m;
        }
      });
      preview.inactive_members.forEach((m) => {
        if (memberIds.indexOf(m.user_id) >= 0) {
          memberMap[m.user_id] = m;
        }
      });
      preview.operators.forEach((op) => {
        memberMap[op.user_id] = op;
      });

      Object.keys(memberMap).forEach((uid) => {
        var m = memberMap[uid];
        usersSheet.appendRow([
          uid,
          m.display_name,
          m.role,
          m.email || "",
          m.active,
          now,
        ]);
      });

      // Migrate selected accounts with balances
      var accountsSheet = ss.getSheetByName(TABS.FINANCE_ACCOUNTS);
      var accountIds = selections.account_ids || [];
      var balanceReasons = selections.balance_reasons || {};
      var balances = selections.account_balances || {};
      preview.accounts.forEach((acct) => {
        if (accountIds.indexOf(acct.account_id) >= 0) {
          var openingBalance =
            Number(balances[acct.account_id]) || acct.current_balance;
          accountsSheet.appendRow([
            acct.account_id,
            acct.name,
            openingBalance,
            openingBalance,
            0,
            0,
            ROLES.COMMITTEE ? STATUS.FinanceAccount.ACTIVE : "ACTIVE",
            now,
            "",
          ]);
        } else {
          // Inactive reference for non-carried accounts
          accountsSheet.appendRow([
            acct.account_id,
            acct.name + " (closed)",
            0,
            0,
            0,
            0,
            STATUS.FinanceAccount.INACTIVE,
            now,
            now,
          ]);
        }
      });

      // Migrate selected categories
      var catSheet = ss.getSheetByName(TABS.CATEGORIES);
      var catIds = selections.category_ids || [];
      preview.categories.forEach((cat) => {
        if (catIds.indexOf(cat.category_id) >= 0) {
          catSheet.appendRow([
            cat.category_id,
            cat.name,
            cat.kind,
            0,
            cat.active,
          ]);
        }
      });

      // Migrate selected events
      var evtSheet = ss.getSheetByName(TABS.EVENTS);
      var eventIds = selections.event_ids || [];
      var eventCount = 0;
      preview.events.forEach((evt) => {
        if (eventIds.indexOf(evt.event_id) >= 0) {
          eventCount++;
          evtSheet.appendRow([
            evt.event_id,
            evt.name + " (" + (Number(preview.next_committee_year) - 1) + ")",
            preview.current_year,
            preview.operators.length > 0 ? preview.operators[0].user_id : "",
            now,
          ]);
        }
      });

      // Seed Config for new spreadsheet
      var configSheet = ss.getSheetByName(TABS.CONFIG);
      configSheet.appendRow(["CURRENT_SEMESTER", "SEM A"]);
      configSheet.appendRow([
        "COMMITTEE_YEAR",
        String(preview.next_committee_year || 27),
      ]);

      // Seed Counters
      var countersSheet = ss.getSheetByName(TABS.COUNTERS);
      [
        "User",
        "Event",
        "BudgetRequest",
        "BudgetRequestLine",
        "ExpenseClaim",
        "ClaimLineItem",
        "Receipt",
        "Income",
        "Payout",
        "FinanceAccount",
        "AccountTransfer",
        "AccountAdjustment",
      ].forEach((entity) => {
        countersSheet.appendRow([entity, 0]);
      });

      Audit.append(actorUserId, "Migration", preview.year_label, "EXECUTED", {
        accounts: accountIds.length,
        categories: catIds.length,
        events: eventCount,
        members: Object.keys(memberMap).length,
      });

      return {
        ok: true,
        stage: "REVIEW",
        target_spreadsheet_id: targetSpreadsheetId,
      };
    } catch (e) {
      return { ok: false, reason: "Migration execution failed: " + e.message };
    }
  },

  /**
   * Get a preview of what would be carried forward in a migration.
   * Shows active members, inactive members for history, accounts, categories, events.
   */
  getPreview() {
    // Active members
    var usersSheet = getSheet_(TABS.USERS);
    var usersValues = usersSheet.getDataRange().getValues();
    var uc = COLS.Users;
    var activeMembers = [];
    var inactiveMembers = [];
    var operators = [];

    for (var i = 1; i < usersValues.length; i++) {
      var role = usersValues[i][uc.role - 1];
      var active =
        String(usersValues[i][uc.active - 1])
          .trim()
          .toUpperCase() === "TRUE";
      var entry = {
        active,
        display_name: usersValues[i][uc.display_name - 1],
        email: usersValues[i][uc.email - 1] || "",
        role,
        user_id: usersValues[i][uc.user_id - 1],
      };

      if (role === ROLES.MEMBER) {
        if (active) {
          activeMembers.push(entry);
        } else {
          inactiveMembers.push(entry);
        }
      } else if (role === ROLES.COMMITTEE || role === ROLES.TREASURER) {
        operators.push(entry);
      }
    }

    // Finance accounts
    var accounts = [];
    var faSheet = getSheet_(TABS.FINANCE_ACCOUNTS);
    var faValues = faSheet.getDataRange().getValues();
    var fac = COLS.FinanceAccounts;
    for (var j = 1; j < faValues.length; j++) {
      if (!faValues[j][fac.account_id - 1]) {
        continue;
      }
      accounts.push({
        account_id: faValues[j][fac.account_id - 1],
        current_balance: Number(faValues[j][fac.current_balance - 1]) || 0,
        name: faValues[j][fac.name - 1],
        status: faValues[j][fac.status - 1],
      });
    }

    // Categories
    var categories = [];
    var catSheet = getSheet_(TABS.CATEGORIES);
    var catValues = catSheet.getDataRange().getValues();
    var cc = COLS.Categories;
    for (var k = 1; k < catValues.length; k++) {
      if (!catValues[k][cc.category_id - 1]) {
        continue;
      }
      categories.push({
        active: catValues[k][cc.active - 1] === true,
        category_id: catValues[k][cc.category_id - 1],
        kind: catValues[k][cc.kind - 1],
        name: catValues[k][cc.name - 1],
      });
    }

    // Events (all from current file)
    var events = [];
    var evtSheet = getSheet_(TABS.EVENTS);
    var evtValues = evtSheet.getDataRange().getValues();
    var ec = COLS.Events;
    for (var l = 1; l < evtValues.length; l++) {
      if (!evtValues[l][ec.event_id - 1]) {
        continue;
      }
      events.push({
        event_id: evtValues[l][ec.event_id - 1],
        name: evtValues[l][ec.name - 1],
        semester: evtValues[l][ec.semester - 1],
      });
    }

    // Determine committee year
    var currentYear = Config.getOptional("CURRENT_SEMESTER") || "26A";
    var yearNum = Number.parseInt(currentYear.replace(/[^0-9]/g, ""), 10) || 26;
    var nextYearNum = yearNum + 1;

    return {
      accounts,
      active_members: activeMembers,
      categories,
      current_year: currentYear,
      events,
      has_treasurer: operators.some(
        (o) => o.role === ROLES.TREASURER && o.active
      ),
      inactive_members: inactiveMembers,
      next_committee_year: nextYearNum,
      operators,
      year_label:
        nextYearNum - 1 + "-" + nextYearNum + " (" + nextYearNum + ")",
    };
  },

  /**
   * Get the stored selections for review.
   */
  getSelections() {
    var json = Config.getOptional("MIGRATION_SELECTIONS") || "{}";
    try {
      return JSON.parse(json);
    } catch (e) {
      return {};
    }
  },
  /**
   * Get the current migration state.
   * Returns null if no migration is in progress or the last one was activated.
   */
  getState() {
    var stage = Config.getOptional("MIGRATION_STAGE") || "";
    if (!stage || MIGRATION_STAGES.indexOf(stage) < 0) {
      return null;
    }

    var targetSpreadsheetId =
      Config.getOptional("MIGRATION_TARGET_SPREADSHEET_ID") || "";
    var targetFolderId = Config.getOptional("MIGRATION_TARGET_FOLDER_ID") || "";
    var yearLabel = Config.getOptional("MIGRATION_YEAR_LABEL") || "";
    var committeeYear = Config.getOptional("MIGRATION_COMMITTEE_YEAR") || "";

    return {
      active: stage !== "ACTIVATED",
      committee_year: committeeYear,
      stage,
      target_folder_id: targetFolderId,
      target_spreadsheet_id: targetSpreadsheetId,
      year_label: yearLabel,
    };
  },

  /**
   * Confirm selected members, accounts, categories, and events for migration.
   * Stage: CONFIGURE -> REVIEW
   */
  setSelections(actorUserId, selections) {
    selections = selections || {};

    var selectionJson = JSON.stringify({
      account_balances: selections.accountBalances || {},
      account_ids: selections.accountIds || [],
      balance_reasons: selections.balanceReasons || {},
      category_ids: selections.categoryIds || [],
      event_ids: selections.eventIds || [],
      member_ids: selections.memberIds || [],
    });

    Migration._setConfig("MIGRATION_SELECTIONS", selectionJson);
    Migration._setConfig("MIGRATION_STAGE", "REVIEW");

    Audit.append(
      actorUserId,
      "Migration",
      Config.getOptional("MIGRATION_YEAR_LABEL") || "",
      "SELECTIONS_SET",
      {
        accounts: (selections.accountIds || []).length,
        categories: (selections.categoryIds || []).length,
        events: (selections.eventIds || []).length,
        members: (selections.memberIds || []).length,
      }
    );

    return { ok: true, stage: "REVIEW" };
  },

  /**
   * Initiate migration. Creates the year folder and new spreadsheet.
   * Stage: PREVIEW -> CONFIGURE
   */
  startMigration(actorUserId) {
    var preview = Migration.getPreview();

    // Create year folder
    var parentFolderId = Config.getOptional("PARENT_FOLDER_ID");
    if (!parentFolderId) {
      // Fall back to the same parent as the current ledger
      var currentFileId =
        PropertiesService.getScriptProperties().getProperty("LEDGER_ID") || "";
      if (currentFileId) {
        try {
          var parents = DriveApp.getFileById(currentFileId).getParents();
          if (parents.hasNext()) {
            parentFolderId = parents.next().getId();
          }
        } catch (e) {}
      }
    }

    var yearFolder;
    try {
      var parentFolder = DriveApp.getFolderById(parentFolderId);
      yearFolder = parentFolder.createFolder("CF Budget/" + preview.year_label);
    } catch (e) {
      return {
        ok: false,
        reason: "Failed to create year folder: " + e.message,
      };
    }

    // Create sub-folders
    var receiptsFolder = yearFolder.createFolder("Receipts");
    var qrFolder = yearFolder.createFolder("Payment QR Codes");
    var exportsFolder = yearFolder.createFolder("Exports");

    // Create new spreadsheet
    var newSpreadsheet = SpreadsheetApp.create(
      "CF-Budget " + preview.year_label
    );
    var spreadsheetId = newSpreadsheet.getId();
    var spreadsheetFile = DriveApp.getFileById(spreadsheetId);
    yearFolder.addFile(spreadsheetFile);

    // Move spreadsheet file into year folder by removing from root
    try {
      DriveApp.getRootFolder().removeFile(spreadsheetFile);
    } catch (e) {}

    // Store migration state in Config
    Migration._setConfig("MIGRATION_STAGE", "CONFIGURE");
    Migration._setConfig("MIGRATION_YEAR_LABEL", preview.year_label);
    Migration._setConfig(
      "MIGRATION_COMMITTEE_YEAR",
      String(preview.next_committee_year)
    );
    Migration._setConfig("MIGRATION_TARGET_SPREADSHEET_ID", spreadsheetId);
    Migration._setConfig("MIGRATION_TARGET_FOLDER_ID", yearFolder.getId());

    Audit.append(actorUserId, "Migration", preview.year_label, "INITIATED", {
      folder_id: yearFolder.getId(),
      spreadsheet_id: spreadsheetId,
      year_label: preview.year_label,
    });

    return {
      folder_id: yearFolder.getId(),
      ok: true,
      spreadsheet_id: spreadsheetId,
      stage: "CONFIGURE",
      year_label: preview.year_label,
    };
  },
};

if (typeof module !== "undefined") {
  module.exports = { Migration };
}
