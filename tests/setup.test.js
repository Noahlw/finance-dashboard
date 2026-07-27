"use strict";

const fs = require("node:fs");
const path = require("node:path");

const SCHEMA_REGEX = /schema/i;

class MockRange {
  constructor(sheet, row, column, numRows = 1, numColumns = 1) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }

  clearDataValidations() {
    return this;
  }

  getValues() {
    return Array.from({ length: this.numRows }, (_, rowOffset) =>
      Array.from(
        { length: this.numColumns },
        (_colIndex, colOffset) =>
          this.sheet.values[this.row - 1 + rowOffset]?.[
            this.column - 1 + colOffset
          ] ?? ""
      )
    );
  }

  setDataValidation() {
    return this;
  }

  setFormula(value) {
    return this.setValue(value);
  }

  setValue(value) {
    return this.setValues([[value]]);
  }

  setValues(values) {
    this.sheet.writeCount += 1;
    for (let rowOffset = 0; rowOffset < this.numRows; rowOffset += 1) {
      const rowIndex = this.row - 1 + rowOffset;
      this.sheet.values[rowIndex] ??= [];
      for (
        let columnOffset = 0;
        columnOffset < this.numColumns;
        columnOffset += 1
      ) {
        this.sheet.values[rowIndex][this.column - 1 + columnOffset] =
          values[rowOffset][columnOffset];
      }
    }
    return this;
  }
}

class MockSheet {
  constructor(name, values = []) {
    this.name = name;
    this.values = values.map((row) => row.slice());
    this.writeCount = 0;
  }

  appendRow(row) {
    this.values.push(row.slice());
    this.writeCount += 1;
  }

  getDataRange() {
    return new MockRange(
      this,
      1,
      1,
      Math.max(this.getLastRow(), 1),
      Math.max(this.getLastColumn(), 1)
    );
  }

  getLastColumn() {
    return this.values.reduce((max, row) => Math.max(max, row.length), 0);
  }

  getLastRow() {
    for (let index = this.values.length - 1; index >= 0; index -= 1) {
      if (this.values[index].some((value) => value !== "" && value !== null)) {
        return index + 1;
      }
    }
    return 0;
  }

  getMaxColumns() {
    return Math.max(this.getLastColumn(), 10);
  }

  getMaxRows() {
    return Math.max(this.values.length, 20);
  }

  getName() {
    return this.name;
  }

  getProtections() {
    return [];
  }

  deleteRow(rowIndex) {
    this.values.splice(rowIndex - 1, 1);
    this.writeCount += 1;
  }

  getRange(row, column, numRows = 1, numColumns = 1) {
    return new MockRange(this, row, column, numRows, numColumns);
  }

  setFrozenRows() {
    /* no-op mock */
  }
}

class MockLedger {
  constructor(sheets) {
    this.sheets = Object.fromEntries(
      sheets.map((sheet) => [sheet.name, sheet])
    );
  }

  getId() {
    return "LEDGER-1";
  }

  getOwner() {
    return { getEmail: () => "owner@example.com" };
  }

  getSheetByName(name) {
    return this.sheets[name] || null;
  }

  getSheets() {
    return Object.values(this.sheets);
  }

  insertSheet(name) {
    const sheet = new MockSheet(name);
    this.sheets[name] = sheet;
    return sheet;
  }
}

function configureMigrationGlobals() {
  global.COLS = {
    Config: { key: 1, value: 2 },
    Data: { id: 1, value: 2 },
  };
  global.TABS = { CONFIG: "Config" };
  global.LockService = {
    getScriptLock: jest.fn(() => ({
      releaseLock: jest.fn(),
      waitLock: jest.fn(),
    })),
  };
  global.Session = {
    getActiveUser: () => ({ getEmail: () => "owner@example.com" }),
  };
  global.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (key) => (key === "LEDGER_ID" ? "LEDGER-1" : null),
    }),
  };
  global.Config = { invalidate: jest.fn() };
}

