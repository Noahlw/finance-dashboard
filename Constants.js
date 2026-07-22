"use strict";
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
  ACCOUNT_ADJUSTMENTS: "AccountAdjustments",
  ACCOUNT_TRANSFERS: "AccountTransfers",
  APPROVALS: "Approvals",
  AUDIT_LOG: "AuditLog",
  BUDGET_REQUEST_LINES: "BudgetRequestLines",
  BUDGET_REQUESTS: "BudgetRequests",
  CATEGORIES: "Categories",
  CLAIM_LINE_ITEMS: "ClaimLineItems",
  CONFIG: "Config",
  COUNTERS: "Counters",
  EVENTS: "Events",
  EXPENSE_CLAIMS: "ExpenseClaims",
  FINANCE_ACCOUNTS: "FinanceAccounts",
  INCOME: "Income",
  PAYOUTS: "Payouts",
  RECEIPTS: "Receipts",
  USERS: "Users",
  // CF-Vault workbook (separate spreadsheet; treasurer-only)
  VAULT: "Vault",
});

/**
 * 1-indexed column layouts per tab. Column 1 is always the primary key.
 * Keep in lockstep with FINANCE-SYSTEM-DESIGN.md §1.3 and BUILD-PLAN.md §0.6.
 */
var COLS = Object.freeze({
  AccountAdjustments: Object.freeze({
    account_id: 2,
    adjusted_at: 7,
    adjusted_by: 6,
    adjustment_id: 1,
    amount: 3,
    direction: 4,
    reason: 5,
  }),
  AccountTransfers: Object.freeze({
    amount: 4,
    from_account_id: 2,
    reason: 5,
    to_account_id: 3,
    transfer_id: 1,
    transferred_at: 7,
    transferred_by: 6,
  }),
  Approvals: Object.freeze({
    action: 7,
    amount: 5,
    amount_override: 8,
    confirm: 10,
    entity_id: 1,
    entity_type: 2,
    intent_actor_email: 11,
    note: 9,
    receipt_link: 12,
    requester_or_claimant: 4,
    status: 6,
    title: 3,
  }),
  AuditLog: Object.freeze({
    action: 6,
    actor_user_id: 3,
    detail: 7,
    entity_id: 5,
    entity_type: 4,
    prev_hash: 8,
    row_hash: 9,
    seq: 1,
    ts: 2,
  }),
  BudgetRequestLines: Object.freeze({
    approved_amount: 6,
    category_id: 3,
    claimed_amount: 8,
    description: 4,
    line_id: 1,
    line_status: 7,
    remaining: 9,
    request_id: 2,
    requested_amount: 5,
  }),
  BudgetRequests: Object.freeze({
    decided_at: 9,
    decided_by: 10,
    decision_note: 11,
    event_id: 3,
    justification: 5,
    needed_by: 6,
    processed_response_id: 13,
    request_id: 1,
    requester_id: 2,
    self_approved: 12,
    status: 7,
    submitted_at: 8,
    title: 4,
  }),
  Categories: Object.freeze({
    active: 5,
    category_id: 1,
    kind: 3,
    name: 2,
    semester_cap: 4,
  }),
  ClaimLineItems: Object.freeze({
    amount: 5,
    budget_line_id: 3,
    claim_id: 2,
    claim_line_id: 1,
    description: 6,
    missing_receipt_flag: 7,
    receipt_id: 4,
  }),
  Config: Object.freeze({ key: 1, value: 2 }),
  Counters: Object.freeze({ entity: 1, last_n: 2 }),
  Events: Object.freeze({
    created_at: 5,
    event_id: 1,
    name: 2,
    owner_user_id: 4,
    semester: 3,
  }),
  ExpenseClaims: Object.freeze({
    approved_at: 6,
    approved_by: 10,
    claim_id: 1,
    claimant_id: 2,
    created_by: 16,
    event_id: 19,
    expense_date: 17,
    late_flag: 12,
    locked_at: 8,
    notes: 14,
    paid_at: 7,
    payout_handle: 21,
    payout_method: 20,
    processed_response_id: 15,
    self_approved: 13,
    semester: 18,
    status: 3,
    submitted_at: 4,
    total_amount: 11,
    verified_at: 5,
    verified_by: 9,
  }),
  FinanceAccounts: Object.freeze({
    account_id: 1,
    created_at: 8,
    current_balance: 4,
    deactivated_at: 9,
    name: 2,
    opening_balance: 3,
    pending_income: 5,
    reserved_payouts: 6,
    status: 7,
  }),
  Income: Object.freeze({
    account_id: 9,
    amount: 4,
    category_id: 3,
    date: 2,
    decided_at: 12,
    decided_by: 11,
    decision_note: 13,
    event_id: 7,
    income_id: 1,
    notes: 8,
    processed_response_id: 14,
    received_by: 5,
    source_ref: 6,
    status: 10,
  }),
  Payouts: Object.freeze({
    account_id: 11,
    amount: 4,
    claim_id: 2,
    confirmed_at: 10,
    failure_reason: 12,
    method: 5,
    paid_at: 9,
    paid_by: 7,
    parent_payout_id: 13,
    payee_user_id: 3,
    payout_id: 1,
    status: 8,
    txn_reference: 6,
  }),
  Receipts: Object.freeze({
    drive_file_id: 2,
    file_link: 9,
    receipt_date: 7,
    receipt_id: 1,
    receipt_total: 8,
    sha256: 3,
    uploaded_at: 5,
    uploaded_by: 4,
    vendor: 6,
  }),
  Users: Object.freeze({
    active: 5,
    created_at: 6,
    display_name: 2,
    email: 4,
    role: 3,
    user_id: 1,
  }),
  Vault: Object.freeze({
    consent_ts: 6,
    full_name: 2,
    payout_handle: 5,
    payout_method: 4,
    student_id: 3,
    user_id: 1,
  }),
});

