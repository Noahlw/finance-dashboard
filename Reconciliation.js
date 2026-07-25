"use strict";

var Reconciliation = {
  build() {
    var movements = MovementLedger.list();
    var totalsByAccount = {};
    var drilldown = {
      adjustments: [],
      income: [],
      payouts: [],
      transfers: [],
    };
    for (var i = 0; i < movements.length; i++) {
      var movement = movements[i];
      totalsByAccount[movement.account_id] =
        (totalsByAccount[movement.account_id] || 0) + movement.amount;
      if (movement.movement_type === "INCOME") {
        drilldown.income.push(movement);
      } else if (movement.movement_type === "PAYOUT") {
        drilldown.payouts.push(movement);
      } else if (
        movement.movement_type === "TRANSFER_IN" ||
        movement.movement_type === "TRANSFER_OUT"
      ) {
        drilldown.transfers.push(movement);
      } else {
        drilldown.adjustments.push(movement);
      }
    }

    var accountValues = getSheet_(TABS.FINANCE_ACCOUNTS)
      .getDataRange()
      .getValues();
    var ac = COLS.FinanceAccounts;
    var accounts = [];
    var mismatches = [];
    for (
      var accountIndex = 1;
      accountIndex < accountValues.length;
      accountIndex++
    ) {
      var accountId = accountValues[accountIndex][ac.account_id - 1];
      if (!accountId) {
        continue;
      }
      var opening =
        Number(accountValues[accountIndex][ac.opening_balance - 1]) || 0;
      var ledgerTotal = totalsByAccount[accountId] || 0;
      var expected = Math.round((opening + ledgerTotal) * 100) / 100;
      var actual =
        Number(accountValues[accountIndex][ac.current_balance - 1]) || 0;
      var difference = Math.round((actual - expected) * 100) / 100;
      var comparison = {
        account_id: accountId,
        actual_balance: actual,
        difference,
        expected_balance: expected,
        ledger_total: ledgerTotal,
        name: accountValues[accountIndex][ac.name - 1],
        opening_balance: opening,
      };
      accounts.push(comparison);
      if (Math.abs(difference) >= 0.005) {
        mismatches.push(comparison);
      }
    }

    var payoutValues = getSheet_(TABS.PAYOUTS).getDataRange().getValues();
    var pc = COLS.Payouts;
    var incompletePayouts = [];
    for (
      var payoutIndex = 1;
      payoutIndex < payoutValues.length;
      payoutIndex++
    ) {
      var status = payoutValues[payoutIndex][pc.status - 1];
      if (
        status !== STATUS.Payout.FAILED &&
        status !== STATUS.Payout.QUEUED &&
        status !== STATUS.Payout.SENT
      ) {
        continue;
      }
      incompletePayouts.push({
        amount: Number(payoutValues[payoutIndex][pc.amount - 1]) || 0,
        claim_id: payoutValues[payoutIndex][pc.claim_id - 1],
        failure_reason: payoutValues[payoutIndex][pc.failure_reason - 1] || "",
        payout_id: payoutValues[payoutIndex][pc.payout_id - 1],
        status,
      });
    }

    return {
      accounts,
      drilldown,
      incomplete_payouts: incompletePayouts,
      mismatches,
      movement_count: movements.length,
    };
  },

  correct(accountId, amount, direction, reason, actorUserId) {
    if (!(reason && String(reason).trim())) {
      return { ok: false, reason: "Correction reason is required." };
    }
    var result = Engine.adjustAccount(
      accountId,
      amount,
      direction,
      reason,
      actorUserId
    );
    if (result.ok) {
      Audit.append(actorUserId, "Reconciliation", accountId, "CORRECT", {
        adjustmentId: result.adjustmentId,
        amount,
        direction,
        reason,
      });
    }
    return result;
  },
};

if (typeof module !== "undefined") {
  module.exports = { Reconciliation };
}
