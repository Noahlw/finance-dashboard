"use strict";
/**
 * Migration.gs — owner-run, versioned in-place schema migration runner.
 *
 * Schema Migration is distinct from Annual Migration: it changes one existing
 * ledger in place, under a ScriptLock, and records enough state to resume or
 * roll back every physical data move. Annual Migration uses prepareAnnualLedger
 * before activating its newly-created ledger and completes the deferred audit
 * manifest only after LEDGER_ID points at that ledger.
 */

var CURRENT_SCHEMA_VERSION = 1;
var MIGRATION_LOG_TAB = "MigrationLog";
var MIGRATION_SNAPSHOT_CHUNK_SIZE = 40_000;
var MIGRATION_LOCK_TIMEOUT_MS = 30_000;
var MIGRATION_LOG_HEADERS = [
  "record_type",
  "run_id",
  "migration_id",
  "from_version",
  "to_version",
  "step_id",
  "step_type",
  "status",
  "tab",
  "row",
  "column",
  "num_rows",
  "num_columns",
  "pre_step_values",
  "expected_fingerprint",
  "error",
  "updated_at",
];

/**
 * Registry entries deliberately retain both the current and immediately prior
 * schema layout. Version 0 is the pre-runner baseline; Phase 1 does not itself
 * change a COLS layout, so its physical headers equal version 1. A future COLS
 * change must freeze the previous layout here before adding the next migration.
 */
var SCHEMA_REGISTRY = Object.freeze({
  0: Object.freeze({
    headers() {
      return SchemaMigration.headersFromCols(COLS);
    },
  }),
  1: Object.freeze({
    headers() {
      return SchemaMigration.headersFromCols(COLS);
    },
  }),
});

var DERIVED_REGISTRY = Object.freeze({
  0: Object.freeze({
    apply(context) {
      return SchemaMigration.applySetupDerived(context.ledger);
    },
    verify(context) {
      return SchemaMigration.verifySetupDerived(context.ledger);
    },
  }),
  1: Object.freeze({
    apply(context) {
      return SchemaMigration.applySetupDerived(context.ledger);
    },
    verify(context) {
      return SchemaMigration.verifySetupDerived(context.ledger);
    },
  }),
});

/** Phase 1 baseline registration; future versions append, never rewrite. */
var MIGRATIONS = Object.freeze({
  1: Object.freeze({
    fromVersion: 0,
    id: "SCHEMA-0000-0001",
    steps: Object.freeze([
      Object.freeze({ id: "derived-reapply", type: "DERIVED_REAPPLY" }),
    ]),
    toVersion: 1,
  }),
});

