var STATUS_ = typeof module !== 'undefined' ? require('./Constants').STATUS : STATUS;
var ROLES_ = typeof module !== 'undefined' ? require('./Constants').ROLES : ROLES;
var COLS_ = typeof module !== 'undefined' ? require('./Constants').COLS : COLS;

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
    { from: STATUS_.BudgetRequest.DRAFT, action: 'SUBMIT', to: STATUS_.BudgetRequest.PENDING, allowedRoles: null },
    { from: STATUS_.BudgetRequest.DRAFT, action: 'WITHDRAW', to: STATUS_.BudgetRequest.WITHDRAWN, allowedRoles: null },
    { from: STATUS_.BudgetRequest.PENDING, action: 'WITHDRAW', to: STATUS_.BudgetRequest.WITHDRAWN, allowedRoles: null },
    { from: STATUS_.BudgetRequest.PENDING, action: 'REQUEST_INFO', to: STATUS_.BudgetRequest.NEEDS_INFO, allowedRoles: [ROLES_.TREASURER], requiresNote: true },
    { from: STATUS_.BudgetRequest.NEEDS_INFO, action: 'RESUBMIT', to: STATUS_.BudgetRequest.PENDING, allowedRoles: null },
    { from: STATUS_.BudgetRequest.PENDING, action: 'APPROVE', to: 'DERIVED', allowedRoles: [ROLES_.TREASURER] },
    { from: STATUS_.BudgetRequest.PENDING, action: 'REDUCE', to: 'DERIVED', allowedRoles: [ROLES_.TREASURER], requiresNote: true, requiresAmount: true },
    { from: STATUS_.BudgetRequest.PENDING, action: 'REJECT', to: 'DERIVED', allowedRoles: [ROLES_.TREASURER], requiresNote: true },
    { from: STATUS_.BudgetRequest.APPROVED, action: 'CLOSE', to: STATUS_.BudgetRequest.CLOSED, allowedRoles: [ROLES_.TREASURER] },
    { from: STATUS_.BudgetRequest.PARTIALLY_APPROVED, action: 'CLOSE', to: STATUS_.BudgetRequest.CLOSED, allowedRoles: [ROLES_.TREASURER] }
  ],
  ExpenseClaim: [
    { from: STATUS_.ExpenseClaim.DRAFT, action: 'SUBMIT', to: STATUS_.ExpenseClaim.SUBMITTED, allowedRoles: [ROLES_.COMMITTEE, ROLES_.TREASURER] },
    { from: STATUS_.ExpenseClaim.DRAFT, action: 'WITHDRAW', to: STATUS_.ExpenseClaim.REJECTED, allowedRoles: [ROLES_.COMMITTEE, ROLES_.TREASURER], requiresNote: true },
    { from: STATUS_.ExpenseClaim.SUBMITTED, action: 'REQUEST_INFO', to: STATUS_.ExpenseClaim.NEEDS_INFO, allowedRoles: [ROLES_.COMMITTEE, ROLES_.TREASURER], requiresNote: true },
    { from: STATUS_.ExpenseClaim.NEEDS_INFO, action: 'RESUBMIT', to: STATUS_.ExpenseClaim.SUBMITTED, allowedRoles: null },
    { from: STATUS_.ExpenseClaim.SUBMITTED, action: 'VERIFY', to: STATUS_.ExpenseClaim.VERIFIED, allowedRoles: [ROLES_.COMMITTEE, ROLES_.TREASURER] },
    { from: STATUS_.ExpenseClaim.VERIFIED, action: 'REJECT', to: STATUS_.ExpenseClaim.REJECTED, allowedRoles: [ROLES_.COMMITTEE, ROLES_.TREASURER], requiresNote: true },
    { from: STATUS_.ExpenseClaim.VERIFIED, action: 'APPROVE_PAYOUT', to: STATUS_.ExpenseClaim.APPROVED_FOR_PAYOUT, allowedRoles: [ROLES_.TREASURER] },
    { from: STATUS_.ExpenseClaim.PAID, action: 'LOCK', to: STATUS_.ExpenseClaim.LOCKED, allowedRoles: [ROLES_.TREASURER] }
    // APPROVED_FOR_PAYOUT -> PAID happens automatically in Payouts.gs when
    // every Payout row for the claim reaches CONFIRMED (not a human action).
    // PAID -> LOCKED happens automatically in Jobs.dailyJob (Phase 2).
  ]
};

