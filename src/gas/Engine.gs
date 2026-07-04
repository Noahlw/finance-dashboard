/**
 * Engine.gs — the Engine (see CONTEXT.md): the sole mutator of status on
 * BudgetRequest and ExpenseClaim. Nothing else may write a status column,
 * a *_by/*_at stamp, an approved_amount, or a self_approved flag.
 *
 * Payout status is handled separately in Payouts.gs (simpler lifecycle,
 * see BUILD-PLAN.md P1-9), but also goes through Audit.append so every
 * mutation everywhere is logged.
 */

/**
 * Declarative transition tables. Each entry:
 *   from            current status this transition applies to
 *   action          one of the action strings used by Approvals.gs /
 *                   IntakeForms.gs / Jobs.gs
 *   to              next status, or 'DERIVED' to call
 *                   Engine_deriveRequestStatus after line effects run
 *   allowedRoles    array of ROLES.* the actor's role must be in, or
 *                   null to mean "self-only" (actor must be the
 *                   requester/claimant of the entity)
 *   requiresNote    if true, payload.decision_note must be non-empty
 *   requiresAmount  if true, payload.amount_override must be a valid number
 *
 * This table is exhaustive for FINANCE-SYSTEM-DESIGN.md §1.5 — no
 * transition exists outside it, so any (from, action) pair not listed
 * here is automatically illegal (see the five illegal cases in
 * BUILD-PLAN.md §4.1, cases 1 and 4 are denied purely by table lookup).
 */
var TRANSITIONS = {
  BudgetRequest: [
    { from: STATUS.BudgetRequest.DRAFT, action: 'SUBMIT', to: STATUS.BudgetRequest.PENDING, allowedRoles: null },
    { from: STATUS.BudgetRequest.DRAFT, action: 'WITHDRAW', to: STATUS.BudgetRequest.WITHDRAWN, allowedRoles: null },
    { from: STATUS.BudgetRequest.PENDING, action: 'WITHDRAW', to: STATUS.BudgetRequest.WITHDRAWN, allowedRoles: null },
    { from: STATUS.BudgetRequest.PENDING, action: 'REQUEST_INFO', to: STATUS.BudgetRequest.NEEDS_INFO, allowedRoles: [ROLES.TREASURER], requiresNote: true },
    { from: STATUS.BudgetRequest.NEEDS_INFO, action: 'RESUBMIT', to: STATUS.BudgetRequest.PENDING, allowedRoles: null },
    { from: STATUS.BudgetRequest.PENDING, action: 'APPROVE', to: 'DERIVED', allowedRoles: [ROLES.TREASURER] },
    { from: STATUS.BudgetRequest.PENDING, action: 'REDUCE', to: 'DERIVED', allowedRoles: [ROLES.TREASURER], requiresNote: true, requiresAmount: true },
    { from: STATUS.BudgetRequest.PENDING, action: 'REJECT', to: 'DERIVED', allowedRoles: [ROLES.TREASURER], requiresNote: true },
    { from: STATUS.BudgetRequest.APPROVED, action: 'CLOSE', to: STATUS.BudgetRequest.CLOSED, allowedRoles: [ROLES.TREASURER] },
    { from: STATUS.BudgetRequest.PARTIALLY_APPROVED, action: 'CLOSE', to: STATUS.BudgetRequest.CLOSED, allowedRoles: [ROLES.TREASURER] }
  ],
  ExpenseClaim: [
    { from: STATUS.ExpenseClaim.SUBMITTED, action: 'REQUEST_INFO', to: STATUS.ExpenseClaim.NEEDS_INFO, allowedRoles: [ROLES.COMMITTEE, ROLES.TREASURER], requiresNote: true },
    { from: STATUS.ExpenseClaim.NEEDS_INFO, action: 'RESUBMIT', to: STATUS.ExpenseClaim.SUBMITTED, allowedRoles: null },
    { from: STATUS.ExpenseClaim.SUBMITTED, action: 'VERIFY', to: STATUS.ExpenseClaim.VERIFIED, allowedRoles: [ROLES.COMMITTEE, ROLES.TREASURER] },
    { from: STATUS.ExpenseClaim.VERIFIED, action: 'REJECT', to: STATUS.ExpenseClaim.REJECTED, allowedRoles: [ROLES.COMMITTEE, ROLES.TREASURER], requiresNote: true },
    { from: STATUS.ExpenseClaim.VERIFIED, action: 'APPROVE_PAYOUT', to: STATUS.ExpenseClaim.APPROVED_FOR_PAYOUT, allowedRoles: [ROLES.TREASURER] }
    // APPROVED_FOR_PAYOUT -> PAID happens automatically in Payouts.gs when
    // every Payout row for the claim reaches CONFIRMED (not a human action).
    // PAID -> LOCKED happens automatically in Jobs.dailyJob (Phase 2).
  ]
};