describe("safe annual setup", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("keeps destructive clearing out of setupAll", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "Setup.js"),
      "utf8"
    );
    const setupBody = source.slice(
      source.indexOf("function setupAll()"),
      source.indexOf("function Setup_ensureAllTabsExist")
    );

    expect(setupBody).not.toContain("Setup_clearAllData");
  });

  it("denies resetAllData when the active user is not the owner", () => {
    global.SpreadsheetApp = {
      getActive: () => ({
        getOwner: () => ({ getEmail: () => "owner@example.com" }),
      }),
    };
    global.Session = {
      getActiveUser: () => ({ getEmail: () => "operator@example.com" }),
    };

    const { resetAllData } = require("../Setup.js");

    expect(() => resetAllData()).toThrow("AUTH_DENIED");
  });

  it("orders canonical headers by numeric COLS position", () => {
    const { Setup_getCanonicalHeaders } = require("../Setup.js");

    expect(
      Setup_getCanonicalHeaders({ first: 1, second: 2, third: 3 })
    ).toEqual(["first", "second", "third"]);
  });

  it("collects every ambiguous header before making any write", () => {
    const { Setup_preflightHeaders } = require("../Setup.js");
    const dataSheet = new MockSheet("Data", [["value", "value", "rogue"]]);
    const ledger = new MockLedger([dataSheet]);

    const result = Setup_preflightHeaders(ledger, {
      Data: { id: 1, value: 2 },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((item) => item.classification)).toEqual(
      expect.arrayContaining([
        "DUPLICATE",
        "MISSING",
        "MISMATCHED_POSITION",
        "UNKNOWN",
      ])
    );
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          column: "A",
          expected: "id",
          found: "value",
          tab: "Data",
        }),
      ])
    );
    expect(dataSheet.writeCount).toBe(0);
  });

  it("aborts setupAll before writes when LEDGER_ID points elsewhere", () => {
    const insertSheet = jest.fn();
    const ledger = {
      getId: () => "ACTIVE-LEDGER",
      insertSheet,
    };
    global.SpreadsheetApp = { getActive: () => ledger };
    global.PropertiesService = {
      getScriptProperties: () => ({
        getProperty: () => "OTHER-LEDGER",
        setProperty: jest.fn(),
      }),
    };
    const { setupAll } = require("../Setup.js");

    expect(() => setupAll()).toThrow("LEDGER_ID_MISMATCH");
    expect(insertSheet).not.toHaveBeenCalled();
  });
});

