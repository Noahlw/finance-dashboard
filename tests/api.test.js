global.Session = {
  getActiveUser: jest.fn(() => ({ getEmail: jest.fn(() => 'test@example.com') }))
};
global.getSheet_ = jest.fn();
global.Engine = {
  _findRowsByColumn: jest.fn()
};
global.TABS = { EXPENSE_CLAIMS: 'ExpenseClaims', BUDGET_REQUESTS: 'BudgetRequests', BUDGET_REQUEST_LINES: 'BudgetRequestLines', USERS: 'Users', CLAIM_LINE_ITEMS: 'ClaimLineItems', RECEIPTS: 'Receipts' };
global.COLS = {
  ExpenseClaims: { claim_id: 1, claimant_id: 2, status: 3, submitted_at: 4, total_amount: 11, notes: 14, processed_response_id: 15 },
  BudgetRequests: { request_id: 1, requester_id: 2, event_id: 3, title: 4, justification: 5, needed_by: 6, status: 7, submitted_at: 8, decided_at: 9, decided_by: 10, decision_note: 11, self_approved: 12, processed_response_id: 13 },
  BudgetRequestLines: { line_id: 1, request_id: 2, category_id: 3, description: 4, requested_amount: 5, approved_amount: 6, line_status: 7, claimed_amount: 8, remaining: 9 },
  Users: { user_id: 1, display_name: 2, role: 3, email: 4, active: 5, created_at: 6 },
  ClaimLineItems: { claim_id: 2, amount: 5, description: 6 },
  Receipts: { receipt_id: 1, file_id: 2, sha256: 3, uploaded_by: 4 }
};
global.STATUS = {
  ExpenseClaim: { SUBMITTED: 'SUBMITTED' },
  BudgetRequest: { DRAFT: 'DRAFT', PENDING: 'PENDING', NEEDS_INFO: 'NEEDS_INFO', APPROVED: 'APPROVED', PARTIALLY_APPROVED: 'PARTIALLY_APPROVED', REJECTED: 'REJECTED', WITHDRAWN: 'WITHDRAWN', CLOSED: 'CLOSED' },
  BudgetRequestLine: { PENDING: 'PENDING', APPROVED: 'APPROVED', REDUCED: 'REDUCED', REJECTED: 'REJECTED' }
};
global.ROLES = { COMMITTEE: 'COMMITTEE', TREASURER: 'TREASURER', MEMBER: 'MEMBER', ADVISOR_AUDITOR: 'ADVISOR_AUDITOR' };
global.Discord = { postStatus: jest.fn() };
global.Audit = { _nowIso: jest.fn(() => '2026-07-21T12:00:00Z'), append: jest.fn() };
global.Ids = { nextId: jest.fn(() => 'BUDGET-26A-001'), childId: jest.fn(() => 'BUDGETLINE-26A-001-01') };
global.Engine._loadRow = jest.fn();
global.Engine._sumBudgetRequestLines = jest.fn(() => 0);
global.Engine.transition = jest.fn((entityType, entityId, action, actorUserId, payload) => {
  return { ok: true, from: 'DRAFT', to: 'PENDING', selfApproved: false };
});

const { api_getMyClaims } = require('../Api.js');

