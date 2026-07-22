/**
 * Constants.js — single source of truth for tab names, column layouts,
 * status enums, roles, and ID prefixes. Every other file MUST reference
 * these maps instead of numeric column literals or string literals.
 *
 * Column indexes in COLS.* are 1-indexed to match Range.getRange(row, col)
 * / sheet.getRange(row, col, ...).getValue() conventions used throughout
 * this project (NOT 0-indexed array offsets).
 */

/** Spreadsheet tab names (CF-Ledger workbook, unless noted). */
var TABS = Object.freeze({
  USERS: 'Users',
  CATEGORIES: 'Categories',
  EVENTS: 'Events',
  BUDGET_REQUESTS: 'BudgetRequests',
  BUDGET_REQUEST_LINES: 'BudgetRequestLines',
  EXPENSE_CLAIMS: 'ExpenseClaims',
  CLAIM_LINE_ITEMS: 'ClaimLineItems',
  RECEIPTS: 'Receipts',
  INCOME: 'Income',
  PAYOUTS: 'Payouts',
  AUDIT_LOG: 'AuditLog',
  APPROVALS: 'Approvals',
  CONFIG: 'Config',
  COUNTERS: 'Counters',
  // CF-Vault workbook (separate spreadsheet; treasurer-only)
  VAULT: 'Vault'
});

/**
 * 1-indexed column layouts per tab. Column 1 is always the primary key.
 * Keep in lockstep with FINANCE-SYSTEM-DESIGN.md §1.3 and BUILD-PLAN.md §0.6.
 */
var COLS = Object.freeze({
  Users: Object.freeze({
    user_id: 1, display_name: 2, role: 3, email: 4, active: 5, created_at: 6
  }),
  Categories: Object.freeze({
    category_id: 1, name: 2, kind: 3, semester_cap: 4, active: 5
  }),
  Events: Object.freeze({
    event_id: 1, name: 2, semester: 3, owner_user_id: 4, created_at: 5
  }),
  BudgetRequests: Object.freeze({
    request_id: 1, requester_id: 2, event_id: 3, title: 4, justification: 5,
    needed_by: 6, status: 7, submitted_at: 8, decided_at: 9, decided_by: 10,
    decision_note: 11, self_approved: 12, processed_response_id: 13
  }),
  BudgetRequestLines: Object.freeze({
    line_id: 1, request_id: 2, category_id: 3, description: 4,
    requested_amount: 5, approved_amount: 6, line_status: 7,
    claimed_amount: 8, remaining: 9
  }),
  ExpenseClaims: Object.freeze({
    claim_id: 1, claimant_id: 2, status: 3, submitted_at: 4, verified_at: 5,
    approved_at: 6, paid_at: 7, locked_at: 8, verified_by: 9, approved_by: 10,
    total_amount: 11, late_flag: 12, self_approved: 13, notes: 14,
    processed_response_id: 15, created_by: 16, expense_date: 17, semester: 18,
    event_id: 19, payout_method: 20, payout_handle: 21
  }),
  ClaimLineItems: Object.freeze({
    claim_line_id: 1, claim_id: 2, budget_line_id: 3, receipt_id: 4,
    amount: 5, description: 6, missing_receipt_flag: 7
  }),
  Receipts: Object.freeze({
    receipt_id: 1, drive_file_id: 2, sha256: 3, uploaded_by: 4,
    uploaded_at: 5, vendor: 6, receipt_date: 7, receipt_total: 8, file_link: 9
  }),
  Income: Object.freeze({
    income_id: 1, date: 2, category_id: 3, amount: 4, received_by: 5,
    source_ref: 6, event_id: 7, notes: 8
  }),
  Payouts: Object.freeze({
    payout_id: 1, claim_id: 2, payee_user_id: 3, amount: 4, method: 5,
    txn_reference: 6, paid_by: 7, status: 8, paid_at: 9, confirmed_at: 10
  }),
  AuditLog: Object.freeze({
    seq: 1, ts: 2, actor_user_id: 3, entity_type: 4, entity_id: 5,
    action: 6, detail: 7, prev_hash: 8, row_hash: 9
  }),
  Approvals: Object.freeze({
    entity_id: 1, entity_type: 2, title: 3, requester_or_claimant: 4,
    amount: 5, status: 6, action: 7, amount_override: 8, note: 9,
    confirm: 10, intent_actor_email: 11, receipt_link: 12
  }),
  Config: Object.freeze({ key: 1, value: 2 }),
  Counters: Object.freeze({ entity: 1, last_n: 2 }),
  Vault: Object.freeze({
    user_id: 1, full_name: 2, student_id: 3, payout_method: 4,
    payout_handle: 5, consent_ts: 6
  })
});

/** User.role and Approvals.role-check values (design §1.3 + D4). */
var ROLES = Object.freeze({
  MEMBER: 'MEMBER',
  COMMITTEE: 'COMMITTEE',
  TREASURER: 'TREASURER',
  ADVISOR_AUDITOR: 'ADVISOR_AUDITOR'
});

/** Status enums per FINANCE-SYSTEM-DESIGN.md §1.5 state machines. */
var STATUS = Object.freeze({
  BudgetRequest: Object.freeze({
    DRAFT: 'DRAFT', PENDING: 'PENDING', NEEDS_INFO: 'NEEDS_INFO',
    APPROVED: 'APPROVED', PARTIALLY_APPROVED: 'PARTIALLY_APPROVED',
    REJECTED: 'REJECTED', WITHDRAWN: 'WITHDRAWN', CLOSED: 'CLOSED'
  }),
  BudgetRequestLine: Object.freeze({
    PENDING: 'PENDING', APPROVED: 'APPROVED', REDUCED: 'REDUCED',
    REJECTED: 'REJECTED'
  }),
  ExpenseClaim: Object.freeze({
    DRAFT: 'DRAFT', SUBMITTED: 'SUBMITTED', NEEDS_INFO: 'NEEDS_INFO', VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED', APPROVED_FOR_PAYOUT: 'APPROVED_FOR_PAYOUT',
    PAID: 'PAID', LOCKED: 'LOCKED'
  }),
  Payout: Object.freeze({
    QUEUED: 'QUEUED', SENT: 'SENT', CONFIRMED: 'CONFIRMED'
  })
});

/** Vault.payout_method / Payouts.method values (design §1.3). */
var PAYOUT_METHOD = Object.freeze({
  FPS: 'FPS', PAYME: 'PAYME', BANK: 'BANK', CASH: 'CASH'
});

/** Entity name -> ID prefix, used by Ids.nextId(). */
var ENTITY_PREFIX = Object.freeze({
  User: 'USER',
  Event: 'EVENT',
  BudgetRequest: 'BUDGET',
  BudgetRequestLine: 'BUDGETLINE',
  ExpenseClaim: 'CLAIM',
  ClaimLineItem: 'CLAIMLINE',
  Receipt: 'RECEIPT',
  Income: 'INCOME',
  Payout: 'PAYOUT'
});

/** Approval actions accepted on the Approvals tab intent columns. */
var ACTIONS = Object.freeze({
  APPROVE: 'APPROVE',
  REDUCE: 'REDUCE',
  REJECT: 'REJECT',
  REQUEST_INFO: 'REQUEST_INFO',
  VERIFY: 'VERIFY',
  APPROVE_PAYOUT: 'APPROVE_PAYOUT',
  MARK_PAID: 'MARK_PAID'
});

if (typeof module !== 'undefined') {
  module.exports = { TABS, COLS, ROLES, STATUS, ENTITY_PREFIX, ACTIONS, PAYOUT_METHOD };
}
