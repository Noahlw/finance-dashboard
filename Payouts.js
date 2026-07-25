"use strict";
/**
 * Payouts.gs — the Payout lifecycle: QUEUED -> SENT -> CONFIRMED + FAILED.
 * Every mutation goes through Audit.append and Discord.
 *
 * V2 additions: account_id on payout creation, balance deduction on SENT,
 * partial payment, failure logging, retry.
 */
var MovementLedgerForPayouts_ =
  typeof MovementLedger === "undefined"
    ? require("./MovementLedger").MovementLedger
    : MovementLedger;

var Payouts = {
  /**
   * If every Payout row for a claim is CONFIRMED, move the claim to PAID.
   */
  _maybeMarkClaimPaid(claimId) {
    var sheet = getSheet_(TABS.PAYOUTS);
    var rows = Engine._findRowsByColumn(sheet, COLS.Payouts.claim_id, claimId);
    var c = COLS.Payouts;
    if (rows.length === 0) {
      return;
    }

    var nonFailedRows = rows.filter(
      (r) => r.values[c.status - 1] !== STATUS.Payout.FAILED
    );
    if (nonFailedRows.length === 0) {
      return;
    }

    var allConfirmed = nonFailedRows.every(
      (r) => r.values[c.status - 1] === STATUS.Payout.CONFIRMED
    );
    if (!allConfirmed) {
      return;
    }

    var claimRow = Engine._loadRow("ExpenseClaim", claimId);
    if (!claimRow) {
      return;
    }
    var cc = COLS.ExpenseClaims;
    if (
      claimRow.values[cc.status - 1] !== STATUS.ExpenseClaim.APPROVED_FOR_PAYOUT
    ) {
      return;
    }

    var now = Audit._nowIso();
    claimRow.sheet
      .getRange(claimRow.rowIndex, cc.status)
      .setValue(STATUS.ExpenseClaim.PAID);
    claimRow.sheet.getRange(claimRow.rowIndex, cc.paid_at).setValue(now);
    Audit.append("SYSTEM", "ExpenseClaim", claimId, "TRANSITION", {
      action: "ALL_PAYOUTS_CONFIRMED",
      from: STATUS.ExpenseClaim.APPROVED_FOR_PAYOUT,
      to: STATUS.ExpenseClaim.PAID,
    });
    Discord.postTreasury(
      "**" + claimId + "** — all payouts confirmed — claim is now PAID."
    );
    Discord.postStatus(
      claimId,
      claimRow.values[cc.notes - 1] || claimId,
      STATUS.ExpenseClaim.PAID,
      null
    );
  },

  /**
   * Confirm a payout was received. Phase 1: called manually.
   * When every Payout for a claim is CONFIRMED, the claim moves to PAID.
   */
  confirmPayout(payoutId) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30_000);
    } catch (e) {
      Discord.postTreasury(
        "🚨 CRITICAL: Script lock timeout in Payouts.confirmPayout"
      );
      throw e;
    }
    try {
      var row = Engine._loadRow("Payout", payoutId);
      if (!row) {
        return { ok: false, reason: "ENTITY_NOT_FOUND" };
      }
      var c = COLS.Payouts;
      if (row.values[c.status - 1] !== STATUS.Payout.SENT) {
        Audit.append("SYSTEM", "Payout", payoutId, "TRANSITION_DENIED", {
          action: "CONFIRM",
          reason: "ILLEGAL_TRANSITION",
        });
        return { ok: false, reason: "ILLEGAL_TRANSITION" };
      }
      var now = Audit._nowIso();
      var sheet = row.sheet;
      sheet.getRange(row.rowIndex, c.status).setValue(STATUS.Payout.CONFIRMED);
      sheet.getRange(row.rowIndex, c.confirmed_at).setValue(now);
      var claimId = row.values[c.claim_id - 1];
      Audit.append("SYSTEM", "Payout", payoutId, "TRANSITION", {
        from: STATUS.Payout.SENT,
        to: STATUS.Payout.CONFIRMED,
      });
      Discord.postTreasury("**" + payoutId + "** — confirmed received.");

      Payouts._maybeMarkClaimPaid(claimId);
      return { ok: true, reason: null };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Record that a payout was sent (FPS/PayMe/bank/cash/other).
   * Deducts from the Finance Account balance. Supports partial payment
   * by recording a new payout row with the partial amount.
   * FPS/PAYME require txnReference.
   * @param {string} payoutId
   * @param {number} sentAmount partial or full amount
   * @param {string} method 'FPS'|'PAYME'|'BANK'|'CASH'|'OTHER'
   * @param {string} txnReference required for FPS/PAYME
   * @param {string} actorUserId
   * @return {{ok: boolean, reason: ?string}}
   */
  markPayoutSent(payoutId, sentAmount, method, txnReference, actorUserId) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30_000);
    } catch (e) {
      Discord.postTreasury(
        "🚨 CRITICAL: Script lock timeout in Payouts.markPayoutSent"
      );
      throw e;
    }
    try {
      var actor = Engine._loadActor(actorUserId);
      if (!actor || actor.role !== ROLES.TREASURER) {
        Audit.append(
          actorUserId || "SYSTEM",
          "Payout",
          payoutId,
          "TRANSITION_DENIED",
          { action: "MARK_SENT", reason: "ROLE_NOT_ALLOWED" }
        );
        return { ok: false, reason: "ROLE_NOT_ALLOWED" };
      }

      if (
        (method === "FPS" || method === "PAYME") &&
        !(txnReference && String(txnReference).trim())
      ) {
        return {
          ok: false,
          reason: method + " requires a transaction reference.",
        };
      }

      var row = Engine._loadRow("Payout", payoutId);
      if (!row) {
        return { ok: false, reason: "ENTITY_NOT_FOUND" };
      }
      var pc = COLS.Payouts;
      if (row.values[pc.status - 1] !== STATUS.Payout.QUEUED) {
        Audit.append(actorUserId, "Payout", payoutId, "TRANSITION_DENIED", {
          action: "MARK_SENT",
          reason: "ILLEGAL_TRANSITION",
        });
        return { ok: false, reason: "ILLEGAL_TRANSITION" };
      }

      var queuedAmount = Number(row.values[pc.amount - 1]) || 0;
      sentAmount = Number(sentAmount);
      if (
        !isFinite(sentAmount) ||
        sentAmount <= 0 ||
        sentAmount > queuedAmount
      ) {
        return {
          ok: false,
          reason:
            "Sent amount must be positive and not exceed the queued amount.",
        };
      }
      var isPartial = sentAmount < queuedAmount;
      var actualSent = isPartial ? sentAmount : queuedAmount;

      var now = Audit._nowIso();
      var sheet = row.sheet;
      var accountId = row.values[pc.account_id - 1];

      if (isPartial) {
        // Partial payment: mark current payout as SENT with partial amount,
        // create a new QUEUED payout for the remainder.
        var claimId = row.values[pc.claim_id - 1];
        var payeeUserId = row.values[pc.payee_user_id - 1];
        var remaining = queuedAmount - actualSent;

        sheet.getRange(row.rowIndex, pc.amount).setValue(actualSent);
        sheet.getRange(row.rowIndex, pc.method).setValue(method);
        sheet
          .getRange(row.rowIndex, pc.txn_reference)
          .setValue(txnReference || "");
        sheet.getRange(row.rowIndex, pc.paid_by).setValue(actorUserId);
        sheet.getRange(row.rowIndex, pc.status).setValue(STATUS.Payout.SENT);
        sheet.getRange(row.rowIndex, pc.paid_at).setValue(now);

        // Create remainder payout
        var remainderId = Ids.nextId("Payout");
        var remainderRow = [];
        remainderRow[pc.payout_id - 1] = remainderId;
        remainderRow[pc.claim_id - 1] = claimId;
        remainderRow[pc.payee_user_id - 1] = payeeUserId;
        remainderRow[pc.amount - 1] = remaining;
        remainderRow[pc.method - 1] = "";
        remainderRow[pc.txn_reference - 1] = "";
        remainderRow[pc.paid_by - 1] = "";
        remainderRow[pc.status - 1] = STATUS.Payout.QUEUED;
        remainderRow[pc.account_id - 1] = accountId || "";
        remainderRow[pc.parent_payout_id - 1] = payoutId;
        _appendRow(getSheet_(TABS.PAYOUTS), remainderRow);

        Audit.append(actorUserId, "Payout", payoutId, "PARTIAL_SENT", {
          method,
          remaining,
          sentAmount: actualSent,
          txnReference,
        });
        Discord.postTreasury(
          "**" +
            payoutId +
            "** — partial payment of HK$" +
            Number(actualSent).toFixed(2) +
            " via " +
            method +
            ". Remaining: HK$" +
            Number(remaining).toFixed(2)
        );
      } else {
        // Full payment
        sheet.getRange(row.rowIndex, pc.method).setValue(method);
        sheet
          .getRange(row.rowIndex, pc.txn_reference)
          .setValue(txnReference || "");
        sheet.getRange(row.rowIndex, pc.paid_by).setValue(actorUserId);
        sheet.getRange(row.rowIndex, pc.status).setValue(STATUS.Payout.SENT);
        sheet.getRange(row.rowIndex, pc.paid_at).setValue(now);

        Audit.append(actorUserId, "Payout", payoutId, "TRANSITION", {
          from: STATUS.Payout.QUEUED,
          method,
          sentAmount: actualSent,
          to: STATUS.Payout.SENT,
          txnReference,
        });
        Discord.postTreasury(
          "**" +
            payoutId +
            "** — sent HK$" +
            Number(actualSent).toFixed(2) +
            " via " +
            method +
            " by " +
            actorUserId +
            "."
        );
      }

      // Deduct from account balance exactly once.
      if (accountId) {
        MovementLedgerForPayouts_.post({
          accountId,
          accountRow: Engine._loadRow("FinanceAccount", accountId),
          actorUserId,
          amount: -actualSent,
          idempotencyKey: "payout:" + payoutId + ":sent",
          movementType: "PAYOUT",
          reason: "",
          sourceId: payoutId,
          sourceType: "Payout",
        });
      }

      return { ok: true, reason: null };
    } finally {
      lock.releaseLock();
    }
  },
  /**
   * Called by Engine when a claim reaches APPROVED_FOR_PAYOUT. Creates
   * exactly one Payout row (payee = claimant, amount = claim total).
   * Partial payment creates additional payout rows later.
   * @param {string} claimId
   * @param {string} accountId optional Finance Account to deduct from
   */
  onClaimApprovedForPayout(claimId, accountId) {
    var claimRow = Engine._loadRow("ExpenseClaim", claimId);
    if (!claimRow) {
      return;
    }
    var c = COLS.ExpenseClaims;
    var payeeUserId = claimRow.values[c.claimant_id - 1];
    var amount = Engine._sumClaimLineItems(claimId);

    // Note: balance deduction happens at markPayoutSent, not here.
    // The reserved_payouts column tracks display-only reservation.

    var payoutId = Ids.nextId("Payout");
    var pc = COLS.Payouts;
    var row = [];
    row[pc.payout_id - 1] = payoutId;
    row[pc.claim_id - 1] = claimId;
    row[pc.payee_user_id - 1] = payeeUserId;
    row[pc.amount - 1] = amount;
    row[pc.method - 1] = "";
    row[pc.txn_reference - 1] = "";
    row[pc.paid_by - 1] = "";
    row[pc.status - 1] = STATUS.Payout.QUEUED;
    row[pc.account_id - 1] = accountId || "";
    _appendRow(getSheet_(TABS.PAYOUTS), row);

    Audit.append("SYSTEM", "Payout", payoutId, "CREATE", {
      accountId: accountId || null,
      amount,
      claimId,
      payeeUserId,
    });
    Discord.postTreasury(
      "**" +
        payoutId +
        "** — queued payout of HK$" +
        Number(amount).toFixed(2) +
        " to " +
        payeeUserId +
        " for claim " +
        claimId +
        (accountId ? " (account: " + accountId + ")" : "") +
        "."
    );
  },

  /**
   * Record a failed external payment attempt. Logs the attempt, leaves
   * the balance unchanged, reverses the QUEUED->SENT if already marked.
   * @param {string} payoutId
   * @param {string} failureReason
   * @param {string} actorUserId
   * @return {{ok: boolean, reason: ?string}}
   */
  recordPayoutFailed(payoutId, failureReason, actorUserId) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30_000);
    } catch (e) {
      throw e;
    }
    try {
      var actor = Engine._loadActor(actorUserId);
      if (!actor || actor.role !== ROLES.TREASURER) {
        return { ok: false, reason: "ROLE_NOT_ALLOWED" };
      }

      var row = Engine._loadRow("Payout", payoutId);
      if (!row) {
        return { ok: false, reason: "ENTITY_NOT_FOUND" };
      }
      var pc = COLS.Payouts;
      if (
        row.values[pc.status - 1] !== STATUS.Payout.QUEUED &&
        row.values[pc.status - 1] !== STATUS.Payout.SENT
      ) {
        return {
          ok: false,
          reason: "Only QUEUED or SENT payouts can be marked as failed.",
        };
      }

      var wasSent = row.values[pc.status - 1] === STATUS.Payout.SENT;
      var amount = Number(row.values[pc.amount - 1]) || 0;
      var accountId = row.values[pc.account_id - 1];

      var now = Audit._nowIso();
      var sheet = row.sheet;
      sheet.getRange(row.rowIndex, pc.status).setValue(STATUS.Payout.FAILED);
      sheet
        .getRange(row.rowIndex, pc.failure_reason)
        .setValue(failureReason || "Unknown error");
      sheet.getRange(row.rowIndex, pc.paid_at).setValue(now);

      // A SENT record represents money that left the account. If it is later
      // identified as failed/reversed, preserve both facts in the ledger.
      if (wasSent && accountId) {
        MovementLedgerForPayouts_.post({
          accountId,
          accountRow: Engine._loadRow("FinanceAccount", accountId),
          actorUserId,
          amount,
          idempotencyKey: "payout:" + payoutId + ":reversal",
          movementType: "PAYOUT_REVERSAL",
          reason: failureReason || "Payment reversed",
          sourceId: payoutId,
          sourceType: "Payout",
        });
      }

      Audit.append(actorUserId, "Payout", payoutId, "FAILED", {
        reason: failureReason,
        wasSent,
      });
      Discord.postTreasury(
        "🚫 **" +
          payoutId +
          "** — payment failed: " +
          (failureReason || "Unknown error") +
          " (by " +
          actorUserId +
          ")."
      );

      return { ok: true, reason: null };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Retry a failed payout: creates a new QUEUED payout (same claim, payee, amount).
   * @param {string} failedPayoutId
   * @param {string} actorUserId
   * @return {{ok: boolean, reason: ?string, newPayoutId: ?string}}
   */
  retryPayout(failedPayoutId, actorUserId) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30_000);
    } catch (e) {
      throw e;
    }
    try {
      var actor = Engine._loadActor(actorUserId);
      if (!actor || actor.role !== ROLES.TREASURER) {
        return { newPayoutId: null, ok: false, reason: "ROLE_NOT_ALLOWED" };
      }

      var row = Engine._loadRow("Payout", failedPayoutId);
      if (!row) {
        return { newPayoutId: null, ok: false, reason: "ENTITY_NOT_FOUND" };
      }
      var pc = COLS.Payouts;
      if (row.values[pc.status - 1] !== STATUS.Payout.FAILED) {
        return {
          newPayoutId: null,
          ok: false,
          reason: "Only FAILED payouts can be retried.",
        };
      }

      var claimId = row.values[pc.claim_id - 1];
      var payeeUserId = row.values[pc.payee_user_id - 1];
      var amount = row.values[pc.amount - 1];
      var accountId = row.values[pc.account_id - 1];

      var newPayoutId = Ids.nextId("Payout");
      var newRow = [];
      newRow[pc.payout_id - 1] = newPayoutId;
      newRow[pc.claim_id - 1] = claimId;
      newRow[pc.payee_user_id - 1] = payeeUserId;
      newRow[pc.amount - 1] = amount;
      newRow[pc.method - 1] = "";
      newRow[pc.txn_reference - 1] = "";
      newRow[pc.paid_by - 1] = "";
      newRow[pc.status - 1] = STATUS.Payout.QUEUED;
      newRow[pc.account_id - 1] = accountId || "";
      newRow[pc.parent_payout_id - 1] = failedPayoutId;
      _appendRow(getSheet_(TABS.PAYOUTS), newRow);

      Audit.append(actorUserId, "Payout", newPayoutId, "RETRY", {
        amount,
        originalPayoutId: failedPayoutId,
      });
      Discord.postTreasury(
        "**" +
          newPayoutId +
          "** — retry payout of HK$" +
          Number(amount).toFixed(2) +
          " for claim " +
          claimId +
          " (original: " +
          failedPayoutId +
          ") by " +
          actorUserId +
          "."
      );

      return { newPayoutId, ok: true, reason: null };
    } finally {
      lock.releaseLock();
    }
  },
};

if (typeof module !== "undefined") {
  module.exports = { Payouts };
}