describe('Api.js', () => {
  const testUserEmail = 'test@example.com';
  const testUserId = 'U-001';

  beforeEach(() => {
    jest.clearAllMocks();
    // Shared mocks for all tests
    global.Session.getActiveUser.mockReturnValue({ getEmail: () => testUserEmail });
    const mockUsersData = [
      ['user_id', 'display_name', 'role', 'email', 'active', 'created_at'],
      [testUserId, 'Test User', 'COMMITTEE', testUserEmail, true, '2026-01-01']
    ];
    global.getSheet_.mockImplementation(name => {
      if (name === global.TABS.USERS) {
        return { getDataRange: () => ({ getValues: () => mockUsersData }) };
      }
      return { name: name, appendRow: jest.fn(), getDataRange: jest.fn(() => ({ getValues: jest.fn(() => [[]]) })), getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn(), getValues: jest.fn(() => [[]]) })), getLastRow: jest.fn(() => 1) };
    });
  });

  describe('api_resolveSession', () => {
    it('should allow COMMITTEE role with claims and budget-requests views', () => {
      const { api_resolveSession } = require('../Api.js');
      const result = api_resolveSession();
      expect(result.allowed).toBe(true);
      expect(result.role).toBe('COMMITTEE');
      expect(result.user_id).toBe('U-001');
      expect(result.display_name).toBe('Test User');
      expect(result.views).toEqual(['claims', 'budget-requests']);
    });

    it('should allow TREASURER role with all views', () => {
      global.getSheet_.mockImplementationOnce(name => {
        if (name === global.TABS.USERS) {
          return { getDataRange: () => ({
            getValues: () => [
              ['user_id', 'display_name', 'role', 'email', 'active', 'created_at'],
              ['U-002', 'Treasurer User', 'TREASURER', 'test@example.com', true, '2026-01-01']
            ]
          }) };
        }
        return { name, getDataRange: jest.fn(() => ({ getValues: () => [[]] })), getRange: jest.fn(), getLastRow: jest.fn(() => 1), appendRow: jest.fn() };
      });
      const { api_resolveSession } = require('../Api.js');
      const result = api_resolveSession();
      expect(result.allowed).toBe(true);
      expect(result.role).toBe('TREASURER');
      expect(result.views).toEqual(['claims', 'budget-requests', 'income', 'payouts', 'reports']);
    });

    it('should deny unknown user', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'unknown@example.com' });
      const { api_resolveSession } = require('../Api.js');
      const result = api_resolveSession();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('unknown_user');
    });

    it('should deny MEMBER role', () => {
      global.getSheet_.mockImplementationOnce(name => {
        if (name === global.TABS.USERS) {
          return { getDataRange: () => ({
            getValues: () => [
              ['user_id', 'display_name', 'role', 'email', 'active', 'created_at'],
              ['U-003', 'Member User', 'MEMBER', 'test@example.com', true, '2026-01-01']
            ]
          }) };
        }
        return { name, getDataRange: jest.fn(() => ({ getValues: () => [[]] })), getRange: jest.fn(), getLastRow: jest.fn(() => 1), appendRow: jest.fn() };
      });
      const { api_resolveSession } = require('../Api.js');
      const result = api_resolveSession();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('unauthorized_role');
    });

    it('should deny ADVISOR_AUDITOR role', () => {
      global.getSheet_.mockImplementationOnce(name => {
        if (name === global.TABS.USERS) {
          return { getDataRange: () => ({
            getValues: () => [
              ['user_id', 'display_name', 'role', 'email', 'active', 'created_at'],
              ['U-010', 'Advisor', 'ADVISOR_AUDITOR', 'test@example.com', true, '2026-01-01']
            ]
          }) };
        }
        return { name, getDataRange: jest.fn(() => ({ getValues: () => [[]] })), getRange: jest.fn(), getLastRow: jest.fn(() => 1), appendRow: jest.fn() };
      });
      const { api_resolveSession } = require('../Api.js');
      const result = api_resolveSession();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('unauthorized_role');
    });

    it('should deny inactive user', () => {
      global.getSheet_.mockImplementationOnce(name => {
        if (name === global.TABS.USERS) {
          return { getDataRange: () => ({
            getValues: () => [
              ['user_id', 'display_name', 'role', 'email', 'active', 'created_at'],
              ['U-004', 'Inactive User', 'COMMITTEE', 'test@example.com', false, '2026-01-01']
            ]
          }) };
        }
        return { name, getDataRange: jest.fn(() => ({ getValues: () => [[]] })), getRange: jest.fn(), getLastRow: jest.fn(() => 1), appendRow: jest.fn() };
      });
      const { api_resolveSession } = require('../Api.js');
      const result = api_resolveSession();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('inactive_user');
    });

    it('should deny no session email', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => '' });
      const { api_resolveSession } = require('../Api.js');
      const result = api_resolveSession();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('no_session');
    });
  });

  describe('api_getMyBudgetRequests', () => {
    it('should return empty array for unknown user', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'unknown@example.com' });
      const { api_getMyBudgetRequests } = require('../Api.js');
      const result = api_getMyBudgetRequests();
      expect(result).toEqual([]);
    });

    it('should return requests with lines for current user', () => {
      const findCalls = [];
      global.Engine._findRowsByColumn.mockImplementation((sheet, colIndex, matchValue) => {
        findCalls.push({ colIndex, matchValue });
        if (findCalls.length === 1) {
          return [{ values: ['BUDGET-26A-001', 'U-001', '', 'Test Request', 'Justification', '2026-08-01', 'PENDING', '2026-07-21', '', '', '', false, ''] }];
        }
        return [{ values: ['BUDGETLINE-26A-001-01', 'BUDGET-26A-001', 'CAT-1', 'First line', 500, 0, 'PENDING', 0, 500] }];
      });
      const { api_getMyBudgetRequests } = require('../Api.js');
      const result = api_getMyBudgetRequests();
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Test Request');
      expect(result[0].lines.length).toBe(1);
      expect(result[0].lines[0].requested_amount).toBe(500);
    });
  });

  describe('api_saveBudgetRequestDraft', () => {
    it('should create a new draft', () => {
      global.Ids.nextId.mockReturnValueOnce('BUDGET-26A-010');
      const sheetCalls = [];
      global.getSheet_.mockImplementation(name => {
        sheetCalls.push(name);
        if (name === global.TABS.USERS) {
          return { getDataRange: () => ({ getValues: () => [['user_id', 'display_name', 'role', 'email', 'active', 'created_at'], ['U-001', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        }
        return {
          name,
          getDataRange: jest.fn(() => ({ getValues: () => [[]] })),
          getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn(), getValues: jest.fn(() => [['']]) })),
          getLastRow: jest.fn(() => 1),
          getMaxRows: jest.fn(() => 10),
          insertRowAfter: jest.fn(),
          appendRow: jest.fn()
        };
      });
      const { api_saveBudgetRequestDraft } = require('../Api.js');
      const result = api_saveBudgetRequestDraft({
        uuid: 'uuid-1',
        title: 'New Budget',
        justification: 'For event',
        needed_by: '2026-08-15',
        lines: [{ description: 'Food', requested_amount: 300 }]
      });
      expect(result.request_id).toBe('BUDGET-26A-010');
    });

    it('should throw when editing non-draft request', () => {
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 3,
        values: ['BUDGET-26A-001', 'U-001', '', 'Test', '', '2026-08-01', 'APPROVED', '', '', '', '', false, '']
      });
      const { api_saveBudgetRequestDraft } = require('../Api.js');
      expect(() => api_saveBudgetRequestDraft({ request_id: 'BUDGET-26A-001', title: 'Hack' })).toThrow('Cannot edit a APPROVED budget request');
    });
  });

  describe('api_submitBudgetRequest', () => {
    it('should submit a DRAFT request to PENDING', () => {
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: ['BUDGET-26A-001', 'U-001', '', 'Test', '', '2026-08-01', 'DRAFT', '', '', '', '', false, '']
      });
      const { api_submitBudgetRequest } = require('../Api.js');
      const result = api_submitBudgetRequest('BUDGET-26A-001');
      expect(result.status).toBe('PENDING');
      expect(global.Engine.transition).toHaveBeenCalledWith('BudgetRequest', 'BUDGET-26A-001', 'SUBMIT', 'U-001', {});
    });

    it('should resubmit a NEEDS_INFO request', () => {
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: ['BUDGET-26A-001', 'U-001', '', 'Test', '', '2026-08-01', 'NEEDS_INFO', '', '', '', '', false, '']
      });
      global.Engine.transition.mockReturnValueOnce({ ok: true, from: 'NEEDS_INFO', to: 'PENDING' });
      const { api_submitBudgetRequest } = require('../Api.js');
      const result = api_submitBudgetRequest('BUDGET-26A-001');
      expect(result.status).toBe('PENDING');
      expect(global.Engine.transition).toHaveBeenCalledWith('BudgetRequest', 'BUDGET-26A-001', 'RESUBMIT', 'U-001', {});
    });
  });

  describe('api_discardBudgetRequest', () => {
    it('should withdraw a DRAFT request', () => {
      global.Engine.transition.mockReturnValueOnce({ ok: true, from: 'DRAFT', to: 'WITHDRAWN' });
      const { api_discardBudgetRequest } = require('../Api.js');
      const result = api_discardBudgetRequest('BUDGET-26A-001');
      expect(result.status).toBe('WITHDRAWN');
    });
  });

  describe('api_getPendingBudgetRequests', () => {
    it('should throw if user is not treasurer', () => {
      const { api_getPendingBudgetRequests } = require('../Api.js');
      expect(() => api_getPendingBudgetRequests()).toThrow('Unauthorized');
    });

    it('should return pending requests for treasurer', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'treasurer@example.com' });
      global.getSheet_.mockImplementationOnce(name => {
        if (name === global.TABS.USERS) {
          return { getDataRange: () => ({ getValues: () => [['user_id', 'display_name', 'role', 'email', 'active', 'created_at'], ['U-002', 'Treasurer', 'TREASURER', 'treasurer@example.com', true, '2026-01-01']] }) };
        }
        return { name, getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      global.getSheet_.mockImplementationOnce(name => {
        if (name === global.TABS.BUDGET_REQUESTS) {
          return { getDataRange: () => ({ getValues: () => [['request_id', 'requester_id', 'event_id', 'title', 'justification', 'needed_by', 'status', 'submitted_at'], ['BUDGET-26A-001', 'U-001', '', 'Pending Request', 'Justification', '2026-08-01', 'PENDING', '2026-07-21']] }) };
        }
        return { name, getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      global.Engine._sumBudgetRequestLines.mockReturnValueOnce(500);
      const { api_getPendingBudgetRequests } = require('../Api.js');
      const result = api_getPendingBudgetRequests();
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Pending Request');
      expect(result[0].total_requested).toBe(500);
    });
  });

  describe('api_decisionBudgetRequest', () => {
    it('should throw if user is not treasurer', () => {
      const { api_decisionBudgetRequest } = require('../Api.js');
      expect(() => api_decisionBudgetRequest('BUDGET-26A-001', 'APPROVE', {})).toThrow('Unauthorized');
    });

    it('should approve a pending request', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'treasurer@example.com' });
      global.getSheet_.mockImplementationOnce(name => {
        if (name === global.TABS.USERS) {
          return { getDataRange: () => ({ getValues: () => [['user_id', 'display_name', 'role', 'email', 'active', 'created_at'], ['U-002', 'Treasurer', 'TREASURER', 'treasurer@example.com', true, '2026-01-01']] }) };
        }
        return { name, getDataRange: jest.fn(() => ({ getValues: () => [[]] })) };
      });
      global.Engine.transition.mockReturnValueOnce({ ok: true, from: 'PENDING', to: 'APPROVED' });
      const { api_decisionBudgetRequest } = require('../Api.js');
      const result = api_decisionBudgetRequest('BUDGET-26A-001', 'APPROVE', { decision_note: 'Looks good' });
      expect(result.to).toBe('APPROVED');
    });
  });

  describe('api_getMyClaims', () => {
    it('should throw if no email is found', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => '' });
      expect(() => api_getMyClaims()).toThrow('User not authenticated (no active session)');
    });

    it('should return empty arrays if user is unknown', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'unknown@example.com' });
      const mockUsersDataUnknown = [
        ['user_id', 'display_name', 'role', 'email', 'active', 'created_at'],
        [testUserId, 'Test User', 'COMMITTEE', testUserEmail, true, '2026-01-01']
      ];
      global.getSheet_.mockImplementation(name => {
        if (name === global.TABS.USERS) {
          return { name, getDataRange: () => ({ getValues: () => mockUsersDataUnknown }) };
        }
        if (name === global.TABS.BUDGET_REQUEST_LINES) {
          return { name, getDataRange: () => ({ getValues: () => [[]] }) };
        }
        return { name };
      });
      const result = api_getMyClaims();
      expect(result.claims).toEqual([]);
      expect(result.requests).toEqual([]);
    });

    it('should map claims and requests properly', () => {
      // Mock rows returned by Engine._findRowsByColumn
      global.Engine._findRowsByColumn.mockImplementation((sheet, colIndex, userId) => {
        if (sheet.name === global.TABS.EXPENSE_CLAIMS) {
          return [{ rowIndex: 2, values: ['C-123', 'U-001', 'SUBMITTED', '2026-07-16', null, null, null, null, null, null, 150, false, false, 'notes'] }];
        }
        if (sheet.name === global.TABS.BUDGET_REQUESTS) {
          return [{ rowIndex: 2, values: ['R-123', 'U-001', 'E-001', 'Event', 'Just', '2026-08-01', 'PENDING', '2026-07-01'] }];
        }
        return [];
      });

      const result = api_getMyClaims();
      expect(result.claims[0].claim_id).toBe('C-123');
      expect(result.requests[0].request_id).toBe('R-123');
    });
  });

  describe('api_submitClaim', () => {
    it('should create a claim and line item successfully', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'test@example.com' });
      
      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [[], ['USER-1', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        return {
          getLastRow: () => 1,
          getRange: () => ({ getValues: () => [], setValues: jest.fn() }),
          getMaxRows: () => 10,
          insertRowAfter: jest.fn()
        };
      });
      
      global.Ids = { nextId: () => 'C-2', childId: () => 'CL-2' };
      global.Audit = { _nowIso: () => '2023-01-03', append: jest.fn() };
      global.Config = { getNum: () => 14 };

      const payload = { uuid: 'abc', amount: 200, notes: 'Office chairs', budgetLineId: 'BL-1', receiptId: 'R-1' };
      
      const { api_submitClaim } = require('../Api.js');
      const result = api_submitClaim(payload);
      
      expect(result.success).toBe(true);
      expect(result.claimId).toBe('C-2');
      expect(global.Audit.append).toHaveBeenCalled();
    });
  });

  describe('api_editClaim', () => {
    it('should update a submitted claim successfully', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'test@example.com' });

      const mockExpenseSheet = {
        getDataRange: () => ({
          getValues: () => [
            [],
            ['C-1', 'USER-1', 'SUBMITTED', '2023-01-01', null, null, null, null, null, null, 150, null, null, 'Note']
          ]
        }),
        getRange: jest.fn(() => ({ setValue: jest.fn() }))
      };
      const mockCliSheet = {
        getDataRange: () => ({ getValues: () => [[], ['CL-1', 'C-1', 'BL-1', 'R-1', 150, 'Note']] }),
        getRange: jest.fn(() => ({ setValue: jest.fn() }))
      };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [[], ['USER-1', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        if (tab === 'ExpenseClaims') return mockExpenseSheet;
        if (tab === 'ClaimLineItems') return mockCliSheet;
        return null;
      });

      const payload = { claimId: 'C-1', amount: 300, notes: 'Updated notes' };
      
      const { api_editClaim } = require('../Api.js');
      const result = api_editClaim(payload);
      
      expect(result.success).toBe(true);
      expect(mockExpenseSheet.getRange).toHaveBeenCalled();
    });

    it('should throw an error if claim is not SUBMITTED', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'test@example.com' });

      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [[], ['USER-1', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        if (tab === 'ExpenseClaims') return {
          getDataRange: () => ({
            getValues: () => [
              [],
              ['C-1', 'USER-1', 'APPROVED', '2023-01-01']
            ]
          })
        };
        return null;
      });

      const payload = { claimId: 'C-1', amount: 300, notes: 'Updated' };
      
      const { api_editClaim } = require('../Api.js');
      expect(() => api_editClaim(payload)).toThrow('Only SUBMITTED claims can be edited.');
    });
  });
});
