"use strict";

const TREASURER_REGEX = /Treasurer/;
const REASON_REGEX = /reason/;
const VALIDATE_REGEX = /VALIDATE/;
const MIGRATION_START_REGEX = /Start a migration first/;
global.getSheet_ = jest.fn();
global.getVaultSheet_ = jest.fn();
global.Audit = { _nowIso: () => "2026-07-22T00:00:00Z", append: jest.fn() };
global.LockService = {
  getScriptLock: jest.fn(() => ({
    releaseLock: jest.fn(),
    waitLock: jest.fn(),
  })),
};
global.DriveApp = {
  getFileById: jest.fn(() => ({
    getId: () => "FILE-OLD",
    getName: () => "CF-Budget 25-26",
    getParents: () => ({
      hasNext: () => true,
      next: () => ({ getId: () => "PARENT-FOLDER" }),
    }),
    setName: jest.fn(),
    setViewersCanCopyContent: jest.fn(),
  })),
  getFolderById: jest.fn(() => ({
    addFile: jest.fn(),
    createFolder: jest.fn((name) => ({
      addFile: jest.fn(),
      createFolder: jest.fn(() => ({
        addFile: jest.fn(),
        getId: () => "FOLDER-X",
      })),
      getId: () => `FOLDER-${name}`,
    })),
    getId: () => "PARENT-FOLDER",
  })),
  getRootFolder: () => ({ removeFile: jest.fn() }),
};
global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: jest.fn((key) => (key === "LEDGER_ID" ? "FILE-OLD" : "")),
    setProperty: jest.fn(),
  }),
};
global.SpreadsheetApp = {
  create: jest.fn(() => ({
    deleteSheet: jest.fn(),
    getId: () => "NEW-SS-ID",
    getSheetByName: jest.fn(() => ({
      appendRow: jest.fn(),
      getDataRange: () => ({ getValues: () => [] }),
      getRange: () => ({ setValues: jest.fn() }),
    })),
    getSheets: () => [],
    insertSheet: jest.fn(() => ({ appendRow: jest.fn() })),
  })),
  openById: jest.fn(() => ({
    deleteSheet: jest.fn(),
    getSheetByName: jest.fn(() => ({
      appendRow: jest.fn(),
      getDataRange: () => ({ getValues: () => [] }),
      getRange: () => ({ setValues: jest.fn() }),
    })),
    getSheets: () => [],
    insertSheet: jest.fn(() => ({ appendRow: jest.fn() })),
  })),
};
global.Session = {
  getActiveUser: jest.fn(() => ({ getEmail: () => "test@example.com" })),
};
global.Discord = { postTreasury: jest.fn() };
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
  ExpenseClaim: {
    APPROVED_FOR_PAYOUT: "APPROVED_FOR_PAYOUT",
    DRAFT: "DRAFT",
    SUBMITTED: "SUBMITTED",
    VERIFIED: "VERIFIED",
  },
  FinanceAccount: { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" },
};

// In-memory config store to simulate Script Properties for migration state.
const configStore = {};

function resetConfig() {
  for (const k of Object.keys(configStore)) {
    delete configStore[k];
  }
}

