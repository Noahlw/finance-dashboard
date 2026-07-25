"use strict";

const originalGlobals = {
  COLS: global.COLS,
  getSheet_: global.getSheet_,
  MovementLedger: global.MovementLedger,
  STATUS: global.STATUS,
  TABS: global.TABS,
};

describe("Reconciliation", () => {
  beforeEach(() => {
    jest.resetModules();
    global.TABS = {
      FINANCE_ACCOUNTS: "FinanceAccounts",
      PAYOUTS: "Payouts",
    };
    global.COLS = {
      FinanceAccounts: {
        account_id: 1,
        current_balance: 4,
        name: 2,
        opening_balance: 3,
      },
      Payouts: {
        amount: 4,
        claim_id: 2,
        failure_reason: 12,
        payout_id: 1,
        status: 8,
      },
    };
    global.STATUS = {
      Payout: {
        FAILED: "FAILED",
        QUEUED: "QUEUED",
        SENT: "SENT",
      },
    };
    global.MovementLedger = {
      list: jest.fn(() => [
        {
          account_id: "A-1",
          amount: 200,
          movement_type: "INCOME",
        },
        {
          account_id: "A-1",
          amount: -50,
          movement_type: "PAYOUT",
        },
      ]),
    };
    global.getSheet_ = jest.fn((name) => ({
      getDataRange: () => ({
        getValues: () =>
          name === "FinanceAccounts"
            ? [
                ["account_id", "name", "opening_balance", "current_balance"],
                ["A-1", "Main", 100, 260],
              ]
            : [
                [],
                ["P-1", "C-1", "", 50, "", "", "", "QUEUED", "", "", "", ""],
              ],
      }),
    }));
  });

  afterEach(() => {
    Object.assign(global, originalGlobals);
  });

  it("derives expected balances and incomplete payouts from source records", () => {
    const { Reconciliation } = require("../Reconciliation");
    const result = Reconciliation.build();

    expect(result.accounts[0]).toEqual(
      expect.objectContaining({
        actual_balance: 260,
        difference: 10,
        expected_balance: 250,
        ledger_total: 150,
      })
    );
    expect(result.mismatches).toHaveLength(1);
    expect(result.incomplete_payouts[0].payout_id).toBe("P-1");
  });
});
