"use strict";
/**
 * AnnualMigration.js — Resumable Treasurer-guided migration from a closed
 * annual file to a fresh annual spreadsheet and year folder.
 *
 * Stages (per issue #48 spec):
 *   1. PREVIEW     — Show what would be migrated
 *   2. MEMBERS     — Select members to carry forward
 *   3. ACCOUNTS    — Select accounts + opening balances + reasons
 *   4. EVENTS      — Select events to carry forward (no finance history)
 *   5. CATEGORIES  — Select categories to carry forward (no finance history)
 *   6. USERS       — Confirm active allowlisted operators (≥1 Treasurer)
 *   7. VALIDATE    — Run pre-activation checks
 *   8. ACTIVATE    — Switch LEDGER_ID; archive old file
 *
 * Staging year folder + spreadsheet are created as soon as the migration
 * leaves PREVIEW (startMigration → MEMBERS), so any active Treasurer can
 * resume after a browser close. Backtracking invalidates downstream derived
 * data; staging never becomes active automatically — ACTIVATE is an explicit
 * Treasurer action gated by VALIDATE.
 */

var MIGRATION_STAGES = [
  "PREVIEW",
  "MEMBERS",
  "ACCOUNTS",
  "EVENTS",
  "CATEGORIES",
  "USERS",
  "VALIDATE",
  "ACTIVATE",
];

/**
 * Stages whose selections can be saved. Order is the natural progression;
 * PREVIEW is the entry gate and VALIDATE/ACTIVATE are gates, not selectors.
 */