global.Setup_setConfigValue_ = jest.fn((key, value) => {
  configStore[key] = String(value);
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
  invalidate: () => {
    /* no-op */
  },
};

// Users sheet with operators and members for preview.
const usersData = [
  ["user_id", "display_name", "role", "email", "active", "created_at"],
  [
    "U-001",
    "Treasurer Test",
    "TREASURER",
    "test@example.com",
    true,
    "2026-01-01",
  ],
  [
    "U-002",
    "Committee",
    "COMMITTEE",
    "committee@example.com",
    true,
    "2026-01-01",
  ],
  ["M-001", "Alice Member", "MEMBER", "alice@example.com", true, "2026-01-01"],
  ["M-002", "Bob Member", "MEMBER", "bob@example.com", true, "2026-01-01"],
  ["M-003", "Old Member", "MEMBER", "old@example.com", false, "2026-01-01"],
];

const accountsData = [
  [
    "account_id",
    "name",
    "opening_balance",
    "current_balance",
    "pending_income",
    "reserved_payouts",
    "status",
  ],
  ["AC-1", "Main", 10_000, 9500, 0, 0, "ACTIVE"],
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
        if (row[0]) {
          configStore[row[0]] = String(row[1]);
        }
      }),
      deleteRow: jest.fn((rowIndex) => {
        const row = configData[rowIndex - 1];
        if (row?.[0]) {
          delete configStore[row[0]];
        }
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
      "MEMBERS",
      "ACCOUNTS",
      "EVENTS",
      "CATEGORIES",
      "USERS",
      "VALIDATE",
      "ACTIVATE",
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

  it("startMigration creates folder + spreadsheet and lands on MEMBERS", () => {
    const result = Migration.startMigration("U-001");
    expect(result.ok).toBe(true);
    expect(result.stage).toBe("MEMBERS");
    expect(result.folder_id).toBeTruthy();
    expect(result.spreadsheet_id).toBeTruthy();
    expect(configStore.MIGRATION_STAGE).toBe("MEMBERS");
    expect(configStore.MIGRATION_TARGET_SPREADSHEET_ID).toBeTruthy();
    expect(configStore.MIGRATION_TARGET_FOLDER_ID).toBeTruthy();
  });

  it("startMigration is idempotent: a second call resumes instead of duplicating", () => {
    const first = Migration.startMigration("U-001");
    const second = Migration.startMigration("U-001");
    expect(second.ok).toBe(true);
    expect(second.spreadsheet_id).toBe(first.spreadsheet_id);
    expect(second.folder_id).toBe(first.folder_id);
  });

  it("setMemberSelections stores member_ids and advances to MEMBERS", () => {
    Migration.startMigration("U-001");
    const result = Migration.setMemberSelections("U-001", ["M-001", "M-002"]);
    expect(result.ok).toBe(true);
    expect(result.stage).toBe("MEMBERS");
    const selections = JSON.parse(configStore.MIGRATION_SELECTIONS);
    expect(selections.member_ids).toEqual(["M-001", "M-002"]);
  });

  it("setAccountSelections preserves member_ids and advances to ACCOUNTS", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    const result = Migration.setAccountSelections("U-001", {
      accountBalances: { "AC-1": 9500 },
      accountIds: ["AC-1"],
      balanceReasons: { "AC-1": "Carried over" },
    });
    expect(result.ok).toBe(true);
    expect(result.stage).toBe("ACCOUNTS");
    const selections = JSON.parse(configStore.MIGRATION_SELECTIONS);
    expect(selections.member_ids).toEqual(["M-001"]);
    expect(selections.account_ids).toEqual(["AC-1"]);
    expect(selections.account_balances["AC-1"]).toBe(9500);
    expect(selections.balance_reasons["AC-1"]).toBe("Carried over");
  });

  it("setEventSelections stores event_ids and advances to EVENTS", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    Migration.setAccountSelections("U-001", {
      accountBalances: { "AC-1": 1000 },
      accountIds: ["AC-1"],
      balanceReasons: { "AC-1": "Carry forward opening balance" },
      confirmedAccountIds: ["AC-1"],
    });
    const result = Migration.setEventSelections("U-001", ["EVT-1"]);
    expect(result.ok).toBe(true);
    expect(result.stage).toBe("EVENTS");
    const selections = JSON.parse(configStore.MIGRATION_SELECTIONS);
    expect(selections.event_ids).toEqual(["EVT-1"]);
    expect(selections.member_ids).toEqual(["M-001"]);
  });

  it("setCategorySelections stores category_ids and advances to CATEGORIES", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    Migration.setAccountSelections("U-001", {
      accountBalances: { "AC-1": 1000 },
      accountIds: ["AC-1"],
      balanceReasons: { "AC-1": "Carry forward opening balance" },
      confirmedAccountIds: ["AC-1"],
    });
    Migration.setEventSelections("U-001", ["EVT-1"]);
    const result = Migration.setCategorySelections("U-001", ["CAT-1"]);
    expect(result.ok).toBe(true);
    expect(result.stage).toBe("CATEGORIES");
    const selections = JSON.parse(configStore.MIGRATION_SELECTIONS);
    expect(selections.category_ids).toEqual(["CAT-1"]);
  });

  it("setUserSelections stores user_ids and requires >=1 active Treasurer", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    Migration.setAccountSelections("U-001", {
      accountBalances: { "AC-1": 1000 },
      accountIds: ["AC-1"],
      balanceReasons: { "AC-1": "Carry forward opening balance" },
      confirmedAccountIds: ["AC-1"],
    });
    Migration.setEventSelections("U-001", ["EVT-1"]);
    Migration.setCategorySelections("U-001", ["CAT-1"]);
    // Carry only the committee operator — should fail validation later.
    const result = Migration.setUserSelections("U-001", ["U-002"]);
    expect(result.ok).toBe(true);
    expect(result.stage).toBe("USERS");
    const selections = JSON.parse(configStore.MIGRATION_SELECTIONS);
    expect(selections.user_ids).toEqual(["U-002"]);
  });

  it("validateMigration passes when every step has valid selections + Treasurer", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001", "M-002"]);
    Migration.setAccountSelections("U-001", {
      accountBalances: { "AC-1": 1000 },
      accountIds: ["AC-1"],
      balanceReasons: { "AC-1": "Carry forward opening balance" },
      confirmedAccountIds: ["AC-1"],
    });
    Migration.setEventSelections("U-001", ["EVT-1"]);
    Migration.setCategorySelections("U-001", ["CAT-1"]);
    Migration.setUserSelections("U-001", ["U-001", "U-002"]);
    const result = Migration.validateMigration("U-001");
    expect(result.ok).toBe(true);
    expect(result.stage).toBe("VALIDATE");
    expect(configStore.MIGRATION_STAGE).toBe("VALIDATE");
  });

  it("validateMigration fails when no Treasurer is selected", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    Migration.setAccountSelections("U-001", {
      accountBalances: { "AC-1": 1000 },
      accountIds: ["AC-1"],
      balanceReasons: { "AC-1": "Carry forward opening balance" },
      confirmedAccountIds: ["AC-1"],
    });
    Migration.setEventSelections("U-001", ["EVT-1"]);
    Migration.setCategorySelections("U-001", ["CAT-1"]);
    Migration.setUserSelections("U-001", ["U-002"]);
    const result = Migration.validateMigration("U-001");
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(TREASURER_REGEX);
  });

  it("validateMigration fails when an account has a changed balance without a reason", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    Migration.setAccountSelections("U-001", {
      accountBalances: { "AC-1": 9999 },
      accountIds: ["AC-1"],
      balanceReasons: {}, // missing for AC-1
    });
    Migration.setEventSelections("U-001", ["EVT-1"]);
    Migration.setCategorySelections("U-001", ["CAT-1"]);
    Migration.setUserSelections("U-001", ["U-001"]);
    const result = Migration.validateMigration("U-001");
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(REASON_REGEX);
  });

  it("activateMigration blocks until VALIDATE succeeds", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    Migration.setAccountSelections("U-001", {
      accountBalances: { "AC-1": 1000 },
      accountIds: ["AC-1"],
      balanceReasons: { "AC-1": "Carry forward opening balance" },
      confirmedAccountIds: ["AC-1"],
    });
    Migration.setEventSelections("U-001", ["EVT-1"]);
    Migration.setCategorySelections("U-001", ["CAT-1"]);
    Migration.setUserSelections("U-001", ["U-001"]);
    // Skip VALIDATE
    const result = Migration.activateMigration("U-001");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(VALIDATE_REGEX);
  });

  it("activateMigration is idempotent: a repeat call returns ok without re-archiving", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    Migration.setAccountSelections("U-001", {
      accountBalances: { "AC-1": 1000 },
      accountIds: ["AC-1"],
      balanceReasons: { "AC-1": "Carry forward opening balance" },
      confirmedAccountIds: ["AC-1"],
    });
    Migration.setEventSelections("U-001", ["EVT-1"]);
    Migration.setCategorySelections("U-001", ["CAT-1"]);
    Migration.setUserSelections("U-001", ["U-001"]);
    Migration.validateMigration("U-001");
    const first = Migration.activateMigration("U-001");
    expect(first.ok).toBe(true);
    expect(first.stage).toBe("ACTIVATE");
    const second = Migration.activateMigration("U-001");
    expect(second.ok).toBe(true);
    expect(second.stage).toBe("ACTIVATE");
  });

  it("setMemberSelections before startMigration returns ok:false", () => {
    const result = Migration.setMemberSelections("U-001", ["M-001"]);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(MIGRATION_START_REGEX);
  });

  it("member selection is independently updatable after advancing to ACCOUNTS", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    Migration.setAccountSelections("U-001", {
      accountBalances: { "AC-1": 1000 },
      accountIds: ["AC-1"],
      balanceReasons: { "AC-1": "Carry forward opening balance" },
      confirmedAccountIds: ["AC-1"],
    });
    Migration.setMemberSelections("U-001", ["M-001", "M-002"]);
    const selections = JSON.parse(configStore.MIGRATION_SELECTIONS);
    expect(selections.member_ids).toEqual(["M-001", "M-002"]);
    expect(selections.account_ids).toEqual(["AC-1"]);
  });

  it("cancelMigration clears all migration config keys", () => {
    Migration.startMigration("U-001");
    Migration.setMemberSelections("U-001", ["M-001"]);
    Migration.cancelMigration("U-001");
    expect(configStore.MIGRATION_STAGE).toBeUndefined();
    expect(configStore.MIGRATION_SELECTIONS).toBeUndefined();
    expect(configStore.MIGRATION_TARGET_SPREADSHEET_ID).toBeUndefined();
  });
});