/** Actions where the actor being the entity's own requester/claimant triggers D5 self-approval flagging. */
var SELF_APPROVAL_ACTIONS = ['APPROVE', 'REDUCE', 'VERIFY', 'APPROVE_PAYOUT'];

var CoreDecisions = {
  TRANSITIONS: TRANSITIONS,
  SELF_APPROVAL_ACTIONS: SELF_APPROVAL_ACTIONS,

  /**
   * Look up the transition rule for (entityType, fromStatus, action), or
   * null if no such rule exists (i.e. the transition is illegal).
   */
  findTransition: function (entityType, fromStatus, action) {
    var table = TRANSITIONS[entityType] || [];
    for (var i = 0; i < table.length; i++) {
      if (table[i].from === fromStatus && table[i].action === action) return table[i];
    }
    return null;
  },

  /**
   * Derive a BudgetRequest's status from its lines' statuses: all APPROVED
   * -> APPROVED, all REJECTED -> REJECTED, anything mixed -> PARTIALLY_APPROVED.
   * A request with zero lines is still PENDING (nothing to derive from yet).
   * @param {Array<string>} lineStatuses
   * @return {string}
   */
  deriveRequestStatusFromLineStatuses: function (lineStatuses) {
    if (lineStatuses.length === 0) return STATUS_.BudgetRequest.PENDING;
    if (lineStatuses.every(function (s) { return s === STATUS_.BudgetRequestLine.APPROVED; })) return STATUS_.BudgetRequest.APPROVED;
    if (lineStatuses.every(function (s) { return s === STATUS_.BudgetRequestLine.REJECTED; })) return STATUS_.BudgetRequest.REJECTED;
    return STATUS_.BudgetRequest.PARTIALLY_APPROVED;
  },

  /**
   * The owning user's ID for an entity row: requester_id for BudgetRequest,
   * claimant_id for ExpenseClaim. Returns null for unrecognized entity types.
   * @param {string} entityType
   * @param {Array} values full row values array as loaded from the sheet
   * @return {?string}
   */
  ownerId: function (entityType, values) {
    if (entityType === 'BudgetRequest') return values[COLS_.BudgetRequests.requester_id - 1];
    if (entityType === 'ExpenseClaim') return values[COLS_.ExpenseClaims.claimant_id - 1];
    return null;
  },

  /**
   * D5: does a successful transition get flagged as self-approved?
   * (Distinct from allowedRoles===null "self-only" permission — this flags
   * role-gated actions, e.g. TREASURER approving their own request.)
   * @param {boolean} isSelf actorUserId === owner of the entity
   * @param {string} action
   * @return {boolean}
   */
  isSelfApproval: function (isSelf, action) {
    return isSelf && SELF_APPROVAL_ACTIONS.indexOf(action) !== -1;
  },

  /**
   * The four-eyes / ownership authorization gate plus payload validation for
   * a transition, in the exact precedence order used by Engine.transition:
   * ownership/role, then requiresNote, then requiresAmount. Returns the
   * first failing reason, or {ok:true} if all checks pass.
   * @param {Object} def a TRANSITIONS entry (from findTransition)
   * @param {boolean} isSelf actorUserId === owner of the entity
   * @param {string} actorRole
   * @param {Object} payload {decision_note, amount_override}
   * @return {{ok: boolean, reason: ?string}}
   */
  authorize: function (def, isSelf, actorRole, payload) {
    if (def.allowedRoles === null) {
      if (!isSelf) return { ok: false, reason: 'NOT_OWNER' };
    } else {
      if (def.allowedRoles.indexOf(actorRole) === -1) {
        return { ok: false, reason: 'ROLE_NOT_ALLOWED' };
      }
    }
    if (def.requiresNote && !(payload.decision_note && String(payload.decision_note).trim())) {
      return { ok: false, reason: 'NOTE_REQUIRED' };
    }
    if (def.requiresAmount) {
      var amt = Number(payload.amount_override);
      if (isNaN(amt) || amt < 0) {
        return { ok: false, reason: 'INVALID_AMOUNT_OVERRIDE' };
      }
    }
    return { ok: true, reason: null };
  },

  /**
   * Edge case 5 (BUILD-PLAN §4.1): can this claim-line amount be charged
   * against a budget line's remaining balance?
   * @param {number} amount
   * @param {number} approved BudgetRequestLine.approved_amount
   * @param {number} claimed sum already claimed against the line
   * @return {{ok: boolean, remaining: number}}
   */
  checkClaimLineAmount: function (amount, approved, claimed) {
    var remaining = approved - claimed;
    return { ok: Number(amount) <= remaining, remaining: remaining };
  },

  /**
   * The REDUCE proportional split: given every line's requested_amount and
   * the treasurer's amount_override, compute each line's approved_amount
   * and resulting line_status, in input order.
   *
   * Uses largest-remainder allocation (not independent per-line rounding)
   * so that Σ approved_amount always equals exactly min(override,
   * totalRequested) to the cent — independent rounding of each line can
   * silently drift by a cent or more (e.g. requested [10,10,10], override
   * 10 would round to 3.33 x3 = 9.99, a cent short of what was approved).
   * @param {Array<number>} requestedAmounts
   * @param {number} override payload.amount_override
   * @return {Array<{approved_amount: number, line_status: string}>}
   */
  computeReduceSplit: function (requestedAmounts, override) {
    var totalRequested = requestedAmounts.reduce(function (sum, r) { return sum + (Number(r) || 0); }, 0);
    if (totalRequested <= 0) {
      return requestedAmounts.map(function () {
        return { approved_amount: 0, line_status: STATUS_.BudgetRequestLine.REJECTED };
      });
    }

    var targetAmount = Math.min(Math.max(Number(override) || 0, 0), totalRequested);
    var targetCents = Math.round(targetAmount * 100);

    var shares = requestedAmounts.map(function (r) {
      var requested = Number(r) || 0;
      var exactCents = requested / totalRequested * targetCents;
      var flooredCents = Math.floor(exactCents);
      return { requested: requested, flooredCents: flooredCents, remainder: exactCents - flooredCents };
    });

    var sumFlooredCents = shares.reduce(function (sum, s) { return sum + s.flooredCents; }, 0);
    var centsToDistribute = targetCents - sumFlooredCents;

    // Give the leftover cents to the lines with the largest fractional
    // remainder first (stable sort: ties keep original line order).
    var byRemainderDesc = shares.slice().sort(function (a, b) { return b.remainder - a.remainder; });
    for (var i = 0; i < centsToDistribute; i++) {
      byRemainderDesc[i].flooredCents += 1;
    }

    return shares.map(function (s) {
      var approved = s.flooredCents / 100;
      var line_status = approved <= 0 ? STATUS_.BudgetRequestLine.REJECTED :
        (approved >= s.requested ? STATUS_.BudgetRequestLine.APPROVED : STATUS_.BudgetRequestLine.REDUCED);
      return { approved_amount: approved, line_status: line_status };
    });
  },

  /**
   * Nightly integrity sweep invariant: a receipt's linked ClaimLineItems
   * must never total more than the receipt's own printed total.
   * @param {number} lineItemsSum
   * @param {number} receiptTotal
   * @return {{ok: boolean}}
   */
  checkReceiptTotal: function (lineItemsSum, receiptTotal) {
    return { ok: lineItemsSum <= receiptTotal + 0.005 };
  },

  /**
   * Nightly integrity sweep invariant: a PAID claim's payouts must sum to
   * exactly its total_amount (within float-rounding tolerance).
   * @param {number} payoutsSum
   * @param {number} claimTotal
   * @return {{ok: boolean}}
   */
  checkPayoutSum: function (payoutsSum, claimTotal) {
    return { ok: Math.abs(payoutsSum - claimTotal) < 0.005 };
  },

  /**
   * Detect and resolve Config.TREASURER_USER_ID drift: the stored ID can
   * survive an ID-scheme change across upgrades (e.g. 'U-0001' -> 'USER-0001')
   * while the real Users row moves to the new ID, silently breaking every
   * transition that resolves the treasurer. Auto-correctable only when
   * exactly one TREASURER-role user exists to correct to.
   * @param {?string} configuredId current Config.TREASURER_USER_ID (or null/unset)
   * @param {string[]} treasurerUserIds every Users.user_id with role TREASURER
   * @return {{action: 'ok'|'correct'|'unresolvable', correctedId: ?string}}
   */
  resolveTreasurerIdDrift: function (configuredId, treasurerUserIds) {
    if (configuredId && treasurerUserIds.indexOf(configuredId) !== -1) {
      return { action: 'ok', correctedId: null };
    }
    if (treasurerUserIds.length === 1) {
      return { action: 'correct', correctedId: treasurerUserIds[0] };
    }
    return { action: 'unresolvable', correctedId: null };
  }
};

if (typeof module !== 'undefined') {
  module.exports = { CoreDecisions: CoreDecisions };
}