var SchemaMigration = {
  /** @return {string} */
  _now() {
    if (
      typeof Utilities !== "undefined" &&
      typeof Utilities.formatDate === "function"
    ) {
      return Utilities.formatDate(
        new Date(),
        "Asia/Hong_Kong",
        "yyyy-MM-dd'T'HH:mm:ssXXX"
      );
    }
    return new Date().toISOString();
  },

  /** @return {string} */
  _runId(migrationId) {
    var suffix =
      typeof Utilities !== "undefined" &&
      typeof Utilities.getUuid === "function"
        ? Utilities.getUuid()
        : String(Date.now()) + "-" + String(Math.random()).slice(2);
    return migrationId + ":" + suffix;
  },

  /** @param {string} value @return {string} */
  _hash(value) {
    var hash = 2_166_136_261;
    for (var i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16_777_619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  },

  /** @param {number} index1Based @return {string} */
  columnLetter(index1Based) {
    var value = index1Based;
    var label = "";
    while (value > 0) {
      value -= 1;
      label = String.fromCharCode(65 + (value % 26)) + label;
      value = Math.floor(value / 26);
    }
    return label;
  },

  /**
   * @param {Object<string,number>} columns
   * @return {string[]}
   */
  canonicalHeaders(columns) {
    return Object.keys(columns).sort((left, right) => {
      return Number(columns[left]) - Number(columns[right]);
    });
  },

  /**
   * @param {Object<string,Object<string,number>>} columnsByTab
   * @return {Object<string,string[]>}
   */
  headersFromCols(columnsByTab) {
    var headers = {};
    Object.keys(columnsByTab).forEach((tabName) => {
      if (typeof TABS !== "undefined" && tabName === TABS.VAULT) {
        return;
      }
      headers[tabName] = SchemaMigration.canonicalHeaders(
        columnsByTab[tabName]
      );
    });
    return headers;
  },

  /** @param {Object} entry @return {Object<string,string[]>} */
  _resolveHeaders(entry) {
    if (!entry) {
      throw new Error("SCHEMA_REGISTRY_ENTRY_MISSING");
    }
    return typeof entry.headers === "function"
      ? entry.headers()
      : entry.headers;
  },

  /** @param {Object} sheet @return {boolean} */
  _isBlankSheet(sheet) {
    if (sheet.getLastRow() === 0) {
      return true;
    }
    var width = Math.max(sheet.getLastColumn(), 1);
    var values = sheet.getRange(1, 1, sheet.getLastRow(), width).getValues();
    for (var row = 0; row < values.length; row++) {
      for (var column = 0; column < values[row].length; column++) {
        if (String(values[row][column] || "").trim()) {
          return false;
        }
      }
    }
    return true;
  },

  /**
   * Whole-ledger, read-only preflight. Every ambiguity is collected before the
   * caller is permitted to initialize a missing tab or journal row.
   * @param {Spreadsheet} ledger
   * @param {Object<string,string[]>} expectedByTab
   * @return {{ok:boolean, diagnostics:Object[], fingerprints:Object, missingTabs:string[]}}
   */
  preflightHeaders(ledger, expectedByTab) {
    var diagnostics = [];
    var fingerprints = {};
    var missingTabs = [];
    Object.keys(expectedByTab).forEach((tabName) => {
      var expectedHeaders = expectedByTab[tabName];
      var sheet = ledger.getSheetByName(tabName);
      if (!sheet || SchemaMigration._isBlankSheet(sheet)) {
        missingTabs.push(tabName);
        return;
      }
      var width = Math.max(sheet.getLastColumn(), expectedHeaders.length);
      var headers = sheet.getRange(1, 1, 1, width).getValues()[0];
      var normalized = headers.map((header) => String(header || "").trim());
      var seen = {};
      normalized.forEach((header) => {
        if (header) {
          seen[header] = (seen[header] || 0) + 1;
        }
      });

      for (var index = 0; index < width; index++) {
        var found = normalized[index] || "";
        var expected = expectedHeaders[index] || "";
        var diagnostic = {
          column: SchemaMigration.columnLetter(index + 1),
          expected,
          found,
          tab: tabName,
        };
        if (found && expectedHeaders.indexOf(found) < 0) {
          diagnostics.push(
            Object.assign({ classification: "UNKNOWN" }, diagnostic)
          );
        }
        if (found && seen[found] > 1) {
          diagnostics.push(
            Object.assign({ classification: "DUPLICATE" }, diagnostic)
          );
        }
        if (found !== expected) {
          diagnostics.push(
            Object.assign({ classification: "MISMATCHED_POSITION" }, diagnostic)
          );
        }
      }
      expectedHeaders.forEach((expectedHeader, index) => {
        if (!seen[expectedHeader]) {
          diagnostics.push({
            classification: "MISSING",
            column: SchemaMigration.columnLetter(index + 1),
            expected: expectedHeader,
            found: "",
            tab: tabName,
          });
        }
      });
      fingerprints[tabName] = SchemaMigration._hash(
        tabName + "|" + normalized.join("|")
      );
    });
    return {
      diagnostics,
      fingerprints,
      missingTabs,
      ok: diagnostics.length === 0,
    };
  },

  /**
   * @param {Spreadsheet} ledger
   * @param {Object<string,string[]>} headersByTab
   * @return {string[]}
   */
  initializeMissingTabs(ledger, headersByTab) {
    var initialized = [];
    Object.keys(headersByTab).forEach((tabName) => {
      var sheet = ledger.getSheetByName(tabName);
      if (!sheet) {
        sheet = ledger.insertSheet(tabName);
      } else if (!SchemaMigration._isBlankSheet(sheet)) {
        return;
      }
      var headers = headersByTab[tabName];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      if (typeof sheet.setFrozenRows === "function") {
        sheet.setFrozenRows(1);
      }
      initialized.push(tabName);
    });
    return initialized;
  },

  /** @param {Spreadsheet} ledger @return {?string} */
  readSchemaVersion(ledger) {
    var sheet = ledger.getSheetByName(
      typeof TABS !== "undefined" ? TABS.CONFIG : "Config"
    );
    if (!sheet || SchemaMigration._isBlankSheet(sheet)) {
      return null;
    }
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === "SCHEMA_VERSION") {
        return String(values[i][1]);
      }
    }
    return null;
  },

  /**
   * @param {Spreadsheet} ledger
   * @param {string} key
   * @param {*} value
   */
  setConfigValue(ledger, key, value) {
    var tabName = typeof TABS !== "undefined" ? TABS.CONFIG : "Config";
    var sheet = ledger.getSheetByName(tabName);
    if (!sheet) {
      throw new Error("CONFIG_TAB_MISSING");
    }
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === key) {
        sheet.getRange(i + 1, 2).setValue(String(value));
        SchemaMigration._invalidateConfig();
        return;
      }
    }
    sheet.appendRow([key, String(value)]);
    SchemaMigration._invalidateConfig();
  },

  /** @param {Spreadsheet} ledger @param {string} key */
  removeConfigValue(ledger, key) {
    var tabName = typeof TABS !== "undefined" ? TABS.CONFIG : "Config";
    var sheet = ledger.getSheetByName(tabName);
    if (!sheet || typeof sheet.deleteRow !== "function") {
      return;
    }
    var values = sheet.getDataRange().getValues();
    for (var i = values.length - 1; i >= 1; i--) {
      if (String(values[i][0]) === key) {
        sheet.deleteRow(i + 1);
      }
    }
    SchemaMigration._invalidateConfig();
  },

  _invalidateConfig() {
    if (
      typeof Config !== "undefined" &&
      typeof Config.invalidate === "function"
    ) {
      Config.invalidate();
    }
  },

  /** @param {Spreadsheet} ledger @return {Sheet} */
  ensureJournal(ledger) {
    var sheet = ledger.getSheetByName(MIGRATION_LOG_TAB);
    if (!sheet) {
      sheet = ledger.insertSheet(MIGRATION_LOG_TAB);
      sheet
        .getRange(1, 1, 1, MIGRATION_LOG_HEADERS.length)
        .setValues([MIGRATION_LOG_HEADERS]);
      if (typeof sheet.setFrozenRows === "function") {
        sheet.setFrozenRows(1);
      }
    }
    return sheet;
  },

  /** @param {Object} record @return {Array} */
  _journalRow(record) {
    return MIGRATION_LOG_HEADERS.map((header) => record[header] ?? "");
  },

  /** @param {Sheet} journal @param {Object} record @return {number} */
  appendJournal(journal, record) {
    journal.appendRow(SchemaMigration._journalRow(record));
    return journal.getLastRow();
  },

  /** @param {Sheet} journal @param {number} row @param {Object} updates */
  updateJournal(journal, row, updates) {
    Object.keys(updates).forEach((field) => {
      var index = MIGRATION_LOG_HEADERS.indexOf(field);
      if (index >= 0) {
        journal.getRange(row, index + 1).setValue(updates[field]);
      }
    });
  },

  /** @param {Sheet} journal @return {Object[]} */
  readJournal(journal) {
    var values = journal.getDataRange().getValues();
    return values.slice(1).map((row, index) => {
      var record = { _row: index + 2 };
      MIGRATION_LOG_HEADERS.forEach((header, column) => {
        record[header] = row[column];
      });
      return record;
    });
  },

  /**
   * Persist an exact values snapshot inline or in bounded journal chunks.
   * @param {Sheet} journal
   * @param {Object} baseRecord
   * @param {Array[]} values
   * @return {string}
   */
  writeSnapshot(journal, baseRecord, values) {
    var serialized = JSON.stringify(values);
    if (serialized.length <= MIGRATION_SNAPSHOT_CHUNK_SIZE) {
      return serialized;
    }
    var chunks = [];
    for (
      var offset = 0;
      offset < serialized.length;
      offset += MIGRATION_SNAPSHOT_CHUNK_SIZE
    ) {
      chunks.push(
        serialized.slice(offset, offset + MIGRATION_SNAPSHOT_CHUNK_SIZE)
      );
    }
    chunks.forEach((chunk, index) => {
      SchemaMigration.appendJournal(
        journal,
        Object.assign({}, baseRecord, {
          pre_step_values: chunk,
          record_type: "SNAPSHOT_CHUNK",
          status: String(index),
        })
      );
    });
    return "@CHUNKS:" + String(chunks.length);
  },

  /** @param {Sheet} journal @param {Object} stepRecord @return {Array[]} */
  readSnapshot(journal, stepRecord) {
    var payload = String(stepRecord.pre_step_values || "");
    if (!payload.startsWith("@CHUNKS:")) {
      return JSON.parse(payload || "[]");
    }
    var chunks = SchemaMigration.readJournal(journal)
      .filter(
        (record) =>
          record.record_type === "SNAPSHOT_CHUNK" &&
          record.run_id === stepRecord.run_id &&
          record.migration_id === stepRecord.migration_id &&
          record.step_id === stepRecord.step_id
      )
      .sort((left, right) => Number(left.status) - Number(right.status))
      .map((record) => String(record.pre_step_values));
    return JSON.parse(chunks.join(""));
  },

  /** @param {Range} range @return {string} */
  fingerprintRange(range) {
    return SchemaMigration._hash(JSON.stringify(range.getValues()));
  },

  /**
   * @param {Spreadsheet} ledger
   * @param {Object} step
   * @param {Object} derivedRegistry
   * @param {number} schemaVersion
   * @return {string}
   */
  fingerprintStep(ledger, step, derivedRegistry, schemaVersion) {
    if (step.type === "DATA_MOVE") {
      var rangeSpec = step.range;
      return SchemaMigration.fingerprintRange(
        ledger
          .getSheetByName(step.tab)
          .getRange(
            rangeSpec.row,
            rangeSpec.column,
            rangeSpec.numRows,
            rangeSpec.numColumns
          )
      );
    }
    var verification = SchemaMigration.verifyDerived(
      ledger,
      schemaVersion,
      derivedRegistry
    );
    return verification.ok
      ? SchemaMigration._hash(JSON.stringify(verification.fingerprint || {}))
      : "INVALID:" + verification.errors.join("|");
  },

  /**
   * @param {Spreadsheet} ledger
   * @param {number} schemaVersion
   * @param {Object} registry
   */
  applyDerived(ledger, schemaVersion, registry) {
    var entry = registry[schemaVersion];
    if (!entry || typeof entry.apply !== "function") {
      throw new Error("DERIVED_REGISTRY_ENTRY_MISSING:" + schemaVersion);
    }
    return entry.apply({ ledger, schemaVersion });
  },

  /**
   * @param {Spreadsheet} ledger
   * @param {number} schemaVersion
   * @param {Object} registry
   * @return {{ok:boolean,errors:string[],fingerprint:Object}}
   */
  verifyDerived(ledger, schemaVersion, registry) {
    var entry = registry[schemaVersion];
    if (!entry) {
      return {
        errors: ["Derived registry missing version " + schemaVersion],
        fingerprint: {},
        ok: false,
      };
    }
    if (typeof entry.verify !== "function") {
      return { errors: [], fingerprint: { version: schemaVersion }, ok: true };
    }
    var result = entry.verify({ ledger, schemaVersion });
    return typeof result === "boolean"
      ? { errors: result ? [] : ["Derived verification failed"], ok: result }
      : result;
  },

  /** @param {Spreadsheet} ledger */
  clearDerivedState(ledger) {
    var protectionTypes = [];
    if (
      typeof SpreadsheetApp !== "undefined" &&
      SpreadsheetApp.ProtectionType
    ) {
      protectionTypes = [
        SpreadsheetApp.ProtectionType.SHEET,
        SpreadsheetApp.ProtectionType.RANGE,
      ].filter(Boolean);
    }
    ledger.getSheets().forEach((sheet) => {
      if (sheet.getName() === MIGRATION_LOG_TAB) {
        return;
      }
      var rowCount = Math.max(0, sheet.getMaxRows() - 1);
      if (rowCount > 0) {
        var range = sheet.getRange(
          2,
          1,
          rowCount,
          Math.max(sheet.getMaxColumns(), 1)
        );
        if (typeof range.clearDataValidations === "function") {
          range.clearDataValidations();
        }
      }
      if (typeof sheet.getProtections === "function") {
        protectionTypes.forEach((type) => {
          sheet.getProtections(type).forEach((protection) => {
            if (typeof protection.remove === "function") {
              protection.remove();
            }
          });
        });
      }
    });
  },

  /** @param {Spreadsheet} ledger */
  applySetupDerived(ledger) {
    SchemaMigration.clearDerivedState(ledger);
    if (typeof Setup_installArrayFormulas !== "function") {
      throw new Error("SETUP_DERIVED_FUNCTIONS_UNAVAILABLE");
    }
    Setup_installArrayFormulas(ledger);
    Setup_applyValidationsAndProtections(ledger);
  },

  /** @param {Spreadsheet} ledger @return {Object} */
  verifySetupDerived(ledger) {
    var errors = [];
    var fingerprint = { formulas: {}, protections: {}, validations: {} };
    var lineSheet = ledger.getSheetByName(TABS.BUDGET_REQUEST_LINES);
    if (!lineSheet) {
      errors.push("Missing BudgetRequestLines for formula verification");
    } else {
      [
        COLS.BudgetRequestLines.claimed_amount,
        COLS.BudgetRequestLines.remaining,
      ].forEach((column) => {
        var range = lineSheet.getRange(1, column);
        var formula =
          typeof range.getFormula === "function" ? range.getFormula() : "";
        fingerprint.formulas["BudgetRequestLines:" + column] = formula;
        if (!formula) {
          errors.push("Missing BudgetRequestLines formula at column " + column);
        }
      });
    }

    var validationTargets = [
      [TABS.BUDGET_REQUESTS, COLS.BudgetRequests.status],
      [TABS.BUDGET_REQUEST_LINES, COLS.BudgetRequestLines.line_status],
      [TABS.EXPENSE_CLAIMS, COLS.ExpenseClaims.status],
      [TABS.PAYOUTS, COLS.Payouts.status],
      [TABS.FINANCE_ACCOUNTS, COLS.FinanceAccounts.status],
      [TABS.INCOME, COLS.Income.status],
      [TABS.USERS, COLS.Users.role],
      [TABS.CATEGORIES, COLS.Categories.kind],
      [TABS.APPROVALS, COLS.Approvals.action],
    ];
    validationTargets.forEach((target) => {
      var sheet = ledger.getSheetByName(target[0]);
      var rule = null;
      if (sheet) {
        var range = sheet.getRange(2, target[1]);
        if (typeof range.getDataValidation === "function") {
          rule = range.getDataValidation();
        }
      }
      fingerprint.validations[target[0] + ":" + target[1]] = Boolean(rule);
      if (!rule) {
        errors.push(
          "Missing validation at " + target[0] + " column " + target[1]
        );
      }
    });

    [TABS.AUDIT_LOG, TABS.CONFIG, TABS.COUNTERS, TABS.APPROVALS].forEach(
      (tabName) => {
        var sheet = ledger.getSheetByName(tabName);
        var count = 0;
        if (
          sheet &&
          typeof sheet.getProtections === "function" &&
          SpreadsheetApp.ProtectionType
        ) {
          count = sheet.getProtections(
            SpreadsheetApp.ProtectionType.SHEET
          ).length;
        }
        fingerprint.protections[tabName] = count;
        if (count === 0) {
          errors.push("Missing sheet protection on " + tabName);
        }
      }
    );
    return { errors, fingerprint, ok: errors.length === 0 };
  },

  /** @return {Object} */
  _lock() {
    if (
      typeof LockService === "undefined" ||
      typeof LockService.getScriptLock !== "function"
    ) {
      return { releaseLock() {}, waitLock() {} };
    }
    return LockService.getScriptLock();
  },

  /**
   * Restore every DATA_MOVE from this run, including PENDING and FAILED, then
   * recompute derived state from the source-version registry.
   * @param {Object} context
   * @return {{restoredSteps:number}}
   */
  rollback(context) {
    var records = SchemaMigration.readJournal(context.journal).filter(
      (record) =>
        record.record_type === "STEP" &&
        record.run_id === context.runId &&
        record.step_type === "DATA_MOVE" &&
        ["PENDING", "FAILED", "DONE"].indexOf(String(record.status)) >= 0
    );
    records.reverse().forEach((record) => {
      var values = SchemaMigration.readSnapshot(context.journal, record);
      context.ledger
        .getSheetByName(String(record.tab))
        .getRange(
          Number(record.row),
          Number(record.column),
          Number(record.num_rows),
          Number(record.num_columns)
        )
        .setValues(values);
      SchemaMigration.updateJournal(context.journal, record._row, {
        status: "ROLLED_BACK",
        updated_at: SchemaMigration._now(),
      });
    });
    SchemaMigration.applyDerived(
      context.ledger,
      context.sourceVersion,
      context.derivedRegistry
    );
    if (context.originalStoredVersion == null) {
      SchemaMigration.removeConfigValue(context.ledger, "SCHEMA_VERSION");
    } else {
      SchemaMigration.setConfigValue(
        context.ledger,
        "SCHEMA_VERSION",
        context.originalStoredVersion
      );
    }
    return { restoredSteps: records.length };
  },

  /**
   * @param {Object} options
   * @return {Object}
   */
  run(options) {
    var settings = options || {};
    var ledger = settings.ledger || getLedger_();
    var migrations = settings.migrations || MIGRATIONS;
    var schemaRegistry = settings.schemaRegistry || SCHEMA_REGISTRY;
    var derivedRegistry = settings.derivedRegistry || DERIVED_REGISTRY;
    var targetVersion = Number(
      settings.targetVersion == null
        ? CURRENT_SCHEMA_VERSION
        : settings.targetVersion
    );

    if (!settings.skipOwnerCheck) {
      var owner = ledger.getOwner && ledger.getOwner();
      var ownerEmail = owner ? owner.getEmail() : "";
      var activeEmail = Session.getActiveUser().getEmail();
      if (
        !(ownerEmail && activeEmail) ||
        ownerEmail.toLowerCase() !== activeEmail.toLowerCase()
      ) {
        return { ok: false, status: "AUTH_DENIED" };
      }
    }

    var originalStoredVersion = SchemaMigration.readSchemaVersion(ledger);
    var sourceVersion;
    var sourceHeaders;
    var preflight;
    if (originalStoredVersion == null) {
      var inference = SchemaMigration.inferSchemaVersion(
        ledger,
        schemaRegistry,
        targetVersion
      );
      if (!inference.ok) {
        return {
          diagnostics: inference.diagnostics,
          ok: false,
          status: "HEADER_PREFLIGHT_FAILED",
        };
      }
      sourceVersion = inference.version;
      sourceHeaders = SchemaMigration._resolveHeaders(
        schemaRegistry[sourceVersion]
      );
      preflight = SchemaMigration.preflightHeaders(ledger, sourceHeaders);
    } else {
      sourceVersion = Number(originalStoredVersion);
      var sourceEntry = schemaRegistry[sourceVersion];
      if (!sourceEntry) {
        return {
          diagnostics: [
            {
              classification: "UNKNOWN_SCHEMA_VERSION",
              found: String(sourceVersion),
              tab: "Config",
            },
          ],
          ok: false,
          status: "HEADER_PREFLIGHT_FAILED",
        };
      }
      sourceHeaders = SchemaMigration._resolveHeaders(sourceEntry);
      preflight = SchemaMigration.preflightHeaders(ledger, sourceHeaders);
    }
    if (!preflight.ok) {
      return Object.assign({}, preflight, {
        ok: false,
        status: "HEADER_PREFLIGHT_FAILED",
      });
    }

    var lock = settings.lock || SchemaMigration._lock();
    var ownsLock = !settings.lock;
    var lockHeld = false;
    var movementResult;
    try {
      if (ownsLock) {
        lock.waitLock(MIGRATION_LOCK_TIMEOUT_MS);
        lockHeld = true;
      }

      // A second read closes the preflight-to-lock race. If another execution
      // changed the version, make no write and force the owner to rerun.
      var lockedVersion = SchemaMigration.readSchemaVersion(ledger);
      if (
        String(lockedVersion == null ? "" : lockedVersion) !==
        String(originalStoredVersion == null ? "" : originalStoredVersion)
      ) {
        throw new Error("SCHEMA_VERSION_CHANGED_DURING_PREFLIGHT");
      }

      SchemaMigration.initializeMissingTabs(ledger, sourceHeaders);
      var journal = SchemaMigration.ensureJournal(ledger);
      var currentVersion = sourceVersion;
      var completedMigrations = [];
      var latestRunId = "";

      if (
        currentVersion === targetVersion &&
        SchemaMigration.readSchemaVersion(ledger) !== targetVersion
      ) {
        SchemaMigration.setConfigValue(ledger, "SCHEMA_VERSION", targetVersion);
      }

      while (currentVersion < targetVersion) {
        var migration = migrations[currentVersion + 1];
        if (
          !migration ||
          Number(migration.fromVersion) !== currentVersion ||
          Number(migration.toVersion) !== currentVersion + 1
        ) {
          throw new Error(
            "MIGRATION_PATH_MISSING:" + currentVersion + "->" + targetVersion
          );
        }
        var runId = SchemaMigration._runId(migration.id);
        latestRunId = runId;
        var context = {
          derivedRegistry,
          journal,
          ledger,
          migration,
          originalStoredVersion,
          runId,
          sourceVersion,
        };
        try {
          SchemaMigration._runMigrationSteps(context);
          currentVersion = Number(migration.toVersion);
          SchemaMigration.setConfigValue(
            ledger,
            "SCHEMA_VERSION",
            currentVersion
          );
          completedMigrations.push(migration.id);
        } catch (error) {
          var rollbackResult = SchemaMigration.rollback(context);
          movementResult = {
            error: error.message,
            migrationId: migration.id,
            ok: false,
            restoredSteps: rollbackResult.restoredSteps,
            status: "ROLLED_BACK",
          };
          break;
        }
      }

      if (!movementResult) {
        var targetHeaders = SchemaMigration._resolveHeaders(
          schemaRegistry[targetVersion]
        );
        var finalPreflight = SchemaMigration.preflightHeaders(
          ledger,
          targetHeaders
        );
        if (!finalPreflight.ok) {
          throw new Error(
            "POST_MIGRATION_FINGERPRINT_MISMATCH:" +
              JSON.stringify(finalPreflight.diagnostics)
          );
        }
        var manifest = SchemaMigration._buildManifest(
          ledger,
          completedMigrations,
          sourceVersion,
          targetVersion,
          finalPreflight.fingerprints
        );
        if (settings.deferManifest) {
          SchemaMigration.setConfigValue(
            ledger,
            "SCHEMA_MIGRATION_PENDING_MANIFEST",
            JSON.stringify(manifest)
          );
          movementResult = {
            manifest,
            ok: true,
            runId: latestRunId,
            status: "MANIFEST_DEFERRED",
          };
        } else {
          movementResult = {
            manifest,
            ok: true,
            runId: latestRunId,
            status: "DATA_COMPLETE",
          };
        }
      }
    } catch (error) {
      movementResult = {
        error: error.message,
        ok: false,
        status: "FAILED",
      };
    } finally {
      if (ownsLock && lockHeld) {
        lock.releaseLock();
      }
    }

    if (!movementResult.ok || movementResult.status === "MANIFEST_DEFERRED") {
      return movementResult;
    }
    if (settings.skipManifest) {
      return Object.assign({}, movementResult, { status: "SUCCESS" });
    }
    return SchemaMigration.completeManifest(ledger, movementResult.manifest);
  },

  /** @param {Object} migrations @param {number} targetVersion @return {number} */
  _initialVersion(migrations, targetVersion) {
    var versions = Object.keys(migrations)
      .map(Number)
      .filter((version) => version <= targetVersion)
      .sort((left, right) => left - right);
    return versions.length
      ? Number(migrations[versions[0]].fromVersion)
      : targetVersion;
  },

  /**
   * Match an unversioned ledger to exactly one registered live header shape.
   * Duplicate layout aliases resolve to the highest matching version because
   * there is no physical data move owed between identical shapes.
   * @param {Spreadsheet} ledger
   * @param {Object} schemaRegistry
   * @param {number} targetVersion
   * @return {Object}
   */
  inferSchemaVersion(ledger, schemaRegistry, targetVersion) {
    var matches = [];
    var diagnostics = [];
    var seenShapes = {};
    Object.keys(schemaRegistry)
      .map(Number)
      .filter((version) => version <= targetVersion)
      .sort((left, right) => right - left)
      .forEach((version) => {
        var headers = SchemaMigration._resolveHeaders(schemaRegistry[version]);
        var shape = JSON.stringify(headers);
        if (seenShapes[shape]) {
          return;
        }
        seenShapes[shape] = true;
        var result = SchemaMigration.preflightHeaders(ledger, headers);
        if (result.ok) {
          matches.push(version);
        } else if (!diagnostics.length) {
          diagnostics = result.diagnostics;
        }
      });
    if (matches.length === 1) {
      return { diagnostics: [], ok: true, version: matches[0] };
    }
    return {
      diagnostics:
        matches.length > 1
          ? [
              {
                classification: "AMBIGUOUS_SCHEMA_VERSION",
                found: matches.join(","),
                tab: "Config",
              },
            ]
          : diagnostics,
      ok: false,
    };
  },

  /** @param {Object} context */
  _runMigrationSteps(context) {
    var priorRecords = SchemaMigration.readJournal(context.journal);
    context.migration.steps.forEach((step) => {
      var priorDone = priorRecords
        .filter(
          (record) =>
            record.record_type === "STEP" &&
            record.migration_id === context.migration.id &&
            record.step_id === step.id &&
            record.status === "DONE"
        )
        .pop();
      if (priorDone) {
        var liveFingerprint = SchemaMigration.fingerprintStep(
          context.ledger,
          step,
          context.derivedRegistry,
          context.migration.toVersion
        );
        if (liveFingerprint === priorDone.expected_fingerprint) {
          return;
        }
      }

      var baseRecord = {
        column: step.range ? step.range.column : "",
        error: "",
        expected_fingerprint: "",
        from_version: context.migration.fromVersion,
        migration_id: context.migration.id,
        num_columns: step.range ? step.range.numColumns : "",
        num_rows: step.range ? step.range.numRows : "",
        record_type: "STEP",
        row: step.range ? step.range.row : "",
        run_id: context.runId,
        status: "PENDING",
        step_id: step.id,
        step_type: step.type,
        tab: step.tab || "",
        to_version: context.migration.toVersion,
        updated_at: SchemaMigration._now(),
      };
      if (step.type === "DATA_MOVE") {
        if (!step.tab || !step.range || typeof step.apply !== "function") {
          throw new Error("INVALID_DATA_MOVE_STEP:" + step.id);
        }
        var range = context.ledger
          .getSheetByName(step.tab)
          .getRange(
            step.range.row,
            step.range.column,
            step.range.numRows,
            step.range.numColumns
          );
        baseRecord.pre_step_values = SchemaMigration.writeSnapshot(
          context.journal,
          baseRecord,
          range.getValues()
        );
      } else if (step.type !== "DERIVED_REAPPLY") {
        throw new Error("UNKNOWN_MIGRATION_STEP_TYPE:" + step.type);
      }

      var journalRow = SchemaMigration.appendJournal(
        context.journal,
        baseRecord
      );
      try {
        if (step.type === "DATA_MOVE") {
          var stepRange = context.ledger
            .getSheetByName(step.tab)
            .getRange(
              step.range.row,
              step.range.column,
              step.range.numRows,
              step.range.numColumns
            );
          step.apply({
            fromVersion: context.migration.fromVersion,
            ledger: context.ledger,
            range: stepRange,
            toVersion: context.migration.toVersion,
          });
        } else {
          SchemaMigration.applyDerived(
            context.ledger,
            context.migration.toVersion,
            context.derivedRegistry
          );
        }
        var fingerprint = SchemaMigration.fingerprintStep(
          context.ledger,
          step,
          context.derivedRegistry,
          context.migration.toVersion
        );
        SchemaMigration.updateJournal(context.journal, journalRow, {
          expected_fingerprint: fingerprint,
          status: "DONE",
          updated_at: SchemaMigration._now(),
        });
      } catch (error) {
        SchemaMigration.updateJournal(context.journal, journalRow, {
          error: error.message,
          status: "FAILED",
          updated_at: SchemaMigration._now(),
        });
        throw error;
      }
    });
  },

  /** @return {Object} */
  _buildManifest(
    ledger,
    migrationIds,
    beforeVersion,
    afterVersion,
    fingerprints
  ) {
    var rowCounts = {};
    Object.keys(fingerprints).forEach((tabName) => {
      var sheet = ledger.getSheetByName(tabName);
      rowCounts[tabName] = Math.max(0, sheet.getLastRow() - 1);
    });
    var migrationId = migrationIds.length
      ? migrationIds.join("+")
      : "SCHEMA-" + beforeVersion + "-" + afterVersion + "-VERIFY";
    return {
      after_schema_version: afterVersion,
      before_schema_version: beforeVersion,
      fingerprints,
      ledger_id: ledger.getId(),
      migration_id: migrationId,
      row_counts: rowCounts,
    };
  },

  /**
   * Append and verify outside the runner lock. Audit.append owns its own lock.
   * @param {Spreadsheet} ledger
   * @param {Object} manifest
   * @return {Object}
   */
  completeManifest(ledger, manifest) {
    var configuredLedgerId =
      PropertiesService.getScriptProperties().getProperty("LEDGER_ID");
    if (configuredLedgerId !== ledger.getId()) {
      return {
        error: "LEDGER_ID does not point at migrated ledger",
        manifest,
        ok: false,
        status: "MANIFEST_INCOMPLETE",
      };
    }
    try {
      Audit.append(
        "SYSTEM",
        "SchemaMigration",
        manifest.migration_id,
        "MIGRATION_COMPLETE",
        manifest,
        manifest.migration_id
      );
      var verification = Audit.verifyChain();
      if (!verification.ok) {
        throw new Error(
          "Audit chain verification failed at seq " + verification.badSeq
        );
      }
      SchemaMigration.removeConfigValue(
        ledger,
        "SCHEMA_MIGRATION_PENDING_MANIFEST"
      );
      return { manifest, ok: true, status: "SUCCESS" };
    } catch (error) {
      return {
        error: error.message,
        manifest,
        ok: false,
        status: "MANIFEST_INCOMPLETE",
      };
    }
  },

  /** @param {Spreadsheet} ledger @return {Object} */
  completePendingManifest(ledger) {
    var sheet = ledger.getSheetByName(TABS.CONFIG);
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === "SCHEMA_MIGRATION_PENDING_MANIFEST") {
        try {
          return SchemaMigration.completeManifest(
            ledger,
            JSON.parse(String(values[i][1]))
          );
        } catch (error) {
          return {
            error: "Invalid pending manifest: " + error.message,
            ok: false,
            status: "MANIFEST_INCOMPLETE",
          };
        }
      }
    }
    return { ok: true, status: "NO_PENDING_MANIFEST" };
  },

  /**
   * Annual Migration pre-activation hook. It deliberately defers the manifest
   * because LEDGER_ID still points at the prior annual ledger.
   * @param {Spreadsheet} ledger
   * @return {Object}
   */
  prepareAnnualLedger(ledger) {
    return SchemaMigration.run({
      deferManifest: true,
      ledger,
      skipOwnerCheck: true,
      targetVersion: CURRENT_SCHEMA_VERSION,
    });
  },

  /**
   * @param {Spreadsheet} ledger
   * @param {Object=} options
   * @return {{ok:boolean,errors:string[],fingerprints:Object}}
   */
  healthCheck(ledger, options) {
    var settings = options || {};
    var targetVersion = Number(
      settings.targetVersion == null
        ? CURRENT_SCHEMA_VERSION
        : settings.targetVersion
    );
    var schemaRegistry = settings.schemaRegistry || SCHEMA_REGISTRY;
    var derivedRegistry = settings.derivedRegistry || DERIVED_REGISTRY;
    var errors = [];
    var storedVersion = SchemaMigration.readSchemaVersion(ledger);
    if (Number(storedVersion) !== targetVersion) {
      errors.push(
        "SCHEMA_VERSION expected " +
          targetVersion +
          " but found " +
          storedVersion
      );
    }
    var preflight = SchemaMigration.preflightHeaders(
      ledger,
      SchemaMigration._resolveHeaders(schemaRegistry[targetVersion])
    );
    preflight.diagnostics.forEach((diagnostic) => {
      errors.push(JSON.stringify(diagnostic));
    });
    var derived = SchemaMigration.verifyDerived(
      ledger,
      targetVersion,
      derivedRegistry
    );
    errors = errors.concat(derived.errors || []);
    return {
      errors,
      fingerprints: preflight.fingerprints,
      ok: errors.length === 0,
    };
  },
};

