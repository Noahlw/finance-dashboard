global.getSheet_ = jest.fn();
global.getVaultSheet_ = jest.fn();
global.TABS = { EXPENSE_CLAIMS: 'ExpenseClaims', CLAIM_LINE_ITEMS: 'ClaimLineItems', RECEIPTS: 'Receipts', BUDGET_REQUESTS: 'BudgetRequests', BUDGET_REQUEST_LINES: 'BudgetRequestLines', USERS: 'Users', AUDIT_LOG: 'AuditLog' };
global.COLS = {
  ExpenseClaims: { claim_id: 1, claimant_id: 2, status: 3, submitted_at: 4, verified_at: 5, approved_at: 6, paid_at: 7, locked_at: 8, verified_by: 9, approved_by: 10, total_amount: 11, late_flag: 12, self_approved: 13, notes: 14, processed_response_id: 15, created_by: 16, expense_date: 17, semester: 18, event_id: 19, payout_method: 20, payout_handle: 21 },
  ClaimLineItems: { claim_line_id: 1, claim_id: 2, budget_line_id: 3, receipt_id: 4, amount: 5, description: 6, missing_receipt_flag: 7 },
  Receipts: { receipt_id: 1, drive_file_id: 2, sha256: 3, uploaded_by: 4, uploaded_at: 5, vendor: 6, receipt_date: 7, receipt_total: 8, file_link: 9 },
  BudgetRequestLines: { line_id: 1, request_id: 2, category_id: 3, description: 4, requested_amount: 5, approved_amount: 6, line_status: 7, claimed_amount: 8, remaining: 9 },
  Users: { user_id: 1, display_name: 2, role: 3, email: 4, active: 5, created_at: 6 }
};
global.STATUS = {
  ExpenseClaim: { SUBMITTED: 'SUBMITTED', VERIFIED: 'VERIFIED', REJECTED: 'REJECTED', DRAFT: 'DRAFT', NEEDS_INFO: 'NEEDS_INFO', APPROVED_FOR_PAYOUT: 'APPROVED_FOR_PAYOUT', PAID: 'PAID', LOCKED: 'LOCKED' }
};
global.ROLES = { MEMBER: 'MEMBER', COMMITTEE: 'COMMITTEE', TREASURER: 'TREASURER', ADVISOR_AUDITOR: 'ADVISOR_AUDITOR' };
global.Config = {
  get: jest.fn(() => '14'),
  getNum: jest.fn(() => 5)
};
global.Discord = { postStatus: jest.fn(), postTreasury: jest.fn() };
global.Audit = { _nowIso: jest.fn(() => '2026-07-21T12:00:00Z'), append: jest.fn() };
global.Session = { getActiveUser: jest.fn(() => ({ getEmail: () => 'test@example.com' })) };
global.PropertiesService = {
  getScriptProperties: jest.fn(() => ({ getProperty: jest.fn(() => 'FOLDER-123'), setProperty: jest.fn() }))
};
global.CacheService = {
  getScriptCache: jest.fn(() => ({ get: jest.fn(() => null), put: jest.fn() }))
};
global.SpreadsheetApp = {
  openById: jest.fn(() => ({ getSheetByName: jest.fn() })),
  flush: jest.fn()
};

var CoreDecisions = {};
global.CoreDecisions = CoreDecisions;

var engineModule = require('../Engine.js');
var realEngine = engineModule.Engine;

function makeCliSheet(rows) {
  return {
    getDataRange: jest.fn(() => ({ getValues: jest.fn(() => {
      var header = ['claim_line_id', 'claim_id', 'budget_line_id', 'receipt_id', 'amount', 'description', 'missing_receipt_flag'];
      return [header].concat(rows);
    }) }))
  };
}

function makeClaimSheet(rows) {
  return {
    getDataRange: jest.fn(() => ({ getValues: jest.fn(() => {
      var header = ['claim_id', 'claimant_id', 'status'];
      return [header].concat(rows);
    }) }))
  };
}

