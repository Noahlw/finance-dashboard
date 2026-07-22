"use strict";
global._appendRow = jest.fn();
global.getSheet_ = jest.fn();
global.getVaultSheet_ = jest.fn();
global.TABS = {
  ACCOUNT_ADJUSTMENTS: "AccountAdjustments",
  ACCOUNT_TRANSFERS: "AccountTransfers",
  AUDIT_LOG: "AuditLog",
  BUDGET_REQUEST_LINES: "BudgetRequestLines",
  BUDGET_REQUESTS: "BudgetRequests",
  CLAIM_LINE_ITEMS: "ClaimLineItems",
  EXPENSE_CLAIMS: "ExpenseClaims",
  FINANCE_ACCOUNTS: "FinanceAccounts",
  INCOME: "Income",
  PAYOUTS: "Payouts",
  RECEIPTS: "Receipts",
  USERS: "Users",
};
global.COLS = {
  AccountAdjustments: {
    account_id: 2,
    adjusted_at: 7,
    adjusted_by: 6,
    adjustment_id: 1,
    amount: 3,
    direction: 4,
    reason: 5,
  },
  AccountTransfers: {
    amount: 4,
    from_account_id: 2,
    reason: 5,
    to_account_id: 3,
    transfer_id: 1,
    transferred_at: 7,
    transferred_by: 6,
  },
  BudgetRequestLines: {
    approved_amount: 6,
    category_id: 3,
    claimed_amount: 8,
    description: 4,
    line_id: 1,
    line_status: 7,
    remaining: 9,
    request_id: 2,
    requested_amount: 5,
  },
  ClaimLineItems: {
    amount: 5,
    budget_line_id: 3,
    claim_id: 2,
    claim_line_id: 1,
    description: 6,
    missing_receipt_flag: 7,
    receipt_id: 4,
  },
  ExpenseClaims: {
    approved_at: 6,
    approved_by: 10,
    claim_id: 1,
    claimant_id: 2,
    created_by: 16,
    event_id: 19,
    expense_date: 17,
    late_flag: 12,
    locked_at: 8,
    notes: 14,
    paid_at: 7,
    payout_handle: 21,
    payout_method: 20,
    processed_response_id: 15,
    self_approved: 13,
    semester: 18,
    status: 3,
    submitted_at: 4,
    total_amount: 11,
    verified_at: 5,
    verified_by: 9,
  },
  FinanceAccounts: {
    account_id: 1,
    created_at: 8,
    current_balance: 4,
    deactivated_at: 9,
    name: 2,
    opening_balance: 3,
    pending_income: 5,
    reserved_payouts: 6,
    status: 7,
  },
  Income: {
    account_id: 9,
    amount: 4,
    category_id: 3,
    date: 2,
    decided_at: 12,
    decided_by: 11,
    decision_note: 13,
    event_id: 7,
    income_id: 1,
    notes: 8,
    processed_response_id: 14,
    received_by: 5,
    source_ref: 6,
    status: 10,
  },
  Payouts: {
    account_id: 8,
    amount: 4,
    claim_id: 2,
    created_at: 10,
    failure_reason: 9,
    method: 5,
    parent_payout_id: 13,
    payee_user_id: 3,
    payout_id: 1,
    sent_at: 12,
    sent_by: 11,
    status: 7,
    txn_reference: 6,
  },
  Receipts: {
    drive_file_id: 2,
    file_link: 9,
    receipt_date: 7,
    receipt_id: 1,
    receipt_total: 8,
    sha256: 3,
    uploaded_at: 5,
    uploaded_by: 4,
    vendor: 6,
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
global.STATUS = {
  ExpenseClaim: {
    APPROVED_FOR_PAYOUT: "APPROVED_FOR_PAYOUT",
    DRAFT: "DRAFT",
    LOCKED: "LOCKED",
    NEEDS_INFO: "NEEDS_INFO",
    PAID: "PAID",
    REJECTED: "REJECTED",
    SUBMITTED: "SUBMITTED",
    VERIFIED: "VERIFIED",
  },
  FinanceAccount: { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" },
  Income: {
    CONFIRMED: "CONFIRMED",
    CORRECTED: "CORRECTED",
    NEEDS_INFO: "NEEDS_INFO",
    PENDING: "PENDING",
    REJECTED: "REJECTED",
  },
  Payout: {
    CONFIRMED: "CONFIRMED",
    FAILED: "FAILED",
    QUEUED: "QUEUED",
    SENT: "SENT",
  },
};
global.ROLES = {
  ADVISOR_AUDITOR: "ADVISOR_AUDITOR",
  COMMITTEE: "COMMITTEE",
  MEMBER: "MEMBER",
  TREASURER: "TREASURER",
};
global.Config = {
  get: jest.fn(() => "14"),
  getNum: jest.fn(() => 5),
};
global.Discord = { postStatus: jest.fn(), postTreasury: jest.fn() };
global.Audit = {
  _nowIso: jest.fn(() => "2026-07-21T12:00:00Z"),
  append: jest.fn(),
};
global.Session = {
  getActiveUser: jest.fn(() => ({ getEmail: () => "test@example.com" })),
};
global.PropertiesService = {
  getScriptProperties: jest.fn(() => ({
    getProperty: jest.fn(() => "FOLDER-123"),
    setProperty: jest.fn(),
  })),
};
global.CacheService = {
  getScriptCache: jest.fn(() => ({ get: jest.fn(() => null), put: jest.fn() })),
};
global.SpreadsheetApp = {
  flush: jest.fn(),
  openById: jest.fn(() => ({ getSheetByName: jest.fn() })),
};
global.LockService = {
  getScriptLock: jest.fn(() => ({
    releaseLock: jest.fn(),
    waitLock: jest.fn(),
  })),
};

var CoreDecisions = {};
global.CoreDecisions = CoreDecisions;

var engineModule = require("../Engine.js");
var realEngine = engineModule.Engine;

function makeCliSheet(rows) {
  return {
    getDataRange: jest.fn(() => ({
      getValues: jest.fn(() => {
        var header = [
          "claim_line_id",
          "claim_id",
          "budget_line_id",
          "receipt_id",
          "amount",
          "description",
          "missing_receipt_flag",
        ];
        return [header].concat(rows);
      }),
    })),
  };
}

function makeClaimSheet(rows) {
  return {
    getDataRange: jest.fn(() => ({
      getValues: jest.fn(() => {
        var header = ["claim_id", "claimant_id", "status"];
        return [header].concat(rows);
      }),
    })),
  };
}

describe("Engine._validateClaimVerification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    realEngine._sumClaimedAgainstLine = jest.fn(() => 0);
  });

  it("should reject a claim line with no receipt_id and no missing receipt flag", () => {
    realEngine._findRowsByColumn = jest.fn(() => [
      {
        rowIndex: 2,
        values: [
          "CLI-001",
          "CLAIM-001",
          "BL-001",
          "",
          100,
          "No receipt",
          false,
        ],
      },
    ]);
    realEngine._loadRow = jest.fn(() => ({
      rowIndex: 2,
      sheet: {},
      values: [
        "BL-001",
        "BUDGET-001",
        "CAT-1",
        "Test",
        200,
        200,
        "APPROVED",
        0,
        200,
      ],
    }));

    global.getSheet_.mockImplementation((tab) => {
      if (tab === "ExpenseClaims") {
        return makeClaimSheet([]);
      }
      return makeCliSheet([]);
    });

    var result = realEngine._validateClaimVerification(
      "CLAIM-001",
      "USER-1",
      {}
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toContain(
      "has no receipt_id and is not marked as missing receipt"
    );
  });

  it("should reject when total claimed exceeds receipt total", () => {
    realEngine._findRowsByColumn = jest.fn(() => [
      {
        rowIndex: 2,
        values: [
          "CLI-001",
          "CLAIM-001",
          "BL-001",
          "RECEIPT-001",
          250,
          "Over limit",
          false,
        ],
      },
    ]);
    realEngine._loadRow = jest.fn((entityType, id) => {
      if (entityType === "BudgetRequestLine") {
        return {
          rowIndex: 2,
          sheet: {},
          values: [
            "BL-001",
            "BUDGET-001",
            "CAT-1",
            "Test",
            200,
            200,
            "APPROVED",
            0,
            200,
          ],
        };
      }
      if (entityType === "Receipt") {
        return {
          rowIndex: 2,
          values: [
            "RECEIPT-001",
            "file-id",
            "hash",
            "USER-1",
            "2026-07-20",
            "Vendor",
            "2026-07-20",
            200,
            "=HYPERLINK(...)",
          ],
        };
      }
      return null;
    });

    global.getSheet_.mockImplementation((tab) => {
      if (tab === "ExpenseClaims") {
        return makeClaimSheet([["CLAIM-001", "M-001", "SUBMITTED"]]);
      }
      return makeCliSheet([
        ["CLI-001", "CLAIM-001", "BL-001", "RECEIPT-001", 250, "", false],
      ]);
    });

    var result = realEngine._validateClaimVerification(
      "CLAIM-001",
      "USER-1",
      {}
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("exceeds printed receipt total");
  });

  it("should allow missing receipt flag", () => {
    realEngine._findRowsByColumn = jest.fn(() => [
      {
        rowIndex: 2,
        values: ["CLI-001", "CLAIM-001", "BL-001", "", 5, "Missing", true],
      },
    ]);
    realEngine._loadRow = jest.fn((entityType) => {
      if (entityType === "BudgetRequestLine") {
        return {
          rowIndex: 2,
          sheet: {},
          values: [
            "BL-001",
            "BUDGET-001",
            "CAT-1",
            "Test",
            200,
            200,
            "APPROVED",
            0,
            200,
          ],
        };
      }
      if (entityType === "User") {
        return {
          rowIndex: 2,
          values: [
            "USER-1",
            "Treasurer",
            "TREASURER",
            "treasurer@example.com",
            true,
            "2026-01-01",
          ],
        };
      }
      if (entityType === "ExpenseClaim") {
        return {
          rowIndex: 2,
          values: [
            "CLAIM-001",
            "M-001",
            "SUBMITTED",
            "2026-07-20",
            "",
            "",
            "",
            "",
            "",
            "",
            5,
            false,
            false,
            "Missing receipt",
            "uuid",
            "USER-1",
            "2026-07-20",
            "26A",
            "",
            "FPS",
            "91234567",
          ],
        };
      }
      return null;
    });

    global.getSheet_.mockImplementation((tab) => {
      if (tab === "ExpenseClaims") {
        return makeClaimSheet([]);
      }
      return makeCliSheet([]);
    });

    var result = realEngine._validateClaimVerification(
      "CLAIM-001",
      "USER-1",
      {}
    );
    expect(result.ok).toBe(true);
  });

  it("should reject over-claimed budget line (negative remaining)", () => {
    realEngine._findRowsByColumn = jest.fn(() => [
      {
        rowIndex: 2,
        values: [
          "CLI-001",
          "CLAIM-001",
          "BL-001",
          "RECEIPT-001",
          100,
          "",
          false,
        ],
      },
    ]);
    realEngine._sumClaimedAgainstLine = jest.fn(() => 250);
    realEngine._loadRow = jest.fn((entityType, id) => {
      if (entityType === "BudgetRequestLine") {
        return {
          rowIndex: 2,
          sheet: {},
          values: [
            "BL-001",
            "BUDGET-001",
            "CAT-1",
            "Test",
            200,
            200,
            "APPROVED",
            250,
            -50,
          ],
        };
      }
      if (entityType === "Receipt") {
        return {
          rowIndex: 2,
          values: [
            "RECEIPT-001",
            "file-id",
            "hash",
            "USER-1",
            "2026-07-20",
            "Vendor",
            "2026-07-20",
            500,
            "=HYPERLINK(...)",
          ],
        };
      }
      return null;
    });

    global.getSheet_.mockImplementation((tab) => {
      if (tab === "ExpenseClaims") {
        return makeClaimSheet([["CLAIM-001", "M-001", "SUBMITTED"]]);
      }
      return makeCliSheet([
        ["CLI-001", "CLAIM-001", "BL-001", "RECEIPT-001", 100, "", false],
      ]);
    });

    var result = realEngine._validateClaimVerification(
      "CLAIM-001",
      "USER-1",
      {}
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("over-claimed");
  });
});

// ──────────────────────────────────────────────
//  Engine Finance & Payout tests
// ──────────────────────────────────────────────

describe("Engine._postToAccountBalance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    realEngine._loadRow = jest.fn((entityType, id) => {
      if (entityType === "FinanceAccount" && id === "AC-001") {
        return {
          rowIndex: 2,
          sheet: {
            getRange: jest.fn(() => ({ setValue: jest.fn() })),
          },
          values: [0, 0, 0, balance, pending, reserved, activeStatus, "", ""],
        };
      }
      return null;
    });
    var balance = 0,
      pending = 0,
      reserved = 0,
      activeStatus = "ACTIVE";
  });

  var sharedSetValue = jest.fn();
  function makeLoadRow(currentBalance, pendingIncome, reservedPayouts, status) {
    status = status || "ACTIVE";
    sharedSetValue = jest.fn();
    realEngine._loadRow = jest.fn((entityType, id) => {
      if (entityType === "FinanceAccount" && id === "AC-001") {
        return {
          rowIndex: 2,
          sheet: {
            getRange: jest.fn(() => ({ setValue: sharedSetValue })),
          },
          values: [
            "AC-001",
            "Main",
            10_000,
            currentBalance,
            pendingIncome,
            reservedPayouts,
            status,
            "2026-07-01",
            "",
          ],
        };
      }
      return null;
    });
  }

  it("should increase current_balance for income direction", () => {
    makeLoadRow(1000, 500, 0);
    realEngine._postToAccountBalance("AC-001", 200, "income");
    var sheet = realEngine._loadRow.mock.results[0].value.sheet;
    expect(sheet.getRange).toHaveBeenCalledWith(
      2,
      global.COLS.FinanceAccounts.current_balance
    );
    expect(sharedSetValue).toHaveBeenCalledWith(1200);
  });

  it("should decrease current_balance for payout direction", () => {
    makeLoadRow(1000, 0, 300);
    realEngine._postToAccountBalance("AC-001", 150, "payout");
    var sheet = realEngine._loadRow.mock.results[0].value.sheet;
    expect(sheet.getRange).toHaveBeenCalledWith(
      2,
      global.COLS.FinanceAccounts.current_balance
    );
    expect(sharedSetValue).toHaveBeenCalledWith(850);
  });

  it("should decrease reserved_payouts for payout direction", () => {
    makeLoadRow(1000, 0, 500);
    realEngine._postToAccountBalance("AC-001", 200, "payout");
    var sheet = realEngine._loadRow.mock.results[0].value.sheet;
    expect(sheet.getRange).toHaveBeenCalledWith(
      2,
      global.COLS.FinanceAccounts.reserved_payouts
    );
    expect(sharedSetValue).toHaveBeenCalledWith(300);
  });

  it("should increase pending_income for pending_income_add", () => {
    makeLoadRow(1000, 100, 0);
    realEngine._postToAccountBalance("AC-001", 50, "pending_income_add");
    var sheet = realEngine._loadRow.mock.results[0].value.sheet;
    expect(sheet.getRange).toHaveBeenCalledWith(
      2,
      global.COLS.FinanceAccounts.pending_income
    );
    expect(sharedSetValue).toHaveBeenCalledWith(150);
  });

  it("should decrease pending_income for pending_income_sub", () => {
    makeLoadRow(1000, 200, 0);
    realEngine._postToAccountBalance("AC-001", 50, "pending_income_sub");
    expect(sharedSetValue).toHaveBeenCalledWith(150);
  });

  it("should increase current_balance for adjustment_credit", () => {
    makeLoadRow(1000, 0, 0);
    realEngine._postToAccountBalance("AC-001", 300, "adjustment_credit");
    expect(sharedSetValue).toHaveBeenCalledWith(1300);
  });

  it("should decrease current_balance for adjustment_debit", () => {
    makeLoadRow(1000, 0, 0);
    realEngine._postToAccountBalance("AC-001", 100, "adjustment_debit");
    expect(sharedSetValue).toHaveBeenCalledWith(900);
  });

  it("should post for inactive account (no caller-level check in _postToAccountBalance)", () => {
    makeLoadRow(1000, 0, 0, "INACTIVE");
    realEngine._postToAccountBalance("AC-001", 100, "income");
    expect(sharedSetValue).toHaveBeenCalledWith(1100);
  });

  it("should return silently for nonexistent account", () => {
    realEngine._loadRow = jest.fn(() => null);
    var result = realEngine._postToAccountBalance("AC-NONEXIST", 100, "income");
    expect(result).toBeUndefined();
  });
});