/** User.role and Approvals.role-check values (design §1.3 + D4). */
var ROLES = Object.freeze({
  ADVISOR_AUDITOR: "ADVISOR_AUDITOR",
  COMMITTEE: "COMMITTEE",
  MEMBER: "MEMBER",
  TREASURER: "TREASURER",
});

/** Status enums per FINANCE-SYSTEM-DESIGN.md §1.5 state machines. */
var STATUS = Object.freeze({
  BudgetRequest: Object.freeze({
    APPROVED: "APPROVED",
    CLOSED: "CLOSED",
    DRAFT: "DRAFT",
    NEEDS_INFO: "NEEDS_INFO",
    PARTIALLY_APPROVED: "PARTIALLY_APPROVED",
    PENDING: "PENDING",
    REJECTED: "REJECTED",
    WITHDRAWN: "WITHDRAWN",
  }),
  BudgetRequestLine: Object.freeze({
    APPROVED: "APPROVED",
    PENDING: "PENDING",
    REDUCED: "REDUCED",
    REJECTED: "REJECTED",
  }),
  ExpenseClaim: Object.freeze({
    APPROVED_FOR_PAYOUT: "APPROVED_FOR_PAYOUT",
    DRAFT: "DRAFT",
    LOCKED: "LOCKED",
    NEEDS_INFO: "NEEDS_INFO",
    PAID: "PAID",
    REJECTED: "REJECTED",
    SUBMITTED: "SUBMITTED",
    VERIFIED: "VERIFIED",
  }),
  FinanceAccount: Object.freeze({
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
  }),
  Income: Object.freeze({
    CONFIRMED: "CONFIRMED",
    CORRECTED: "CORRECTED",
    NEEDS_INFO: "NEEDS_INFO",
    PENDING: "PENDING",
    REJECTED: "REJECTED",
  }),
  Payout: Object.freeze({
    CONFIRMED: "CONFIRMED",
    FAILED: "FAILED",
    QUEUED: "QUEUED",
    SENT: "SENT",
  }),
});

/** Vault.payout_method / Payouts.method values (design §1.3). */
var PAYOUT_METHOD = Object.freeze({
  BANK: "BANK",
  CASH: "CASH",
  FPS: "FPS",
  OTHER: "OTHER",
  PAYME: "PAYME",
});

/** Entity name -> ID prefix, used by Ids.nextId(). */
var ENTITY_PREFIX = Object.freeze({
  AccountAdjustment: "ADJ",
  AccountTransfer: "XFER",
  BudgetRequest: "BUDGET",
  BudgetRequestLine: "BUDGETLINE",
  ClaimLineItem: "CLAIMLINE",
  Event: "EVENT",
  ExpenseClaim: "CLAIM",
  FinanceAccount: "ACCOUNT",
  Income: "INCOME",
  Payout: "PAYOUT",
  Receipt: "RECEIPT",
  User: "USER",
});

/** Approval actions accepted on the Approvals tab intent columns. */
var ACTIONS = Object.freeze({
  APPROVE: "APPROVE",
  APPROVE_PAYOUT: "APPROVE_PAYOUT",
  CONFIRM: "CONFIRM",
  CORRECT: "CORRECT",
  MARK_PAID: "MARK_PAID",
  REDUCE: "REDUCE",
  REJECT: "REJECT",
  REQUEST_INFO: "REQUEST_INFO",
  VERIFY: "VERIFY",
});

if (typeof module !== "undefined") {
  module.exports = {
    ACTIONS,
    COLS,
    ENTITY_PREFIX,
    PAYOUT_METHOD,
    ROLES,
    STATUS,
    TABS,
  };
}
