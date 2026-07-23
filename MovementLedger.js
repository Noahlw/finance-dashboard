"use strict";

/**
 * Append-only monetary movement service.
 *
 * Callers must hold the script lock. The idempotency key is the stable
 * source-side operation key, so a retried workflow cannot post twice.
 */
var MovementLedger = {
  findByIdempotencyKey(idempotencyKey) {
    var sheet = getSheet_(TABS.MOVEMENT_LEDGER);
    var values = sheet.getDataRange().getValues();
    var c = COLS.MovementLedger;
    for (var i = 1; i < values.length; i++) {
      if (values[i][c.idempotency_key - 1] === idempotencyKey) {
        return { rowIndex: i + 1, values: values[i] };
      }
    }
    return null;
  },

  list() {
    var values = getSheet_(TABS.MOVEMENT_LEDGER).getDataRange().getValues();
    var c = COLS.MovementLedger;
    var movements = [];
    for (var i = 1; i < values.length; i++) {
      if (!values[i][c.movement_id - 1]) {
        continue;
      }
      movements.push({
        account_id: values[i][c.account_id - 1],
        amount: Number(values[i][c.amount - 1]) || 0,
        counterparty_account_id: values[i][c.counterparty_account_id - 1] || "",
        idempotency_key: values[i][c.idempotency_key - 1],
        movement_id: values[i][c.movement_id - 1],
        movement_type: values[i][c.movement_type - 1],
        posted_at: values[i][c.posted_at - 1],
        posted_by: values[i][c.posted_by - 1],
        reason: values[i][c.reason - 1] || "",
        source_id: values[i][c.source_id - 1],
        source_type: values[i][c.source_type - 1],
      });
    }
    return movements;
  },

  /**
   * @param {Object} movement signed amount: positive=in, negative=out
   * @return {{ok: boolean, duplicate: boolean, movementId: string, balance: number}}
   */
  post(movement) {
    if (!movement.idempotencyKey) {
      throw new Error("Movement idempotency key is required.");
    }
    if (!movement.accountId) {
      throw new Error("Movement account is required.");
    }
    var amount = Number(movement.amount);
    if (!isFinite(amount) || amount === 0) {
      throw new Error("Movement amount must be a non-zero number.");
    }

    var existing = MovementLedger.findByIdempotencyKey(
      String(movement.idempotencyKey)
    );
    var accountRow =
      movement.accountRow ||
      Engine._loadRow("FinanceAccount", movement.accountId);
    if (!accountRow) {
      throw new Error("Finance Account not found: " + movement.accountId);
    }
    var accountCols = COLS.FinanceAccounts;
    var currentBalance =
      Number(accountRow.values[accountCols.current_balance - 1]) || 0;
    if (existing) {
      return {
        balance: currentBalance,
        duplicate: true,
        movementId: existing.values[COLS.MovementLedger.movement_id - 1],
        ok: true,
      };
    }

    var movementId = Ids.nextId("Movement");
    var now = Audit._nowIso();
    _appendRow(getSheet_(TABS.MOVEMENT_LEDGER), [
      movementId,
      String(movement.idempotencyKey),
      movement.accountId,
      amount,
      movement.movementType,
      movement.sourceType,
      movement.sourceId,
      movement.counterpartyAccountId || "",
      movement.actorUserId || "SYSTEM",
      now,
      movement.reason || "",
    ]);

    var nextBalance = Math.round((currentBalance + amount) * 100) / 100;
    accountRow.sheet
      .getRange(accountRow.rowIndex, accountCols.current_balance)
      .setValue(nextBalance);
    Audit.append(
      movement.actorUserId || "SYSTEM",
      "Movement",
      movementId,
      "POST",
      {
        accountId: movement.accountId,
        amount,
        idempotencyKey: movement.idempotencyKey,
        movementType: movement.movementType,
        sourceId: movement.sourceId,
        sourceType: movement.sourceType,
      }
    );
    return {
      balance: nextBalance,
      duplicate: false,
      movementId,
      ok: true,
    };
  },
};

if (typeof module !== "undefined") {
  module.exports = { MovementLedger };
}