describe("Engine._computeEffectiveBalance", () => {
  it("should return current_balance + pending_income - reserved_payouts", () => {
    realEngine._loadRow = jest.fn((entityType, id) => {
      if (entityType === "FinanceAccount" && id === "AC-001") {
        return {
          rowIndex: 2,
          sheet: {},
          values: ["AC-001", "Main", 10_000, 1000, 500, 300, "ACTIVE", "", ""],
        };
      }
      return null;
    });
    var result = realEngine._computeEffectiveBalance("AC-001");
    expect(result).toBe(1200);
  });

  it("should handle zero values", () => {
    realEngine._loadRow = jest.fn((entityType, id) => {
      if (entityType === "FinanceAccount" && id === "AC-002") {
        return {
          rowIndex: 2,
          sheet: {},
          values: ["AC-002", "Empty", 0, 0, 0, 0, "ACTIVE", "", ""],
        };
      }
      return null;
    });
    expect(realEngine._computeEffectiveBalance("AC-002")).toBe(0);
  });

  it("should return 0 for nonexistent account", () => {
    realEngine._loadRow = jest.fn(() => null);
    expect(realEngine._computeEffectiveBalance("AC-NOPE")).toBe(0);
  });
});

describe("Engine.confirmIncome", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    realEngine._postToAccountBalance = jest.fn();
    realEngine._loadActor = jest.fn(() => ({
      displayName: "Treasurer",
      role: "TREASURER",
    }));
    realEngine._loadRow = jest.fn((entityType, id) => {
      if (entityType === "Income" && id === "INC-001") {
        return {
          rowIndex: 3,
          sheet: { getRange: jest.fn(() => ({ setValue: jest.fn() })) },
          values: [
            "INC-001",
            "2026-07-20",
            "CAT-001",
            500,
            "U-001",
            "Tickets",
            "",
            "",
            "AC-001",
            "PENDING",
            "",
            "",
            "",
            "",
          ],
        };
      }
      if (entityType === "FinanceAccount" && id === "AC-001") {
        return {
          rowIndex: 2,
          sheet: { getRange: jest.fn(() => ({ setValue: jest.fn() })) },
          values: ["AC-001", "Main", 10_000, 1000, 500, 0, "ACTIVE", "", ""],
        };
      }
      return null;
    });
  });

  it("should confirm PENDING income and post to balance", () => {
    var result = realEngine.confirmIncome("INC-001", "AC-001", "U-002");
    expect(result.ok).toBe(true);
    expect(realEngine._postToAccountBalance).toHaveBeenCalledWith(
      "AC-001",
      500,
      "income"
    );
  });

  it("should reject already-processed income (idempotent return)", () => {
    realEngine._loadRow = jest.fn((entityType, id) => {
      if (entityType === "Income" && id === "INC-001") {
        return {
          rowIndex: 3,
          sheet: { getRange: jest.fn(() => ({ setValue: jest.fn() })) },
          values: [
            "INC-001",
            "2026-07-20",
            "CAT-001",
            500,
            "U-001",
            "Tickets",
            "",
            "",
            "AC-001",
            "CONFIRMED",
            "U-002",
            "2026-07-22",
            "",
            "",
          ],
        };
      }
      return null;
    });
    var result = realEngine.confirmIncome("INC-001", "AC-001", "U-002");
    expect(result.ok).toBe(true);
  });

  it("should reject non-PENDING income", () => {
    realEngine._loadRow = jest.fn((entityType, id) => {
      if (entityType === "Income" && id === "INC-001") {
        return {
          rowIndex: 3,
          sheet: {},
          values: [
            "INC-001",
            "2026-07-20",
            "CAT-001",
            500,
            "U-001",
            "",
            "",
            "",
            "AC-001",
            "REJECTED",
            "U-001",
            "2026-07-22",
            "",
            "",
          ],
        };
      }
      return null;
    });
    var result = realEngine.confirmIncome("INC-001", "AC-001", "U-002");
    expect(result.ok).toBe(false);
  });

  it("should require TREASURER role", () => {
    realEngine._loadActor = jest.fn(() => ({
      displayName: "Committee",
      role: "COMMITTEE",
    }));
    var result = realEngine.confirmIncome("INC-001", "AC-001", "U-001");
    expect(result.ok).toBe(false);
  });
});

