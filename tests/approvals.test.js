global.getSheet_ = jest.fn();
global.TABS = { EXPENSE_CLAIMS: 'ExpenseClaims', CLAIM_LINE_ITEMS: 'ClaimLineItems', RECEIPTS: 'Receipts', APPROVALS: 'Approvals', BUDGET_REQUESTS: 'BudgetRequests', BUDGET_REQUEST_LINES: 'BudgetRequestLines', PAYOUTS: 'Payouts' };
global.COLS = {
  ExpenseClaims: { claim_id: 1, claimant_id: 2, status: 3, notes: 14 },
  ClaimLineItems: { claim_line_id: 1, claim_id: 2, budget_line_id: 3, receipt_id: 4, amount: 5 },
  Receipts: { receipt_id: 1, file_link: 9 },
  Approvals: { entity_id: 1, entity_type: 2, title: 3, requester_or_claimant: 4, amount: 5, status: 6, action: 7, amount_override: 8, note: 9, confirm: 10, intent_actor_email: 11, receipt_link: 12 },
  BudgetRequests: { request_id: 1, requester_id: 2, title: 4, status: 7 },
  Payouts: { payout_id: 1, claim_id: 2, payee_user_id: 3, amount: 4, status: 8 }
};
global.STATUS = {
  ExpenseClaim: { SUBMITTED: 'SUBMITTED', VERIFIED: 'VERIFIED' },
  BudgetRequest: { PENDING: 'PENDING' },
  Payout: { QUEUED: 'QUEUED' }
};
global.Config = { get: jest.fn(() => 'TREASURER-001'), getNum: jest.fn(() => 14) };
global.Discord = { postStatus: jest.fn() };
global.Audit = { _nowIso: jest.fn(() => '2026-07-21T12:00:00Z'), append: jest.fn() };

var mockEngineLoadRow = jest.fn();
var mockEngineFindRowsByColumn = jest.fn();
var mockEngineSumClaimLineItems = jest.fn(() => 200);

global.Engine = {
  _loadRow: mockEngineLoadRow,
  _findRowsByColumn: mockEngineFindRowsByColumn,
  _sumClaimLineItems: mockEngineSumClaimLineItems
};

var mod = require('../Approvals.js');
var Approvals_claimRows = mod.Approvals_claimRows;

describe('Approvals_claimRows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEngineLoadRow.mockReset();
    mockEngineFindRowsByColumn.mockReset();
    mockEngineSumClaimLineItems.mockReset();
    mockEngineSumClaimLineItems.mockReturnValue(200);
  });

  it('should include receipt_link when claim has receipt', () => {
    var expenseClaimsData = [
      ['claim_id', 'claimant_id', 'status', '', '', '', '', '', '', '', '', '', '', 'notes'],
      ['CLAIM-001', 'M-001', 'SUBMITTED', '', '', '', '', '', '', '', '', '', '', 'Test claim']
    ];

    global.getSheet_.mockImplementation((tab) => {
      if (tab === 'ExpenseClaims') {
        return { getDataRange: jest.fn(() => ({ getValues: jest.fn(() => expenseClaimsData) })) };
      }
      if (tab === 'ClaimLineItems') {
        return { getDataRange: jest.fn(() => ({ getValues: jest.fn(() => [['cli_id', 'claim_id', 'bl_id', 'receipt_id', 'amount'], ['CLI-001', 'CLAIM-001', 'BL-001', 'RECEIPT-001', 200]]) })) };
      }
      return { getDataRange: jest.fn(() => ({ getValues: jest.fn(() => [[]]) })) };
    });

    mockEngineFindRowsByColumn.mockReturnValue([
      { values: ['CLI-001', 'CLAIM-001', 'BL-001', 'RECEIPT-001', 200] }
    ]);

    mockEngineLoadRow.mockImplementation((entityType, id) => {
      if (entityType === 'Receipt' && id === 'RECEIPT-001') {
        return { values: ['RECEIPT-001', 'file-id', 'hash', 'USER-1', '2026-07-20', 'Vendor', '2026-07-20', 200, '=HYPERLINK("https://drive.google.com/open?id=file-id", "View Receipt")'] };
      }
      return null;
    });

    var rows = Approvals_claimRows();
    expect(rows.length).toBe(1);
    expect(rows[0][11]).toContain('HYPERLINK');
    expect(rows[0][11]).toContain('file-id');
  });

  it('should return empty receipt_link when claim has no receipt', () => {
    var expenseClaimsData = [
      ['claim_id', 'claimant_id', 'status', '', '', '', '', '', '', '', '', '', '', 'notes'],
      ['CLAIM-002', 'M-002', 'SUBMITTED', '', '', '', '', '', '', '', '', '', '', 'No receipt']
    ];

    global.getSheet_.mockImplementation((tab) => {
      if (tab === 'ExpenseClaims') {
        return { getDataRange: jest.fn(() => ({ getValues: jest.fn(() => expenseClaimsData) })) };
      }
      if (tab === 'ClaimLineItems') {
        return { getDataRange: jest.fn(() => ({ getValues: jest.fn(() => [['cli_id', 'claim_id', 'bl_id', 'receipt_id', 'amount'], ['CLI-002', 'CLAIM-002', 'BL-002', '', 200]]) })) };
      }
      return { getDataRange: jest.fn(() => ({ getValues: jest.fn(() => [[]]) })) };
    });

    mockEngineFindRowsByColumn.mockReturnValue([
      { values: ['CLI-002', 'CLAIM-002', 'BL-002', '', 200] }
    ]);

    var rows = Approvals_claimRows();
    expect(rows.length).toBe(1);
    expect(rows[0][11]).toBe('');
  });

  it('should skip non-SUBMITTED non-VERIFIED claims', () => {
    var expenseClaimsData = [
      ['claim_id', 'claimant_id', 'status', '', '', '', '', '', '', '', '', '', '', 'notes'],
      ['CLAIM-003', 'M-003', 'DRAFT', '', '', '', '', '', '', '', '', '', '', 'Draft']
    ];

    global.getSheet_.mockImplementation((tab) => {
      if (tab === 'ExpenseClaims') {
        return { getDataRange: jest.fn(() => ({ getValues: jest.fn(() => expenseClaimsData) })) };
      }
      return { getDataRange: jest.fn(() => ({ getValues: jest.fn(() => [[]]) })) };
    });

    var rows = Approvals_claimRows();
    expect(rows.length).toBe(0);
  });
});
