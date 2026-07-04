const { CoreDecisions } = require('../src/gas/CoreDecisions');
const { STATUS, ROLES, COLS } = require('../src/gas/Constants');

describe('findTransition', () => {
  test('BudgetRequest DRAFT --SUBMIT--> PENDING is legal and self-only', () => {
    var def = CoreDecisions.findTransition('BudgetRequest', STATUS.BudgetRequest.DRAFT, 'SUBMIT');
    expect(def).toBeTruthy();
    expect(def.to).toBe(STATUS.BudgetRequest.PENDING);
    expect(def.allowedRoles).toBeNull();
  });

  test('BudgetRequest PENDING --REQUEST_INFO--> NEEDS_INFO requires TREASURER and a note', () => {
    var def = CoreDecisions.findTransition('BudgetRequest', STATUS.BudgetRequest.PENDING, 'REQUEST_INFO');
    expect(def).toBeTruthy();
    expect(def.to).toBe(STATUS.BudgetRequest.NEEDS_INFO);
    expect(def.allowedRoles).toEqual([ROLES.TREASURER]);
    expect(def.requiresNote).toBe(true);
  });

  test('BudgetRequest PENDING --APPROVE--> DERIVED requires TREASURER', () => {
    var def = CoreDecisions.findTransition('BudgetRequest', STATUS.BudgetRequest.PENDING, 'APPROVE');
    expect(def).toBeTruthy();
    expect(def.to).toBe('DERIVED');
    expect(def.allowedRoles).toEqual([ROLES.TREASURER]);
  });

  test('BudgetRequest PENDING --REDUCE--> DERIVED requires a note and an amount', () => {
    var def = CoreDecisions.findTransition('BudgetRequest', STATUS.BudgetRequest.PENDING, 'REDUCE');
    expect(def).toBeTruthy();
    expect(def.requiresNote).toBe(true);
    expect(def.requiresAmount).toBe(true);
  });

  test('BudgetRequest APPROVED --CLOSE--> CLOSED requires TREASURER', () => {
    var def = CoreDecisions.findTransition('BudgetRequest', STATUS.BudgetRequest.APPROVED, 'CLOSE');
    expect(def).toBeTruthy();
    expect(def.to).toBe(STATUS.BudgetRequest.CLOSED);
  });

  test('ExpenseClaim SUBMITTED --VERIFY--> VERIFIED requires COMMITTEE or TREASURER', () => {
    var def = CoreDecisions.findTransition('ExpenseClaim', STATUS.ExpenseClaim.SUBMITTED, 'VERIFY');
    expect(def).toBeTruthy();
    expect(def.to).toBe(STATUS.ExpenseClaim.VERIFIED);
    expect(def.allowedRoles).toEqual([ROLES.COMMITTEE, ROLES.TREASURER]);
  });

  test('ExpenseClaim VERIFIED --APPROVE_PAYOUT--> APPROVED_FOR_PAYOUT requires TREASURER', () => {
    var def = CoreDecisions.findTransition('ExpenseClaim', STATUS.ExpenseClaim.VERIFIED, 'APPROVE_PAYOUT');
    expect(def).toBeTruthy();
    expect(def.to).toBe(STATUS.ExpenseClaim.APPROVED_FOR_PAYOUT);
    expect(def.allowedRoles).toEqual([ROLES.TREASURER]);
  });

  test('ExpenseClaim PAID --LOCK--> LOCKED requires TREASURER', () => {
    var def = CoreDecisions.findTransition('ExpenseClaim', STATUS.ExpenseClaim.PAID, 'LOCK');
    expect(def).toBeTruthy();
    expect(def.to).toBe(STATUS.ExpenseClaim.LOCKED);
  });

  test('returns null for an illegal from-state', () => {
    var def = CoreDecisions.findTransition('BudgetRequest', STATUS.BudgetRequest.CLOSED, 'SUBMIT');
    expect(def).toBeNull();
  });

  test('returns null for an unknown action', () => {
    var def = CoreDecisions.findTransition('BudgetRequest', STATUS.BudgetRequest.PENDING, 'NOT_A_REAL_ACTION');
    expect(def).toBeNull();
  });

  test('returns null for an unknown entity type', () => {
    var def = CoreDecisions.findTransition('NotAnEntity', STATUS.BudgetRequest.PENDING, 'SUBMIT');
    expect(def).toBeNull();
  });
});