describe("Engine.adjustAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    realEngine._postToAccountBalance = jest.fn();
    realEngine._loadActor = jest.fn(() => ({
      displayName: "Treasurer",
      role: "TREASURER",
    }));
    realEngine._loadRow = jest.fn((entityType, id) => {
      if (entityType === "FinanceAccount" && id === "AC-001") {
        return {
          rowIndex: 2,
          sheet: { getRange: jest.fn(() => ({ setValue: jest.fn() })) },
          values: ["AC-001", "Main", 10_000, 1000, 0, 0, "ACTIVE", "", ""],
        };
      }
      return null;
    });
  });

  it("should post credit adjustment and append row", () => {
    global.getSheet_ = jest.fn(() => ({
      appendRow: jest.fn(),
      getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
      getLastRow: () => 1,
      getMaxRows: () => 10,
      getRange: jest.fn(() => ({
        getValues: jest.fn(() => [[""]]),
        setValues: jest.fn(),
      })),
      insertRowAfter: jest.fn(),
    }));
    global.Ids = { nextId: jest.fn(() => "ADJ-001") };
    var result = realEngine.adjustAccount(
      "AC-001",
      200,
      "CREDIT",
      "Fix balance",
      "U-002"
    );
    expect(result.ok).toBe(true);
    expect(realEngine._postToAccountBalance).toHaveBeenCalledWith(
      "AC-001",
      200,
      "adjustment_credit"
    );
  });

  it("should post debit adjustment", () => {
    global.getSheet_ = jest.fn(() => ({
      appendRow: jest.fn(),
      getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
      getLastRow: () => 1,
      getMaxRows: () => 10,
      getRange: jest.fn(() => ({
        getValues: jest.fn(() => [[""]]),
        setValues: jest.fn(),
      })),
      insertRowAfter: jest.fn(),
    }));
    global.Ids = { nextId: jest.fn(() => "ADJ-002") };

    realEngine.adjustAccount("AC-001", 100, "DEBIT", "Remove funds", "U-002");
    expect(realEngine._postToAccountBalance).toHaveBeenCalledWith(
      "AC-001",
      100,
      "adjustment_debit"
    );
  });

  it("should reject non-treasurer", () => {
    realEngine._loadActor = jest.fn(() => ({
      displayName: "Committee",
      role: "COMMITTEE",
    }));
    var result = realEngine.adjustAccount(
      "AC-001",
      100,
      "CREDIT",
      "Test",
      "U-001"
    );
    expect(result.ok).toBe(false);
  });
});