/** Apps Script entry point. */
function Migrate_run(options) {
  if (options && typeof options.getSheetByName === "function") {
    return SchemaMigration.run({ ledger: options });
  }
  return SchemaMigration.run(options || {});
}

/** Owner-visible explicit rollback helper for the most recent failed run. */
function Migrate_rollback(options) {
  var settings = options || {};
  var lock = settings.lock || LockService.getScriptLock();
  var ownsLock = !settings.lock;
  if (ownsLock) {
    lock.waitLock(30_000);
  }
  try {
    var ledger = settings.ledger || getLedger_();
    var journal = SchemaMigration.ensureJournal(ledger);
    var records = SchemaMigration.readJournal(journal);
    var latest = records
      .filter(
        (record) =>
          record.record_type === "STEP" &&
          ["PENDING", "FAILED", "DONE"].indexOf(String(record.status)) >= 0
      )
      .pop();
    if (!latest) {
      return { ok: true, restoredSteps: 0, status: "NOTHING_TO_ROLL_BACK" };
    }
    var migration = (settings.migrations || MIGRATIONS)[
      Number(latest.to_version)
    ];
    return SchemaMigration.rollback({
      derivedRegistry: settings.derivedRegistry || DERIVED_REGISTRY,
      journal,
      ledger,
      originalStoredVersion: String(latest.from_version),
      runId: latest.run_id,
      sourceVersion: Number(latest.from_version),
      migration,
    });
  } finally {
    if (ownsLock) {
      lock.releaseLock();
    }
  }
}

if (typeof module !== "undefined") {
  module.exports = {
    CURRENT_SCHEMA_VERSION,
    DERIVED_REGISTRY,
    MIGRATIONS,
    MIGRATION_LOG_HEADERS,
    Migrate_rollback,
    Migrate_run,
    SCHEMA_REGISTRY,
    SchemaMigration,
  };
}
