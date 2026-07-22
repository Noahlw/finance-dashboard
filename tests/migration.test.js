"use strict";
global.getSheet_ = jest.fn();
global.getVaultSheet_ = jest.fn();
global.Audit = { _nowIso: () => "2026-07-22T00:00:00Z", append: jest.fn() };
global.DriveApp = {
  getFolderById: jest.fn(() => ({
    addFile: jest.fn(),
    createFolder: jest.fn(function (name) {
      return {
        addFile: jest.fn(),
        createFolder: jest.fn(function () { return { addFile: jest.fn(), getId: () => "FOLDER-X" }; }),
        getId: () => "FOLDER-" + name,
      };
    }),
    getId: () => "PARENT-FOLDER",
  })),
  getFileById: jest.fn(() => ({
    getId: () => "FILE-OLD",
    getName: () => "CF-Budget 25-26",
    getParents: () => ({ hasNext: () => true, next: () => ({ getId: () => "PARENT-FOLDER" }) }),
    setName: jest.fn(),
    setViewersCanCopyContent: jest.fn(),
  })),
  getRootFolder: () => ({ removeFile: jest.fn() }),
};
global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: jest.fn(() => ""),
    setProperty: jest.fn(),
  }),
};
global.SpreadsheetApp = {
  create: jest.fn(() => ({
    deleteSheet: jest.fn(),
    getId: () => "NEW-SS-ID",
    getSheetByName: jest.fn(() => ({ appendRow: jest.fn(), getRange: () => ({ setValues: jest.fn() }) })),
    getSheets: () => [],
    insertSheet: jest.fn(() => ({ appendRow: jest.fn() })),
  })),
  openById: jest.fn(() => ({
    deleteSheet: jest.fn(),
    getSheetByName: jest.fn(() => ({ appendRow: jest.fn(), getRange: () => ({ setValues: jest.fn() }) })),
    getSheets: () => [],
    insertSheet: jest.fn(() => ({ appendRow: jest.fn() })),
  })),
};
global.Session = { getActiveUser: jest.fn(() => ({ getEmail: () => "test@example.com" })) };
global.TABS = {
  ACCOUNT_ADJUSTMENTS: "AccountAdjustments",
  ACCOUNT_TRANSFERS: "AccountTransfers",
  APPROVALS: "Approvals",
  AUDIT_LOG: "AuditLog",
  BUDGET_REQUEST_LINES: "BudgetRequestLines",
  BUDGET_REQUESTS: "BudgetRequests",
  CATEGORIES: "Categories",
  CLAIM_LINE_ITEMS: "ClaimLineItems",
  CONFIG: "Config",
  COUNTERS: "Counters",
  EVENTS: "Events",
  EXPENSE_CLAIMS: "ExpenseClaims",
  FINANCE_ACCOUNTS: "FinanceAccounts",
  INCOME: "Income",
  PAYOUTS: "Payouts",
  RECEIPTS: "Receipts",
  USERS: "Users",
};
global.COLS = {
  Categories: {
    active: 5,
    category_id: 1,
    kind: 3,
    name: 2,
  },
  Config: { key: 1, value: 2 },
  Events: {
    event_id: 1,
    name: 2,
    semester: 3,
  },
  FinanceAccounts: {
    account_id: 1,
    current_balance: 4,
    name: 2,
    status: 7,
  },
  Users: {
    active: 5,
    created_at: 6,
    display_name: 2,
    email: 4,
    role: 3,
    user_id: 1,
  },
};
global.ROLES = {
  ADVISOR_AUDITOR: "ADVISOR_AUDITOR",
  COMMITTEE: "COMMITTEE",
  MEMBER: "MEMBER",
  TREASURER: "TREASURER",
};
global.STATUS = {
  ExpenseClaim: { DRAFT: "DRAFT", SUBMITTED: "SUBMITTED", VERIFIED: "VERIFIED", APPROVED_FOR_PAYOUT: "APPROVED_FOR_PAYOUT" },
  FinanceAccount: { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" },
};

// In-memory config store to simulate Script Properties for migration state.
const configStore = {};

function resetConfig() {
  Object.keys(configStore).forEach((k) => delete configStore[k]);
}

global.Setup_setConfigValue_ = jest.fn((key, value) => {
  configStore[key] = String(value);
  // Mirror to configData sheet so _clearConfig can find and remove it
  const existingIdx = configData.findIndex((r) => r[0] === key);
  if (existingIdx >= 0) {
    configData[existingIdx] = [key, String(value)];
  } else {
    configData.push([key, String(value)]);
  }
});

global.Config = {
  getNum: () => 14,
  getOptional: (key) => configStore[key] || "",
  invalidate: () => {},
};

// Users sheet with operators and members for preview.
const usersData = [
  ["user_id", "display_name", "role", "email", "active", "created_at"],
  ["U-001", "Treasurer Test", "TREASURER", "test@example.com", true, "2026-01-01"],
  ["U-002", "Committee", "COMMITTEE", "committee@example.com", true, "2026-01-01"],
  ["M-001", "Alice Member", "MEMBER", "alice@example.com", true, "2026-01-01"],
  ["M-002", "Bob Member", "MEMBER", "bob@example.com", true, "2026-01-01"],
  ["M-003", "Old Member", "MEMBER", "old@example.com", false, "2026-01-01"],
];

const accountsData = [
  ["account_id", "name", "opening_balance", "current_balance", "pending_income", "reserved_payouts", "status"],
  ["AC-1", "Main", 10000, 9500, 0, 0, "ACTIVE"],
  ["AC-2", "Reserve", 5000, 5200, 0, 0, "ACTIVE"],
];

const categoriesData = [
  ["category_id", "name", "kind", "semester_cap", "active"],
  ["CAT-1", "Marketing", "EXPENSE", 1000, true],
  ["CAT-2", "Inactive Cat", "EXPENSE", 0, false],
];

const eventsData = [
  ["event_id", "name", "semester", "owner_user_id", "created_at"],
  ["EVT-1", "Fall Gala", "SEM A", "U-001", "2026-01-01"],
];

const configData = [["key", "value"]];

global.getSheet_.mockImplementation((tab) => {
  if (tab === "Users") {
    return {
      getDataRange: () => ({ getValues: () => usersData }),
    };
  }
  if (tab === "FinanceAccounts") {
    return {
      getDataRange: () => ({ getValues: () => accountsData }),
    };
  }
  if (tab === "Categories") {
    return {
      getDataRange: () => ({ getValues: () => categoriesData }),
    };
  }
  if (tab === "Events") {
    return {
      getDataRange: () => ({ getValues: () => eventsData }),
    };
  }
  if (tab === "Config") {
    return {
      appendRow: jest.fn((row) => {
        configData.push(row);
        if (row[0]) configStore[row[0]] = String(row[1]);
      }),
      deleteRow: jest.fn((rowIndex) => {
        const row = configData[rowIndex - 1];
        if (row && row[0]) delete configStore[row[0]];
        configData.splice(rowIndex - 1, 1);
      }),
      getDataRange: () => ({ getValues: () => configData }),
    };
  }
  return { getDataRange: () => ({ getValues: () => [] }) };
});

const { Migration, MIGRATION_STAGES } = require("../AnnualMigration.js");

describe("Annual Migration: 8-stage resumable flow", () => {
  beforeEach(() => {
    resetConfig();
  });

  it("exposes all 8 stages in MIGRATION_STAGES", () => {
    expect(MIGRATION_STAGES).toEqual([
      "PREVIEW",
      "INIT",
      "MEMBERS",
      "ACCOUNTS",
      "CATEGORIES_EVENTS",
      "REVIEW",
      "EXECUTE",
      "ACTIVATED",
    ]);
  });

  it("preview shows active members, operators, accounts, categories, events", () => {
    const preview = Migration.getPreview();
    expect(preview.active_members.length).toBe(2);
    expect(preview.inactive_members.length).toBe(1);
    expect(preview.operators.length).toBe(2);
    expect(preview.accounts.length).toBe(2);
    expect(preview.categories.length).toBe(2);
    expect(preview.events.length).toBe(1);
    expect(preview.has_treasurer).toBe(true);
  });

  it("startMigration advances from PREVIEW to INIT", () => {
    const result = Migration.startMigration("U-001");
    expect(result.ok).toBe(true);
    expect(result.stage).toBe("INIT");
    expect(Migration.getState().stage).toBe("INIT");
  });

  it("setMemberSelections advances INIT -> MEMBERS and stores member_ids", () => {
    Migration.startMigration("U-001");
    const result = Migration.setMemberSelections("U-001", ["M-001", "M-002"]);
    expect(result.ok).toBe(true);
    expect(result.stage).toBe("MEMBERS");
    const selections = JSON.parse(configStore["MIGRATION_SELECTIONS"]);
    expect(selections.member_ids).toEqual(["M-001", "M-002"]);
  });

  it("setAccountSelections preserves member_ids and advances to ACCOUNTS", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    const result = Migration.setAccountSelections("U-001", {
      accountIds: ["AC-1"],
      accountBalances: { "AC-1": 9500 },
      balanceReasons: { "AC-1": "Carried over" },
    });
    expect(result.ok).toBe(true);
    expect(result.stage).toBe("ACCOUNTS");
    const selections = JSON.parse(configStore["MIGRATION_SELECTIONS"]);
    expect(selections.member_ids).toEqual(["M-001"]);
    expect(selections.account_ids).toEqual(["AC-1"]);
    expect(selections.account_balances["AC-1"]).toBe(9500);
    expect(selections.balance_reasons["AC-1"]).toBe("Carried over");
  });

  it("setCategoryEventSelections advances to CATEGORIES_EVENTS and preserves prior selections", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    Migration.setAccountSelections("U-001", {
      accountBalances: {},
      accountIds: ["AC-1"],
      balanceReasons: {},
    });
    const result = Migration.setCategoryEventSelections("U-001", {
      categoryIds: ["CAT-1"],
      eventIds: ["EVT-1"],
    });
    expect(result.ok).toBe(true);
    expect(result.stage).toBe("CATEGORIES_EVENTS");
    const selections = JSON.parse(configStore["MIGRATION_SELECTIONS"]);
    expect(selections.member_ids).toEqual(["M-001"]);
    expect(selections.account_ids).toEqual(["AC-1"]);
    expect(selections.category_ids).toEqual(["CAT-1"]);
    expect(selections.event_ids).toEqual(["EVT-1"]);
  });

  it("setSelections transitions to REVIEW from any earlier stage", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    const result = Migration.setSelections("U-001", {
      accountBalances: {},
      accountIds: ["AC-1"],
      balanceReasons: {},
      categoryIds: ["CAT-1"],
      eventIds: ["EVT-1"],
      memberIds: ["M-001"],
    });
    expect(result.ok).toBe(true);
    expect(result.stage).toBe("REVIEW");
  });

  it("setMemberSelections before startMigration returns ok:false", () => {
    const result = Migration.setMemberSelections("U-001", ["M-001"]);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Start a migration first/);
  });

  it("member selection is independently updatable after advancing to ACCOUNTS", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    Migration.setAccountSelections("U-001", {
      accountBalances: {},
      accountIds: ["AC-1"],
      balanceReasons: {},
    });
    // Re-edit members mid-flow
    Migration.setMemberSelections("U-001", ["M-001", "M-002"]);
    const selections = JSON.parse(configStore["MIGRATION_SELECTIONS"]);
    expect(selections.member_ids).toEqual(["M-001", "M-002"]);
    expect(selections.account_ids).toEqual(["AC-1"]); // preserved
  });

  it("cancelMigration clears all migration config keys", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    Migration.setAccountSelections("U-001", {
      accountBalances: {},
      accountIds: ["AC-1"],
      balanceReasons: {},
    });
    Migration.cancelMigration("U-001");
    expect(configStore["MIGRATION_STAGE"]).toBeUndefined();
    expect(configStore["MIGRATION_SELECTIONS"]).toBeUndefined();
    expect(configStore["MIGRATION_TARGET_SPREADSHEET_ID"]).toBeUndefined();
  });
});