describe("Engine.transferBetweenAccounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    realEngine._postToAccountBalance = jest.fn();
    realEngine._loadActor = jest.fn(() => ({
      displayName: "Treasurer",
      role: "TREASURER",
    }));
    realEngine._loadRow = jest.fn((entityType, id) => {
      if (entityType === "FinanceAccount" && id === "AC-001") {
        return {
          rowIndex: 2,
          sheet: { getRange: jest.fn(() => ({ setValue: jest.fn() })) },
          values: ["AC-001", "Main", 10_000, 1000, 0, 0, "ACTIVE", "", ""],
        };
      }
      if (entityType === "FinanceAccount" && id === "AC-002") {
        return {
          rowIndex: 3,
          sheet: { getRange: jest.fn(() => ({ setValue: jest.fn() })) },
          values: ["AC-002", "Savings", 5000, 500, 0, 0, "ACTIVE", "", ""],
        };
      }
      return null;
    });
  });

  it("should debit sender and credit receiver and append row", () => {
    global.getSheet_ = jest.fn(() => ({
      appendRow: jest.fn(),
      getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
      getLastRow: () => 1,
      getMaxRows: () => 10,
      getRange: jest.fn(() => ({
        getValues: jest.fn(() => [[""]]),
        setValues: jest.fn(),
      })),
      insertRowAfter: jest.fn(),
    }));
    global.Ids = { nextId: jest.fn(() => "TRF-001") };

    var result = realEngine.transferBetweenAccounts(
      "AC-001",
      "AC-002",
      300,
      "Reallocate",
      "U-002"
    );
    expect(result.ok).toBe(true);
    expect(realEngine._postToAccountBalance).toHaveBeenCalledWith(
      "AC-001",
      300,
      "adjustment_debit"
    );
    expect(realEngine._postToAccountBalance).toHaveBeenCalledWith(
      "AC-002",
      300,
      "adjustment_credit"
    );
  });

  it("should reject non-treasurer", () => {
    realEngine._loadActor = jest.fn(() => ({ role: "COMMITTEE" }));
    var result = realEngine.transferBetweenAccounts(
      "AC-001",
      "AC-002",
      100,
      "Test",
      "U-001"
    );
    expect(result.ok).toBe(false);
  });
});

