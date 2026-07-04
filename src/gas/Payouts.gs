/**
 * Payouts.gs — the Payout lifecycle: QUEUED -> SENT -> CONFIRMED. Simpler
 * than the Engine's declarative transitions (no role/branch decisions
 * beyond "treasurer sends"), but every mutation still goes through
 * Audit.append and Discord, per the hard constraints in BUILD-PLAN §0.4.
 *
 * Phase 1 assumes one payee per claim (multi-payee splitting is P4-2).
 * Phase 1 shortcut: SENT normally auto-confirms after
 * PAYOUT_AUTOCONFIRM_HOURS via Jobs.dailyJob (Phase 2, not built yet).
 * Until then, confirmPayout() must be called manually.
 */

var Payouts = {
  /**
   * Called by Engine when a claim reaches APPROVED_FOR_PAYOUT. Creates
   * exactly one Payout row (payee = claimant, amount = claim total).
   * @param {string} claimId
   */
  onClaimApprovedForPayout: function (claimId) {
    var claimRow = Engine._loadRow('ExpenseClaim', claimId);
    if (!claimRow) return;
    var c = COLS.ExpenseClaims;
    var payeeUserId = claimRow.values[c.claimant_id - 1];
    var amount = Engine._sumClaimLineItems(claimId);

    var payoutId = Ids.nextId('Payout');
    getSheet_(TABS.PAYOUTS).appendRow([
      payoutId, claimId, payeeUserId, amount, '', '', '', STATUS.Payout.QUEUED, '', ''
    ]);
    Audit.append('SYSTEM', 'Payout', payoutId, 'CREATE', { claimId: claimId, payeeUserId: payeeUserId, amount: amount });
    Discord.postTreasury('**' + payoutId + '** — queued payout of HK$' + amount.toFixed(2) + ' to ' + payeeUserId + ' for claim ' + claimId + '.');
  },

  /**
   * Record that a payout was sent (FPS/PayMe/bank/cash). Treasurer-only (D4).
   * @param {string} payoutId
   * @param {string} method 'FPS'|'PAYME'|'BANK'|'CASH'
   * @param {string} txnReference
   * @param {string} actorUserId
   * @return {{ok: boolean, reason: ?string}}
   */
  markPayoutSent: function (payoutId, method, txnReference, actorUserId) {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var actor = Engine._loadActor(actorUserId);
      if (!actor || actor.role !== ROLES.TREASURER) {
        Audit.append(actorUserId || 'SYSTEM', 'Payout', payoutId, 'TRANSITION_DENIED', { action: 'MARK_SENT', reason: 'ROLE_NOT_ALLOWED' });
        return { ok: false, reason: 'ROLE_NOT_ALLOWED' };
      }
      var row = Engine._loadRow('Payout', payoutId);
      if (!row) return { ok: false, reason: 'ENTITY_NOT_FOUND' };
      var c = COLS.Payouts;
      if (row.values[c.status - 1] !== STATUS.Payout.QUEUED) {
        Audit.append(actorUserId, 'Payout', payoutId, 'TRANSITION_DENIED', { action: 'MARK_SENT', reason: 'ILLEGAL_TRANSITION' });
        return { ok: false, reason: 'ILLEGAL_TRANSITION' };
      }
      var now = Audit._nowIso();
      var sheet = row.sheet;
      sheet.getRange(row.rowIndex, c.method).setValue(method);
      sheet.getRange(row.rowIndex, c.txn_reference).setValue(txnReference);
      sheet.getRange(row.rowIndex, c.paid_by).setValue(actorUserId);
      sheet.getRange(row.rowIndex, c.status).setValue(STATUS.Payout.SENT);
      sheet.getRange(row.rowIndex, c.paid_at).setValue(now);
      Audit.append(actorUserId, 'Payout', payoutId, 'TRANSITION', {
        from: STATUS.Payout.QUEUED, to: STATUS.Payout.SENT, method: method, txnReference: txnReference
      });
      Discord.postTreasury('**' + payoutId + '** — sent via ' + method + ' (ref: ' + txnReference + ') by ' + actorUserId + '.');
      return { ok: true, reason: null };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Confirm a payout was received. Phase 1: called manually; Phase 2's
   * Jobs.dailyJob automates this after PAYOUT_AUTOCONFIRM_HOURS if
   * undisputed. When every Payout for a claim is CONFIRMED, the claim
   * moves to PAID.
   * @param {string} payoutId
   * @return {{ok: boolean, reason: ?string}}
   */
  confirmPayout: function (payoutId) {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var row = Engine._loadRow('Payout', payoutId);
      if (!row) return { ok: false, reason: 'ENTITY_NOT_FOUND' };
      var c = COLS.Payouts;
      if (row.values[c.status - 1] !== STATUS.Payout.SENT) {
        Audit.append('SYSTEM', 'Payout', payoutId, 'TRANSITION_DENIED', { action: 'CONFIRM', reason: 'ILLEGAL_TRANSITION' });
        return { ok: false, reason: 'ILLEGAL_TRANSITION' };
      }
      var now = Audit._nowIso();
      var sheet = row.sheet;
      sheet.getRange(row.rowIndex, c.status).setValue(STATUS.Payout.CONFIRMED);
      sheet.getRange(row.rowIndex, c.confirmed_at).setValue(now);
      var claimId = row.values[c.claim_id - 1];
      Audit.append('SYSTEM', 'Payout', payoutId, 'TRANSITION', { from: STATUS.Payout.SENT, to: STATUS.Payout.CONFIRMED });
      Discord.postTreasury('**' + payoutId + '** — confirmed received.');

      Payouts._maybeMarkClaimPaid(claimId);
      return { ok: true, reason: null };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * If every Payout row for a claim is CONFIRMED, move the claim to PAID.
   * @param {string} claimId
   * @private
   */
  _maybeMarkClaimPaid: function (claimId) {
    var sheet = getSheet_(TABS.PAYOUTS);
    var rows = Engine._findRowsByColumn(sheet, COLS.Payouts.claim_id, claimId);
    var c = COLS.Payouts;
    if (rows.length === 0) return;
    var allConfirmed = rows.every(function (r) { return r.values[c.status - 1] === STATUS.Payout.CONFIRMED; });
    if (!allConfirmed) return;

    var claimRow = Engine._loadRow('ExpenseClaim', claimId);
    if (!claimRow) return;
    var cc = COLS.ExpenseClaims;
    if (claimRow.values[cc.status - 1] !== STATUS.ExpenseClaim.APPROVED_FOR_PAYOUT) return;

    var now = Audit._nowIso();
    claimRow.sheet.getRange(claimRow.rowIndex, cc.status).setValue(STATUS.ExpenseClaim.PAID);
    claimRow.sheet.getRange(claimRow.rowIndex, cc.paid_at).setValue(now);
    Audit.append('SYSTEM', 'ExpenseClaim', claimId, 'TRANSITION', {
      action: 'ALL_PAYOUTS_CONFIRMED', from: STATUS.ExpenseClaim.APPROVED_FOR_PAYOUT, to: STATUS.ExpenseClaim.PAID
    });
    Discord.postTreasury('**' + claimId + '** — all payouts confirmed — claim is now PAID.');
    Discord.postStatus(claimId, claimRow.values[cc.notes - 1] || claimId, STATUS.ExpenseClaim.PAID, null);
  }
};