describe('Engine._validateClaimVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    realEngine._sumClaimedAgainstLine = jest.fn(() => 0);
  });

  it('should reject a claim line with no receipt_id and no missing receipt flag', () => {
    realEngine._findRowsByColumn = jest.fn(() => [
      { rowIndex: 2, values: ['CLI-001', 'CLAIM-001', 'BL-001', '', 100, 'No receipt', false] }
    ]);
    realEngine._loadRow = jest.fn(() => ({
      rowIndex: 2, sheet: {},
      values: ['BL-001', 'BUDGET-001', 'CAT-1', 'Test', 200, 200, 'APPROVED', 0, 200]
    }));

    global.getSheet_.mockImplementation((tab) => {
      if (tab === 'ExpenseClaims') return makeClaimSheet([]);
      return makeCliSheet([]);
    });

    var result = realEngine._validateClaimVerification('CLAIM-001', 'USER-1', {});
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('has no receipt_id and is not marked as missing receipt');
  });

  it('should reject when total claimed exceeds receipt total', () => {
    realEngine._findRowsByColumn = jest.fn(() => [
      { rowIndex: 2, values: ['CLI-001', 'CLAIM-001', 'BL-001', 'RECEIPT-001', 250, 'Over limit', false] }
    ]);
    realEngine._loadRow = jest.fn((entityType, id) => {
      if (entityType === 'BudgetRequestLine') {
        return { rowIndex: 2, sheet: {}, values: ['BL-001', 'BUDGET-001', 'CAT-1', 'Test', 200, 200, 'APPROVED', 0, 200] };
      }
      if (entityType === 'Receipt') {
        return { rowIndex: 2, values: ['RECEIPT-001', 'file-id', 'hash', 'USER-1', '2026-07-20', 'Vendor', '2026-07-20', 200, '=HYPERLINK(...)'] };
      }
      return null;
    });

    global.getSheet_.mockImplementation((tab) => {
      if (tab === 'ExpenseClaims') return makeClaimSheet([
        ['CLAIM-001', 'M-001', 'SUBMITTED']
      ]);
      return makeCliSheet([
        ['CLI-001', 'CLAIM-001', 'BL-001', 'RECEIPT-001', 250, '', false]
      ]);
    });

    var result = realEngine._validateClaimVerification('CLAIM-001', 'USER-1', {});
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('exceeds printed receipt total');
  });

  it('should allow missing receipt flag', () => {
    realEngine._findRowsByColumn = jest.fn(() => [
      { rowIndex: 2, values: ['CLI-001', 'CLAIM-001', 'BL-001', '', 5, 'Missing', true] }
    ]);
    realEngine._loadRow = jest.fn((entityType) => {
      if (entityType === 'BudgetRequestLine') {
        return { rowIndex: 2, sheet: {}, values: ['BL-001', 'BUDGET-001', 'CAT-1', 'Test', 200, 200, 'APPROVED', 0, 200] };
      }
      if (entityType === 'User') {
        return { rowIndex: 2, values: ['USER-1', 'Treasurer', 'TREASURER', 'treasurer@example.com', true, '2026-01-01'] };
      }
      if (entityType === 'ExpenseClaim') {
        return { rowIndex: 2, values: ['CLAIM-001', 'M-001', 'SUBMITTED', '2026-07-20', '', '', '', '', '', '', 5, false, false, 'Missing receipt', 'uuid', 'USER-1', '2026-07-20', '26A', '', 'FPS', '91234567'] };
      }
      return null;
    });

    global.getSheet_.mockImplementation((tab) => {
      if (tab === 'ExpenseClaims') return makeClaimSheet([]);
      return makeCliSheet([]);
    });

    var result = realEngine._validateClaimVerification('CLAIM-001', 'USER-1', {});
    expect(result.ok).toBe(true);
  });

  it('should reject over-claimed budget line (negative remaining)', () => {
    realEngine._findRowsByColumn = jest.fn(() => [
      { rowIndex: 2, values: ['CLI-001', 'CLAIM-001', 'BL-001', 'RECEIPT-001', 100, '', false] }
    ]);
    realEngine._sumClaimedAgainstLine = jest.fn(() => 250);
    realEngine._loadRow = jest.fn((entityType, id) => {
      if (entityType === 'BudgetRequestLine') {
        return { rowIndex: 2, sheet: {}, values: ['BL-001', 'BUDGET-001', 'CAT-1', 'Test', 200, 200, 'APPROVED', 250, -50] };
      }
      if (entityType === 'Receipt') {
        return { rowIndex: 2, values: ['RECEIPT-001', 'file-id', 'hash', 'USER-1', '2026-07-20', 'Vendor', '2026-07-20', 500, '=HYPERLINK(...)'] };
      }
      return null;
    });

    global.getSheet_.mockImplementation((tab) => {
      if (tab === 'ExpenseClaims') return makeClaimSheet([
        ['CLAIM-001', 'M-001', 'SUBMITTED']
      ]);
      return makeCliSheet([
        ['CLI-001', 'CLAIM-001', 'BL-001', 'RECEIPT-001', 100, '', false]
      ]);
    });

    var result = realEngine._validateClaimVerification('CLAIM-001', 'USER-1', {});
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('over-claimed');
  });
});