describe("Phase 1 schema migration runner", () => {
  beforeEach(() => {
    jest.resetModules();
    configureMigrationGlobals();
  });

  it("journals the exact DATA_MOVE snapshot before applying the step", () => {
    const { SchemaMigration } = require("../Migration.js");
    const dataSheet = new MockSheet("Data", [
      ["id", "value"],
      ["A", 10],
    ]);
    const configSheet = new MockSheet("Config", [
      ["key", "value"],
      ["SCHEMA_VERSION", "0"],
    ]);
    const ledger = new MockLedger([dataSheet, configSheet]);

    const result = SchemaMigration.run({
      derivedRegistry: { 0: { apply: jest.fn() }, 1: { apply: jest.fn() } },
      ledger,
      migrations: {
        1: {
          fromVersion: 0,
          id: "TEST-0-1",
          steps: [
            {
              apply: ({ range }) => range.setValues([["A", 20]]),
              id: "move-data",
              range: { column: 1, numColumns: 2, numRows: 1, row: 2 },
              tab: "Data",
              type: "DATA_MOVE",
            },
          ],
          toVersion: 1,
        },
      },
      schemaRegistry: {
        0: { headers: { Config: ["key", "value"], Data: ["id", "value"] } },
        1: { headers: { Config: ["key", "value"], Data: ["id", "value"] } },
      },
      skipManifest: true,
      skipOwnerCheck: true,
      targetVersion: 1,
    });

    const journal = ledger.getSheetByName("MigrationLog").values;
    expect(result.status).toBe("SUCCESS");
    expect(dataSheet.values[1]).toEqual(["A", 20]);
    expect(journal.flat().join(" ")).toContain('[["A",10]]');
    expect(journal.flat()).toContain("DONE");
  });

  it("rolls back failed migration data literally and reapplies source derived state", () => {
    const { SchemaMigration } = require("../Migration.js");
    const sourceDerivedApply = jest.fn();
    const dataSheet = new MockSheet("Data", [
      ["id", "value"],
      ["A", "original"],
    ]);
    const configSheet = new MockSheet("Config", [
      ["key", "value"],
      ["SCHEMA_VERSION", "0"],
    ]);
    const ledger = new MockLedger([dataSheet, configSheet]);

    const result = SchemaMigration.run({
      derivedRegistry: {
        0: { apply: sourceDerivedApply },
        1: {
          apply: jest.fn(() => {
            throw new Error("derived failure");
          }),
        },
      },
      ledger,
      migrations: {
        1: {
          fromVersion: 0,
          id: "TEST-ROLLBACK",
          steps: [
            {
              apply: ({ range }) => range.setValues([["A", "changed"]]),
              id: "move-data",
              range: { column: 1, numColumns: 2, numRows: 1, row: 2 },
              tab: "Data",
              type: "DATA_MOVE",
            },
            { id: "derived", type: "DERIVED_REAPPLY" },
          ],
          toVersion: 1,
        },
      },
      schemaRegistry: {
        0: { headers: { Config: ["key", "value"], Data: ["id", "value"] } },
        1: { headers: { Config: ["key", "value"], Data: ["id", "value"] } },
      },
      skipManifest: true,
      skipOwnerCheck: true,
      targetVersion: 1,
    });

    expect(result.status).toBe("ROLLED_BACK");
    expect(dataSheet.values[1]).toEqual(["A", "original"]);
    expect(sourceDerivedApply).toHaveBeenCalledWith(
      expect.objectContaining({ ledger, schemaVersion: 0 })
    );
    expect(ledger.getSheetByName("MigrationLog").values.flat()).toContain(
      "ROLLED_BACK"
    );
  });

  it("releases the migration lock when a step throws", () => {
    const lock = { releaseLock: jest.fn(), waitLock: jest.fn() };
    global.LockService.getScriptLock.mockReturnValue(lock);
    const { SchemaMigration } = require("../Migration.js");
    const dataSheet = new MockSheet("Data", [
      ["id", "value"],
      ["A", 10],
    ]);
    const configSheet = new MockSheet("Config", [
      ["key", "value"],
      ["SCHEMA_VERSION", "0"],
    ]);
    const ledger = new MockLedger([dataSheet, configSheet]);

    const result = SchemaMigration.run({
      derivedRegistry: { 0: { apply: jest.fn() }, 1: { apply: jest.fn() } },
      ledger,
      migrations: {
        1: {
          fromVersion: 0,
          id: "TEST-LOCK",
          steps: [
            {
              apply: () => {
                throw new Error("move failed");
              },
              id: "move-data",
              range: { column: 1, numColumns: 2, numRows: 1, row: 2 },
              tab: "Data",
              type: "DATA_MOVE",
            },
          ],
          toVersion: 1,
        },
      },
      schemaRegistry: {
        0: { headers: { Config: ["key", "value"], Data: ["id", "value"] } },
        1: { headers: { Config: ["key", "value"], Data: ["id", "value"] } },
      },
      skipManifest: true,
      skipOwnerCheck: true,
      targetVersion: 1,
    });

    expect(result.status).toBe("ROLLED_BACK");
    expect(lock.waitLock).toHaveBeenCalled();
    expect(lock.releaseLock).toHaveBeenCalledTimes(1);
  });

  it("rejects a stored schema version whose live fingerprint is ambiguous", () => {
    const { SchemaMigration } = require("../Migration.js");
    const dataSheet = new MockSheet("Data", [
      ["value", "id"],
      [10, "A"],
    ]);
    const configSheet = new MockSheet("Config", [
      ["key", "value"],
      ["SCHEMA_VERSION", "1"],
    ]);
    const ledger = new MockLedger([dataSheet, configSheet]);

    const result = SchemaMigration.run({
      derivedRegistry: { 1: { apply: jest.fn() } },
      ledger,
      migrations: {},
      schemaRegistry: {
        1: { headers: { Config: ["key", "value"], Data: ["id", "value"] } },
      },
      skipManifest: true,
      skipOwnerCheck: true,
      targetVersion: 1,
    });

    expect(result.status).toBe("HEADER_PREFLIGHT_FAILED");
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ classification: "MISMATCHED_POSITION" }),
      ])
    );
    expect(global.LockService.getScriptLock).not.toHaveBeenCalled();
    expect(dataSheet.writeCount).toBe(0);
    expect(configSheet.writeCount).toBe(0);
  });

  it("appends and verifies the manifest only after releasing the runner lock", () => {
    const calls = [];
    const lock = {
      releaseLock: jest.fn(() => calls.push("release")),
      waitLock: jest.fn(() => calls.push("wait")),
    };
    global.LockService.getScriptLock.mockReturnValue(lock);
    global.Audit = {
      append: jest.fn(() => calls.push("append")),
      verifyChain: jest.fn(() => {
        calls.push("verify");
        return { badSeq: null, ok: true };
      }),
    };
    const { SchemaMigration } = require("../Migration.js");
    const dataSheet = new MockSheet("Data", [["id", "value"]]);
    const configSheet = new MockSheet("Config", [
      ["key", "value"],
      ["SCHEMA_VERSION", "1"],
    ]);
    const ledger = new MockLedger([dataSheet, configSheet]);

    const result = SchemaMigration.run({
      derivedRegistry: { 1: { apply: jest.fn() } },
      ledger,
      migrations: {},
      schemaRegistry: {
        1: { headers: { Config: ["key", "value"], Data: ["id", "value"] } },
      },
      skipOwnerCheck: true,
      targetVersion: 1,
    });

    expect(result.status).toBe("SUCCESS");
    expect(calls).toEqual(["wait", "release", "append", "verify"]);
    expect(global.Audit.append).toHaveBeenCalledWith(
      "SYSTEM",
      "SchemaMigration",
      expect.any(String),
      "MIGRATION_COMPLETE",
      expect.objectContaining({
        after_schema_version: 1,
        before_schema_version: 1,
      }),
      expect.any(String)
    );
  });
});

