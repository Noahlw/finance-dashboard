"use strict";

const originalGlobals = {
  _appendRow: global._appendRow,
  Audit: global.Audit,
  COLS: global.COLS,
  Engine: global.Engine,
  getSheet_: global.getSheet_,
  Ids: global.Ids,
  TABS: global.TABS,
};

describe("MovementLedger", () => {
  let rows;
  let balance;
  let ledgerSheet;
  let accountSheet;
  let MovementLedger;

  beforeEach(() => {
    jest.resetModules();
    rows = [
      [
        "movement_id",
        "idempotency_key",
        "account_id",
        "amount",
        "movement_type",
        "source_type",
        "source_id",
        "counterparty_account_id",
        "posted_by",
        "posted_at",
        "reason",
      ],
    ];
    balance = 100;
    ledgerSheet = {
      getDataRange: () => ({ getValues: () => rows }),
    };
    accountSheet = {
      getRange: jest.fn(() => ({
        setValue: jest.fn((value) => {
          balance = value;
        }),
      })),
    };
    global.TABS = { MOVEMENT_LEDGER: "MovementLedger" };
    global.COLS = {
      FinanceAccounts: { current_balance: 4 },
      MovementLedger: {
        account_id: 3,
        amount: 4,
        counterparty_account_id: 8,
        idempotency_key: 2,
        movement_id: 1,
        movement_type: 5,
        posted_at: 10,
        posted_by: 9,
        reason: 11,
        source_id: 7,
        source_type: 6,
      },
    };
    global.getSheet_ = jest.fn(() => ledgerSheet);
    global.Engine = {
      _loadRow: jest.fn(() => ({
        rowIndex: 2,
        sheet: accountSheet,
        values: ["A-1", "Main", 100, balance],
      })),
    };
    global.Ids = { nextId: jest.fn(() => "MOVEMENT-1") };
    global.Audit = {
      _nowIso: jest.fn(() => "2026-07-23T00:00:00Z"),
      append: jest.fn(),
    };
    global._appendRow = jest.fn((_sheet, row) => rows.push(row));
    MovementLedger = require("../MovementLedger").MovementLedger;
  });

  afterEach(() => {
    Object.assign(global, originalGlobals);
  });

  it("posts a signed movement and updates the balance", () => {
    const result = MovementLedger.post({
      accountId: "A-1",
      actorUserId: "U-1",
      amount: -25,
      idempotencyKey: "payout:P-1:sent",
      movementType: "PAYOUT",
      sourceId: "P-1",
      sourceType: "Payout",
    });

    expect(result.duplicate).toBe(false);
    expect(balance).toBe(75);
    expect(global.Audit.append).toHaveBeenCalledWith(
      "U-1",
      "Movement",
      "MOVEMENT-1",
      "POST",
      expect.objectContaining({ amount: -25 })
    );
  });

  it("does not double-post an existing idempotency key", () => {
    const movement = {
      accountId: "A-1",
      actorUserId: "U-1",
      amount: 50,
      idempotencyKey: "income:I-1",
      movementType: "INCOME",
      sourceId: "I-1",
      sourceType: "Income",
    };
    MovementLedger.post(movement);
    const result = MovementLedger.post(movement);

    expect(result.duplicate).toBe(true);
    expect(global._appendRow).toHaveBeenCalledTimes(1);
    expect(accountSheet.getRange).toHaveBeenCalledTimes(1);
  });
});
