"use strict";

const originalGlobals = {
  _appendRow: global._appendRow,
  Audit: global.Audit,
  COLS: global.COLS,
  Discord: global.Discord,
  Engine: global.Engine,
  getSheet_: global.getSheet_,
  Ids: global.Ids,
  LockService: global.LockService,
  MovementLedger: global.MovementLedger,
  ROLES: global.ROLES,
  STATUS: global.STATUS,
  TABS: global.TABS,
};

describe("Payout movement posting", () => {
  let payoutValues;
  let payoutRow;

  beforeEach(() => {
    jest.resetModules();
    payoutValues = [
      "P-1",
      "C-1",
      "M-1",
      100,
      "",
      "",
      "",
      "QUEUED",
      "",
      "",
      "A-1",
      "",
      "",
    ];
    payoutRow = {
      rowIndex: 2,
      sheet: {
        getRange: jest.fn((_row, column) => ({
          setValue: jest.fn((value) => {
            payoutValues[column - 1] = value;
          }),
        })),
      },
      values: payoutValues,
    };
    global.TABS = { PAYOUTS: "Payouts" };
    global.COLS = {
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
    };
    global.STATUS = {
      Payout: {
        CONFIRMED: "CONFIRMED",
        FAILED: "FAILED",
        QUEUED: "QUEUED",
        SENT: "SENT",
      },
    };
    global.ROLES = { TREASURER: "TREASURER" };
    global.LockService = {
      getScriptLock: () => ({
        releaseLock: jest.fn(),
        waitLock: jest.fn(),
      }),
    };
    global.Engine = {
      _loadActor: jest.fn(() => ({ role: "TREASURER" })),
      _loadRow: jest.fn((type) =>
        type === "Payout" ? payoutRow : { values: [] }
      ),
    };
    global.MovementLedger = { post: jest.fn(() => ({ ok: true })) };
    global.Audit = {
      _nowIso: jest.fn(() => "2026-07-23T00:00:00Z"),
      append: jest.fn(),
    };
    global.Discord = { postTreasury: jest.fn() };
    global.Ids = { nextId: jest.fn(() => "P-2") };
    global._appendRow = jest.fn();
    global.getSheet_ = jest.fn();
  });

  afterEach(() => {
    Object.assign(global, originalGlobals);
  });

  it("posts one payout movement when a full payout is sent", () => {
    const { Payouts } = require("../Payouts");

    const result = Payouts.markPayoutSent(
      "P-1",
      100,
      "FPS",
      "PRIVATE-REFERENCE",
      "U-1"
    );

    expect(result.ok).toBe(true);
    expect(global.MovementLedger.post).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: -100,
        idempotencyKey: "payout:P-1:sent",
        movementType: "PAYOUT",
      })
    );
    expect(global.Discord.postTreasury).not.toHaveBeenCalledWith(
      expect.stringContaining("PRIVATE-REFERENCE")
    );
  });

  it("does not post money for a queued payout failure", () => {
    const { Payouts } = require("../Payouts");

    const result = Payouts.recordPayoutFailed("P-1", "Declined", "U-1");

    expect(result.ok).toBe(true);
    expect(global.MovementLedger.post).not.toHaveBeenCalled();
  });
});