describe("Annual Migration schema activation gate", () => {
  it("blocks activation when the target schema runner reports unhealthy", () => {
    jest.resetModules();
    global.getSheet_ = jest.fn();
    global.getVaultSheet_ = jest.fn();
    global.TABS = {
      AUDIT_LOG: "AuditLog",
      CONFIG: "Config",
      USERS: "Users",
    };
    global.Config = {
      getOptional: jest.fn((key) => {
        const values = {
          MIGRATION_STAGE: "VALIDATE",
          MIGRATION_TARGET_SPREADSHEET_ID: "TARGET-1",
        };
        return values[key] || "";
      }),
      invalidate: jest.fn(),
    };
    global.SchemaMigration = {
      healthCheck: jest.fn(() => ({
        errors: ["missing formula"],
        ok: false,
      })),
      prepareAnnualLedger: jest.fn(() => ({
        error: "missing formula",
        ok: false,
      })),
    };
    const target = {
      getSheetByName: jest.fn(() => ({})),
    };
    global.SpreadsheetApp = { openById: jest.fn(() => target) };
    global.PropertiesService = {
      getScriptProperties: () => ({
        getProperty: () => "SOURCE-1",
        setProperty: jest.fn(),
      }),
    };
    global.LockService = {
      getScriptLock: () => ({ releaseLock: jest.fn(), waitLock: jest.fn() }),
    };
    global.DriveApp = {};
    global.Audit = { append: jest.fn() };
    global.Discord = { postTreasury: jest.fn() };
    global.ROLES = { TREASURER: "TREASURER" };
    global.COLS = {};
    global.Setup_setConfigValue_ = jest.fn();

    const { Migration } = require("../AnnualMigration.js");
    global.SchemaMigration.prepareAnnualLedger = jest.fn(() => ({
      error: "schema unhealthy",
      ok: false,
      status: "SCHEMA_FAILED",
    }));
    Migration._validateAll = jest.fn(() => ({ errors: [], ok: true }));

    const result = Migration.activateMigration("USER-1");

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(SCHEMA_REGEX);
    expect(global.SchemaMigration.prepareAnnualLedger).toHaveBeenCalledWith(
      target,
      expect.anything()
    );
  });
});