describe('deriveRequestStatusFromLineStatuses', () => {
  test('empty line list stays PENDING (nothing to derive from yet)', () => {
    expect(CoreDecisions.deriveRequestStatusFromLineStatuses([])).toBe(STATUS.BudgetRequest.PENDING);
  });

  test('all lines APPROVED derives request APPROVED', () => {
    var statuses = [STATUS.BudgetRequestLine.APPROVED, STATUS.BudgetRequestLine.APPROVED];
    expect(CoreDecisions.deriveRequestStatusFromLineStatuses(statuses)).toBe(STATUS.BudgetRequest.APPROVED);
  });

  test('all lines REJECTED derives request REJECTED', () => {
    var statuses = [STATUS.BudgetRequestLine.REJECTED, STATUS.BudgetRequestLine.REJECTED];
    expect(CoreDecisions.deriveRequestStatusFromLineStatuses(statuses)).toBe(STATUS.BudgetRequest.REJECTED);
  });

  test('mixed line statuses derive PARTIALLY_APPROVED', () => {
    var statuses = [STATUS.BudgetRequestLine.APPROVED, STATUS.BudgetRequestLine.REJECTED];
    expect(CoreDecisions.deriveRequestStatusFromLineStatuses(statuses)).toBe(STATUS.BudgetRequest.PARTIALLY_APPROVED);
  });

  test('a REDUCED line among approved ones also derives PARTIALLY_APPROVED', () => {
    var statuses = [STATUS.BudgetRequestLine.APPROVED, STATUS.BudgetRequestLine.REDUCED];
    expect(CoreDecisions.deriveRequestStatusFromLineStatuses(statuses)).toBe(STATUS.BudgetRequest.PARTIALLY_APPROVED);
  });
});

describe('SELF_APPROVAL_ACTIONS / isSelfApproval', () => {
  test('the self-approval action list matches D5', () => {
    expect(CoreDecisions.SELF_APPROVAL_ACTIONS).toEqual(['APPROVE', 'REDUCE', 'VERIFY', 'APPROVE_PAYOUT']);
  });

  test('self + a self-approval action -> true', () => {
    expect(CoreDecisions.isSelfApproval(true, 'APPROVE')).toBe(true);
    expect(CoreDecisions.isSelfApproval(true, 'VERIFY')).toBe(true);
    expect(CoreDecisions.isSelfApproval(true, 'APPROVE_PAYOUT')).toBe(true);
  });

  test('not self -> false even for a self-approval action', () => {
    expect(CoreDecisions.isSelfApproval(false, 'APPROVE')).toBe(false);
  });

  test('self + a self-only action (not in the list) -> false', () => {
    // SUBMIT/WITHDRAW/RESUBMIT are allowedRoles:null "self-only" actions,
    // not self-APPROVAL actions -- these are different concepts.
    expect(CoreDecisions.isSelfApproval(true, 'SUBMIT')).toBe(false);
  });
});

describe('ownerId', () => {
  test('BudgetRequest owner is requester_id', () => {
    var values = [];
    values[COLS.BudgetRequests.requester_id - 1] = 'U1';
    expect(CoreDecisions.ownerId('BudgetRequest', values)).toBe('U1');
  });

  test('ExpenseClaim owner is claimant_id', () => {
    var values = [];
    values[COLS.ExpenseClaims.claimant_id - 1] = 'U2';
    expect(CoreDecisions.ownerId('ExpenseClaim', values)).toBe('U2');
  });

  test('unrecognized entity type -> null', () => {
    expect(CoreDecisions.ownerId('Payout', [])).toBeNull();
  });
});

