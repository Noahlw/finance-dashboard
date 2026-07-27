"use strict";
global.Session = {
  getActiveUser: jest.fn(() => ({
    getEmail: jest.fn(() => "test@example.com"),
  })),
};
global.getSheet_ = jest.fn();
global.getVaultSheet_ = jest.fn();
global.Engine = {
  _findRowsByColumn: jest.fn(),
};
global.TABS = {
  ACCOUNT_ADJUSTMENTS: "AccountAdjustments",
  ACCOUNT_TRANSFERS: "AccountTransfers",
  BUDGET_REQUEST_LINES: "BudgetRequestLines",
  BUDGET_REQUESTS: "BudgetRequests",
  CLAIM_LINE_ITEMS: "ClaimLineItems",
  COUNTERS: "Counters",
  EVENTS: "Events",
  EXPENSE_CLAIMS: "ExpenseClaims",
  FINANCE_ACCOUNTS: "FinanceAccounts",
  INCOME: "Income",
  PAYOUTS: "Payouts",
  RECEIPTS: "Receipts",
  USERS: "Users",
  VAULT: "Vault",
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
  BudgetRequests: {
    decided_at: 9,
    decided_by: 10,
    decision_note: 11,
    event_id: 3,
    justification: 5,
    needed_by: 6,
    processed_response_id: 13,
    request_id: 1,
    requester_id: 2,
    self_approved: 12,
    status: 7,
    submitted_at: 8,
    title: 4,
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
  Counters: { entity: 1, last_n: 2 },
  Events: {
    closed_at: 7,
    created_at: 5,
    event_id: 1,
    name: 2,
    owner_user_id: 4,
    semester: 3,
    status: 6,
  },
  ExpenseClaims: {
    claim_id: 1,
    claimant_id: 2,
    created_by: 16,
    event_id: 19,
    expense_date: 17,
    notes: 14,
    payout_handle: 21,
    payout_method: 20,
    processed_response_id: 15,
    semester: 18,
    status: 3,
    submitted_at: 4,
    total_amount: 11,
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
    received_by: 5,
    source_ref: 6,
    status: 10,
  },
  Payouts: {
    account_id: 11,
    amount: 4,
    claim_id: 2,
    confirmed_at: 10,
    failure_reason: 12,
    method: 5,
    paid_at: 9,
    paid_by: 7,
    parent_payout_id: 13,
    payee_user_id: 3,
    payout_id: 1,
    status: 8,
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
  Vault: {
    consent_ts: 6,
    full_name: 2,
    payout_handle: 5,
    payout_method: 4,
    student_id: 3,
    user_id: 1,
  },
};
global.STATUS = {
  BudgetRequest: {
    APPROVED: "APPROVED",
    CLOSED: "CLOSED",
    DRAFT: "DRAFT",
    NEEDS_INFO: "NEEDS_INFO",
    PARTIALLY_APPROVED: "PARTIALLY_APPROVED",
    PENDING: "PENDING",
    REJECTED: "REJECTED",
    WITHDRAWN: "WITHDRAWN",
  },
  BudgetRequestLine: {
    APPROVED: "APPROVED",
    PENDING: "PENDING",
    REDUCED: "REDUCED",
    REJECTED: "REJECTED",
  },
  Event: {
    CLOSED: "CLOSED",
    OPEN: "OPEN",
  },
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
global.PAYOUT_METHOD = {
  FPS: "FPS",
  OTHER: "OTHER",
  PAYME: "PAYME",
};
global.Discord = { postStatus: jest.fn() };
global.Audit = {
  _nowIso: jest.fn(() => "2026-07-21T12:00:00Z"),
  append: jest.fn(),
};
global.Ids = {
  childId: jest.fn(() => "BUDGETLINE-26A-001-01"),
  nextId: jest.fn(() => "BUDGET-26A-001"),
};
global.Payouts = {
  markPayoutSent: jest.fn(() => ({ ok: true })),
  recordPayoutFailed: jest.fn(() => ({ ok: true })),
  retryPayout: jest.fn(() => ({
    newPayoutId: "PAYOUT-002",
    ok: true,
  })),
};
global.Utilities = {
  base64Decode: jest.fn(() => [116, 101, 115, 116, 32, 98, 121, 116, 101, 115]),
  computeDigest: jest.fn(() => [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
  ]),
  newBlob: jest.fn(() => ({ setName: jest.fn() })),
};
global.DriveApp = {
  getFolderById: jest.fn(() => ({
    createFile: jest.fn(() => ({ getId: () => "drive-file-123" })),
  })),
};
global.PropertiesService = {
  getScriptProperties: jest.fn(() => ({
    getProperty: jest.fn(() => "RECEIPTS-FOLDER-123"),
  })),
};
global.LockService = {
  getScriptLock: jest.fn(() => {
    const lock = {
      releaseLock: jest.fn(),
      tryLock: jest.fn(() => true),
      waitLock: jest.fn(() => true),
    };
    return lock;
  }),
};
global.Engine._loadRow = jest.fn();
global.Engine._loadActor = jest.fn(() => ({
  displayName: "Test User",
  role: "COMMITTEE",
}));
global.Engine._sumBudgetRequestLines = jest.fn(() => 0);
global.Engine._sumClaimLineItems = jest.fn(() => 0);
global.Engine._computeEffectiveBalance = jest.fn(() => 0);
global.Engine.recordIncome = jest.fn(() => ({ incomeId: "INC-001", ok: true }));
global.Engine.confirmIncome = jest.fn(() => ({
  accountId: "AC-001",
  ok: true,
}));
global.Engine.rejectIncome = jest.fn(() => ({ ok: true }));
global.Engine.requestIncomeInfo = jest.fn(() => ({ ok: true }));
global.Engine.adjustAccount = jest.fn(() => ({
  adjustmentId: "ADJ-001",
  ok: true,
}));
global.Engine.transferBetweenAccounts = jest.fn(() => ({
  ok: true,
  transferId: "TRF-001",
}));
global.Engine.transition = jest.fn(
  (_entityType, _entityId, _action, _actorUserId, _payload) => ({
    from: "DRAFT",
    ok: true,
    selfApproved: false,
    to: "PENDING",
  })
);
describe("additional authorization scenarios", () => {
  it("should deny api_saveBudgetRequestDraft for an active operator modifying another user's draft", () => {
    global.Session.getActiveUser.mockReturnValueOnce({
      getEmail: () => "attacker@example.com",
    });
    global.getSheet_.mockImplementationOnce((name) => {
      if (name === "Users") {
        return {
          getDataRange: () => ({
            getValues: () => [
              [
                "user_id",
                "display_name",
                "role",
                "email",
                "active",
                "created_at",
              ],
              [
                "U-ATTACKER",
                "Attacker",
                "COMMITTEE",
                "attacker@example.com",
                true,
                "2026-01-01",
              ],
            ],
          }),
        };
      }
      return {
        appendRow: jest.fn(),
        getDataRange: jest.fn(() => ({ getValues: jest.fn(() => [[]]) })),
        getLastRow: jest.fn(() => 1),
        getMaxRows: jest.fn(() => 100),
        getRange: jest.fn(() => ({
          getValues: () => [[]],
          setValue: jest.fn(),
          setValues: jest.fn(),
        })),
      };
    });
    const api = require("../Api.js");
    global.Engine._loadRow.mockReturnValueOnce({
      values: [
        "BUDGET-999",
        "U-VICTIM",
        "DRAFT",
        "Victim Title",
        100,
        100,
        "2026-01-01",
      ],
    });
    const result = api.api_saveBudgetRequestDraft({
      request_id: "BUDGET-999",
      title: "Hacked Title",
    });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("AUTH_DENIED");
  });

  it("should deny api_getPendingBudgetRequests for an inactive Treasurer user", () => {
    global.Session.getActiveUser.mockReturnValueOnce({
      getEmail: () => "inactive@example.com",
    });
    global.getSheet_.mockImplementationOnce((name) => {
      if (name === "Users") {
        return {
          getDataRange: () => ({
            getValues: () => [
              [
                "user_id",
                "display_name",
                "role",
                "email",
                "active",
                "created_at",
              ],
              [
                "U-INACTIVE",
                "Inactive",
                "TREASURER",
                "inactive@example.com",
                false,
                "2026-01-01",
              ],
            ],
          }),
        };
      }
      return { getDataRange: () => ({ getValues: () => [[]] }) };
    });
    const api = require("../Api.js");
    const result = api.api_getPendingBudgetRequests();
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("AUTH_DENIED");
  });

  it("should deny api_uploadReceipt for a Member role user", () => {
    global.Session.getActiveUser.mockReturnValueOnce({
      getEmail: () => "member@example.com",
    });
    global.getSheet_.mockImplementationOnce((name) => {
      if (name === "Users") {
        return {
          getDataRange: () => ({
            getValues: () => [
              [
                "user_id",
                "display_name",
                "role",
                "email",
                "active",
                "created_at",
              ],
              [
                "U-MEMBER",
                "Member User",
                "MEMBER",
                "member@example.com",
                true,
                "2026-01-01",
              ],
            ],
          }),
        };
      }
      return { getDataRange: () => ({ getValues: () => [[]] }) };
    });
    const api = require("../Api.js");
    const result = api.api_uploadReceipt("file.png", "image/png", "bytes");
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("AUTH_DENIED");
  });
});
const { api_getMyClaims } = require("../Api.js");
global.getSheet_ = jest.fn();
describe("Api.js", () => {
  const testUserEmail = "test@example.com";
  const testUserId = "U-001";

  beforeEach(() => {
    jest.clearAllMocks();
    global.Engine.transition.mockReset();
    global.Engine.transition.mockImplementation(() => ({
      from: "DRAFT",
      ok: true,
      selfApproved: false,
      to: "PENDING",
    }));
    global.Engine._loadRow.mockImplementation((entityType) => {
      if (entityType !== "BudgetRequestLine") {
        return null;
      }
      const values = [];
      values[global.COLS.BudgetRequestLines.line_status - 1] = "APPROVED";
      return { rowIndex: 2, values };
    });
    // Shared mocks for all tests
    global.Session.getActiveUser.mockReturnValue({
      getEmail: () => testUserEmail,
    });
    global.Audit = {
      _nowIso: jest.fn(() => "2026-07-21T12:00:00Z"),
      append: jest.fn(),
    };
    global.Ids = {
      childId: jest.fn(() => "BUDGETLINE-26A-001-01"),
      nextId: jest.fn(() => "BUDGET-26A-001"),
    };
    global.Utilities = {
      base64Decode: jest.fn(() => [
        116, 101, 115, 116, 32, 98, 121, 116, 101, 115,
      ]),
      computeDigest: jest.fn(() => [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
      ]),
      DigestAlgorithm: { SHA_256: "SHA_256" },
      newBlob: jest.fn(() => ({ setName: jest.fn() })),
    };
    global.DriveApp = {
      getFolderById: jest.fn(() => ({
        createFile: jest.fn(() => ({ getId: () => "drive-file-123" })),
      })),
    };
    global.PropertiesService = {
      getScriptProperties: jest.fn(() => ({
        getProperty: jest.fn(() => "RECEIPTS-FOLDER-123"),
      })),
    };
    global.getVaultSheet_ = jest.fn(() => ({
      appendRow: jest.fn(),
      getDataRange: () => ({
        getValues: () => [
          [
            "user_id",
            "full_name",
            "student_id",
            "payout_method",
            "payout_handle",
            "consent_ts",
          ],
          ["M-001", "Alice", "12345678", "FPS", "91234567", "2026-01-01"],
          ["MEMBER-001", "Bob", "87654321", "FPS", "98887766", "2026-01-01"],
          ["USER-1", "Charlie", "11111111", "FPS", "90000000", "2026-01-01"],
          ["U-001", "Test User", "22222222", "FPS", "91111111", "2026-01-01"],
        ],
      }),
      getLastRow: () => 5,
      getRange: jest.fn(() => ({
        setNumberFormat: jest.fn().mockReturnThis(),
        setValue: jest.fn(),
      })),
    }));
    const mockUsersData = [
      ["user_id", "display_name", "role", "email", "active", "created_at"],
      [testUserId, "Test User", "COMMITTEE", testUserEmail, true, "2026-01-01"],
      ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
      ["MEMBER-001", "Bob", "MEMBER", "", true, "2026-01-01"],
      ["USER-1", "Charlie", "MEMBER", "", true, "2026-01-01"],
    ];
    global.getSheet_.mockImplementation((name) => {
      if (name === global.TABS.USERS) {
        return { getDataRange: () => ({ getValues: () => mockUsersData }) };
      }
      return {
        appendRow: jest.fn(),
        getDataRange: jest.fn(() => ({ getValues: jest.fn(() => [[]]) })),
        getLastRow: jest.fn(() => 1),
        getMaxRows: jest.fn(() => 100),
        getRange: jest.fn(() => ({
          getValues: jest.fn(() => [[]]),
          setValue: jest.fn(),
          setValues: jest.fn(),
        })),
        name,
      };
    });
  });

  describe("api_resolveSession", () => {
    it("should allow COMMITTEE role with claims and budget-requests views", () => {
      const { api_resolveSession } = require("../Api.js");
      const result = api_resolveSession();
      expect(result.allowed).toBe(true);
      expect(result.role).toBe("COMMITTEE");
      expect(result.user_id).toBe("U-001");
      expect(result.display_name).toBe("Test User");
      expect(result.views).toEqual([
        "review",
        "claims",
        "members",
        "budget-requests",
      ]);
    });

    it("should allow TREASURER role with all views", () => {
      global.getSheet_.mockImplementationOnce((name) => {
        if (name === global.TABS.USERS) {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer User",
                  "TREASURER",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return {
          appendRow: jest.fn(),
          getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
          getLastRow: jest.fn(() => 1),
          getRange: jest.fn(),
          name,
        };
      });
      const { api_resolveSession } = require("../Api.js");
      const result = api_resolveSession();
      expect(result.allowed).toBe(true);
      expect(result.role).toBe("TREASURER");
      expect(result.views).toEqual([
        "review",
        "claims",
        "members",
        "budget-requests",
        "income",
        "payouts",
        "reports",
        "reconciliation",
      ]);
    });

    it("should deny unknown user", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "unknown@example.com",
      });
      const { api_resolveSession } = require("../Api.js");
      const result = api_resolveSession();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("unknown_user");
    });

    it("should deny MEMBER role", () => {
      global.getSheet_.mockImplementationOnce((name) => {
        if (name === global.TABS.USERS) {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-003",
                  "Member User",
                  "MEMBER",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return {
          appendRow: jest.fn(),
          getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
          getLastRow: jest.fn(() => 1),
          getRange: jest.fn(),
          name,
        };
      });
      const { api_resolveSession } = require("../Api.js");
      const result = api_resolveSession();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("unauthorized_role");
    });

    it("should deny ADVISOR_AUDITOR role", () => {
      global.getSheet_.mockImplementationOnce((name) => {
        if (name === global.TABS.USERS) {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-010",
                  "Advisor",
                  "ADVISOR_AUDITOR",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return {
          appendRow: jest.fn(),
          getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
          getLastRow: jest.fn(() => 1),
          getRange: jest.fn(),
          name,
        };
      });
      const { api_resolveSession } = require("../Api.js");
      const result = api_resolveSession();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("unauthorized_role");
    });

    it("should deny inactive user", () => {
      global.getSheet_.mockImplementationOnce((name) => {
        if (name === global.TABS.USERS) {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-004",
                  "Inactive User",
                  "COMMITTEE",
                  "test@example.com",
                  false,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return {
          appendRow: jest.fn(),
          getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
          getLastRow: jest.fn(() => 1),
          getRange: jest.fn(),
          name,
        };
      });
      const { api_resolveSession } = require("../Api.js");
      const result = api_resolveSession();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("inactive_user");
    });

    it("should deny no session email", () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => "" });
      const { api_resolveSession } = require("../Api.js");
      const result = api_resolveSession();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("no_session");
    });
  });

  describe("api_getMyBudgetRequests", () => {
    it("should return empty array for unknown user", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "unknown@example.com",
      });
      const { api_getMyBudgetRequests } = require("../Api.js");
      const { data: result } = api_getMyBudgetRequests();
      expect(result).toEqual([]);
    });

    it("should return requests with lines for current user", () => {
      const findCalls = [];
      global.Engine._findRowsByColumn.mockImplementation(
        (_sheet, colIndex, matchValue) => {
          findCalls.push({ colIndex, matchValue });
          if (findCalls.length === 1) {
            return [
              {
                values: [
                  "BUDGET-26A-001",
                  "U-001",
                  "",
                  "Test Request",
                  "Justification",
                  "2026-08-01",
                  "PENDING",
                  "2026-07-21",
                  "",
                  "",
                  "",
                  false,
                  "",
                ],
              },
            ];
          }
          return [
            {
              values: [
                "BUDGETLINE-26A-001-01",
                "BUDGET-26A-001",
                "CAT-1",
                "First line",
                500,
                0,
                "PENDING",
                0,
                500,
              ],
            },
          ];
        }
      );
      const { api_getMyBudgetRequests } = require("../Api.js");
      const { data: result } = api_getMyBudgetRequests();
      expect(result.length).toBe(1);
      expect(result[0].title).toBe("Test Request");
      expect(result[0].lines.length).toBe(1);
      expect(result[0].lines[0].requested_amount).toBe(500);
    });
  });

  describe("api_saveBudgetRequestDraft", () => {
    it("should create a new draft", () => {
      global.Ids.nextId.mockReturnValueOnce("BUDGET-26A-010");
      const sheetCalls = [];
      global.getSheet_.mockImplementation((name) => {
        sheetCalls.push(name);
        if (name === global.TABS.USERS) {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return {
          appendRow: jest.fn(),
          getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
          getLastRow: jest.fn(() => 1),
          getMaxRows: jest.fn(() => 10),
          getRange: jest.fn(() => ({
            getValues: jest.fn(() => [[""]]),
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
          insertRowAfter: jest.fn(),
          name,
        };
      });
      const { api_saveBudgetRequestDraft } = require("../Api.js");
      const { data: result } = api_saveBudgetRequestDraft({
        justification: "For event",
        lines: [{ description: "Food", requested_amount: 300 }],
        needed_by: "2026-08-15",
        title: "New Budget",
        uuid: "uuid-1",
      });
      expect(result.request_id).toBe("BUDGET-26A-010");
    });

    it("should throw when editing non-draft request", () => {
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 3,
        status: "APPROVED",
        values: [
          "BUDGET-26A-001",
          "U-001",
          "",
          "Test",
          "",
          "2026-08-01",
          "APPROVED",
          "",
          "",
          "",
          "",
          false,
          "",
        ],
      });
      const { api_saveBudgetRequestDraft } = require("../Api.js");
      const result = api_saveBudgetRequestDraft({
        request_id: "BUDGET-26A-001",
        title: "Hack",
      });
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain(
        "Cannot edit a APPROVED budget request"
      );
    });

    it("should deny updating another requester's draft", () => {
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 3,
        values: ["BUDGET-26A-001", "U-OTHER", "", "Test", "", "", "DRAFT"],
      });
      const { api_saveBudgetRequestDraft } = require("../Api.js");

      const result = api_saveBudgetRequestDraft({
        request_id: "BUDGET-26A-001",
        title: "Unauthorized edit",
      });

      expect(result).toEqual(
        expect.objectContaining({
          error: expect.objectContaining({ code: "AUTH_DENIED" }),
          ok: false,
        })
      );
    });
  });

  describe("api_submitBudgetRequest", () => {
    it("should submit a DRAFT request to PENDING", () => {
      global.Engine._loadRow.mockReset();
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: [
          "BUDGET-26A-001",
          "U-001",
          "",
          "Test",
          "",
          "2026-08-01",
          "DRAFT",
          "",
          "",
          "",
          "",
          false,
          "",
        ],
      });
      const { api_submitBudgetRequest } = require("../Api.js");
      const { data: result } = api_submitBudgetRequest("BUDGET-26A-001");
      expect(result.status).toBe("PENDING");
      expect(global.Engine.transition).toHaveBeenCalledWith(
        "BudgetRequest",
        "BUDGET-26A-001",
        "SUBMIT",
        "U-001",
        {}
      );
    });

    it("should resubmit a NEEDS_INFO request", () => {
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: [
          "BUDGET-26A-001",
          "U-001",
          "",
          "Test",
          "",
          "2026-08-01",
          "NEEDS_INFO",
          "",
          "",
          "",
          "",
          false,
          "",
        ],
      });
      global.Engine.transition.mockReturnValueOnce({
        from: "NEEDS_INFO",
        ok: true,
        to: "PENDING",
      });
      const { api_submitBudgetRequest } = require("../Api.js");
      const { data: result } = api_submitBudgetRequest("BUDGET-26A-001");
      expect(result.status).toBe("PENDING");
      expect(global.Engine.transition).toHaveBeenCalledWith(
        "BudgetRequest",
        "BUDGET-26A-001",
        "RESUBMIT",
        "U-001",
        {}
      );
    });

    it("should deny submitting another requester's request", () => {
      global.Engine._loadRow.mockReset();
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: ["BUDGET-26A-001", "U-OTHER", "", "Test", "", "", "DRAFT"],
      });
      const { api_submitBudgetRequest } = require("../Api.js");

      const result = api_submitBudgetRequest("BUDGET-26A-001");

      expect(result).toEqual(
        expect.objectContaining({
          error: expect.objectContaining({ code: "AUTH_DENIED" }),
          ok: false,
        })
      );
      expect(global.Engine.transition).not.toHaveBeenCalled();
    });
  });

  describe("api_discardBudgetRequest", () => {
    it("should withdraw a DRAFT request", () => {
      global.Engine._loadRow.mockReset();
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: ["BUDGET-26A-001", "U-001", "", "Test", "", "", "DRAFT"],
      });
      global.Engine.transition.mockReturnValueOnce({
        from: "DRAFT",
        ok: true,
        to: "WITHDRAWN",
      });
      const { api_discardBudgetRequest } = require("../Api.js");
      const { data: result } = api_discardBudgetRequest("BUDGET-26A-001");
      expect(result.status).toBe("WITHDRAWN");
    });

    it("should deny discarding another requester's request", () => {
      global.Engine._loadRow.mockReset();
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: ["BUDGET-26A-001", "U-OTHER", "", "Test", "", "", "DRAFT"],
      });
      const { api_discardBudgetRequest } = require("../Api.js");

      const result = api_discardBudgetRequest("BUDGET-26A-001");

      expect(result).toEqual(
        expect.objectContaining({
          error: expect.objectContaining({ code: "AUTH_DENIED" }),
          ok: false,
        })
      );
      expect(global.Engine.transition).not.toHaveBeenCalled();
    });
  });

  describe("api_getPendingBudgetRequests", () => {
    it("should throw if user is not treasurer", () => {
      const { api_getPendingBudgetRequests } = require("../Api.js");
      const result = api_getPendingBudgetRequests();
      expect(result.ok).toBe(false);
      expect(result.error.message).toBe("Access denied");
    });

    it("should return pending requests for treasurer", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.getSheet_.mockImplementationOnce((name) => {
        if (name === global.TABS.USERS) {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return {
          getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
          name,
        };
      });
      global.getSheet_.mockImplementationOnce((name) => {
        if (name === global.TABS.BUDGET_REQUESTS) {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "request_id",
                  "requester_id",
                  "event_id",
                  "title",
                  "justification",
                  "needed_by",
                  "status",
                  "submitted_at",
                ],
                [
                  "BUDGET-26A-001",
                  "U-001",
                  "",
                  "Pending Request",
                  "Justification",
                  "2026-08-01",
                  "PENDING",
                  "2026-07-21",
                ],
              ],
            }),
          };
        }
        return {
          getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
          name,
        };
      });
      global.Engine._sumBudgetRequestLines.mockReturnValueOnce(500);
      const { api_getPendingBudgetRequests } = require("../Api.js");
      const { data: result } = api_getPendingBudgetRequests();
      expect(result.length).toBe(1);
      expect(result[0].title).toBe("Pending Request");
      expect(result[0].total_requested).toBe(500);
    });
  });

  describe("api_decisionBudgetRequest", () => {
    it("should throw if user is not treasurer", () => {
      const { api_decisionBudgetRequest } = require("../Api.js");
      const result = api_decisionBudgetRequest("BUDGET-26A-001", "APPROVE", {});
      expect(result.ok).toBe(false);
      expect(result.error.message).toBe("Access denied");
    });

    it("should approve a pending request", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.getSheet_.mockImplementationOnce((name) => {
        if (name === global.TABS.USERS) {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return {
          getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
          name,
        };
      });
      global.Engine.transition.mockReturnValueOnce({
        from: "PENDING",
        ok: true,
        to: "APPROVED",
      });
      const { api_decisionBudgetRequest } = require("../Api.js");
      const { data: result } = api_decisionBudgetRequest(
        "BUDGET-26A-001",
        "APPROVE",
        {
          decision_note: "Looks good",
        }
      );
      expect(result.to).toBe("APPROVED");
    });
  });

  describe("authorization hardening", () => {
    it.each([
      ["api_uploadReceipt", ["receipt.png", "image/png", "data", "", "", 0]],
      ["api_deleteOrphanedReceipt", ["RECEIPT-001"]],
      ["api_editClaim", [{ claimId: "CLAIM-001" }]],
      ["api_saveBudgetRequestDraft", [{ title: "Draft" }]],
      ["api_submitBudgetRequest", ["BUDGET-001"]],
      ["api_discardBudgetRequest", ["BUDGET-001"]],
      ["api_getPendingBudgetRequests", []],
      ["api_decisionBudgetRequest", ["BUDGET-001", "APPROVE", {}]],
    ])("should deny %s without an operator session", (functionName, args) => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => "" });
      const api = require("../Api.js");

      const result = api[functionName](...args);

      expect(result).toEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "AUTH_DENIED",
            message: "Access denied",
          }),
          ok: false,
        })
      );
    });
  });

  describe("api_getMyClaims", () => {
    it("should return one minimal audited denial if no email is found", () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => "" });
      const result = api_getMyClaims();
      expect(result.ok).toBe(false);
      expect(result.error).toEqual({
        code: "AUTH_DENIED",
        details: {},
        message: "Access denied",
      });
      expect(global.Audit.append).toHaveBeenCalledWith(
        "SYSTEM",
        "Authorization",
        "SESSION",
        "AUTH_DENIED",
        { reason: "no_session" }
      );
    });

    it("should deny access and audit if user is unknown", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "unknown@example.com",
      });
      const mockUsersDataUnknown = [
        ["user_id", "display_name", "role", "email", "active", "created_at"],
        [
          testUserId,
          "Test User",
          "COMMITTEE",
          testUserEmail,
          true,
          "2026-01-01",
        ],
      ];
      global.getSheet_.mockImplementation((name) => {
        if (name === global.TABS.USERS) {
          return {
            getDataRange: () => ({ getValues: () => mockUsersDataUnknown }),
            name,
          };
        }
        if (name === global.TABS.BUDGET_REQUEST_LINES) {
          return { getDataRange: () => ({ getValues: () => [[]] }), name };
        }
        return { name };
      });
      const result = api_getMyClaims();
      expect(result).toEqual({
        error: { code: "AUTH_DENIED", details: {}, message: "Access denied" },
        ok: false,
      });
      expect(global.Audit.append).toHaveBeenCalledWith(
        "SYSTEM",
        "Authorization",
        "SESSION",
        "AUTH_DENIED",
        { reason: "unknown_user" }
      );
    });

    it("should map claims and requests properly", () => {
      // Mock rows returned by Engine._findRowsByColumn
      global.Engine._findRowsByColumn.mockImplementation(
        (sheet, _colIndex, _userId) => {
          if (sheet.name === global.TABS.EXPENSE_CLAIMS) {
            return [
              {
                rowIndex: 2,
                values: [
                  "C-123",
                  "U-001",
                  "SUBMITTED",
                  "2026-07-16",
                  null,
                  null,
                  null,
                  null,
                  null,
                  null,
                  150,
                  false,
                  false,
                  "notes",
                ],
              },
            ];
          }
          if (sheet.name === global.TABS.BUDGET_REQUESTS) {
            return [
              {
                rowIndex: 2,
                values: [
                  "R-123",
                  "U-001",
                  "E-001",
                  "Event",
                  "Just",
                  "2026-08-01",
                  "PENDING",
                  "2026-07-01",
                ],
              },
            ];
          }
          return [];
        }
      );

      const { data: result } = api_getMyClaims();
      expect(result.claims[0].claim_id).toBe("C-123");
      expect(result.requests[0].request_id).toBe("R-123");
    });

    // Issue #68: api_getMyClaims must surface only budget lines whose
    // line_status equals STATUS.BudgetRequestLine.APPROVED, not the
    // legacy bare "APPROVED" string.
    it("should return approved budget lines using STATUS.BudgetRequestLine.APPROVED", () => {
      global.Engine._findRowsByColumn.mockImplementation(
        (sheet, _colIndex, _userId) => {
          if (sheet.name === global.TABS.BUDGET_REQUESTS) {
            return [
              {
                rowIndex: 2,
                values: [
                  "R-100",
                  "U-001",
                  "E-001",
                  "Event",
                  "Just",
                  "2026-08-01",
                  "APPROVED",
                  "2026-07-01",
                ],
              },
            ];
          }
          return [];
        }
      );
      // BudgetRequestLines rows:
      //   row 0 = header
      //   row 1 = PENDING (should be excluded)
      //   row 2 = APPROVED (should be included)
      //   row 3 = REJECTED (should be excluded)
      //   row 4 = APPROVED but for a different request (should be excluded)
      global.getSheet_.mockImplementation((tab) => {
        if (tab === global.TABS.USERS) {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
            name: tab,
          };
        }
        if (tab === global.TABS.BUDGET_REQUEST_LINES) {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "line_id",
                  "request_id",
                  "category_id",
                  "description",
                  "requested_amount",
                  "approved_amount",
                  "line_status",
                  "claimed_amount",
                  "remaining",
                ],
                [
                  "BRL-1",
                  "R-100",
                  "C-1",
                  "Pending line",
                  100,
                  0,
                  "PENDING",
                  0,
                  100,
                ],
                [
                  "BRL-2",
                  "R-100",
                  "C-2",
                  "Approved line",
                  200,
                  200,
                  "APPROVED",
                  0,
                  50,
                ],
                [
                  "BRL-3",
                  "R-100",
                  "C-3",
                  "Rejected line",
                  300,
                  0,
                  "REJECTED",
                  0,
                  300,
                ],
                [
                  "BRL-4",
                  "R-OTHER",
                  "C-4",
                  "Other request",
                  400,
                  400,
                  "APPROVED",
                  0,
                  400,
                ],
              ],
            }),
            name: tab,
          };
        }
        if (tab === global.TABS.EXPENSE_CLAIMS) {
          return {
            getDataRange: () => ({
              getValues: () => [
                ["claim_id", "claimant_id", "status", "submitted_at"],
              ],
            }),
            name: tab,
          };
        }
        return {
          getDataRange: () => ({
            getValues: () => [
              [
                "request_id",
                "requester_id",
                "event_id",
                "title",
                "justification",
                "needed_by",
                "status",
                "submitted_at",
              ],
              [
                "R-100",
                "U-001",
                "E-001",
                "Event",
                "Just",
                "2026-08-01",
                "APPROVED",
                "2026-07-01",
              ],
            ],
          }),
          name: tab,
        };
      });

      const { data: result } = api_getMyClaims();
      expect(result.budgetLines).toHaveLength(1);
      expect(result.budgetLines[0].line_id).toBe("BRL-2");
      expect(result.budgetLines[0].description).toBe("Approved line");
      expect(result.budgetLines[0].remaining).toBe(50);
      expect(result.budgetLines[0].overBudget).toBe(false);
    });
  });

  describe("api_submitClaim", () => {
    it("should create a claim and line item successfully", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [],
                [
                  "USER-1",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return {
          getLastRow: () => 1,
          getMaxRows: () => 10,
          getRange: () => ({ getValues: () => [], setValues: jest.fn() }),
          insertRowAfter: jest.fn(),
        };
      });

      global.Ids.nextId.mockReturnValueOnce("C-2");
      global.Ids.childId.mockReturnValueOnce("CL-2");
      global.Audit = { _nowIso: () => "2023-01-03", append: jest.fn() };
      global.Config = { getNum: () => 14 };

      const payload = {
        amount: 200,
        budgetLineId: "BL-1",
        claimantId: "MEMBER-001",
        fpsAccount: "fps-account-1",
        fpsPhone: "91234567",
        notes: "Office chairs",
        payoutHandle: "91234567",
        payoutMethod: "FPS",
        receiptId: "R-1",
        uuid: "abc",
      };

      const { api_submitClaim } = require("../Api.js");
      const { data: result } = api_submitClaim(payload);

      expect(result.success).toBe(true);
      expect(result.claimId).toBe("C-2");
      expect(global.Audit.append).toHaveBeenCalled();
    });
  });

  describe("api_editClaim", () => {
    it("should update a submitted claim successfully", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });

      const mockExpenseSheet = {
        getDataRange: () => ({
          getValues: () => [
            [],
            [
              "C-1",
              "USER-1",
              "SUBMITTED",
              "2023-01-01",
              null,
              null,
              null,
              null,
              null,
              null,
              150,
              null,
              null,
              "Note",
            ],
          ],
        }),
        getRange: jest.fn(() => ({ setValue: jest.fn() })),
      };
      const mockCliSheet = {
        getDataRange: () => ({
          getValues: () => [[], ["CL-1", "C-1", "BL-1", "R-1", 150, "Note"]],
        }),
        getRange: jest.fn(() => ({ setValue: jest.fn() })),
      };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [],
                [
                  "USER-1",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "ExpenseClaims") {
          return mockExpenseSheet;
        }
        if (tab === "ClaimLineItems") {
          return mockCliSheet;
        }
        return null;
      });

      const payload = { amount: 300, claimId: "C-1", notes: "Updated notes" };

      const { api_editClaim } = require("../Api.js");
      const { data: result } = api_editClaim(payload);

      expect(result.success).toBe(true);
      expect(mockExpenseSheet.getRange).toHaveBeenCalled();
    });

    it("should throw an error if claim is not SUBMITTED", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [],
                [
                  "USER-1",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "ExpenseClaims") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [],
                ["C-1", "USER-1", "APPROVED", "2023-01-01"],
              ],
            }),
          };
        }
        return null;
      });

      const payload = { amount: 300, claimId: "C-1", notes: "Updated" };

      const { api_editClaim } = require("../Api.js");
      const result = api_editClaim(payload);
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain(
        "Only SUBMITTED claims can be edited."
      );
    });
  });

  describe("api_getMembers", () => {
    it("should return all members with role MEMBER", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Alice",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Bob", "MEMBER", "", true, "2026-01-01"],
                ["M-002", "Carol", "MEMBER", "", false, "2026-01-01"],
              ],
            }),
          };
        }
        return {
          getRange: jest.fn(() => ({
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        };
      });
      const { api_getMembers } = require("../Api.js");
      const { data: result } = api_getMembers();
      expect(result.length).toBe(2);
      expect(result[0].user_id).toBe("M-001");
      expect(result[1].active).toBe(false);
    });
  });

  describe("api_addMember", () => {
    it("should create a new member with unique SID", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.Ids.nextId.mockReturnValueOnce("M-003");
      global.Audit._nowIso.mockReturnValueOnce("2026-07-21T12:00:00Z");

      const usersSheet = {
        appendRow: jest.fn(),
        getDataRange: () => ({
          getValues: () => [
            [
              "user_id",
              "display_name",
              "role",
              "email",
              "active",
              "created_at",
            ],
            [
              "U-001",
              "Test User",
              "COMMITTEE",
              "test@example.com",
              true,
              "2026-01-01",
            ],
          ],
        }),
        getLastRow: () => 1,
        getMaxRows: () => 10,
        getRange: jest.fn(() => ({
          getValues: () => [[]],
          setNumberFormat: jest.fn().mockReturnThis(),
          setValue: jest.fn(),
          setValues: jest.fn(),
        })),
        insertRowAfter: jest.fn(),
      };
      const vaultSheet = {
        appendRow: jest.fn(),
        getDataRange: () => ({ getValues: () => [[]] }),
        getLastRow: () => 2,
        getMaxRows: () => 10,
        getRange: jest.fn(() => ({
          getValues: () => [[]],
          setNumberFormat: jest.fn().mockReturnThis(),
          setValue: jest.fn(),
          setValues: jest.fn(),
        })),
        insertRowAfter: jest.fn(),
      };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return usersSheet;
        }
        return {
          getRange: jest.fn(() => ({
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        };
      });
      global.getVaultSheet_.mockReturnValue(vaultSheet);

      const { api_addMember } = require("../Api.js");
      const { data: result } = api_addMember({
        display_name: "Dave",
        full_name: "David",
        payout_handle: "91234567",
        payout_method: "FPS",
        student_id: "12345678",
      });
      expect(result.user_id).toBe("M-003");
      expect(usersSheet.getRange).toHaveBeenCalled();
      expect(vaultSheet.getRange).toHaveBeenCalled();
    });

    it("should reject duplicate SID", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getVaultSheet_.mockReturnValueOnce({
        getDataRange: () => ({
          getValues: () => [
            [
              "user_id",
              "full_name",
              "student_id",
              "payout_method",
              "payout_handle",
              "consent_ts",
            ],
            ["M-001", "Bob", "12345678", "FPS", "91234567", "2026-01-01"],
          ],
        }),
      });
      const { api_addMember } = require("../Api.js");
      const result = api_addMember({
        display_name: "Dave",
        student_id: "12345678",
      });
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("member");
    });
  });

  describe("api_reactivateMember", () => {
    it("should reactivate an inactive member", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      const usersSheet = {
        getDataRange: () => ({
          getValues: () => [
            [
              "user_id",
              "display_name",
              "role",
              "email",
              "active",
              "created_at",
            ],
            [
              "U-001",
              "Test User",
              "COMMITTEE",
              "test@example.com",
              true,
              "2026-01-01",
            ],
            ["M-002", "Carol", "MEMBER", "", false, "2026-01-01"],
          ],
        }),
        getRange: jest.fn(() => ({ setValue: jest.fn() })),
      };
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return usersSheet;
        }
        return { getRange: jest.fn(() => ({ setValue: jest.fn() })) };
      });
      const { api_reactivateMember } = require("../Api.js");
      const { data: result } = api_reactivateMember("M-002");
      expect(result.active).toBe(true);
    });
  });

  describe("api_saveClaimDraft", () => {
    it("should create a new draft claim", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.Ids.nextId.mockReturnValueOnce("CLAIM-26A-001");
      global.Ids.childId.mockReturnValueOnce("CLAIMLINE-26A-001-01");
      global.Config = { getNum: () => 14 };

      const expenseSheet = {
        getLastRow: () => 1,
        getMaxRows: () => 10,
        getRange: () => ({ getValues: () => [[]], setValues: jest.fn() }),
        insertRowAfter: jest.fn(),
      };
      const cliSheet = {
        getLastRow: () => 1,
        getMaxRows: () => 10,
        getRange: () => ({ getValues: () => [[]], setValues: jest.fn() }),
        insertRowAfter: jest.fn(),
      };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [],
                [
                  "USER-1",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "ExpenseClaims") {
          return expenseSheet;
        }
        if (tab === "ClaimLineItems") {
          return cliSheet;
        }
        return {
          getRange: jest.fn(() => ({
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        };
      });

      const { api_saveClaimDraft } = require("../Api.js");
      const { data: result } = api_saveClaimDraft({
        amount: 100,
        budgetLineId: "BL-1",
        claimantId: "M-001",
        expenseDate: "2026-07-15",
        fpsAccount: "fps-account-1",
        fpsPhone: "91234567",
        notes: "Draft note",
        payoutHandle: "91234567",
        payoutMethod: "FPS",
        uuid: "draft-1",
      });
      expect(result.claim_id).toBe("CLAIM-26A-001");
      expect(result.status).toBe("DRAFT");
    });
  });

  describe("api_submitDraftClaim", () => {
    it("should submit a DRAFT claim", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: [
          "CLAIM-26A-001",
          "M-001",
          "DRAFT",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          100,
          false,
          false,
          "Note",
          "uuid-1",
          "U-001",
          "2026-07-15",
          "26A",
          "",
          "FPS",
          "91234567",
        ],
      });
      global.Engine.transition.mockReturnValueOnce({
        from: "DRAFT",
        ok: true,
        to: "SUBMITTED",
      });
      const { api_submitDraftClaim } = require("../Api.js");
      const { data: result } = api_submitDraftClaim("CLAIM-26A-001");
      expect(result.status).toBe("SUBMITTED");
      expect(global.Engine.transition).toHaveBeenCalledWith(
        "ExpenseClaim",
        "CLAIM-26A-001",
        "SUBMIT",
        "U-001",
        {}
      );
    });
  });

  describe("api_atomicSubmitClaim", () => {
    it("should validate upfront and return structured errors", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });

      const { api_atomicSubmitClaim } = require("../Api.js");
      const result = api_atomicSubmitClaim({});

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details.errors.length).toBeGreaterThanOrEqual(3);
      const fields = result.error.details.errors.map((e) => e.field);
      expect(fields).toContain("claimantId");
      expect(fields).toContain("amount");
      expect(fields).toContain("uuid");
    });

    it("should create a claim and submit atomically (no receipts)", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.Ids.nextId.mockReturnValueOnce("CLAIM-ATOMIC");
      global.Ids.childId.mockReturnValueOnce("CLI-ATOMIC-1");
      global.Audit = {
        _nowIso: () => "2026-07-21T12:00:00Z",
        append: jest.fn(),
      };
      global.Config = { getNum: () => 14, getOptional: () => "" };

      global.Engine.transition.mockReturnValueOnce({
        from: "DRAFT",
        ok: true,
        to: "SUBMITTED",
      });

      const payload = {
        amount: 200,
        budgetLineId: "BL-1",
        claimantId: "MEMBER-001",
        expenseDate: "2026-07-15",
        fpsAccount: "fps-account-1",
        fpsPhone: "91234567",
        notes: "Office supplies",
        payoutHandle: "91234567",
        payoutMethod: "FPS",
        semester: "26A",
        uuid: "atomic-uuid-1",
      };

      const { api_atomicSubmitClaim } = require("../Api.js");
      const result = api_atomicSubmitClaim(payload);

      expect(result.ok).toBe(true);
      expect(result.data.claim_id).toBe("CLAIM-ATOMIC");
      expect(result.data.status).toBe("SUBMITTED");
    }); // end atomic basic

    it("should update existing draft and submit atomically", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.Ids.nextId.mockReturnValueOnce("RECEIPT-DRAFT");
      global.Ids.childId.mockReturnValueOnce("CLI-DRAFT-1");
      global.Config = { getNum: () => 14, getOptional: () => "" };

      const usersSheet = {
        getDataRange: () => ({
          getValues: () => [
            [],
            [
              "U-001",
              "Test User",
              "COMMITTEE",
              "test@example.com",
              true,
              "2026-01-01",
            ],
            ["MEMBER-001", "Bob", "MEMBER", "", true, "2026-01-01"],
            ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
          ],
        }),
      };
      const defSheet = {
        getLastRow: () => 1,
        getMaxRows: () => 10,
        getRange: () => ({ getValues: () => [], setValues: jest.fn() }),
      };

      const existingSheet = {
        getRange: jest.fn(() => ({ setValue: jest.fn() })),
      };
      global.Engine._loadRow
        .mockReturnValueOnce({
          rowIndex: 2,
          values: (() => {
            const values = [];
            values[global.COLS.BudgetRequestLines.line_status - 1] = "APPROVED";
            return values;
          })(),
        })
        .mockReturnValueOnce({
          rowIndex: 2,
          sheet: existingSheet,
          values: [
            "CLAIM-DRAFT-1",
            "M-001",
            "DRAFT",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            100,
            false,
            false,
            "Old note",
            "old-uuid",
            "U-001",
            "2026-07-10",
            "26A",
            "",
            "FPS",
            "",
          ],
        });
      global.Engine.transition.mockReturnValueOnce({
        from: "DRAFT",
        ok: true,
        to: "SUBMITTED",
      });

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return usersSheet;
        }
        return defSheet;
      });

      const payload = {
        amount: 250,
        budgetLineId: "BL-1",
        claimantId: "MEMBER-001",
        claimId: "CLAIM-DRAFT-1",
        expenseDate: "2026-07-20",
        notes: "Updated notes",
        paymePhone: "91234567",
        payoutHandle: "payme-id",
        payoutMethod: "PAYME",
        semester: "26A",
        uuid: "atomic-draft-uuid",
      };

      const { api_atomicSubmitClaim } = require("../Api.js");
      const result = api_atomicSubmitClaim(payload);

      if (!result.ok) {
        throw new Error(
          `DRAFTUPD: ${result.error.code} ${result.error.message}`
        );
      }
      expect(result.ok).toBe(true);
      expect(existingSheet.getRange).toHaveBeenCalled();
      expect(global.Engine.transition).toHaveBeenCalledWith(
        "ExpenseClaim",
        "CLAIM-DRAFT-1",
        "SUBMIT",
        "U-001",
        {}
      );
    });

    it("should rollback on failure after partial writes", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.Ids.nextId
        .mockReturnValueOnce("CLAIM-ROLLBACK")
        .mockReturnValueOnce("RECEIPT-RB");
      global.Ids.childId.mockReturnValueOnce("CLI-RB-1");
      global.Config = { getNum: () => 14, getOptional: () => "" };

      const usersSheet = {
        getDataRange: () => ({
          getValues: () => [
            [],
            [
              "U-001",
              "Test User",
              "COMMITTEE",
              "test@example.com",
              true,
              "2026-01-01",
            ],
            ["MEMBER-001", "Bob", "MEMBER", "", true, "2026-01-01"],
          ],
        }),
        getMaxRows: () => 1000,
        getRange: () => ({
          getValues: () => [],
          setValue: jest.fn(),
          setValues: jest.fn(),
        }),
      };
      const receiptSheet = {
        appendRow: jest.fn(),
        getDataRange: () => ({
          getValues: () => [
            ["receipt_id", "drive_file_id", "sha256", "uploaded_by"],
          ],
        }),
        getMaxRows: () => 1000,
        getRange: () => ({
          getValues: () => [[""]],
          setValue: jest.fn(),
          setValues: jest.fn(),
        }),
      };
      const claimsSheet = {
        appendRow: jest.fn(),
        deleteRow: jest.fn(),
        getLastRow: () => 1,
        getMaxRows: () => 1000,
        getRange: () => ({
          getValues: () => [[""]],
          setValue: jest.fn(),
          setValues: jest.fn(),
        }),
      };
      const cliSheet = {
        appendRow: jest.fn(),
        deleteRow: jest.fn(),
        getMaxRows: () => 1000,
        getRange: () => ({
          getValues: () => [[""]],
          setValue: jest.fn(),
          setValues: jest.fn(),
        }),
      };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return usersSheet;
        }
        if (tab === "Receipts") {
          return receiptSheet;
        }
        if (tab === "ExpenseClaims") {
          return claimsSheet;
        }
        if (tab === "ClaimLineItems") {
          return cliSheet;
        }
        return {
          getLastRow: () => 1,
          getMaxRows: () => 10,
          getRange: () => ({ getValues: () => [], setValues: jest.fn() }),
        };
      });

      // Simulate transition failure
      global.Engine.transition.mockReturnValueOnce({
        from: "DRAFT",
        ok: false,
        reason: "Budget line exhausted",
      });

      // Mock _findRowsByColumn to simulate rows that need cleanup
      global.Engine._findRowsByColumn = jest.fn(() => [
        { rowIndex: 2, sheet: { deleteRow: jest.fn() } },
      ]);

      const payload = {
        amount: 100,
        budgetLineId: "BL-1",
        claimantId: "MEMBER-001",
        expenseDate: "2026-07-15",
        fpsAccount: "fps-account-1",
        fpsPhone: "91234567",
        notes: "Test rollback",
        payoutHandle: "91234567",
        payoutMethod: "FPS",
        receipts: [
          {
            base64Data: "dGVzdA==",
            fileName: "rec.jpg",
            mimeType: "image/jpeg",
          },
        ],
        uuid: "rollback-uuid",
      };

      const { api_atomicSubmitClaim } = require("../Api.js");
      const result = api_atomicSubmitClaim(payload);

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("ENGINE_ERROR");
    });

    it("should create claim with receipt files and QR", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.Ids.nextId
        .mockReturnValueOnce("CLAIM-FILES")
        .mockReturnValueOnce("REC-FILE-1")
        .mockReturnValueOnce("REC-QR-1");
      global.Ids.childId
        .mockReturnValueOnce("CLI-FILE-1")
        .mockReturnValueOnce("CLI-QR-1");
      global.Config = { getNum: () => 14, getOptional: () => "" };
      global.Engine.transition.mockReturnValueOnce({
        from: "DRAFT",
        ok: true,
        to: "SUBMITTED",
      });

      const payload = {
        amount: 150,
        budgetLineId: "BL-1",
        claimantId: "MEMBER-001",
        expenseDate: "2026-07-15",
        fpsAccount: "fps-account-1",
        fpsPhone: "91234567",
        notes: "Food receipts",
        payoutHandle: "91234567",
        payoutMethod: "FPS",
        qrFile: {
          base64Data: "cXJkYXRh",
          fileName: "qr.png",
          mimeType: "image/png",
        },
        receipts: [
          {
            base64Data: "ZmlsZTE=",
            fileName: "receipt1.jpg",
            mimeType: "image/jpeg",
          },
        ],
        uuid: "files-uuid",
      };

      const { api_atomicSubmitClaim } = require("../Api.js");
      const result = api_atomicSubmitClaim(payload);

      expect(result.ok).toBe(true);
      expect(result.data.claim_id).toBe("CLAIM-FILES");
      expect(result.data.receipt_ids.length).toBe(1);
      expect(result.data.receipt_ids[0]).toBe("REC-FILE-1");
      expect(global.DriveApp.getFolderById).toHaveBeenCalled();
      expect(global.Utilities.newBlob).toHaveBeenCalledTimes(2); // receipt + QR
    });

    it("should reject invalid file type upfront", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });

      const payload = {
        amount: 100,
        budgetLineId: "BL-1",
        claimantId: "MEMBER-001",
        expenseDate: "2026-07-15",
        fpsAccount: "fps-account-1",
        fpsPhone: "91234567",
        notes: "Bad file test",
        payoutHandle: "91234567",
        payoutMethod: "FPS",
        receipts: [
          {
            base64Data: "dGVzdA==",
            fileName: "bad.exe",
            mimeType: "application/x-msdownload",
          },
        ],
        uuid: "bad-file-uuid",
      };

      const { api_atomicSubmitClaim } = require("../Api.js");
      const result = api_atomicSubmitClaim(payload);

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details.errors.map((e) => e.field)).toContain(
        "receipts[0]"
      );
    });

    it("should return Already processed for reused uuid", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });

      const claimsSheet = {
        getDataRange: () => ({
          getValues: () => {
            const header = [];
            header[14] = "processed_response_id";
            const row = [];
            row[0] = "CLAIM-DONE";
            row[2] = "SUBMITTED";
            row[14] = "uuid-reused";
            return [header, row];
          },
        }),
        getLastRow: () => 2,
        getRange: jest.fn(() => ({
          getValues: jest.fn(() => [["uuid-reused"]]),
        })),
      };
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
                ["MEMBER-001", "Bob", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "ExpenseClaims") {
          return claimsSheet;
        }
        return {
          getLastRow: () => 1,
          getMaxRows: () => 10,
          getRange: () => ({ getValues: () => [], setValues: jest.fn() }),
        };
      });

      const payload = {
        amount: 100,
        budgetLineId: "BL-1",
        claimantId: "MEMBER-001",
        expenseDate: "2026-07-15",
        fpsAccount: "fps-account-1",
        fpsPhone: "91234567",
        notes: "Idempotent test",
        payoutHandle: "91234567",
        payoutMethod: "FPS",
        uuid: "uuid-reused",
      };

      const { api_atomicSubmitClaim } = require("../Api.js");
      global.Engine._loadRow.mockImplementation((entityType) => {
        if (entityType === "BudgetRequestLine") {
          const values = [];
          values[global.COLS.BudgetRequestLines.line_status - 1] = "APPROVED";
          return { rowIndex: 2, values };
        }
        return null;
      });
      const result = api_atomicSubmitClaim(payload);

      expect(result).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            message: "Already processed",
          }),
          ok: true,
        })
      );
    });
  });

  describe("api_uploadReceipt", () => {
    it("should upload a receipt successfully", () => {
      global.Ids.nextId.mockReturnValueOnce("RECEIPT-001");
      const sheet = {
        getDataRange: jest.fn(() => ({
          getValues: () => [
            ["receipt_id", "drive_file_id", "sha256", "uploaded_by"],
          ],
        })),
        getMaxRows: jest.fn(() => 100),
        getRange: jest.fn(() => ({
          getValues: jest.fn(() => [[""]]),
          setValues: jest.fn(),
        })),
        insertRowAfter: jest.fn(),
      };
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "Receipts") {
          return sheet;
        }
        return {
          getMaxRows: jest.fn(() => 100),
          getRange: jest.fn(() => ({
            getValues: jest.fn(() => [[""]]),
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        };
      });
      const { api_uploadReceipt } = require("../Api.js");
      const { data: result } = api_uploadReceipt(
        "receipt.png",
        "image/png",
        "base64data",
        "Vendor Co",
        "2026-07-15",
        100.5
      );
      expect(result.receiptId).toBe("RECEIPT-001");
      expect(global.Utilities.newBlob).toHaveBeenCalled();
      expect(global.DriveApp.getFolderById).toHaveBeenCalledWith(
        "RECEIPTS-FOLDER-123"
      );
      expect(sheet.getRange).toHaveBeenCalled();
    });

    it("should reject unsupported MIME type", () => {
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return {
          getMaxRows: jest.fn(() => 100),
          getRange: jest.fn(() => ({
            getValues: jest.fn(() => [[""]]),
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        };
      });
      const { api_uploadReceipt } = require("../Api.js");
      const result = api_uploadReceipt(
        "file.txt",
        "text/plain",
        "base64data",
        "",
        "",
        0
      );
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("Unsupported file type");
    });

    it("should return existing receiptId for same-user duplicate hash", () => {
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "Receipts") {
          return {
            getDataRange: () => ({
              getValues: () => [
                ["receipt_id", "drive_file_id", "sha256", "uploaded_by"],
                [
                  "RECEIPT-001",
                  "DRIVE-001",
                  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
                  "U-001",
                ],
              ],
            }),
          };
        }
        return {
          getMaxRows: jest.fn(() => 100),
          getRange: jest.fn(() => ({
            getValues: jest.fn(() => [[""]]),
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        };
      });
      const { api_uploadReceipt } = require("../Api.js");
      const { data: result } = api_uploadReceipt(
        "dupe.png",
        "image/png",
        "base64data",
        "",
        "",
        0
      );
      expect(result.receiptId).toBe("RECEIPT-001");
    });

    it("should throw for cross-operator duplicate hash", () => {
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "Receipts") {
          return {
            getDataRange: () => ({
              getValues: () => [
                ["receipt_id", "drive_file_id", "sha256", "uploaded_by"],
                [
                  "RECEIPT-001",
                  "DRIVE-001",
                  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
                  "U-OTHER",
                ],
              ],
            }),
          };
        }
        return {
          getMaxRows: jest.fn(() => 100),
          getRange: jest.fn(() => ({
            getValues: jest.fn(() => [[""]]),
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        };
      });
      const { api_uploadReceipt } = require("../Api.js");
      const result = api_uploadReceipt(
        "dupe.png",
        "image/png",
        "base64data",
        "",
        "",
        0
      );
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("Duplicate receipt detected");
    });

    it("should reject files over 5 MB", () => {
      global.Utilities.base64Decode.mockReturnValueOnce(
        new Array(6 * 1024 * 1024).fill(0)
      );
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return {
          getMaxRows: jest.fn(() => 100),
          getRange: jest.fn(() => ({
            getValues: jest.fn(() => [[""]]),
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        };
      });
      const { api_uploadReceipt } = require("../Api.js");
      const result = api_uploadReceipt(
        "large.png",
        "image/png",
        "bigbase64",
        "",
        "",
        0
      );
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("5 MB limit");
    });

    // Issue #77: two concurrent uploads of the same bytes must be
    // serialized by LockService. The first call creates exactly one
    // Drive file; the second call sees the newly-written row in the
    // hash scan and returns the existing receiptId without creating a
    // second Drive file.
    it("should serialize concurrent duplicate uploads and not create two Drive files", () => {
      const appendedRows = [];
      const createFile = jest.fn(() => ({ getId: () => "drive-file-123" }));
      global.DriveApp.getFolderById.mockImplementation(() => ({
        createFile,
      }));
      global.Ids.nextId
        .mockReturnValueOnce("RECEIPT-001")
        .mockReturnValueOnce("RECEIPT-002");

      // Track writes through sheet.getRange(...).setValues (what
      // _appendRow actually invokes). After the first upload the
      // second upload's getDataRange sees the row that was written.
      const storedRows = [
        ["receipt_id", "drive_file_id", "sha256", "uploaded_by"],
      ];
      const receiptSheet = {
        getDataRange: jest.fn(() => ({
          getValues: () => storedRows.map((r) => r.slice()),
        })),
        getMaxRows: jest.fn(() => 100),
        getRange: jest.fn(() => ({
          getValues: jest.fn(() => [[]]),
          setValues: jest.fn((values) => {
            appendedRows.push(values[0]);
            storedRows.push(values[0].slice());
          }),
        })),
        insertRowAfter: jest.fn(),
      };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        if (tab === "Receipts") {
          return receiptSheet;
        }
        return {
          getMaxRows: jest.fn(() => 100),
          getRange: jest.fn(() => ({
            getValues: jest.fn(() => [[""]]),
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        };
      });

      const { api_uploadReceipt } = require("../Api.js");

      const first = api_uploadReceipt(
        "race.png",
        "image/png",
        "base64data",
        "Vendor Co",
        "2026-07-15",
        100.5
      );

      // Issue #77: must acquire a script lock exactly once per upload.
      expect(global.LockService.getScriptLock).toHaveBeenCalledTimes(1);

      const second = api_uploadReceipt(
        "race.png",
        "image/png",
        "base64data",
        "Vendor Co",
        "2026-07-15",
        100.5
      );

      // After the second call, the lock must have been acquired again
      // and released once per upload.
      expect(global.LockService.getScriptLock).toHaveBeenCalledTimes(2);

      expect(first.ok).toBe(true);
      expect(first.data.receiptId).toBe("RECEIPT-001");

      // Second call hits the same-hash path for the same uploader and
      // returns the existing receiptId — never creates a new file.
      expect(second.ok).toBe(true);
      expect(second.data.receiptId).toBe("RECEIPT-001");

      // Only one Drive file was ever created across both uploads.
      expect(createFile).toHaveBeenCalledTimes(1);

      // Only one row was appended to the Receipts sheet.
      expect(appendedRows).toHaveLength(1);
      expect(appendedRows[0][0]).toBe("RECEIPT-001");

      // Ids.nextId was only consumed once (the second upload short-
      // circuits before it asks for an ID).
      expect(global.Ids.nextId).toHaveBeenCalledTimes(1);
    });

    // Issue #77 cross-user variant: when two users upload the same
    // bytes, the second upload must be rejected with DUPLICATE_RECEIPT
    // without creating a second Drive file.
    it("should return DUPLICATE_RECEIPT on cross-user race without creating a second Drive file", () => {
      const appendedRows = [];
      const createFile = jest.fn(() => ({ getId: () => "drive-file-456" }));
      global.DriveApp.getFolderById.mockImplementation(() => ({
        createFile,
      }));
      global.Ids.nextId.mockReturnValueOnce("RECEIPT-007");

      const initialRows = [
        ["receipt_id", "drive_file_id", "sha256", "uploaded_by"],
      ];
      const getDataRangeReceipts = jest.fn(() => ({
        getValues: () => initialRows.slice(),
      }));
      const appendRow = jest.fn((values) => {
        appendedRows.push(values);
        initialRows.push([values[0], values[1], values[2], values[3]]);
      });
      const receiptSheet = {
        appendRow,
        getDataRange: getDataRangeReceipts,
        getMaxRows: jest.fn(() => 100),
        getRange: jest.fn(() => ({
          getValues: jest.fn(() => [[""]]),
          setValue: jest.fn(),
          setValues: jest.fn((rows) => {
            appendedRows.push(rows[0]);
            initialRows.push([rows[0][0], rows[0][1], rows[0][2], rows[0][3]]);
          }),
        })),
        insertRowAfter: jest.fn(),
      };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        if (tab === "Receipts") {
          return receiptSheet;
        }
        return {
          getMaxRows: jest.fn(() => 100),
          getRange: jest.fn(() => ({
            getValues: jest.fn(() => [[""]]),
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        };
      });

      const { api_uploadReceipt } = require("../Api.js");

      // First upload as U-001 — succeeds.
      const first = api_uploadReceipt(
        "race.png",
        "image/png",
        "base64data",
        "",
        "",
        0
      );
      expect(first.ok).toBe(true);
      expect(first.data.receiptId).toBe("RECEIPT-007");

      // Now switch the active user to U-OTHER and try to upload the
      // same bytes. The hash scan sees the row written by the first
      // call and rejects with DUPLICATE_RECEIPT.
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: jest.fn(() => "other@example.com"),
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                [
                  "U-OTHER",
                  "Other",
                  "COMMITTEE",
                  "other@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        if (tab === "Receipts") {
          return receiptSheet;
        }
        return {
          getMaxRows: jest.fn(() => 100),
          getRange: jest.fn(() => ({
            getValues: jest.fn(() => [[""]]),
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        };
      });

      const second = api_uploadReceipt(
        "race.png",
        "image/png",
        "base64data",
        "",
        "",
        0
      );

      expect(second.ok).toBe(false);
      expect(second.error.code).toBe("DUPLICATE_RECEIPT");

      // Only one Drive file was created across both attempts.
      expect(createFile).toHaveBeenCalledTimes(1);
      expect(appendedRows).toHaveLength(1);
    });
  });

  describe("api_deleteOrphanedReceipt", () => {
    it("should delete a receipt and log audit", () => {
      const receiptSheet = { deleteRow: jest.fn() };
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 3,
        sheet: receiptSheet,
        values: [
          "RECEIPT-001",
          "DRIVE-001",
          "hash",
          "U-001",
          "2026-07-21",
          "",
          "",
          0,
          "",
        ],
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return {};
      });
      const { api_deleteOrphanedReceipt } = require("../Api.js");
      const { data: result } = api_deleteOrphanedReceipt("RECEIPT-001");
      expect(result.success).toBe(true);
      expect(receiptSheet.deleteRow).toHaveBeenCalledWith(3);
      expect(global.Audit.append).toHaveBeenCalled();
    });

    it("should throw for unauthorized user", () => {
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 3,
        values: [
          "RECEIPT-001",
          "DRIVE-001",
          "hash",
          "U-OTHER",
          "2026-07-21",
          "",
          "",
          0,
          "",
        ],
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return {};
      });
      const { api_deleteOrphanedReceipt } = require("../Api.js");
      const result = api_deleteOrphanedReceipt("RECEIPT-001");
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("Access denied");
    });

    it("should throw for not found receipt", () => {
      global.Engine._loadRow.mockReturnValueOnce(null);
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return {};
      });
      const { api_deleteOrphanedReceipt } = require("../Api.js");
      const result = api_deleteOrphanedReceipt("RECEIPT-999");
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("Receipt not found");
    });
  });

  describe("api_saveClaimDraft with receiptIds", () => {
    it("should create a claim draft with multiple receipt IDs", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.Ids.nextId.mockReturnValueOnce("CLAIM-26A-002");
      global.Ids.childId
        .mockReturnValueOnce("CLAIMLINE-26A-002-01")
        .mockReturnValueOnce("CLAIMLINE-26A-002-02");
      global.Config = { getNum: () => 14 };

      const expenseSheet = {
        getLastRow: () => 1,
        getMaxRows: () => 10,
        getRange: jest.fn(() => ({
          getValues: jest.fn(() => [[""]]),
          setValues: jest.fn(),
        })),
        insertRowAfter: jest.fn(),
      };
      const cliSheet = {
        appendRow: jest.fn(),
        deleteRow: jest.fn(),
        getLastRow: () => 1,
        getMaxRows: () => 10,
        getRange: jest.fn(() => ({
          getValues: jest.fn(() => [[""]]),
          setValues: jest.fn(),
        })),
        insertRowAfter: jest.fn(),
      };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [],
                [
                  "USER-1",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "ExpenseClaims") {
          return expenseSheet;
        }
        if (tab === "ClaimLineItems") {
          return cliSheet;
        }
        return {
          getRange: jest.fn(() => ({
            getValues: jest.fn(() => [[""]]),
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        };
      });

      // Mock no existing cli rows
      global.Engine._findRowsByColumn.mockReturnValueOnce([]);

      const { api_saveClaimDraft } = require("../Api.js");
      const { data: result } = api_saveClaimDraft({
        amount: 200,
        claimantId: "M-001",
        expenseDate: "2026-07-15",
        fpsAccount: "fps-account-1",
        fpsPhone: "91234567",
        notes: "Multi receipt",
        payoutHandle: "91234567",
        payoutMethod: "FPS",
        receiptIds: ["RECEIPT-001", "RECEIPT-002"],
        uuid: "draft-2",
      });
      expect(result.claim_id).toBe("CLAIM-26A-002");
      // _appendRow is called once per receipt (uses setValues, not appendRow)
      expect(cliSheet.getRange).toHaveBeenCalledTimes(4); // 2 calls per receipt (getRange("A:A") + getRange(pos))
      // Verify setValues was called on the range objects
      const setValuesCalls = cliSheet.getRange.mock.results.filter(
        (r) => r.value.setValues.mock.calls.length > 0
      );
      expect(setValuesCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("api_saveClaimDraft with receiptIds replacing existing lines", () => {
    it("should delete existing lines and create new ones per receiptId", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.Ids.nextId.mockReturnValueOnce("CLAIM-26A-003");
      global.Ids.childId = jest.fn(() => "CLAIMLINE-26A-003-N");
      global.Config = { getNum: () => 14 };

      // Mock _loadRow for the existing claim lookup (first call in check)
      global.Engine._loadRow
        .mockReturnValueOnce({
          rowIndex: 2,
          sheet: {
            getRange: jest.fn(() => ({
              setValue: jest.fn(),
              setValues: jest.fn(),
            })),
          },
          values: [
            "CLAIM-26A-003",
            "M-001",
            "DRAFT",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            200,
            false,
            false,
            "Note",
            "uuid-3",
            "USER-1",
            "2026-07-15",
            "26A",
            "",
            "FPS",
            "91234567",
          ],
        })
        // Second call for the update path (row.sheet access)
        .mockReturnValueOnce({
          rowIndex: 2,
          sheet: {
            getRange: jest.fn(() => ({
              setValue: jest.fn(),
              setValues: jest.fn(),
            })),
          },
          values: [
            "CLAIM-26A-003",
            "M-001",
            "DRAFT",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            200,
            false,
            false,
            "Note",
            "uuid-3",
            "USER-1",
            "2026-07-15",
            "26A",
            "",
            "FPS",
            "91234567",
          ],
        });

      const cliSheet = {
        appendRow: jest.fn(),
        deleteRow: jest.fn(),
        getLastRow: () => 5,
        getMaxRows: () => 10,
        getRange: jest.fn(() => ({
          getValues: jest.fn(() => [[""]]),
          setValues: jest.fn(),
        })),
        insertRowAfter: jest.fn(),
      };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [],
                [
                  "USER-1",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "ExpenseClaims") {
          return {
            getLastRow: () => 1,
            getMaxRows: () => 10,
            getRange: jest.fn(() => ({
              getValues: jest.fn(() => [[""]]),
              setValues: jest.fn(),
            })),
            insertRowAfter: jest.fn(),
          };
        }
        if (tab === "ClaimLineItems") {
          return cliSheet;
        }
        return {
          getRange: jest.fn(() => ({
            getValues: jest.fn(() => [[""]]),
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        };
      });

      global.Engine._findRowsByColumn.mockReturnValueOnce([
        {
          rowIndex: 3,
          values: [
            "CLAIMLINE-1",
            "CLAIM-26A-003",
            "",
            "RECEIPT-001",
            100,
            "note",
            false,
          ],
        },
        {
          rowIndex: 4,
          values: [
            "CLAIMLINE-2",
            "CLAIM-26A-003",
            "",
            "RECEIPT-002",
            100,
            "note",
            false,
          ],
        },
      ]);

      const { api_saveClaimDraft } = require("../Api.js");
      const { data: result } = api_saveClaimDraft({
        amount: 200,
        claimantId: "M-001",
        claimId: "CLAIM-26A-003",
        expenseDate: "2026-07-15",
        fpsAccount: "fps-account-1",
        fpsPhone: "91234567",
        notes: "Update receipts",
        payoutHandle: "91234567",
        payoutMethod: "FPS",
        receiptIds: ["RECEIPT-003", "RECEIPT-004"],
        uuid: "draft-3",
      });
      expect(result.status).toBe("DRAFT");
      expect(cliSheet.deleteRow).toHaveBeenCalledTimes(2);
      // _appendRow is called per receipt via setValues
      const setValuesCalls = cliSheet.getRange.mock.results.filter(
        (r) => r.value.setValues.mock.calls.length > 0
      );
      expect(setValuesCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("api_submitClaim idempotent retry", () => {
    it("should return Already processed when uuid is reused", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.Ids.nextId.mockReturnValueOnce("C-RETRY");
      global.Ids.childId.mockReturnValueOnce("CL-RETRY");
      global.Audit = {
        _nowIso: () => "2026-07-21T12:00:00Z",
        append: jest.fn(),
      };
      global.Config = { getNum: () => 14 };

      const claimsSheet = {
        getLastRow: () => 2,
        getRange: jest.fn(() => ({
          getValues: jest.fn(() => [["uuid-existing"]]),
        })),
      };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [],
                [
                  "USER-1",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "ExpenseClaims") {
          return claimsSheet;
        }
        return {
          getLastRow: () => 1,
          getMaxRows: () => 10,
          getRange: () => ({ getValues: () => [], setValues: jest.fn() }),
          insertRowAfter: jest.fn(),
        };
      });

      const { api_submitClaim } = require("../Api.js");
      const { data: first } = api_submitClaim({
        amount: 100,
        budgetLineId: "BL-1",
        claimantId: "M-001",
        notes: "Retry test",
        uuid: "uuid-existing",
      });
      expect(first.success).toBe(true);
      expect(first.message).toBe("Already processed");
    });
  });

  describe("api_attachReceipts", () => {
    beforeEach(() => {
      global.Session.getActiveUser.mockReturnValue({
        getEmail: () => "test@example.com",
      });
      global.Ids.childId = jest.fn(() => "CLAIMLINE-ATTACH-N");
      global.Audit = {
        _nowIso: jest.fn(() => "2026-07-21T12:00:00Z"),
        append: jest.fn(),
      };
    });

    it("should attach receipts to a SUBMITTED claim", () => {
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        sheet: {
          getRange: jest.fn(() => ({
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        },
        values: [
          "CLAIM-ATTACH-001",
          "M-001",
          "SUBMITTED",
          "2026-07-20",
          "",
          "",
          "",
          "",
          "",
          "",
          200,
          false,
          false,
          "Test",
          "uuid",
          "U-001",
          "2026-07-20",
          "26A",
          "",
          "FPS",
          "91234567",
        ],
      });

      const cliSheet = {
        appendRow: jest.fn(),
        getLastRow: () => 5,
        getMaxRows: () => 10,
        getRange: jest.fn(() => ({
          getValues: jest.fn(() => [[""]]),
          setValues: jest.fn(),
        })),
        insertRowAfter: jest.fn(),
      };

      global.Engine._findRowsByColumn.mockReturnValueOnce([
        {
          rowIndex: 2,
          values: [
            "CLI-001",
            "CLAIM-ATTACH-001",
            "BL-001",
            "",
            200,
            "Test note",
            false,
          ],
        },
      ]);

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "ClaimLineItems") {
          return cliSheet;
        }
        return {
          getRange: jest.fn(() => ({
            getValues: jest.fn(() => [[""]]),
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
        };
      });

      const { api_attachReceipts } = require("../Api.js");
      const { data: result } = api_attachReceipts("CLAIM-ATTACH-001", [
        "RECEIPT-ATTACH-1",
        "RECEIPT-ATTACH-2",
      ]);
      expect(result.claim_id).toBe("CLAIM-ATTACH-001");
      expect(result.status).toBe("SUBMITTED");
      expect(global.Audit.append).toHaveBeenCalledWith(
        "U-001",
        "ExpenseClaim",
        "CLAIM-ATTACH-001",
        "RECEIPTS_ATTACHED",
        { receiptIds: ["RECEIPT-ATTACH-1", "RECEIPT-ATTACH-2"] }
      );
    });

    it("should reject attaching receipts to an APPROVED_FOR_PAYOUT claim", () => {
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: [
          "CLAIM-ATTACH-002",
          "M-001",
          "APPROVED_FOR_PAYOUT",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          200,
          false,
          false,
          "",
          "uuid",
          "U-001",
          "2026-07-20",
          "26A",
          "",
          "FPS",
          "91234567",
        ],
      });

      const { api_attachReceipts } = require("../Api.js");
      const result = api_attachReceipts("CLAIM-ATTACH-002", ["RECEIPT-X"]);
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain(
        "Receipts can only be attached to DRAFT, SUBMITTED, NEEDS_INFO, or VERIFIED claims"
      );
    });

    it("should reject attaching receipts by a different operator", () => {
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: [
          "CLAIM-ATTACH-003",
          "M-001",
          "SUBMITTED",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          200,
          false,
          false,
          "",
          "uuid",
          "U-OTHER",
          "2026-07-20",
          "26A",
          "",
          "FPS",
          "91234567",
        ],
      });

      const { api_attachReceipts } = require("../Api.js");
      const result = api_attachReceipts("CLAIM-ATTACH-003", ["RECEIPT-Y"]);
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("Access denied");
    });

    it("should reject empty receiptIds array", () => {
      const { api_attachReceipts } = require("../Api.js");
      const result = api_attachReceipts("CLAIM-001", []);
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("receiptIds array is required");
    });
  });

  describe("api_getClaimsQueue", () => {
    it("should return SUBMITTED, NEEDS_INFO, and VERIFIED claims", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "ExpenseClaims") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "claim_id",
                  "claimant_id",
                  "status",
                  "submitted_at",
                  "verified_at",
                  "",
                  "",
                  "",
                  "",
                  "",
                  "total_amount",
                  "",
                  "",
                  "notes",
                  "",
                  "created_by",
                  "",
                  "",
                  "event_id",
                ],
                [
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
                  100,
                  "",
                  "",
                  "Test claim 1",
                  "",
                  "U-001",
                  "",
                  "",
                  "EVT-001",
                ],
                [
                  "CLAIM-002",
                  "M-002",
                  "VERIFIED",
                  "2026-07-19",
                  "2026-07-21",
                  "",
                  "",
                  "",
                  "",
                  "",
                  200,
                  "",
                  "",
                  "Test claim 2",
                  "",
                  "U-002",
                  "",
                  "",
                  "EVT-002",
                ],
                [
                  "CLAIM-003",
                  "M-001",
                  "REJECTED",
                  "2026-07-18",
                  "",
                  "",
                  "",
                  "",
                  "",
                  "",
                  50,
                  "",
                  "",
                  "Rejected claim",
                  "",
                  "U-001",
                  "",
                  "",
                  "EVT-001",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_getClaimsQueue } = require("../Api.js");
      const { data: result } = api_getClaimsQueue();
      expect(result.length).toBe(2);
      expect(result[0].claim_id).toBe("CLAIM-001");
      expect(result[0].status).toBe("SUBMITTED");
      expect(result[1].claim_id).toBe("CLAIM-002");
    });

    it("should filter by status", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "ExpenseClaims") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "claim_id",
                  "claimant_id",
                  "status",
                  "submitted_at",
                  "verified_at",
                  "",
                  "",
                  "",
                  "",
                  "",
                  "total_amount",
                  "",
                  "",
                  "notes",
                  "",
                  "created_by",
                  "",
                  "",
                  "event_id",
                ],
                [
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
                  100,
                  "",
                  "",
                  "Test",
                  "",
                  "U-001",
                  "",
                  "",
                  "EVT-001",
                ],
                [
                  "CLAIM-002",
                  "M-002",
                  "VERIFIED",
                  "2026-07-19",
                  "2026-07-21",
                  "",
                  "",
                  "",
                  "",
                  "",
                  200,
                  "",
                  "",
                  "Test 2",
                  "",
                  "U-002",
                  "",
                  "",
                  "EVT-002",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_getClaimsQueue } = require("../Api.js");
      const { data: result } = api_getClaimsQueue({ status: "VERIFIED" });
      expect(result.length).toBe(1);
      expect(result[0].claim_id).toBe("CLAIM-002");
    });

    it("should filter by creator", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "ExpenseClaims") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "claim_id",
                  "claimant_id",
                  "status",
                  "submitted_at",
                  "verified_at",
                  "",
                  "",
                  "",
                  "",
                  "",
                  "total_amount",
                  "",
                  "",
                  "notes",
                  "",
                  "created_by",
                  "",
                  "",
                  "event_id",
                ],
                [
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
                  100,
                  "",
                  "",
                  "Test",
                  "",
                  "U-001",
                  "",
                  "",
                  "EVT-001",
                ],
                [
                  "CLAIM-002",
                  "M-002",
                  "SUBMITTED",
                  "2026-07-19",
                  "",
                  "",
                  "",
                  "",
                  "",
                  "",
                  200,
                  "",
                  "",
                  "Test 2",
                  "",
                  "U-002",
                  "",
                  "",
                  "EVT-002",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_getClaimsQueue } = require("../Api.js");
      const { data: result } = api_getClaimsQueue({ creator: "U-002" });
      expect(result.length).toBe(1);
      expect(result[0].claim_id).toBe("CLAIM-002");
    });

    it("should filter by budget line", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "ExpenseClaims") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "claim_id",
                  "claimant_id",
                  "status",
                  "submitted_at",
                  "verified_at",
                  "",
                  "",
                  "",
                  "",
                  "",
                  "total_amount",
                  "",
                  "",
                  "notes",
                  "",
                  "created_by",
                  "",
                  "",
                  "event_id",
                ],
                [
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
                  100,
                  "",
                  "",
                  "Test",
                  "",
                  "U-001",
                  "",
                  "",
                  "EVT-001",
                ],
                [
                  "CLAIM-002",
                  "M-002",
                  "VERIFIED",
                  "2026-07-19",
                  "2026-07-21",
                  "",
                  "",
                  "",
                  "",
                  "",
                  200,
                  "",
                  "",
                  "Test 2",
                  "",
                  "U-002",
                  "",
                  "",
                  "EVT-002",
                ],
              ],
            }),
          };
        }
        if (tab === "ClaimLineItems") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "claim_line_id",
                  "claim_id",
                  "budget_line_id",
                  "receipt_id",
                  "amount",
                  "description",
                  "missing_receipt_flag",
                ],
                ["CLI-001", "CLAIM-001", "BL-001", "", 100, "Item 1", false],
                ["CLI-002", "CLAIM-002", "BL-002", "", 200, "Item 2", false],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_getClaimsQueue } = require("../Api.js");
      const { data: result } = api_getClaimsQueue({ budgetLine: "BL-001" });
      expect(result.length).toBe(1);
      expect(result[0].claim_id).toBe("CLAIM-001");
    });

    it("should filter by SID", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "ExpenseClaims") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "claim_id",
                  "claimant_id",
                  "status",
                  "submitted_at",
                  "verified_at",
                  "",
                  "",
                  "",
                  "",
                  "",
                  "total_amount",
                  "",
                  "",
                  "notes",
                  "",
                  "created_by",
                  "",
                  "",
                  "event_id",
                ],
                [
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
                  100,
                  "",
                  "",
                  "Test",
                  "",
                  "U-001",
                  "",
                  "",
                  "EVT-001",
                ],
                [
                  "CLAIM-002",
                  "M-002",
                  "VERIFIED",
                  "2026-07-19",
                  "2026-07-21",
                  "",
                  "",
                  "",
                  "",
                  "",
                  200,
                  "",
                  "",
                  "Test 2",
                  "",
                  "U-002",
                  "",
                  "",
                  "EVT-002",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      global.getVaultSheet_.mockReturnValueOnce({
        getDataRange: () => ({
          getValues: () => [
            [
              "user_id",
              "full_name",
              "student_id",
              "payout_method",
              "payout_handle",
              "consent_ts",
            ],
            ["M-001", "Alice", "12345678", "FPS", "91234567", "2026-01-01"],
          ],
        }),
      });
      const { api_getClaimsQueue } = require("../Api.js");
      const { data: result } = api_getClaimsQueue({ sid: "12345678" });
      expect(result.length).toBe(1);
      expect(result[0].claim_id).toBe("CLAIM-001");
    });
  });

  describe("api_verifyClaim", () => {
    it("should verify a claim and return status transition", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      global.Engine.transition.mockReturnValueOnce({
        from: "SUBMITTED",
        ok: true,
        selfApproved: false,
        to: "VERIFIED",
      });
      const { api_verifyClaim } = require("../Api.js");
      const { data: result } = api_verifyClaim("CLAIM-001", {
        decision_note: "Looks good",
      });
      expect(result.to).toBe("VERIFIED");
      expect(global.Engine.transition).toHaveBeenCalledWith(
        "ExpenseClaim",
        "CLAIM-001",
        "VERIFY",
        "U-001",
        { decision_note: "Looks good" }
      );
    });

    it("should throw if transition fails", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      global.Engine.transition.mockReturnValueOnce({
        ok: false,
        reason: "Self-verification not allowed",
      });
      const { api_verifyClaim } = require("../Api.js");
      const result = api_verifyClaim("CLAIM-001");
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("Self-verification not allowed");
    });
  });

  describe("api_rejectClaim", () => {
    it("should reject a claim with reason", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      global.Engine.transition.mockReturnValueOnce({
        from: "SUBMITTED",
        ok: true,
        selfApproved: false,
        to: "REJECTED",
      });
      const { api_rejectClaim } = require("../Api.js");
      const { data: result } = api_rejectClaim(
        "CLAIM-001",
        "Insufficient documentation"
      );
      expect(result.to).toBe("REJECTED");
      expect(global.Engine.transition).toHaveBeenCalledWith(
        "ExpenseClaim",
        "CLAIM-001",
        "REJECT",
        "U-001",
        { decision_note: "Insufficient documentation" }
      );
    });

    it("should throw if reason is empty", () => {
      const { api_rejectClaim } = require("../Api.js");
      const result = api_rejectClaim("CLAIM-001", "");
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("Rejection reason is required");
    });
  });

  describe("api_requestInfo", () => {
    it("should move claim to NEEDS_INFO with request note", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      global.Engine.transition.mockReturnValueOnce({
        from: "SUBMITTED",
        ok: true,
        selfApproved: false,
        to: "NEEDS_INFO",
      });
      const { api_requestInfo } = require("../Api.js");
      const { data: result } = api_requestInfo(
        "CLAIM-001",
        "Please provide original receipt"
      );
      expect(result.to).toBe("NEEDS_INFO");
      expect(global.Engine.transition).toHaveBeenCalledWith(
        "ExpenseClaim",
        "CLAIM-001",
        "REQUEST_INFO",
        "U-001",
        { decision_note: "Please provide original receipt" }
      );
    });

    it("should throw if request note is empty", () => {
      const { api_requestInfo } = require("../Api.js");
      const result = api_requestInfo("CLAIM-001", "");
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("Request note is required");
    });
  });

  describe("api_resubmitClaim", () => {
    it("should resubmit a NEEDS_INFO claim", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: [
          "CLAIM-001",
          "M-001",
          "NEEDS_INFO",
          "2026-07-20",
          "",
          "",
          "",
          "",
          "",
          "",
          100,
          false,
          false,
          "Note: Need receipt",
          "",
          "U-001",
          "2026-07-20",
          "26A",
          "",
          "FPS",
          "91234567",
        ],
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      global.Engine.transition.mockReturnValueOnce({
        from: "NEEDS_INFO",
        ok: true,
        to: "SUBMITTED",
      });
      const { api_resubmitClaim } = require("../Api.js");
      const { data: result } = api_resubmitClaim("CLAIM-001");
      expect(result.to).toBe("SUBMITTED");
      expect(global.Engine.transition).toHaveBeenCalledWith(
        "ExpenseClaim",
        "CLAIM-001",
        "RESUBMIT",
        "U-001",
        {}
      );
    });

    it("should throw if claim not found", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.Engine._loadRow.mockReturnValueOnce(null);
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_resubmitClaim } = require("../Api.js");
      const result = api_resubmitClaim("CLAIM-NOT-FOUND");
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("Claim not found");
    });
  });

  describe("api_approvePayout", () => {
    it("should approve payout for treasurer", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      global.Engine.transition.mockReturnValueOnce({
        from: "VERIFIED",
        ok: true,
        selfApproved: false,
        to: "APPROVED_FOR_PAYOUT",
      });
      const { api_approvePayout } = require("../Api.js");
      const { data: result } = api_approvePayout("CLAIM-001");
      expect(result.to).toBe("APPROVED_FOR_PAYOUT");
    });

    it("should throw for non-treasurer", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_approvePayout } = require("../Api.js");
      const result = api_approvePayout("CLAIM-001");
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("Access denied");
    });

    it("should support optional accountId parameter for treasurer", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      global.Engine.transition.mockReturnValueOnce({
        from: "VERIFIED",
        ok: true,
        selfApproved: false,
        to: "APPROVED_FOR_PAYOUT",
      });
      const { api_approvePayout } = require("../Api.js");
      const { data: result } = api_approvePayout("CLAIM-001", "AC-001");
      expect(result.to).toBe("APPROVED_FOR_PAYOUT");
      expect(global.Engine.transition).toHaveBeenCalledWith(
        "ExpenseClaim",
        "CLAIM-001",
        "APPROVE_PAYOUT",
        "U-002",
        { account_id: "AC-001" }
      );
    });
  });

  // ──────────────────────────────────────────────
  //  Finance Accounts
  // ──────────────────────────────────────────────

  describe("api_getAccounts", () => {
    it("should return accounts from FinanceAccounts sheet", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "FinanceAccounts") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "account_id",
                  "name",
                  "opening_balance",
                  "current_balance",
                  "pending_income",
                  "reserved_payouts",
                  "status",
                  "created_at",
                  "deactivated_at",
                ],
                [
                  "AC-001",
                  "Main Checking",
                  10_000,
                  12_000,
                  500,
                  300,
                  "ACTIVE",
                  "2026-07-01",
                  "",
                ],
                [
                  "AC-002",
                  "Savings",
                  5000,
                  5500,
                  0,
                  0,
                  "INACTIVE",
                  "2026-07-01",
                  "2026-07-15",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_getAccounts } = require("../Api.js");
      const { data: result } = api_getAccounts();
      expect(result.length).toBe(2);
      expect(result[0].account_id).toBe("AC-001");
      expect(result[0].name).toBe("Main Checking");
      expect(result[0].current_balance).toBe(12_000);
      expect(result[1].status).toBe("INACTIVE");
    });
  });

  describe("api_addAccount", () => {
    it("should create a new ACTIVE account", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.Ids.nextId.mockReturnValueOnce("AC-003");
      global.Audit._nowIso.mockReturnValueOnce("2026-07-22T12:00:00Z");

      const financeSheet = {
        appendRow: jest.fn(),
        getDataRange: jest.fn(() => ({
          getValues: () => [
            [
              "account_id",
              "name",
              "opening_balance",
              "current_balance",
              "pending_income",
              "reserved_payouts",
              "status",
              "created_at",
              "deactivated_at",
            ],
          ],
        })),
        getLastRow: () => 1,
        getMaxRows: () => 10,
        getRange: jest.fn(() => ({
          getValues: jest.fn(() => [
            ["AC-002", "Old", 100, 100, 0, 0, "ACTIVE", "2026-01-01", ""],
          ]),
          setValues: jest.fn(),
        })),
        insertRowAfter: jest.fn(),
      };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        if (tab === "FinanceAccounts") {
          return financeSheet;
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_addAccount } = require("../Api.js");
      const { data: result } = api_addAccount({
        name: "Petty Cash",
        opening_balance: 500,
      });
      expect(result.account_id).toBe("AC-003");
      expect(result.status).toBe("ACTIVE");
      expect(financeSheet.getRange).toHaveBeenCalledWith("A:A");
    });

    it("should throw for non-treasurer", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_addAccount } = require("../Api.js");
      const result = api_addAccount({ name: "Test" });
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("Access denied");
    });
  });

  describe("api_renameAccount", () => {
    it("should rename an ACTIVE account", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      const sheetMock = { getRange: jest.fn(() => ({ setValue: jest.fn() })) };
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        sheet: sheetMock,
        values: [
          "AC-001",
          "Old Name",
          10_000,
          12_000,
          500,
          300,
          "ACTIVE",
          "2026-07-01",
          "",
        ],
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_renameAccount } = require("../Api.js");
      const { data: result } = api_renameAccount("AC-001", "New Name");
      expect(result.name).toBe("New Name");
      expect(result.account_id).toBe("AC-001");
      expect(sheetMock.getRange).toHaveBeenCalledWith(
        2,
        global.COLS.FinanceAccounts.name
      );
    });
  });

  describe("api_deactivateAccount", () => {
    it("should deactivate an ACTIVE account", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      const sheetMock = { getRange: jest.fn(() => ({ setValue: jest.fn() })) };
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 3,
        sheet: sheetMock,
        values: [
          "AC-001",
          "Main",
          10_000,
          12_000,
          500,
          300,
          "ACTIVE",
          "2026-07-01",
          "",
        ],
      });
      global.Audit._nowIso.mockReturnValueOnce("2026-07-22T12:00:00Z");
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_deactivateAccount } = require("../Api.js");
      const { data: result } = api_deactivateAccount("AC-001");
      expect(result.status).toBe("INACTIVE");
      expect(result.account_id).toBe("AC-001");
    });
  });

  // ──────────────────────────────────────────────
  //  Income
  // ──────────────────────────────────────────────

  describe("api_recordIncome", () => {
    it("should record income as PENDING for non-treasurer", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });

      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_recordIncome } = require("../Api.js");
      const { data: result } = api_recordIncome({
        accountId: "AC-001",
        amount: 500,
        categoryId: "CAT-001",
        date: "2026-07-22",
        sourceRef: "Ticket sales",
      });
      expect(result.income_id).toBe("INC-001");
      expect(global.Engine.recordIncome).toHaveBeenCalled();
    });

    it("should record income with empty accountId successfully (no throw)", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_recordIncome } = require("../Api.js");
      const { data: result } = api_recordIncome({
        amount: 500,
        categoryId: "CAT-001",
        date: "2026-07-22",
      });
      expect(result.income_id).toBe("INC-001");
    });
  });

  describe("api_getPendingIncome", () => {
    it("should return only PENDING income items", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "Income") {
          return {
            getDataRange: () => ({
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
                ],
                [
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
                ],
                [
                  "INC-002",
                  "2026-07-21",
                  "CAT-002",
                  300,
                  "U-002",
                  "Donation",
                  "",
                  "",
                  "AC-001",
                  "CONFIRMED",
                  "U-002",
                  "2026-07-22",
                  "",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_getPendingIncome } = require("../Api.js");
      const { data: result } = api_getPendingIncome();
      expect(result.length).toBe(1);
      expect(result[0].income_id).toBe("INC-001");
    });
  });

  describe("api_confirmIncome", () => {
    it("should confirm income via Engine for treasurer", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_confirmIncome } = require("../Api.js");
      const { data: result } = api_confirmIncome("INC-001", "AC-001");
      expect(result.status).toBe("CONFIRMED");
      expect(result.account_id).toBe("AC-001");
      expect(global.Engine.confirmIncome).toHaveBeenCalledWith(
        "INC-001",
        "AC-001",
        "U-002"
      );
    });

    it("should throw for non-treasurer", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_confirmIncome } = require("../Api.js");
      const result = api_confirmIncome("INC-001", "");
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("Access denied");
    });
  });

  describe("api_rejectIncome", () => {
    it("should reject income for treasurer", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_rejectIncome } = require("../Api.js");
      const { data: result } = api_rejectIncome("INC-001", "Duplicate entry");
      expect(result.status).toBe("REJECTED");
      expect(global.Engine.rejectIncome).toHaveBeenCalledWith(
        "INC-001",
        "U-002",
        "Duplicate entry"
      );
    });
  });

  describe("api_requestIncomeInfo", () => {
    it("should request info for income", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_requestIncomeInfo } = require("../Api.js");
      const { data: result } = api_requestIncomeInfo("INC-001", "Need proof");
      expect(result.status).toBe("NEEDS_INFO");
      expect(global.Engine.requestIncomeInfo).toHaveBeenCalledWith(
        "INC-001",
        "U-002",
        "Need proof"
      );
    });
  });

  // ──────────────────────────────────────────────
  //  Adjustments & Transfers
  // ──────────────────────────────────────────────

  describe("api_recordAdjustment", () => {
    it("should record adjustment via Engine for treasurer", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_recordAdjustment } = require("../Api.js");
      const { data: result } = api_recordAdjustment({
        accountId: "AC-001",
        amount: 100,
        direction: "CREDIT",
        reason: "Correction",
      });
      expect(result.adjustment_id).toBe("ADJ-001");
      expect(result.account_id).toBe("AC-001");
      expect(global.Engine.adjustAccount).toHaveBeenCalledWith(
        "AC-001",
        100,
        "CREDIT",
        "Correction",
        "U-002"
      );
    });

    it("should throw for non-treasurer", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_recordAdjustment } = require("../Api.js");
      const result = api_recordAdjustment({
        accountId: "AC-001",
        amount: 100,
        direction: "CREDIT",
        reason: "Test",
      });
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("Access denied");
    });
  });

  describe("api_recordTransfer", () => {
    it("should record transfer via Engine for treasurer", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_recordTransfer } = require("../Api.js");
      const { data: result } = api_recordTransfer({
        amount: 200,
        fromAccountId: "AC-001",
        reason: "Reallocation",
        toAccountId: "AC-002",
      });
      expect(result.transfer_id).toBe("TRF-001");
      expect(result.from).toBe("AC-001");
      expect(global.Engine.transferBetweenAccounts).toHaveBeenCalledWith(
        "AC-001",
        "AC-002",
        200,
        "Reallocation",
        "U-002"
      );
    });
  });

  describe("api_getTransfers", () => {
    it("should return transfers sheet data", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        if (tab === "AccountTransfers") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "transfer_id",
                  "from_account_id",
                  "to_account_id",
                  "amount",
                  "reason",
                  "transferred_by",
                  "transferred_at",
                ],
                [
                  "TRF-001",
                  "AC-001",
                  "AC-002",
                  200,
                  "Reallocation",
                  "U-002",
                  "2026-07-22",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_getTransfers } = require("../Api.js");
      const { data: result } = api_getTransfers();
      expect(result.length).toBe(1);
      expect(result[0].from_account_id).toBe("AC-001");
    });
  });

  describe("api_getAdjustments", () => {
    it("should return adjustments sheet data", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        if (tab === "AccountAdjustments") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "adjustment_id",
                  "account_id",
                  "amount",
                  "direction",
                  "reason",
                  "adjusted_by",
                  "adjusted_at",
                ],
                [
                  "ADJ-001",
                  "AC-001",
                  100,
                  "CREDIT",
                  "Correction",
                  "U-002",
                  "2026-07-22",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_getAdjustments } = require("../Api.js");
      const { data: result } = api_getAdjustments();
      expect(result.length).toBe(1);
      expect(result[0].adjustment_id).toBe("ADJ-001");
    });
  });

  // ──────────────────────────────────────────────
  //  Payout Queue
  // ──────────────────────────────────────────────

  describe("api_getQueuedPayouts", () => {
    it("should return QUEUED and FAILED payouts only", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        if (tab === "Payouts") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "payout_id",
                  "claim_id",
                  "payee_user_id",
                  "amount",
                  "method",
                  "txn_reference",
                  "status",
                  "account_id",
                  "failure_reason",
                  "created_at",
                ],
                [
                  "PAYOUT-001",
                  "CLAIM-001",
                  "M-001",
                  150,
                  "FPS",
                  "",
                  "",
                  "QUEUED",
                  "",
                  "",
                  "AC-001",
                  "",
                  "",
                ],
                [
                  "PAYOUT-002",
                  "CLAIM-002",
                  "M-002",
                  200,
                  "OTHER",
                  "TX-123",
                  "U-002",
                  "SENT",
                  "2026-07-21",
                  "",
                  "AC-001",
                  "",
                  "",
                ],
                [
                  "PAYOUT-003",
                  "CLAIM-003",
                  "M-003",
                  50,
                  "FPS",
                  "",
                  "",
                  "FAILED",
                  "",
                  "",
                  "AC-001",
                  "Insufficient balance",
                  "",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_getQueuedPayouts } = require("../Api.js");
      const { data: result } = api_getQueuedPayouts();
      expect(result.length).toBe(2);
      expect(result[0].status).toBe("QUEUED");
      expect(result[1].status).toBe("FAILED");
    });

    it("should return empty array if no payouts found (available to COMMITTEE)", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_getQueuedPayouts } = require("../Api.js");
      const { data: result } = api_getQueuedPayouts();
      expect(result.length).toBe(0);
    });
  });

  describe("api_markPayoutSent", () => {
    it("should mark payout sent via Payouts module", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: [
          "PAYOUT-001",
          "CLAIM-001",
          "M-001",
          150,
          "FPS",
          "",
          "",
          "QUEUED",
          "",
          "",
          "AC-001",
          "",
          "",
        ],
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_markPayoutSent } = require("../Api.js");
      const { data: result } = api_markPayoutSent("PAYOUT-001", {
        txnReference: "FPS-REF-123",
      });
      expect(result.status).toBe("SENT");
      expect(global.Payouts.markPayoutSent).toHaveBeenCalledWith(
        "PAYOUT-001",
        150,
        "FPS",
        "FPS-REF-123",
        "U-002"
      );
    });

    it("should throw for non-treasurer", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "test@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_markPayoutSent } = require("../Api.js");
      const result = api_markPayoutSent("PAYOUT-001", {});
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain("Access denied");
    });
  });

  describe("api_recordPayoutFailed", () => {
    it("should record payout failure via Payouts module", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_recordPayoutFailed } = require("../Api.js");
      const { data: result } = api_recordPayoutFailed(
        "PAYOUT-001",
        "Bank details incorrect"
      );
      expect(result.status).toBe("FAILED");
      expect(result.payout_id).toBe("PAYOUT-001");
      expect(global.Payouts.recordPayoutFailed).toHaveBeenCalled();
    });
  });

  describe("api_retryPayout", () => {
    it("should retry a failed payout via Payouts module", () => {
      global.Session.getActiveUser.mockReturnValueOnce({
        getEmail: () => "treasurer@example.com",
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [
                  "user_id",
                  "display_name",
                  "role",
                  "email",
                  "active",
                  "created_at",
                ],
                [
                  "U-002",
                  "Treasurer",
                  "TREASURER",
                  "treasurer@example.com",
                  true,
                  "2026-01-01",
                ],
              ],
            }),
          };
        }
        return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      const { api_retryPayout } = require("../Api.js");
      const { data: result } = api_retryPayout("PAYOUT-001");
      expect(result.status).toBe("QUEUED");
      expect(global.Payouts.retryPayout).toHaveBeenCalledWith(
        "PAYOUT-001",
        "U-002"
      );
    });
  });

  describe("api_getMyClaims draft boolean", () => {
    it("should return draft: true for DRAFT claims", () => {
      global.Engine._findRowsByColumn.mockImplementation(
        (sheet, _colIndex, _userId) => {
          if (sheet.name === global.TABS.EXPENSE_CLAIMS) {
            return [
              {
                rowIndex: 2,
                values: [
                  "C-DRAFT",
                  "U-001",
                  "DRAFT",
                  "",
                  null,
                  null,
                  null,
                  null,
                  null,
                  null,
                  100,
                  false,
                  false,
                  "notes",
                ],
              },
            ];
          }
          return [];
        }
      );
      const { api_getMyClaims } = require("../Api.js");
      const { data: result } = api_getMyClaims();
      expect(result.claims[0].draft).toBe(true);
      expect(result.claims[0].claim_id).toBe("C-DRAFT");
    });

    it("should return draft: false for SUBMITTED claims", () => {
      global.Engine._findRowsByColumn.mockImplementation(
        (sheet, _colIndex, _userId) => {
          if (sheet.name === global.TABS.EXPENSE_CLAIMS) {
            return [
              {
                rowIndex: 2,
                values: [
                  "C-100",
                  "U-001",
                  "SUBMITTED",
                  "2026-07-16",
                  null,
                  null,
                  null,
                  null,
                  null,
                  null,
                  150,
                  false,
                  false,
                  "notes",
                ],
              },
            ];
          }
          return [];
        }
      );
      const { api_getMyClaims } = require("../Api.js");
      const { data: result } = api_getMyClaims();
      expect(result.claims[0].draft).toBe(false);
    });
  });

  describe("api_editClaim optional eventId", () => {
    var mockExpenseSheet;
    var mockCliSheet;

    beforeEach(() => {
      global.Session.getActiveUser.mockReturnValue({
        getEmail: () => "test@example.com",
      });
      mockExpenseSheet = {
        getDataRange: () => ({
          getValues: () => [
            [],
            [
              "C-1",
              "U-001",
              "SUBMITTED",
              "2023-01-01",
              null,
              null,
              null,
              null,
              null,
              null,
              150,
              null,
              null,
              null,
              "Note",
              null,
              "U-001",
              "",
              "",
              "",
              "",
              "",
            ],
          ],
        }),
        getRange: jest.fn(() => ({ setValue: jest.fn() })),
      };
      mockCliSheet = {
        getDataRange: () => ({
          getValues: () => [[], ["CL-1", "C-1", "BL-1", "R-1", 150, "Note"]],
        }),
        getRange: jest.fn(() => ({ setValue: jest.fn() })),
      };
      global.getSheet_.mockImplementation((tab) => {
        if (tab === "Users") {
          return {
            getDataRange: () => ({
              getValues: () => [
                [],
                [
                  "U-001",
                  "Test User",
                  "COMMITTEE",
                  "test@example.com",
                  true,
                  "2026-01-01",
                ],
                ["M-001", "Alice", "MEMBER", "", true, "2026-01-01"],
              ],
            }),
          };
        }
        if (tab === "ExpenseClaims") {
          return mockExpenseSheet;
        }
        if (tab === "ClaimLineItems") {
          return mockCliSheet;
        }
        return {
          getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
          getLastRow: jest.fn(() => 1),
          getMaxRows: jest.fn(() => 100),
          getRange: jest.fn(() => ({
            getValues: jest.fn(() => [[]]),
            setValue: jest.fn(),
            setValues: jest.fn(),
          })),
          appendRow: jest.fn(),
          name: tab,
        };
      });
    });

    it("should write event_id and include in audit when eventId is present", () => {
      var auditArgs;
      global.Audit.append = jest.fn(function () {
        auditArgs = arguments;
      });
      const { api_editClaim } = require("../Api.js");
      const result = api_editClaim({
        amount: 300,
        claimId: "C-1",
        notes: "Updated",
        eventId: "EVENT-001",
      });
      expect(result.ok).toBe(true);
      expect(result.data.success).toBe(true);
      expect(mockExpenseSheet.getRange).toHaveBeenCalledWith(2, 19);
      expect(global.Audit.append).toHaveBeenCalledWith(
        "U-001",
        "ExpenseClaim",
        "C-1",
        "UPDATE",
        expect.objectContaining({ amount: 300, event_id: "EVENT-001" })
      );
    });

    it("should not write event_id or include in audit when eventId is absent", () => {
      global.Audit.append = jest.fn();
      const { api_editClaim } = require("../Api.js");
      const result = api_editClaim({
        amount: 200,
        claimId: "C-1",
        notes: "No event",
      });
      expect(result.ok).toBe(true);
      // event_id column (19) should not have been set; the claim has col 19 at index 18
      // Verify the audit detail only has amount
      expect(global.Audit.append).toHaveBeenCalledWith(
        "U-001",
        "ExpenseClaim",
        "C-1",
        "UPDATE",
        { amount: 200 }
      );
    });
  });

  describe("api_getClaimDraft", () => {
    beforeEach(() => {
      global.Session.getActiveUser.mockReturnValue({
        getEmail: () => "test@example.com",
      });
    });

    it("should return full claim draft shape", () => {
      global.Engine._loadRow.mockImplementation((entityType) => {
        if (entityType === "ExpenseClaim") {
          return {
            rowIndex: 2,
            sheet: {
              name: "ExpenseClaims",
              getRange: jest.fn(() => ({ setValue: jest.fn() })),
            },
            values: [
              "C-DRAFT", // claim_id
              "M-001", // claimant_id
              "DRAFT", // status
              "", // submitted_at
              "", // verified_at
              "", // approved_at
              "", // paid_at
              "", // locked_at
              "", // verified_by
              "", // approved_by
              250, // total_amount
              false, // late_flag
              false, // self_approved
              "Test notes", // notes
              "uuid-123", // processed_response_id
              "U-001", // created_by
              "2026-07-20", // expense_date
              "S1-2026", // semester
              "EVENT-001", // event_id
              "FPS", // payout_method
              '{"method":"FPS","phone":"91234567","account":"123456"}', // payout_handle
            ],
          };
        }
        return null;
      });
      global.Engine._findRowsByColumn.mockImplementation(() => {
        return [
          {
            values: [
              "CL-1", // claim_line_id
              "C-DRAFT", // claim_id
              "BL-1", // budget_line_id
              "RECEIPT-001", // receipt_id
              250, // amount
              "Test notes", // description
              false, // missing_receipt_flag
            ],
          },
        ];
      });

      const { api_getClaimDraft } = require("../Api.js");
      const { data: result } = api_getClaimDraft("C-DRAFT");

      expect(result.claim_id).toBe("C-DRAFT");
      expect(result.claimant_id).toBe("M-001");
      expect(result.status).toBe("DRAFT");
      expect(result.draft).toBe(true);
      expect(result.notes).toBe("Test notes");
      expect(result.event_id).toBe("EVENT-001");
      expect(result.expense_date).toBe("2026-07-20");
      expect(result.semester).toBe("S1-2026");
      expect(result.payout_method).toBe("FPS");
      expect(result.payout_handle).toBe(
        '{"method":"FPS","phone":"91234567","account":"123456"}'
      );
      expect(result.total_amount).toBe(250);
      expect(result.created_by).toBe("U-001");
      expect(result.uuid).toBe("uuid-123");
      expect(result.line_items).toHaveLength(1);
      expect(result.line_items[0].claim_line_id).toBe("CL-1");
      expect(result.line_items[0].receipt_id).toBe("RECEIPT-001");
      expect(result.line_items[0].budget_line_id).toBe("BL-1");
      expect(result.line_items[0].amount).toBe(250);
      expect(result.line_items[0].description).toBe("Test notes");
      expect(result.line_items[0].missing_receipt_flag).toBe(false);
    });

    it("should reject non-DRAFT claim with ILLEGAL_STATE", () => {
      global.Engine._loadRow.mockImplementation((entityType) => {
        if (entityType === "ExpenseClaim") {
          return {
            rowIndex: 2,
            sheet: { name: "ExpenseClaims" },
            values: [
              "C-SUB",
              "U-001",
              "SUBMITTED",
              "2023-01-01",
              null,
              null,
              null,
              null,
              null,
              null,
              150,
              false,
              false,
              "Notes",
              "uuid-1",
              "U-001",
            ],
          };
        }
        return null;
      });
      const { api_getClaimDraft } = require("../Api.js");
      const result = api_getClaimDraft("C-SUB");
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("ILLEGAL_STATE");
      expect(result.error.message).toContain("DRAFT");
    });

    it("should reject claim not owned by caller", () => {
      global.Engine._loadRow.mockImplementation((entityType) => {
        if (entityType === "ExpenseClaim") {
          return {
            rowIndex: 2,
            sheet: { name: "ExpenseClaims" },
            values: [
              "C-DRAFT",
              "U-002",
              "DRAFT",
              "",
              null,
              null,
              null,
              null,
              null,
              null,
              100,
              false,
              false,
              "Notes",
              "uuid-2",
              "U-002",
            ],
          };
        }
        return null;
      });
      const { api_getClaimDraft } = require("../Api.js");
      const result = api_getClaimDraft("C-DRAFT");
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("AUTH_DENIED");
    });

    it("should reject not-found claim", () => {
      global.Engine._loadRow.mockImplementation(() => null);
      const { api_getClaimDraft } = require("../Api.js");
      const result = api_getClaimDraft("NONEXISTENT");
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Event CRUD", () => {
    beforeEach(() => {
      global.Session.getActiveUser.mockReturnValue({
        getEmail: () => "test@example.com",
      });
      global.Ids.nextId.mockReset();
      global.Ids.nextId.mockReturnValue("EVENT-001");
    });

    describe("api_listEvents", () => {
      it("should return empty list when no events exist", () => {
        global.getSheet_.mockImplementation((tab) => {
          if (tab === "Users") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "U-001",
                    "Test",
                    "COMMITTEE",
                    "test@example.com",
                    true,
                    "2026-01-01",
                  ],
                ],
              }),
            };
          }
          if (tab === "Events") {
            return { getDataRange: () => ({ getValues: () => [[]] }) };
          }
          return {
            getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
            name: tab,
          };
        });
        const { api_listEvents } = require("../Api.js");
        const { data: result, ok } = api_listEvents();
        expect(ok).toBe(true);
        expect(result).toEqual([]);
      });

      it("should return all events", () => {
        global.getSheet_.mockImplementation((tab) => {
          if (tab === "Users") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "U-001",
                    "Test",
                    "COMMITTEE",
                    "test@example.com",
                    true,
                    "2026-01-01",
                  ],
                ],
              }),
            };
          }
          if (tab === "Events") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [
                    "event_id",
                    "name",
                    "semester",
                    "owner_user_id",
                    "created_at",
                    "status",
                    "closed_at",
                  ],
                  [
                    "EVENT-001",
                    "Orientation",
                    "S1-2026",
                    "U-001",
                    "2026-07-01",
                    "OPEN",
                    "",
                  ],
                  [
                    "EVENT-002",
                    "AGM",
                    "S1-2026",
                    "U-002",
                    "2026-07-15",
                    "CLOSED",
                    "2026-07-20",
                  ],
                ],
              }),
            };
          }
          return {
            getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
            name: tab,
          };
        });
        const { api_listEvents } = require("../Api.js");
        const { data: result } = api_listEvents();
        expect(result).toHaveLength(2);
        expect(result[0].event_id).toBe("EVENT-001");
        expect(result[0].status).toBe("OPEN");
        expect(result[0].semester).toBe("S1-2026");
        expect(result[0].name).toBe("Orientation");
        expect(result[0].owner_user_id).toBe("U-001");
        expect(result[1].event_id).toBe("EVENT-002");
        expect(result[1].status).toBe("CLOSED");
        expect(result[1].closed_at).toBe("2026-07-20");
      });
    });

    describe("api_createEvent", () => {
      it("should create an event with EVENT-N id and OPEN status", () => {
        var auditArgs;
        global.Audit.append = jest.fn(function () {
          auditArgs = arguments;
        });
        var appendRowArg;
        global.getSheet_.mockImplementation((tab) => {
          if (tab === "Users") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "U-001",
                    "Test",
                    "COMMITTEE",
                    "test@example.com",
                    true,
                    "2026-01-01",
                  ],
                ],
              }),
            };
          }
          if (tab === "Events") {
            return {
              appendRow: jest.fn(function () {
                appendRowArg = arguments;
              }),
              getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
              getLastRow: jest.fn(() => 1),
              getMaxRows: jest.fn(() => 100),
              getRange: jest.fn(() => ({
                getValues: jest.fn(() => [[]]),
                setValue: jest.fn(),
                setValues: jest.fn(),
              })),
              name: tab,
            };
          }
          return {
            getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
            name: tab,
          };
        });
        const { api_createEvent } = require("../Api.js");
        const { data: result } = api_createEvent({
          name: "Test Event",
          semester: "S1-2026",
        });
        expect(result.event_id).toBe("EVENT-001");
        expect(result.status).toBe("OPEN");
        expect(global.Audit.append).toHaveBeenCalledWith(
          "U-001",
          "Event",
          "EVENT-001",
          "CREATE",
          { name: "Test Event", owner_user_id: "U-001", semester: "S1-2026" }
        );
      });

      it("should reject empty name", () => {
        const { api_createEvent } = require("../Api.js");
        const result = api_createEvent({ name: "", semester: "S1-2026" });
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("INVALID_INPUT");
      });

      it("should reject empty semester", () => {
        const { api_createEvent } = require("../Api.js");
        const result = api_createEvent({ name: "Test", semester: "" });
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("INVALID_INPUT");
      });

      it("should reject MEMBER caller", () => {
        global.Session.getActiveUser.mockReturnValue({
          getEmail: () => "member@example.com",
        });
        global.getSheet_.mockImplementation((tab) => {
          if (tab === "Users") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "U-MEMBER",
                    "Member",
                    "MEMBER",
                    "member@example.com",
                    true,
                    "2026-01-01",
                  ],
                ],
              }),
            };
          }
          return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
        });
        const { api_createEvent } = require("../Api.js");
        const result = api_createEvent({ name: "Test", semester: "S1-2026" });
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("AUTH_DENIED");
      });

      it("should reject TREASURER caller (Committee only)", () => {
        global.getSheet_.mockImplementation((tab) => {
          if (tab === "Users") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "U-TREAS",
                    "Treasurer",
                    "TREASURER",
                    "treas@example.com",
                    true,
                    "2026-01-01",
                  ],
                ],
              }),
            };
          }
          return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
        });
        const { api_createEvent } = require("../Api.js");
        const result = api_createEvent({
          name: "Test",
          semester: "S1-2026",
        });
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("AUTH_DENIED");
      });
    });

    describe("api_editEvent", () => {
      it("should edit an OPEN event's name and semester", () => {
        global.getSheet_.mockImplementation((tab) => {
          if (tab === "Users") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "U-001",
                    "Test",
                    "COMMITTEE",
                    "test@example.com",
                    true,
                    "2026-01-01",
                  ],
                ],
              }),
            };
          }
          if (tab === "Events") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "EVENT-001",
                    "Old Name",
                    "S1-2026",
                    "U-001",
                    "2026-07-01",
                    "OPEN",
                    "",
                  ],
                ],
              }),
            };
          }
          return {
            getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
            getRange: jest.fn(() => ({
              setValue: jest.fn(),
              getValues: jest.fn(() => [[]]),
            })),
            name: tab,
          };
        });
        var sheetRangeSpy = jest.fn(() => ({ setValue: jest.fn() }));
        global.getSheet_.mockImplementation((tab) => {
          if (tab === "Users") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "U-001",
                    "Test",
                    "COMMITTEE",
                    "test@example.com",
                    true,
                    "2026-01-01",
                  ],
                ],
              }),
            };
          }
          if (tab === "Events") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "EVENT-001",
                    "Old Name",
                    "S1-2026",
                    "U-001",
                    "2026-07-01",
                    "OPEN",
                    "",
                  ],
                ],
              }),
              getRange: sheetRangeSpy,
            };
          }
          return {
            getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
            getRange: jest.fn(() => ({
              setValue: jest.fn(),
              getValues: jest.fn(() => [[]]),
            })),
            name: tab,
          };
        });
        const { api_editEvent } = require("../Api.js");
        const { data: result } = api_editEvent({
          event_id: "EVENT-001",
          name: "New Name",
          semester: "S2-2026",
        });
        expect(result.event_id).toBe("EVENT-001");
        expect(global.Audit.append).toHaveBeenCalledWith(
          "U-001",
          "Event",
          "EVENT-001",
          "UPDATE",
          { changed: { name: "New Name", semester: "S2-2026" } }
        );
      });

      it("should reject editing a CLOSED event", () => {
        global.getSheet_.mockImplementation((tab) => {
          if (tab === "Users") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "U-001",
                    "Test",
                    "COMMITTEE",
                    "test@example.com",
                    true,
                    "2026-01-01",
                  ],
                ],
              }),
            };
          }
          if (tab === "Events") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "EVENT-002",
                    "Closed",
                    "S1-2026",
                    "U-001",
                    "2026-07-01",
                    "CLOSED",
                    "2026-07-20",
                  ],
                ],
              }),
            };
          }
          return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
        });
        const { api_editEvent } = require("../Api.js");
        const result = api_editEvent({ event_id: "EVENT-002", name: "New" });
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("ILLEGAL_STATE");
      });

      it("should reject TREASURER caller (Committee only)", () => {
        global.Session.getActiveUser.mockReturnValue({
          getEmail: () => "treasurer@example.com",
        });
        global.getSheet_.mockImplementation((tab) => {
          if (tab === "Users") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "U-TREAS",
                    "Treasurer",
                    "TREASURER",
                    "treas@example.com",
                    true,
                    "2026-01-01",
                  ],
                ],
              }),
            };
          }
          return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
        });
        const { api_editEvent } = require("../Api.js");
        const result = api_editEvent({
          event_id: "EVENT-001",
          name: "Try edit",
        });
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("AUTH_DENIED");
      });
    });

    describe("api_correctEvent", () => {
      it("should correct a CLOSED event (treasurer override)", () => {
        global.Session.getActiveUser.mockReturnValue({
          getEmail: () => "treasurer@example.com",
        });
        global.getSheet_.mockImplementation((tab) => {
          if (tab === "Users") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "U-002",
                    "Treasurer",
                    "TREASURER",
                    "treasurer@example.com",
                    true,
                    "2026-01-01",
                  ],
                ],
              }),
            };
          }
          if (tab === "Events") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "EVENT-002",
                    "Closed Event",
                    "S1-2026",
                    "U-001",
                    "2026-07-01",
                    "CLOSED",
                    "2026-07-20",
                  ],
                ],
              }),
              getRange: jest.fn(() => ({ setValue: jest.fn() })),
            };
          }
          return {
            getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
            getRange: jest.fn(() => ({ setValue: jest.fn() })),
            name: tab,
          };
        });
        const { api_correctEvent } = require("../Api.js");
        const { data: result } = api_correctEvent({
          event_id: "EVENT-002",
          name: "Corrected Name",
        });
        expect(result.event_id).toBe("EVENT-002");
        expect(global.Audit.append).toHaveBeenCalledWith(
          "U-002",
          "Event",
          "EVENT-002",
          "CORRECT",
          { changed: { name: "Corrected Name" } }
        );
      });

      it("should reject non-treasurer caller", () => {
        global.Session.getActiveUser.mockReturnValue({
          getEmail: () => "committee@example.com",
        });
        global.getSheet_.mockImplementation((tab) => {
          if (tab === "Users") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "U-003",
                    "Committee",
                    "COMMITTEE",
                    "committee@example.com",
                    true,
                    "2026-01-01",
                  ],
                ],
              }),
            };
          }
          return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
        });
        const { api_correctEvent } = require("../Api.js");
        const result = api_correctEvent({ event_id: "EVENT-001", name: "New" });
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("AUTH_DENIED");
      });
    });

    describe("api_closeEvent", () => {
      it("should close an OPEN event", () => {
        global.Session.getActiveUser.mockReturnValue({
          getEmail: () => "treasurer@example.com",
        });
        global.getSheet_.mockImplementation((tab) => {
          if (tab === "Users") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "U-002",
                    "Treasurer",
                    "TREASURER",
                    "treasurer@example.com",
                    true,
                    "2026-01-01",
                  ],
                ],
              }),
            };
          }
          if (tab === "Events") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "EVENT-001",
                    "Open Event",
                    "S1-2026",
                    "U-001",
                    "2026-07-01",
                    "OPEN",
                    "",
                  ],
                ],
              }),
              getRange: jest.fn(() => ({ setValue: jest.fn() })),
            };
          }
          return {
            getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
            name: tab,
          };
        });
        const { api_closeEvent } = require("../Api.js");
        const { data: result } = api_closeEvent({
          event_id: "EVENT-001",
          reason: "Event completed",
        });
        expect(result.event_id).toBe("EVENT-001");
        expect(result.status).toBe("CLOSED");
        expect(global.Audit.append).toHaveBeenCalledWith(
          "U-002",
          "Event",
          "EVENT-001",
          "CLOSE",
          { reason: "Event completed" }
        );
      });

      it("should reject closing an already CLOSED event", () => {
        global.Session.getActiveUser.mockReturnValue({
          getEmail: () => "treasurer@example.com",
        });
        global.getSheet_.mockImplementation((tab) => {
          if (tab === "Users") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "U-002",
                    "Treasurer",
                    "TREASURER",
                    "treasurer@example.com",
                    true,
                    "2026-01-01",
                  ],
                ],
              }),
            };
          }
          if (tab === "Events") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "EVENT-002",
                    "Closed Event",
                    "S1-2026",
                    "U-001",
                    "2026-07-01",
                    "CLOSED",
                    "2026-07-20",
                  ],
                ],
              }),
            };
          }
          return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
        });
        const { api_closeEvent } = require("../Api.js");
        const result = api_closeEvent({
          event_id: "EVENT-002",
          reason: "Trying again",
        });
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("ILLEGAL_STATE");
      });

      it("should reject missing reason", () => {
        global.Session.getActiveUser.mockReturnValue({
          getEmail: () => "treasurer@example.com",
        });
        global.getSheet_.mockImplementation((tab) => {
          if (tab === "Users") {
            return {
              getDataRange: () => ({
                getValues: () => [
                  [],
                  [
                    "U-002",
                    "Treasurer",
                    "TREASURER",
                    "treasurer@example.com",
                    true,
                    "2026-01-01",
                  ],
                ],
              }),
            };
          }
          return { getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
        });
        const { api_closeEvent } = require("../Api.js");
        const result = api_closeEvent({ event_id: "EVENT-001", reason: "" });
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("INVALID_INPUT");
      });
    });
  });
});