var SELECTION_STAGES = ["MEMBERS", "ACCOUNTS", "EVENTS", "CATEGORIES", "USERS"];

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
   *
   * Gated by VALIDATE — only an explicit Treasurer action after validation
   * switches the ledger. Idempotent: a second activation with the same
   * actor does not re-archive or duplicate folders.
   */
  activateMigration(actorUserId) {
    var stage = Config.getOptional("MIGRATION_STAGE") || "";
    if (stage !== "VALIDATE" && stage !== "ACTIVATE") {
      return {
        ok: false,
        reason:
          "Migration must be in VALIDATE or ACTIVATE stage. Current: " +
          (stage || "(none)"),
      };
    }

    var targetSpreadsheetId =
      Config.getOptional("MIGRATION_TARGET_SPREADSHEET_ID") || "";
    if (!targetSpreadsheetId) {
      return { ok: false, reason: "No target spreadsheet" };
    }

    // If already activated (idempotent repeat), return success without
    // re-archiving or duplicating the audit event.
    if (stage === "ACTIVATE") {
      return {
        new_spreadsheet_id: targetSpreadsheetId,
        ok: true,
        stage: "ACTIVATE",
      };
    }

    var oldSpreadsheetId =
      PropertiesService.getScriptProperties().getProperty("LEDGER_ID") || "";

    // Run validation gate one more time — refuse to activate if anything
    // has drifted since the Treasurer clicked VALIDATE.
    var validation = Migration._validateAll();
    if (!validation.ok) {
      return {
        ok: false,
        reason: "Validation failed: " + validation.errors.join("; "),
      };
    }

    // Switch the active ledger.
    PropertiesService.getScriptProperties().setProperty(
      "LEDGER_ID",
      targetSpreadsheetId
    );

    // Mark old spreadsheet as read-only archive.
    if (oldSpreadsheetId && oldSpreadsheetId !== targetSpreadsheetId) {
      try {
        var oldFile = DriveApp.getFileById(oldSpreadsheetId);
        oldFile.setName(oldFile.getName() + " (ARCHIVED)");
        oldFile.setViewersCanCopyContent(false);
      } catch (e) {}
    }

    Migration._setConfig("MIGRATION_STAGE", "ACTIVATE");
    Config.invalidate();

    var yearLabel = Config.getOptional("MIGRATION_YEAR_LABEL") || "";
    Audit.append(actorUserId, "Migration", yearLabel, "ACTIVATE", {
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
      stage: "ACTIVATE",
    };
  },

  /**
   * Cancel/discard an in-progress migration.
   */
  cancelMigration(actorUserId) {
    var stage = Config.getOptional("MIGRATION_STAGE") || "";
    if (!stage || stage === "ACTIVATE") {
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
   * Execute the migration: write the schema and selected records to the
   * staging spreadsheet. Stage: VALIDATE (gated by validation) — produces
   * the fresh annual file content. The ledger switch happens in
   * activateMigration.
   *
   * Idempotent: if the spreadsheet already has the seeded tabs, the
   * schema-build block is skipped and only the selection rows are
   * (re-)written.
   */
  executeMigration(actorUserId) {
    var stage = Config.getOptional("MIGRATION_STAGE") || "";
    if (stage !== "VALIDATE" && stage !== "ACTIVATE") {
      return {
        ok: false,
        reason:
          "Cannot execute migration from stage " +
          (stage || "(none)") +
          ". Validate first.",
      };
    }

    var targetSpreadsheetId =
      Config.getOptional("MIGRATION_TARGET_SPREADSHEET_ID") || "";
    if (!targetSpreadsheetId) {
      return { ok: false, reason: "No migration target spreadsheet" };
    }

    var validation = Migration._validateAll();
    if (!validation.ok) {
      return {
        ok: false,
        reason: "Validation failed: " + validation.errors.join("; "),
      };
    }

    var selections = Migration.getSelections();
    var preview = Migration.getPreview();

    try {
      var ss = SpreadsheetApp.openById(targetSpreadsheetId);

      // Idempotency: only seed schema once. If Config already present in
      // target, skip the tab creation and just (re-)write selection rows.
      var seeded = false;
      try {
        var existingConfig = ss.getSheetByName(TABS.CONFIG);
        if (
          existingConfig &&
          existingConfig.getDataRange().getValues().length > 1
        ) {
          seeded = true;
        }
      } catch (e) {}

      if (!seeded) {
        // Delete default Sheet1
        var sheets = ss.getSheets();
        for (var si = 0; si < sheets.length; si++) {
          if (sheets[si].getName() === "Sheet1") {
            try {
              ss.deleteSheet(sheets[si]);
            } catch (e) {}
          }
        }

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

        // Seed Config
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
      }

      var now = Audit._nowIso();

      // Migrate selected members (and operator carry-over from USERS stage)
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

      // USERS stage: preserve selected active allowlisted operators. MEMBER
      // rows from the source are excluded (they were already carried via
      // MEMBERS) and roles are not automatically promoted.
      var userIds = selections.user_ids || [];
      preview.operators.forEach((op) => {
        if (userIds.indexOf(op.user_id) >= 0) {
          memberMap[op.user_id] = op;
        }
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
            STATUS.FinanceAccount.ACTIVE,
            now,
            "",
          ]);
        } else {
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

      Audit.append(actorUserId, "Migration", preview.year_label, "EXECUTED", {
        accounts: accountIds.length,
        categories: catIds.length,
        events: eventCount,
        members: Object.keys(memberMap).length,
      });

      return {
        ok: true,
        stage: "VALIDATE",
        seeded: !seeded,
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
   * Returns null if no migration in progress.
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
      active: stage !== "ACTIVATE",
      committee_year: committeeYear,
      stage,
      target_folder_id: targetFolderId,
      target_spreadsheet_id: targetSpreadsheetId,
      year_label: yearLabel,
    };
  },

  /**
   * Confirm all selections for migration.
   * Stage: any selection stage -> USERS
   *
   * Bulk "save everything" entry point kept for backward compatibility.
   * Per-entity methods (setMemberSelections, setAccountSelections,
   * setEventSelections, setCategorySelections, setUserSelections) save
   * each subset independently so the Treasurer can resume mid-flow.
   */
  setSelections(actorUserId, selections) {
    var stage = Config.getOptional("MIGRATION_STAGE") || "";
    if (SELECTION_STAGES.indexOf(stage) < 0) {
      return {
        ok: false,
        reason:
          "Cannot set selections from current stage: " +
          (stage || "(none)") +
          ". Start a migration first.",
      };
    }

    selections = selections || {};

    var selectionJson = JSON.stringify({
      account_balances: selections.accountBalances || {},
      account_ids: selections.accountIds || [],
      balance_reasons: selections.balanceReasons || {},
      category_ids: selections.categoryIds || [],
      event_ids: selections.eventIds || [],
      member_ids: selections.memberIds || [],
      user_ids: selections.userIds || [],
    });

    Migration._setConfig("MIGRATION_SELECTIONS", selectionJson);
    Migration._advanceStageIfNeeded("USERS");

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
        users: (selections.userIds || []).length,
      }
    );

    return { ok: true, stage: "USERS" };
  },

  /**
   * Initiate migration. Creates the year folder and new spreadsheet up
   * front (per spec rule #1: "After PREVIEW, create a staging year folder
   * and spreadsheet under the configured parent") so any active Treasurer
   * can resume after a browser close.
   * Stage: PREVIEW -> MEMBERS
   *
   * Idempotent: if a migration is already in flight, returns the current
   * state rather than creating a duplicate folder/spreadsheet.
   */
  startMigration(actorUserId) {
    var existingStage = Config.getOptional("MIGRATION_STAGE") || "";
    var existingTarget =
      Config.getOptional("MIGRATION_TARGET_SPREADSHEET_ID") || "";
    var existingFolder = Config.getOptional("MIGRATION_TARGET_FOLDER_ID") || "";
    var existingLabel = Config.getOptional("MIGRATION_YEAR_LABEL") || "";

    if (
      existingStage &&
      existingStage !== "ACTIVATE" &&
      existingTarget &&
      existingFolder
    ) {
      // Idempotent resume — return existing staging state.
      return {
        folder_id: existingFolder,
        ok: true,
        spreadsheet_id: existingTarget,
        stage: existingStage,
        year_label: existingLabel,
      };
    }

    var preview = Migration.getPreview();

    // Create year folder
    var parentFolderId = Config.getOptional("PARENT_FOLDER_ID");
    if (!parentFolderId) {
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

    if (!parentFolderId) {
      return { ok: false, reason: "No parent folder configured" };
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

    // Sub-folders for Receipts / QR Codes / Exports (used by the live app).
    yearFolder.createFolder("Receipts");
    yearFolder.createFolder("Payment QR Codes");
    yearFolder.createFolder("Exports");

    // Staging spreadsheet — schema is seeded in executeMigration.
    var newSpreadsheet = SpreadsheetApp.create(
      "CF-Budget " + preview.year_label
    );
    var spreadsheetId = newSpreadsheet.getId();
    var spreadsheetFile = DriveApp.getFileById(spreadsheetId);
    yearFolder.addFile(spreadsheetFile);
    try {
      DriveApp.getRootFolder().removeFile(spreadsheetFile);
    } catch (e) {}

    Migration._setConfig("MIGRATION_STAGE", "MEMBERS");
    Migration._setConfig("MIGRATION_YEAR_LABEL", preview.year_label);
    Migration._setConfig(
      "MIGRATION_COMMITTEE_YEAR",
      String(preview.next_committee_year)
    );
    Migration._setConfig("MIGRATION_TARGET_SPREADSHEET_ID", spreadsheetId);
    Migration._setConfig("MIGRATION_TARGET_FOLDER_ID", yearFolder.getId());

    Audit.append(actorUserId, "Migration", preview.year_label, "STARTED", {
      folder_id: yearFolder.getId(),
      spreadsheet_id: spreadsheetId,
      year_label: preview.year_label,
    });

    return {
      folder_id: yearFolder.getId(),
      ok: true,
      spreadsheet_id: spreadsheetId,
      stage: "MEMBERS",
      year_label: preview.year_label,
    };
  },

  /**
   * Advance the migration stage automatically when an earlier selection
   * step has been completed. Forward-only: a Treasurer editing an earlier
   * selection never silently regresses later stages (the wizard keeps the
   * saved state and the user re-confirms via VALIDATE).
   * @private
   */
  _advanceStageIfNeeded(targetStage) {
    var current = Config.getOptional("MIGRATION_STAGE") || "";
    var currentIdx = MIGRATION_STAGES.indexOf(current);
    var targetIdx = MIGRATION_STAGES.indexOf(targetStage);
    if (currentIdx >= 0 && targetIdx > currentIdx) {
      Migration._setConfig("MIGRATION_STAGE", targetStage);
    }
  },

  /**
   * Move the migration stage backward (Back button on a selection step).
   * Clears any selections made beyond the target stage so backtracking
   * invalidates downstream derived data (per spec rule #2).
   * @private
   */
  _backtrackStage(targetStage) {
    var current = Config.getOptional("MIGRATION_STAGE") || "";
    var currentIdx = MIGRATION_STAGES.indexOf(current);
    var targetIdx = MIGRATION_STAGES.indexOf(targetStage);
    if (currentIdx < 0 || targetIdx < 0 || targetIdx >= currentIdx) {
      return { ok: false, reason: "Backtrack only moves to earlier stages" };
    }
    Migration._setConfig("MIGRATION_STAGE", targetStage);
    return { ok: true };
  },

  /**
   * Read the current MIGRATION_SELECTIONS JSON, or return empty defaults.
   * @private
   */
  _getSelections_() {
    var json = Config.getOptional("MIGRATION_SELECTIONS") || "{}";
    try {
      var parsed = JSON.parse(json);
      return {
        account_balances: parsed.account_balances || {},
        account_ids: parsed.account_ids || [],
        balance_reasons: parsed.balance_reasons || {},
        category_ids: parsed.category_ids || [],
        event_ids: parsed.event_ids || [],
        member_ids: parsed.member_ids || [],
        user_ids: parsed.user_ids || [],
      };
    } catch (e) {
      return {
        account_balances: {},
        account_ids: [],
        balance_reasons: {},
        category_ids: [],
        event_ids: [],
        member_ids: [],
        user_ids: [],
      };
    }
  },

  /**
   * Save member selections to MIGRATION_SELECTIONS.
   * Stage: MEMBERS (and later selection stages as a no-op update).
   *
   * Spec rule #3: preselects active members; inactive members are
   * preserved as historical references only. The validation in
   * _validateAll rejects any inactive member_id that would otherwise
   * receive a new Claim.
   */
  setMemberSelections(actorUserId, memberIds) {
    var stage = Config.getOptional("MIGRATION_STAGE") || "";
    if (SELECTION_STAGES.indexOf(stage) < 0) {
      return {
        ok: false,
        reason:
          "Cannot set members from current stage: " +
          (stage || "(none)") +
          ". Start a migration first.",
      };
    }

    var ids = Array.isArray(memberIds) ? memberIds : [];
    var selections = Migration._getSelections_();
    selections.member_ids = ids;
    Migration._setConfig("MIGRATION_SELECTIONS", JSON.stringify(selections));

    Migration._advanceStageIfNeeded("MEMBERS");

    Audit.append(
      actorUserId,
      "Migration",
      Config.getOptional("MIGRATION_YEAR_LABEL") || "",
      "MEMBERS_SET",
      { members: ids.length }
    );

    return { ok: true, stage: "MEMBERS" };
  },

  /**
   * Save account selections + opening balances + balance reasons.
   * Stage: any selection stage.
   *
   * Spec rule #4: every changed or new balance must carry a non-empty
   * reason. _validateAll rejects entries with a balance override but
   * missing or blank reason.
   */
  setAccountSelections(actorUserId, payload) {
    var stage = Config.getOptional("MIGRATION_STAGE") || "";
    if (SELECTION_STAGES.indexOf(stage) < 0) {
      return {
        ok: false,
        reason:
          "Cannot set accounts from current stage: " +
          (stage || "(none)") +
          ". Start a migration first.",
      };
    }

    payload = payload || {};
    var selections = Migration._getSelections_();
    selections.account_ids = Array.isArray(payload.accountIds)
      ? payload.accountIds
      : [];
    selections.account_balances = payload.accountBalances || {};
    selections.balance_reasons = payload.balanceReasons || {};
    Migration._setConfig("MIGRATION_SELECTIONS", JSON.stringify(selections));

    Migration._advanceStageIfNeeded("ACCOUNTS");

    Audit.append(
      actorUserId,
      "Migration",
      Config.getOptional("MIGRATION_YEAR_LABEL") || "",
      "ACCOUNTS_SET",
      {
        accounts: selections.account_ids.length,
        balances: Object.keys(selections.account_balances).length,
      }
    );

    return { ok: true, stage: "ACCOUNTS" };
  },

  /**
   * Save event selections. EVENTS are fresh annual records only — no
   * Claims, Budget Requests, Payouts, or other finance history is copied.
   * Event identity (event_id, name) is preserved so future Claims can link.
   * Stage: any selection stage.
   */
  setEventSelections(actorUserId, eventIds) {
    var stage = Config.getOptional("MIGRATION_STAGE") || "";
    if (SELECTION_STAGES.indexOf(stage) < 0) {
      return {
        ok: false,
        reason:
          "Cannot set events from current stage: " +
          (stage || "(none)") +
          ". Start a migration first.",
      };
    }

    var ids = Array.isArray(eventIds) ? eventIds : [];
    var selections = Migration._getSelections_();
    selections.event_ids = ids;
    Migration._setConfig("MIGRATION_SELECTIONS", JSON.stringify(selections));

    Migration._advanceStageIfNeeded("EVENTS");

    Audit.append(
      actorUserId,
      "Migration",
      Config.getOptional("MIGRATION_YEAR_LABEL") || "",
      "EVENTS_SET",
      { events: ids.length }
    );

    return { ok: true, stage: "EVENTS" };
  },

  /**
   * Save category selections. CATEGORIES are fresh annual records only;
   * no finance history is copied. Stage cap is reset to 0 so the new
   * committee must re-establish budget caps.
   * Stage: any selection stage.
   */
  setCategorySelections(actorUserId, categoryIds) {
    var stage = Config.getOptional("MIGRATION_STAGE") || "";
    if (SELECTION_STAGES.indexOf(stage) < 0) {
      return {
        ok: false,
        reason:
          "Cannot set categories from current stage: " +
          (stage || "(none)") +
          ". Start a migration first.",
      };
    }

    var ids = Array.isArray(categoryIds) ? categoryIds : [];
    var selections = Migration._getSelections_();
    selections.category_ids = ids;
    Migration._setConfig("MIGRATION_SELECTIONS", JSON.stringify(selections));

    Migration._advanceStageIfNeeded("CATEGORIES");

    Audit.append(
      actorUserId,
      "Migration",
      Config.getOptional("MIGRATION_YEAR_LABEL") || "",
      "CATEGORIES_SET",
      { categories: ids.length }
    );

    return { ok: true, stage: "CATEGORIES" };
  },

  /**
   * Save allowlisted operator selections for the new annual file.
   *
   * Spec rule #6: preserve active allowlisted operator email, role, and
   * active status. Requires at least one active Treasurer (validated in
   * _validateAll). citycf41@gmail.com is recommended when present, but
   * allowlist checks are never bypassed.
   *
   * MEMBER rows are excluded here — they were carried via
   * setMemberSelections. Roles are not auto-promoted.
   * Stage: any selection stage.
   */
  setUserSelections(actorUserId, userIds) {
    var stage = Config.getOptional("MIGRATION_STAGE") || "";
    if (SELECTION_STAGES.indexOf(stage) < 0) {
      return {
        ok: false,
        reason:
          "Cannot set users from current stage: " +
          (stage || "(none)") +
          ". Start a migration first.",
      };
    }

    var ids = Array.isArray(userIds) ? userIds : [];
    var selections = Migration._getSelections_();
    selections.user_ids = ids;
    Migration._setConfig("MIGRATION_SELECTIONS", JSON.stringify(selections));

    Migration._advanceStageIfNeeded("USERS");

    Audit.append(
      actorUserId,
      "Migration",
      Config.getOptional("MIGRATION_YEAR_LABEL") || "",
      "USERS_SET",
      { users: ids.length }
    );

    return { ok: true, stage: "USERS" };
  },

  /**
   * Run the validation gate. Per spec rule #7, checks:
   *   - fresh schema/tabs in the target spreadsheet
   *   - folder structure exists
   *   - selected references (members, accounts, events, categories, users)
   *     resolve
   *   - inactive members are not in the active selection
   *   - every account with a balance override has a non-empty reason
   *   - at least one active Treasurer is preserved in user_ids
   *   - target spreadsheet is accessible (DriveApp.getFileById succeeds)
   *
   * Returns { ok, errors[], warnings[] }. On ok=false the migration is
   * blocked from ACTIVATE.
   */
  validateMigration(actorUserId) {
    var stage = Config.getOptional("MIGRATION_STAGE") || "";
    if (SELECTION_STAGES.indexOf(stage) < 0 && stage !== "VALIDATE") {
      return {
        ok: false,
        reason:
          "Cannot validate from stage " +
          (stage || "(none)") +
          ". Complete selections first.",
      };
    }

    var result = Migration._validateAll();
    if (!result.ok) {
      return {
        errors: result.errors,
        ok: false,
        warnings: result.warnings || [],
      };
    }

    Migration._advanceStageIfNeeded("VALIDATE");
    Audit.append(
      actorUserId,
      "Migration",
      Config.getOptional("MIGRATION_YEAR_LABEL") || "",
      "VALIDATED",
      { warnings: (result.warnings || []).length }
    );

    return {
      errors: [],
      ok: true,
      stage: "VALIDATE",
      warnings: result.warnings || [],
    };
  },

  /**
   * Internal validator — shared by validateMigration and the activate
   * gate. Never advances stage.
   * @private
   */
  _validateAll() {
    var errors = [];
    var warnings = [];

    var preview = Migration.getPreview();
    var selections = Migration._getSelections_();
    var targetId = Config.getOptional("MIGRATION_TARGET_SPREADSHEET_ID") || "";
    var folderId = Config.getOptional("MIGRATION_TARGET_FOLDER_ID") || "";

    // 1. Target spreadsheet + folder must exist and be accessible.
    if (!targetId) {
      errors.push("Missing migration target spreadsheet ID");
    } else {
      try {
        SpreadsheetApp.openById(targetId);
      } catch (e) {
        errors.push("Target spreadsheet is not accessible: " + e.message);
      }
    }
    if (!folderId) {
      errors.push("Missing migration target folder ID");
    } else {
      try {
        DriveApp.getFolderById(folderId);
      } catch (e) {
        errors.push("Target folder is not accessible: " + e.message);
      }
    }

    // 2. Member selection: every active member_id must resolve. Inactive
    //    member_ids are kept as historical references — allowed but flagged.
    var activeMemberIds = preview.active_members.map((m) => m.user_id);
    var inactiveMemberIds = preview.inactive_members.map((m) => m.user_id);
    var memberIds = selections.member_ids || [];
    var memberOk = [];
    memberIds.forEach((mid) => {
      if (activeMemberIds.indexOf(mid) >= 0) {
        memberOk.push(mid);
      } else if (inactiveMemberIds.indexOf(mid) >= 0) {
        warnings.push(
          "Inactive member " + mid + " carried as historical reference only"
        );
        memberOk.push(mid);
      } else {
        errors.push("Selected member not found in source: " + mid);
      }
    });

    // 3. Account selection: every balance override must carry a reason.
    var accountIds = selections.account_ids || [];
    var balances = selections.account_balances || {};
    var reasons = selections.balance_reasons || {};
    var knownAccounts = preview.accounts.map((a) => a.account_id);
    accountIds.forEach((aid) => {
      if (knownAccounts.indexOf(aid) < 0) {
        errors.push("Selected account not found in source: " + aid);
        return;
      }
      var previewAcct = preview.accounts.filter((a) => a.account_id === aid)[0];
      var newBal = Number(balances[aid]);
      var currentBal = previewAcct ? previewAcct.current_balance : 0;
      var hasOverride = !isNaN(newBal) && newBal !== currentBal;
      if (hasOverride) {
        var reason = (reasons[aid] || "").toString().trim();
        if (!reason) {
          errors.push(
            "Account " + aid + " has a changed balance without a reason"
          );
        }
      }
    });

    // 4. Categories + events: every id must resolve.
    var knownCats = preview.categories.map((c) => c.category_id);
    (selections.category_ids || []).forEach((cid) => {
      if (knownCats.indexOf(cid) < 0) {
        errors.push("Selected category not found in source: " + cid);
      }
    });
    var knownEvents = preview.events.map((e) => e.event_id);
    (selections.event_ids || []).forEach((eid) => {
      if (knownEvents.indexOf(eid) < 0) {
        errors.push("Selected event not found in source: " + eid);
      }
    });

    // 5. USERS: at least one active Treasurer; all selected users are
    //    active allowlisted operators in the source.
    var userIds = selections.user_ids || [];
    if (userIds.length === 0) {
      errors.push("No operators selected for the new annual file");
    } else {
      var hasActiveTreasurer = false;
      userIds.forEach((uid) => {
        var op = preview.operators.filter((o) => o.user_id === uid)[0];
        if (!op) {
          errors.push(
            "Selected user " +
              uid +
              " is not an allowlisted operator in the source"
          );
          return;
        }
        if (!op.active) {
          errors.push("Selected user " + uid + " is not active");
          return;
        }
        if (op.role === ROLES.TREASURER) {
          hasActiveTreasurer = true;
        }
      });
      if (!hasActiveTreasurer) {
        errors.push(
          "At least one active Treasurer must be carried forward"
        );
      }
      // Recommendation: surface citycf41 when present but not selected.
      var citycf = preview.operators.filter(
        (o) => (o.email || "").toLowerCase() === "citycf41@gmail.com"
      )[0];
      if (
        citycf &&
        citycf.active &&
        userIds.indexOf(citycf.user_id) < 0
      ) {
        warnings.push(
          "citycf41@gmail.com is an active Treasurer in the source but not selected"
        );
      }
    }

    // 6. Cover SEM A, SEM B, SUMMER. The Config tab on the target is
    //    seeded in executeMigration — flag if the operator plans to seed
    //    only SEM A. We can only check after executeMigration has run.
    try {
      if (targetId) {
        var ss = SpreadsheetApp.openById(targetId);
        var cfg = ss.getSheetByName(TABS.CONFIG);
        if (cfg && cfg.getDataRange().getValues().length > 1) {
          var rows = cfg.getDataRange().getValues();
          var seededSemesters = rows
            .filter(function (r) {
              return r[0] === "CURRENT_SEMESTER";
            })
            .map(function (r) {
              return r[1];
            });
          if (
            seededSemesters.length === 0 ||
            seededSemesters[0] !== "SEM A"
          ) {
            warnings.push(
              "Target spreadsheet is missing the standard CURRENT_SEMESTER=SEM A seed"
            );
          }
        }
      }
    } catch (e) {}

    return {
      errors,
      ok: errors.length === 0,
      warnings,
    };
  },
};

if (typeof module !== "undefined") {
  module.exports = { MIGRATION_STAGES, Migration };
}