describe('authorize', () => {
  var noteDef = { allowedRoles: [ROLES.TREASURER], requiresNote: true };
  var amountDef = { allowedRoles: [ROLES.TREASURER], requiresNote: true, requiresAmount: true };
  var selfOnlyDef = { allowedRoles: null };
  var roleOnlyDef = { allowedRoles: [ROLES.TREASURER] };

  test('self-only transition denies a non-owner regardless of role', () => {
    var result = CoreDecisions.authorize(selfOnlyDef, false, ROLES.TREASURER, {});
    expect(result).toEqual({ ok: false, reason: 'NOT_OWNER' });
  });

  test('self-only transition allows the owner', () => {
    expect(CoreDecisions.authorize(selfOnlyDef, true, ROLES.MEMBER, {}).ok).toBe(true);
  });

  test('role-gated transition denies a disallowed role even if self', () => {
    var result = CoreDecisions.authorize(roleOnlyDef, true, ROLES.MEMBER, {});
    expect(result).toEqual({ ok: false, reason: 'ROLE_NOT_ALLOWED' });
  });

  test('role-gated transition allows an allowed role', () => {
    expect(CoreDecisions.authorize(roleOnlyDef, false, ROLES.TREASURER, {}).ok).toBe(true);
  });

  test('requiresNote denies a missing decision_note', () => {
    var result = CoreDecisions.authorize(noteDef, false, ROLES.TREASURER, {});
    expect(result).toEqual({ ok: false, reason: 'NOTE_REQUIRED' });
  });

  test('requiresNote denies an empty-string decision_note', () => {
    var result = CoreDecisions.authorize(noteDef, false, ROLES.TREASURER, { decision_note: '' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('NOTE_REQUIRED');
  });

  test('requiresNote denies a whitespace-only decision_note', () => {
    var result = CoreDecisions.authorize(noteDef, false, ROLES.TREASURER, { decision_note: '   ' });
    expect(result.reason).toBe('NOTE_REQUIRED');
  });

  test('requiresNote allows a non-empty decision_note', () => {
    expect(CoreDecisions.authorize(noteDef, false, ROLES.TREASURER, { decision_note: 'ok' }).ok).toBe(true);
  });

  test('role check happens before the note check (precedence)', () => {
    var result = CoreDecisions.authorize(noteDef, false, ROLES.MEMBER, {});
    expect(result.reason).toBe('ROLE_NOT_ALLOWED');
  });

  test('note check happens before the amount check (precedence)', () => {
    var result = CoreDecisions.authorize(amountDef, false, ROLES.TREASURER, {});
    expect(result.reason).toBe('NOTE_REQUIRED');
  });

  test('requiresAmount allows amount_override of exactly 0', () => {
    var result = CoreDecisions.authorize(amountDef, false, ROLES.TREASURER, { decision_note: 'ok', amount_override: 0 });
    expect(result.ok).toBe(true);
  });

  test('requiresAmount treats an empty-string amount_override as 0 (current behavior preserved, not endorsed)', () => {
    var result = CoreDecisions.authorize(amountDef, false, ROLES.TREASURER, { decision_note: 'ok', amount_override: '' });
    expect(result.ok).toBe(true);
  });

  test('requiresAmount denies a missing amount_override (NaN)', () => {
    var result = CoreDecisions.authorize(amountDef, false, ROLES.TREASURER, { decision_note: 'ok' });
    expect(result).toEqual({ ok: false, reason: 'INVALID_AMOUNT_OVERRIDE' });
  });

  test('requiresAmount denies a negative amount_override', () => {
    var result = CoreDecisions.authorize(amountDef, false, ROLES.TREASURER, { decision_note: 'ok', amount_override: -0.01 });
    expect(result.reason).toBe('INVALID_AMOUNT_OVERRIDE');
  });

  test('requiresAmount denies a non-numeric amount_override', () => {
    var result = CoreDecisions.authorize(amountDef, false, ROLES.TREASURER, { decision_note: 'ok', amount_override: 'abc' });
    expect(result.reason).toBe('INVALID_AMOUNT_OVERRIDE');
  });

  test('all checks pass -> ok:true', () => {
    var result = CoreDecisions.authorize(amountDef, false, ROLES.TREASURER, { decision_note: 'ok', amount_override: 50 });
    expect(result).toEqual({ ok: true, reason: null });
  });
});

describe('checkClaimLineAmount', () => {
  test('amount under remaining is ok', () => {
    expect(CoreDecisions.checkClaimLineAmount(50, 100, 40)).toEqual({ ok: true, remaining: 60 });
  });

  test('amount exactly equal to remaining is ok (boundary, <=)', () => {
    expect(CoreDecisions.checkClaimLineAmount(60, 100, 40)).toEqual({ ok: true, remaining: 60 });
  });

  test('amount one cent over remaining is not ok', () => {
    var result = CoreDecisions.checkClaimLineAmount(60.01, 100, 40);
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(60);
  });

  test('amount of 0 is ok against a positive remaining', () => {
    expect(CoreDecisions.checkClaimLineAmount(0, 100, 40).ok).toBe(true);
  });

  test('a line already over-claimed (negative remaining) rejects even a 0 amount', () => {
    var result = CoreDecisions.checkClaimLineAmount(0, 50, 70);
    expect(result).toEqual({ ok: false, remaining: -20 });
  });
});

describe('computeReduceSplit', () => {
  test('override fully covers total requested -> every line APPROVED at full amount (ratio clamps at 1)', () => {
    var result = CoreDecisions.computeReduceSplit([10, 10], 100);
    expect(result).toEqual([
      { approved_amount: 10, line_status: STATUS.BudgetRequestLine.APPROVED },
      { approved_amount: 10, line_status: STATUS.BudgetRequestLine.APPROVED }
    ]);
  });

  test('override of 0 -> every line REJECTED at 0', () => {
    var result = CoreDecisions.computeReduceSplit([10, 20], 0);
    expect(result).toEqual([
      { approved_amount: 0, line_status: STATUS.BudgetRequestLine.REJECTED },
      { approved_amount: 0, line_status: STATUS.BudgetRequestLine.REJECTED }
    ]);
  });

  test('total requested of 0 never divides by zero and always REJECTs regardless of override', () => {
    var result = CoreDecisions.computeReduceSplit([0, 0], 500);
    expect(result).toEqual([
      { approved_amount: 0, line_status: STATUS.BudgetRequestLine.REJECTED },
      { approved_amount: 0, line_status: STATUS.BudgetRequestLine.REJECTED }
    ]);
  });

  test('a clean proportional split lands each line on REDUCED', () => {
    var result = CoreDecisions.computeReduceSplit([100, 300], 100);
    expect(result).toEqual([
      { approved_amount: 25, line_status: STATUS.BudgetRequestLine.REDUCED },
      { approved_amount: 75, line_status: STATUS.BudgetRequestLine.REDUCED }
    ]);
  });

  test('rounds to cents on a non-terminating ratio', () => {
    var result = CoreDecisions.computeReduceSplit([1, 2], 1);
    expect(result).toEqual([
      { approved_amount: 0.33, line_status: STATUS.BudgetRequestLine.REDUCED },
      { approved_amount: 0.67, line_status: STATUS.BudgetRequestLine.REDUCED }
    ]);
  });

  test('a line rounded back up to its full requested amount within a mixed split lands APPROVED while others REDUCED', () => {
    var result = CoreDecisions.computeReduceSplit([1000, 1], 1000);
    // ratio = 1000/1001 ~= 0.999000999...
    expect(result[0].line_status).toBe(STATUS.BudgetRequestLine.REDUCED);
    expect(result[1].approved_amount).toBe(1);
    expect(result[1].line_status).toBe(STATUS.BudgetRequestLine.APPROVED);
  });

  test('a three-way tie never drifts a cent short of the override (largest-remainder allocation)', () => {
    // Independent per-line rounding would give 3.33 x3 = 9.99, a cent short
    // of the 10.00 the treasurer actually approved. The extra cent must go
    // to exactly one line (first in original order wins the tie).
    var result = CoreDecisions.computeReduceSplit([10, 10, 10], 10);
    var sum = result.reduce(function (s, r) { return s + r.approved_amount; }, 0);
    expect(Math.round(sum * 100) / 100).toBe(10);
    expect(result[0].approved_amount).toBe(3.34);
    expect(result[1].approved_amount).toBe(3.33);
    expect(result[2].approved_amount).toBe(3.33);
  });

  test('sum of approved_amount always equals min(override, totalRequested) exactly, across several ratios', () => {
    [
      { lines: [7, 11, 13], override: 17 },
      { lines: [1, 1, 1, 1, 1, 1, 1], override: 3 },
      { lines: [50, 25, 25], override: 40 }
    ].forEach(function (c) {
      var result = CoreDecisions.computeReduceSplit(c.lines, c.override);
      var sum = result.reduce(function (s, r) { return s + r.approved_amount; }, 0);
      var target = Math.min(c.override, c.lines.reduce(function (s, r) { return s + r; }, 0));
      expect(Math.round(sum * 100) / 100).toBe(Math.round(target * 100) / 100);
    });
  });
});