describe("Engine._alreadyProcessedIncome", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true when uuid matches", () => {
    var sheet = {
      getDataRange: jest.fn(() => ({
        getValues: () => [
          [
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
          ],
          [
            "INC-001",
            "2026-07-20",
            "CAT-001",
            500,
            "U-001",
            "",
            "",
            "",
            "",
            "PENDING",
            "",
            "",
            "",
            "uuid-123",
          ],
        ],
      })),
      getLastRow: () => 2,
    };
    global.getSheet_ = jest.fn(() => sheet);
    var result = realEngine._alreadyProcessedIncome("uuid-123");
    expect(result).toBe(true);
  });

  it("should return false when no uuid matches", () => {
    var sheet = {
      getDataRange: jest.fn(() => ({
        getValues: () => [
          [
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
          ],
        ],
      })),
      getLastRow: () => 1,
    };
    global.getSheet_ = jest.fn(() => sheet);
    var result = realEngine._alreadyProcessedIncome("uuid-999");
    expect(result).toBe(false);
  });
});

describe("Engine._findIncomeByUuid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should find income by uuid and return income_id", () => {
    var sheet = {
      getDataRange: jest.fn(() => ({
        getValues: () => [
          [
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
          ],
          [
            "INC-001",
            "2026-07-20",
            "CAT-001",
            500,
            "U-001",
            "",
            "",
            "",
            "",
            "PENDING",
            "",
            "",
            "",
            "uuid-123",
          ],
        ],
      })),
      getLastRow: () => 2,
    };
    global.getSheet_ = jest.fn(() => sheet);
    var result = realEngine._findIncomeByUuid("uuid-123");
    expect(result).toBe("INC-001");
  });

  it("should return null when no match", () => {
    var sheet = {
      getDataRange: jest.fn(() => ({
        getValues: () => [
          [
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
          ],
        ],
      })),
      getLastRow: () => 1,
    };
    global.getSheet_ = jest.fn(() => sheet);
    var result = realEngine._findIncomeByUuid("uuid-999");
    expect(result).toBeNull();
  });
});