/** Actions where the actor being the entity's own requester/claimant triggers D5 self-approval flagging. */
var SELF_APPROVAL_ACTIONS = ['APPROVE', 'REDUCE', 'VERIFY', 'APPROVE_PAYOUT'];

var Engine = {
  /**
   * Perform (or deny) a status transition. Never throws to the caller —
   * illegal transitions return {ok:false, reason} and are logged.
   * @param {string} entityType 'BudgetRequest' | 'ExpenseClaim'
   * @param {string} entityId
   * @param {string} action e.g. 'APPROVE', 'REDUCE', 'REJECT', 'REQUEST_INFO', 'VERIFY', 'APPROVE_PAYOUT', 'SUBMIT', 'WITHDRAW', 'RESUBMIT', 'CLOSE'
   * @param {string} actorUserId a Users.user_id
   * @param {Object} payload optional: {decision_note, amount_override}
   * @return {{ok: boolean, reason: ?string, from: ?string, to: ?string, selfApproved: ?boolean}}
   */
  transition: function (entityType, entityId, action, actorUserId, payload) {
    payload = payload || {};
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var actor = Engine._loadActor(actorUserId);
      if (!actor) return Engine._deny(entityType, entityId, action, actorUserId, 'ACTOR_NOT_FOUND', null);

      var row = Engine._loadRow(entityType, entityId);
      if (!row) return Engine._deny(entityType, entityId, action, actorUserId, 'ENTITY_NOT_FOUND', null);

      var cols = COLS[entityType];
      var currentStatus = row.values[cols.status - 1];
      var def = Engine._findTransition(entityType, currentStatus, action);
      if (!def) return Engine._deny(entityType, entityId, action, actorUserId, 'ILLEGAL_TRANSITION', currentStatus);

      var ownerId = Engine._ownerId(entityType, row.values);
      var isSelf = (actorUserId === ownerId);

      if (def.allowedRoles === null) {
        if (!isSelf) return Engine._deny(entityType, entityId, action, actorUserId, 'NOT_OWNER', currentStatus);
      } else {
        if (def.allowedRoles.indexOf(actor.role) === -1) {
          return Engine._deny(entityType, entityId, action, actorUserId, 'ROLE_NOT_ALLOWED', currentStatus);
        }
      }

      if (def.requiresNote && !(payload.decision_note && String(payload.decision_note).trim())) {
        return Engine._deny(entityType, entityId, action, actorUserId, 'NOTE_REQUIRED', currentStatus);
      }
      if (def.requiresAmount) {
        var amt = Number(payload.amount_override);
        if (isNaN(amt) || amt < 0) {
          return Engine._deny(entityType, entityId, action, actorUserId, 'INVALID_AMOUNT_OVERRIDE', currentStatus);
        }
      }

      var selfApproved = isSelf && SELF_APPROVAL_ACTIONS.indexOf(action) !== -1;

      var nextStatus = (entityType === 'BudgetRequest')
        ? Engine._applyBudgetRequestEffect(entityId, row, action, def, actorUserId, payload, selfApproved)
        : Engine._applyExpenseClaimEffect(entityId, row, action, def, actorUserId, payload, selfApproved);

      Audit.append(actorUserId, entityType, entityId, 'TRANSITION', {
        action: action, from: currentStatus, to: nextStatus, payload: payload, selfApproved: selfApproved
      });

      Engine._notify(entityType, entityId, action, currentStatus, nextStatus, actorUserId, selfApproved);

      return { ok: true, reason: null, from: currentStatus, to: nextStatus, selfApproved: selfApproved };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Edge case 5 (BUILD-PLAN §4.1): a ClaimLineItem's amount must never
   * exceed its BudgetRequestLine's remaining balance. Called by
   * IntakeForms.gs before creating a ClaimLineItem.
   * @param {string} budgetLineId
   * @param {number} amount
   * @return {{ok: boolean, remaining: number}}
   */
  validateClaimLineAmount: function (budgetLineId, amount) {
    var line = Engine._loadRow('BudgetRequestLine', budgetLineId);
    if (!line) return { ok: false, remaining: 0 };
    var c = COLS.BudgetRequestLines;
    var approved = Number(line.values[c.approved_amount - 1]) || 0;
    var claimed = Engine._sumClaimedAgainstLine(budgetLineId);
    var remaining = approved - claimed;
    return { ok: Number(amount) <= remaining, remaining: remaining };
  },

  // ---- internal helpers ----

  /** @private */
  _loadActor: function (userId) {
    var row = Engine._loadRow('User', userId);
    if (!row) return null;
    return { role: row.values[COLS.Users.role - 1], displayName: row.values[COLS.Users.display_name - 1] };
  },

  /**
   * Generic row finder by primary key.
   * @param {string} entityType 'BudgetRequest'|'ExpenseClaim'|'User'|'BudgetRequestLine'|'ClaimLineItem'
   * @param {string} id
   * @return {?{sheet: Sheet, rowIndex: number, values: Array}}
   * @private
   */
  _loadRow: function (entityType, id) {
    var tabMap = {
      BudgetRequest: TABS.BUDGET_REQUESTS, ExpenseClaim: TABS.EXPENSE_CLAIMS,
      User: TABS.USERS, BudgetRequestLine: TABS.BUDGET_REQUEST_LINES,
      ClaimLineItem: TABS.CLAIM_LINE_ITEMS
    };
    var sheet = getSheet_(tabMap[entityType]);
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === id) return { sheet: sheet, rowIndex: i + 1, values: values[i] };
    }
    return null;
  },

  /**
   * @param {Sheet} sheet
   * @param {number} pkColIndex 1-indexed column holding the FK to match
   * @param {string} matchValue
   * @return {Array<{rowIndex:number, values:Array}>}
   * @private
   */
  _findRowsByColumn: function (sheet, pkColIndex, matchValue) {
    var values = sheet.getDataRange().getValues();
    var out = [];
    for (var i = 1; i < values.length; i++) {
      if (values[i][pkColIndex - 1] === matchValue) out.push({ rowIndex: i + 1, values: values[i] });
    }
    return out;
  },

  /** @private */
  _findTransition: function (entityType, fromStatus, action) {
    var table = TRANSITIONS[entityType] || [];
    for (var i = 0; i < table.length; i++) {
      if (table[i].from === fromStatus && table[i].action === action) return table[i];
    }
    return null;
  },

  /** @private */
  _ownerId: function (entityType, values) {
    if (entityType === 'BudgetRequest') return values[COLS.BudgetRequests.requester_id - 1];
    if (entityType === 'ExpenseClaim') return values[COLS.ExpenseClaims.claimant_id - 1];
    return null;
  },

  /**
   * Apply a BudgetRequest transition's effects (line updates + request
   * status/stamps). Returns the resulting request status.
   * @private
   */
  _applyBudgetRequestEffect: function (requestId, row, action, def, actorUserId, payload, selfApproved) {
    var c = COLS.BudgetRequests;
    var sheet = row.sheet;
    var now = Audit._nowIso();
    var nextStatus;

    if (action === 'APPROVE' || action === 'REDUCE' || action === 'REJECT') {
      Engine._applyLineDecision(requestId, action, payload);
      nextStatus = Engine_deriveRequestStatus(requestId);
      sheet.getRange(row.rowIndex, c.decided_at).setValue(now);
      sheet.getRange(row.rowIndex, c.decided_by).setValue(actorUserId);
      sheet.getRange(row.rowIndex, c.decision_note).setValue(payload.decision_note || '');
      // Approved-amount changes shift what's available to claim against;
      // keep the Claim form's budget-line dropdown in sync (best-effort:
      // forms may not exist yet, e.g. under Tests.gs).
      try { FormSetup.refreshClaimFormChoices(); } catch (e) { /* forms not set up yet */ }
    } else if (action === 'REQUEST_INFO') {
      nextStatus = def.to;
      sheet.getRange(row.rowIndex, c.decided_at).setValue(now);
      sheet.getRange(row.rowIndex, c.decided_by).setValue(actorUserId);
      sheet.getRange(row.rowIndex, c.decision_note).setValue(payload.decision_note || '');
    } else if (action === 'SUBMIT') {
      nextStatus = def.to;
      sheet.getRange(row.rowIndex, c.submitted_at).setValue(now);
    } else if (action === 'WITHDRAW') {
      nextStatus = def.to;
      sheet.getRange(row.rowIndex, c.decided_at).setValue(now);
      sheet.getRange(row.rowIndex, c.decided_by).setValue(actorUserId);
      sheet.getRange(row.rowIndex, c.decision_note).setValue('Withdrawn by requester');
    } else if (action === 'RESUBMIT') {
      nextStatus = def.to;
      sheet.getRange(row.rowIndex, c.submitted_at).setValue(now);
    } else { // CLOSE
      nextStatus = def.to;
    }

    sheet.getRange(row.rowIndex, c.status).setValue(nextStatus);
    if (selfApproved) sheet.getRange(row.rowIndex, c.self_approved).setValue(true);
    return nextStatus;
  },

  /**
   * Distribute a decision across a request's BudgetRequestLines.
   * APPROVE: every line fully approved. REJECT: every line rejected.
   * REDUCE: proportional split of payload.amount_override across lines,
   * each line individually landing on APPROVED/REDUCED/REJECTED.
   * @private
   */
  _applyLineDecision: function (requestId, action, payload) {
    var sheet = getSheet_(TABS.BUDGET_REQUEST_LINES);
    var lines = Engine._findRowsByColumn(sheet, COLS.BudgetRequestLines.request_id, requestId);
    var c = COLS.BudgetRequestLines;

    if (action === 'APPROVE') {
      lines.forEach(function (line) {
        var requested = Number(line.values[c.requested_amount - 1]) || 0;
        sheet.getRange(line.rowIndex, c.approved_amount).setValue(requested);
        sheet.getRange(line.rowIndex, c.line_status).setValue(STATUS.BudgetRequestLine.APPROVED);
      });
      return;
    }
    if (action === 'REJECT') {
      lines.forEach(function (line) {
        sheet.getRange(line.rowIndex, c.approved_amount).setValue(0);
        sheet.getRange(line.rowIndex, c.line_status).setValue(STATUS.BudgetRequestLine.REJECTED);
      });
      return;
    }
    // REDUCE: proportional split
    var totalRequested = lines.reduce(function (sum, l) { return sum + (Number(l.values[c.requested_amount - 1]) || 0); }, 0);
    var override = Number(payload.amount_override);
    var ratio = totalRequested > 0 ? Math.min(override / totalRequested, 1) : 0;
    lines.forEach(function (line) {
      var requested = Number(line.values[c.requested_amount - 1]) || 0;
      var approved = Math.round(requested * ratio * 100) / 100;
      var lineStatus = approved <= 0 ? STATUS.BudgetRequestLine.REJECTED :
        (approved >= requested ? STATUS.BudgetRequestLine.APPROVED : STATUS.BudgetRequestLine.REDUCED);
      sheet.getRange(line.rowIndex, c.approved_amount).setValue(approved);
      sheet.getRange(line.rowIndex, c.line_status).setValue(lineStatus);
    });
  },

  /**
   * Apply an ExpenseClaim transition's effects. Returns the resulting status.
   * ExpenseClaims has no decision_note column, so REQUEST_INFO/REJECT notes
   * are appended to `notes` instead (documented choice, see CONTEXT.md).
   * @private
   */
  _applyExpenseClaimEffect: function (claimId, row, action, def, actorUserId, payload, selfApproved) {
    var c = COLS.ExpenseClaims;
    var sheet = row.sheet;
    var now = Audit._nowIso();
    var nextStatus = def.to;

    if (action === 'VERIFY') {
      sheet.getRange(row.rowIndex, c.verified_at).setValue(now);
      sheet.getRange(row.rowIndex, c.verified_by).setValue(actorUserId);
      sheet.getRange(row.rowIndex, c.total_amount).setValue(Engine._sumClaimLineItems(claimId));
    } else if (action === 'APPROVE_PAYOUT') {
      sheet.getRange(row.rowIndex, c.approved_at).setValue(now);
      sheet.getRange(row.rowIndex, c.approved_by).setValue(actorUserId);
    } else if (action === 'REJECT' || action === 'REQUEST_INFO') {
      Engine._appendNote(sheet, row.rowIndex, c.notes, action + ' by ' + actorUserId + ': ' + (payload.decision_note || ''));
    } else if (action === 'RESUBMIT') {
      sheet.getRange(row.rowIndex, c.submitted_at).setValue(now);
    }

    sheet.getRange(row.rowIndex, c.status).setValue(nextStatus);
    if (selfApproved) sheet.getRange(row.rowIndex, c.self_approved).setValue(true);
    return nextStatus;
  },

  /** @private */
  _appendNote: function (sheet, rowIndex, colIndex, extra) {
    var existing = sheet.getRange(rowIndex, colIndex).getValue() || '';
    var stamped = '[' + Audit._nowIso() + '] ' + extra;
    sheet.getRange(rowIndex, colIndex).setValue(existing ? (existing + '\n' + stamped) : stamped);
  },

  /**
   * Sum ClaimLineItems.amount for one claim.
   * @param {string} claimId
   * @return {number}
   * @private
   */
  _sumClaimLineItems: function (claimId) {
    var sheet = getSheet_(TABS.CLAIM_LINE_ITEMS);
    var rows = Engine._findRowsByColumn(sheet, COLS.ClaimLineItems.claim_id, claimId);
    var c = COLS.ClaimLineItems;
    return rows.reduce(function (sum, r) { return sum + (Number(r.values[c.amount - 1]) || 0); }, 0);
  },

  /**
   * Sum ClaimLineItems.amount charged against one budget line, counting
   * only claims that are not REJECTED (rejected claims free up the line).
   * @param {string} budgetLineId
   * @return {number}
   * @private
   */
  _sumClaimedAgainstLine: function (budgetLineId) {
    var cliSheet = getSheet_(TABS.CLAIM_LINE_ITEMS);
    var cliRows = Engine._findRowsByColumn(cliSheet, COLS.ClaimLineItems.budget_line_id, budgetLineId);
    var cliC = COLS.ClaimLineItems;
    var claimSheet = getSheet_(TABS.EXPENSE_CLAIMS);
    var claimStatusCache = {};
    var total = 0;
    cliRows.forEach(function (r) {
      var claimId = r.values[cliC.claim_id - 1];
      if (!(claimId in claimStatusCache)) {
        var claimRow = Engine._findRowsByColumn(claimSheet, COLS.ExpenseClaims.claim_id, claimId)[0];
        claimStatusCache[claimId] = claimRow ? claimRow.values[COLS.ExpenseClaims.status - 1] : null;
      }
      if (claimStatusCache[claimId] !== STATUS.ExpenseClaim.REJECTED) {
        total += Number(r.values[cliC.amount - 1]) || 0;
      }
    });
    return total;
  },

  /** @private */
  _deny: function (entityType, entityId, action, actorUserId, reason, currentStatus) {
    Audit.append(actorUserId || 'SYSTEM', entityType, entityId, 'TRANSITION_DENIED', {
      action: action, reason: reason, currentStatus: currentStatus
    });
    Discord.postTreasury('🚫 Denied: ' + action + ' on ' + entityType + ' ' + entityId +
      ' by ' + (actorUserId || 'unknown') + ' — ' + reason);
    return { ok: false, reason: reason, from: currentStatus, to: null, selfApproved: false };
  },

  /** @private */
  _notify: function (entityType, entityId, action, fromStatus, toStatus, actorUserId, selfApproved) {
    var row = Engine._loadRow(entityType, entityId);
    var title = entityType === 'BudgetRequest'
      ? row.values[COLS.BudgetRequests.title - 1]
      : (row.values[COLS.ExpenseClaims.notes - 1] || entityId);
    var amount = entityType === 'BudgetRequest'
      ? Engine._sumBudgetRequestLines(entityId, 'approved_amount')
      : Engine._sumClaimLineItems(entityId);

    Discord.postTreasury('**' + entityId + '** — ' + title + ' — ' + fromStatus + ' → ' + toStatus + ' (by ' + actorUserId + ')');
    Discord.postStatus(entityId, title, toStatus, amount);
    if (selfApproved) Discord.postSelfApproved(entityId, actorUserId, amount);
  },

  /**
   * @param {string} requestId
   * @param {string} field 'requested_amount' | 'approved_amount'
   * @return {number}
   * @private
   */
  _sumBudgetRequestLines: function (requestId, field) {
    var sheet = getSheet_(TABS.BUDGET_REQUEST_LINES);
    var rows = Engine._findRowsByColumn(sheet, COLS.BudgetRequestLines.request_id, requestId);
    var colIndex = COLS.BudgetRequestLines[field];
    return rows.reduce(function (sum, r) { return sum + (Number(r.values[colIndex - 1]) || 0); }, 0);
  }
};

/**
 * Derive a BudgetRequest's status from its lines: all APPROVED -> APPROVED,
 * all REJECTED -> REJECTED, anything mixed -> PARTIALLY_APPROVED.
 * @param {string} requestId
 * @return {string}
 */
function Engine_deriveRequestStatus(requestId) {
  var sheet = getSheet_(TABS.BUDGET_REQUEST_LINES);
  var rows = Engine._findRowsByColumn(sheet, COLS.BudgetRequestLines.request_id, requestId);
  if (rows.length === 0) return STATUS.BudgetRequest.PENDING;
  var c = COLS.BudgetRequestLines;
  var statuses = rows.map(function (r) { return r.values[c.line_status - 1]; });
  if (statuses.every(function (s) { return s === STATUS.BudgetRequestLine.APPROVED; })) return STATUS.BudgetRequest.APPROVED;
  if (statuses.every(function (s) { return s === STATUS.BudgetRequestLine.REJECTED; })) return STATUS.BudgetRequest.REJECTED;
  return STATUS.BudgetRequest.PARTIALLY_APPROVED;
}
