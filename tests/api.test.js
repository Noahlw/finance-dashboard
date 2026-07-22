global.Session = {
  getActiveUser: jest.fn(() => ({ getEmail: jest.fn(() => 'test@example.com') }))
};
global.getSheet_ = jest.fn();
global.getVaultSheet_ = jest.fn();
global.Engine = {
  _findRowsByColumn: jest.fn()
};
global.TABS = { EXPENSE_CLAIMS: 'ExpenseClaims', BUDGET_REQUESTS: 'BudgetRequests', BUDGET_REQUEST_LINES: 'BudgetRequestLines', USERS: 'Users', CLAIM_LINE_ITEMS: 'ClaimLineItems', RECEIPTS: 'Receipts', VAULT: 'Vault', COUNTERS: 'Counters' };
global.COLS = {
  ExpenseClaims: { claim_id: 1, claimant_id: 2, status: 3, submitted_at: 4, total_amount: 11, notes: 14, processed_response_id: 15, created_by: 16, expense_date: 17, semester: 18, event_id: 19, payout_method: 20, payout_handle: 21 },
  BudgetRequests: { request_id: 1, requester_id: 2, event_id: 3, title: 4, justification: 5, needed_by: 6, status: 7, submitted_at: 8, decided_at: 9, decided_by: 10, decision_note: 11, self_approved: 12, processed_response_id: 13 },
  BudgetRequestLines: { line_id: 1, request_id: 2, category_id: 3, description: 4, requested_amount: 5, approved_amount: 6, line_status: 7, claimed_amount: 8, remaining: 9 },
  Users: { user_id: 1, display_name: 2, role: 3, email: 4, active: 5, created_at: 6 },
  ClaimLineItems: { claim_id: 2, claim_line_id: 1, budget_line_id: 3, receipt_id: 4, amount: 5, description: 6, missing_receipt_flag: 7 },
  Receipts: { receipt_id: 1, drive_file_id: 2, sha256: 3, uploaded_by: 4, uploaded_at: 5, vendor: 6, receipt_date: 7, receipt_total: 8, file_link: 9 },
  Vault: { user_id: 1, full_name: 2, student_id: 3, payout_method: 4, payout_handle: 5, consent_ts: 6 },
  Counters: { entity: 1, last_n: 2 }
};
global.STATUS = {
  ExpenseClaim: { DRAFT: 'DRAFT', SUBMITTED: 'SUBMITTED', NEEDS_INFO: 'NEEDS_INFO', VERIFIED: 'VERIFIED', APPROVED_FOR_PAYOUT: 'APPROVED_FOR_PAYOUT', PAID: 'PAID', REJECTED: 'REJECTED', LOCKED: 'LOCKED' },
  BudgetRequest: { DRAFT: 'DRAFT', PENDING: 'PENDING', NEEDS_INFO: 'NEEDS_INFO', APPROVED: 'APPROVED', PARTIALLY_APPROVED: 'PARTIALLY_APPROVED', REJECTED: 'REJECTED', WITHDRAWN: 'WITHDRAWN', CLOSED: 'CLOSED' },
  BudgetRequestLine: { PENDING: 'PENDING', APPROVED: 'APPROVED', REDUCED: 'REDUCED', REJECTED: 'REJECTED' }
};
global.ROLES = { COMMITTEE: 'COMMITTEE', TREASURER: 'TREASURER', MEMBER: 'MEMBER', ADVISOR_AUDITOR: 'ADVISOR_AUDITOR' };
global.Discord = { postStatus: jest.fn() };
global.Audit = { _nowIso: jest.fn(() => '2026-07-21T12:00:00Z'), append: jest.fn() };
global.Ids = { nextId: jest.fn(() => 'BUDGET-26A-001'), childId: jest.fn(() => 'BUDGETLINE-26A-001-01') };
global.Utilities = {
  base64Decode: jest.fn(() => [116, 101, 115, 116, 32, 98, 121, 116, 101, 115]),
  computeDigest: jest.fn(() => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]),
  newBlob: jest.fn(() => ({ setName: jest.fn() }))
};
global.DriveApp = {
  getFolderById: jest.fn(() => ({
    createFile: jest.fn(() => ({ getId: () => 'drive-file-123' }))
  }))
};
global.PropertiesService = {
  getScriptProperties: jest.fn(() => ({
    getProperty: jest.fn(() => 'RECEIPTS-FOLDER-123')
  }))
};
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
    global.Audit = { _nowIso: jest.fn(() => '2026-07-21T12:00:00Z'), append: jest.fn() };
    global.Ids = { nextId: jest.fn(() => 'BUDGET-26A-001'), childId: jest.fn(() => 'BUDGETLINE-26A-001-01') };
    global.Utilities = {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      base64Decode: jest.fn(() => [116, 101, 115, 116, 32, 98, 121, 116, 101, 115]),
      computeDigest: jest.fn(() => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]),
      newBlob: jest.fn(() => ({ setName: jest.fn() }))
    };
    global.DriveApp = {
      getFolderById: jest.fn(() => ({
        createFile: jest.fn(() => ({ getId: () => 'drive-file-123' }))
      }))
    };
    global.PropertiesService = {
      getScriptProperties: jest.fn(() => ({
        getProperty: jest.fn(() => 'RECEIPTS-FOLDER-123')
      }))
    };
    global.getVaultSheet_ = jest.fn(() => ({ getDataRange: () => ({ getValues: () => [[]] }), appendRow: jest.fn(), getLastRow: () => 1, getRange: jest.fn(() => ({ setNumberFormat: jest.fn().mockReturnThis(), setValue: jest.fn() })) }));
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
      expect(result.views).toEqual(['claims', 'members', 'budget-requests']);
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
      expect(result.views).toEqual(['claims', 'members', 'budget-requests', 'income', 'payouts', 'reports']);
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
      
      global.Ids.nextId.mockReturnValueOnce('C-2');
      global.Ids.childId.mockReturnValueOnce('CL-2');
      global.Audit = { _nowIso: () => '2023-01-03', append: jest.fn() };
      global.Config = { getNum: () => 14 };

      const payload = { uuid: 'abc', amount: 200, notes: 'Office chairs', budgetLineId: 'BL-1', receiptId: 'R-1', claimantId: 'MEMBER-001', payoutMethod: 'FPS', payoutHandle: '91234567' };
      
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

  describe('api_getMembers', () => {
    it('should return all members with role MEMBER', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'test@example.com' });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return {
          getDataRange: () => ({
            getValues: () => [
              ['user_id', 'display_name', 'role', 'email', 'active', 'created_at'],
              ['U-001', 'Alice', 'COMMITTEE', 'test@example.com', true, '2026-01-01'],
              ['M-001', 'Bob', 'MEMBER', '', true, '2026-01-01'],
              ['M-002', 'Carol', 'MEMBER', '', false, '2026-01-01']
            ]
          })
        };
        return { getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn() })) };
      });
      const { api_getMembers } = require('../Api.js');
      const result = api_getMembers();
      expect(result.length).toBe(2);
      expect(result[0].user_id).toBe('M-001');
      expect(result[1].active).toBe(false);
    });
  });

  describe('api_addMember', () => {
    it('should create a new member with unique SID', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'test@example.com' });
      global.Ids.nextId.mockReturnValueOnce('M-003');
      global.Audit._nowIso.mockReturnValueOnce('2026-07-21T12:00:00Z');

      const usersSheet = { getDataRange: () => ({ getValues: () => [
        ['user_id', 'display_name', 'role', 'email', 'active', 'created_at'],
        ['U-001', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']
      ] }), appendRow: jest.fn(), getLastRow: () => 1, getMaxRows: () => 10, insertRowAfter: jest.fn(), getRange: jest.fn(() => ({ getValues: () => [[]], setNumberFormat: jest.fn().mockReturnThis(), setValue: jest.fn(), setValues: jest.fn() })) };
      const vaultSheet = { getDataRange: () => ({ getValues: () => [[]] }), appendRow: jest.fn(), getLastRow: () => 2, getMaxRows: () => 10, insertRowAfter: jest.fn(), getRange: jest.fn(() => ({ getValues: () => [[]], setNumberFormat: jest.fn().mockReturnThis(), setValue: jest.fn(), setValues: jest.fn() })) };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return usersSheet;
        return { getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn() })) };
      });
      global.getVaultSheet_.mockReturnValue(vaultSheet);

      const { api_addMember } = require('../Api.js');
      const result = api_addMember({ student_id: 'S123456', display_name: 'Dave', full_name: 'David', payout_method: 'FPS', payout_handle: '91234567' });
      expect(result.user_id).toBe('M-003');
      expect(usersSheet.getRange).toHaveBeenCalled();
      expect(vaultSheet.getRange).toHaveBeenCalled();
    });

    it('should reject duplicate SID', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'test@example.com' });
      global.getVaultSheet_.mockReturnValueOnce({
        getDataRange: () => ({
          getValues: () => [
            ['user_id', 'full_name', 'student_id', 'payout_method', 'payout_handle', 'consent_ts'],
            ['M-001', 'Bob', 'S123456', 'FPS', '91234567', '2026-01-01']
          ]
        })
      });
      const { api_addMember } = require('../Api.js');
      expect(() => api_addMember({ student_id: 'S123456', display_name: 'Dave' })).toThrow('member');
    });
  });

  describe('api_reactivateMember', () => {
    it('should reactivate an inactive member', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'test@example.com' });
      const usersSheet = {
        getDataRange: () => ({
          getValues: () => [
            ['user_id', 'display_name', 'role', 'email', 'active', 'created_at'],
            ['U-001', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01'],
            ['M-002', 'Carol', 'MEMBER', '', false, '2026-01-01']
          ]
        }),
        getRange: jest.fn(() => ({ setValue: jest.fn() }))
      };
      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return usersSheet;
        return { getRange: jest.fn(() => ({ setValue: jest.fn() })) };
      });
      const { api_reactivateMember } = require('../Api.js');
      const result = api_reactivateMember('M-002');
      expect(result.active).toBe(true);
    });
  });

  describe('api_saveClaimDraft', () => {
    it('should create a new draft claim', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'test@example.com' });
      global.Ids.nextId.mockReturnValueOnce('CLAIM-26A-001');
      global.Ids.childId.mockReturnValueOnce('CLAIMLINE-26A-001-01');
      global.Config = { getNum: () => 14 };

      const expenseSheet = {
        getRange: () => ({ getValues: () => [[]], setValues: jest.fn() }),
        getLastRow: () => 1,
        getMaxRows: () => 10,
        insertRowAfter: jest.fn()
      };
      const cliSheet = {
        getRange: () => ({ getValues: () => [[]], setValues: jest.fn() }),
        getLastRow: () => 1,
        getMaxRows: () => 10,
        insertRowAfter: jest.fn()
      };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [[], ['USER-1', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        if (tab === 'ExpenseClaims') return expenseSheet;
        if (tab === 'ClaimLineItems') return cliSheet;
        return { getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn() })) };
      });

      const { api_saveClaimDraft } = require('../Api.js');
      const result = api_saveClaimDraft({
        uuid: 'draft-1', claimantId: 'M-001', amount: 100, notes: 'Draft note',
        budgetLineId: 'BL-1', expenseDate: '2026-07-15', payoutMethod: 'FPS', payoutHandle: '91234567'
      });
      expect(result.claim_id).toBe('CLAIM-26A-001');
      expect(result.status).toBe('DRAFT');
    });
  });

  describe('api_submitDraftClaim', () => {
    it('should submit a DRAFT claim', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'test@example.com' });
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: ['CLAIM-26A-001', 'M-001', 'DRAFT', '', '', '', '', '', '', '', 100, false, false, 'Note', 'uuid-1', 'U-001', '2026-07-15', '26A', '', 'FPS', '91234567']
      });
      global.Engine.transition.mockReturnValueOnce({ ok: true, from: 'DRAFT', to: 'SUBMITTED' });
      const { api_submitDraftClaim } = require('../Api.js');
      const result = api_submitDraftClaim('CLAIM-26A-001');
      expect(result.status).toBe('SUBMITTED');
      expect(global.Engine.transition).toHaveBeenCalledWith('ExpenseClaim', 'CLAIM-26A-001', 'SUBMIT', 'U-001', {});
    });
  });

  describe('api_uploadReceipt', () => {
    it('should upload a receipt successfully', () => {
      global.Ids.nextId.mockReturnValueOnce('RECEIPT-001');
      const sheet = { getDataRange: jest.fn(() => ({ getValues: () => [['receipt_id', 'drive_file_id', 'sha256', 'uploaded_by']] })), getRange: jest.fn(() => ({ getValues: jest.fn(() => [['']]), setValues: jest.fn() })), getMaxRows: jest.fn(() => 100), insertRowAfter: jest.fn() };
      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [['user_id', 'display_name', 'role', 'email', 'active', 'created_at'], ['U-001', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        if (tab === 'Receipts') return sheet;
        return { getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn(), getValues: jest.fn(() => [['']]) })), getMaxRows: jest.fn(() => 100) };
      });
      const { api_uploadReceipt } = require('../Api.js');
      const result = api_uploadReceipt('receipt.png', 'image/png', 'base64data', 'Vendor Co', '2026-07-15', 100.50);
      expect(result.receiptId).toBe('RECEIPT-001');
      expect(global.Utilities.newBlob).toHaveBeenCalled();
      expect(global.DriveApp.getFolderById).toHaveBeenCalledWith('RECEIPTS-FOLDER-123');
      expect(sheet.getRange).toHaveBeenCalled();
    });

    it('should reject unsupported MIME type', () => {
      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [['user_id', 'display_name', 'role', 'email', 'active', 'created_at'], ['U-001', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        return { getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn(), getValues: jest.fn(() => [['']]) })), getMaxRows: jest.fn(() => 100) };
      });
      const { api_uploadReceipt } = require('../Api.js');
      expect(() => api_uploadReceipt('file.txt', 'text/plain', 'base64data', '', '', 0)).toThrow('Unsupported file type');
    });

    it('should return existing receiptId for same-user duplicate hash', () => {
      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [['user_id', 'display_name', 'role', 'email', 'active', 'created_at'], ['U-001', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        if (tab === 'Receipts') return {
          getDataRange: () => ({
            getValues: () => [
              ['receipt_id', 'drive_file_id', 'sha256', 'uploaded_by'],
              ['RECEIPT-001', 'DRIVE-001', '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', 'U-001']
            ]
          })
        };
        return { getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn(), getValues: jest.fn(() => [['']]) })), getMaxRows: jest.fn(() => 100) };
      });
      const { api_uploadReceipt } = require('../Api.js');
      const result = api_uploadReceipt('dupe.png', 'image/png', 'base64data', '', '', 0);
      expect(result.receiptId).toBe('RECEIPT-001');
    });

    it('should throw for cross-operator duplicate hash', () => {
      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [['user_id', 'display_name', 'role', 'email', 'active', 'created_at'], ['U-001', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        if (tab === 'Receipts') return {
          getDataRange: () => ({
            getValues: () => [
              ['receipt_id', 'drive_file_id', 'sha256', 'uploaded_by'],
              ['RECEIPT-001', 'DRIVE-001', '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', 'U-OTHER']
            ]
          })
        };
        return { getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn(), getValues: jest.fn(() => [['']]) })), getMaxRows: jest.fn(() => 100) };
      });
      const { api_uploadReceipt } = require('../Api.js');
      expect(() => api_uploadReceipt('dupe.png', 'image/png', 'base64data', '', '', 0)).toThrow('Duplicate receipt detected');
    });

    it('should reject files over 5 MB', () => {
      global.Utilities.base64Decode.mockReturnValueOnce(new Array(6 * 1024 * 1024).fill(0));
      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [['user_id', 'display_name', 'role', 'email', 'active', 'created_at'], ['U-001', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        return { getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn(), getValues: jest.fn(() => [['']]) })), getMaxRows: jest.fn(() => 100) };
      });
      const { api_uploadReceipt } = require('../Api.js');
      expect(() => api_uploadReceipt('large.png', 'image/png', 'bigbase64', '', '', 0)).toThrow('5 MB limit');
    });
  });

  describe('api_deleteOrphanedReceipt', () => {
    it('should delete a receipt and log audit', () => {
      const receiptSheet = { deleteRow: jest.fn() };
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 3,
        sheet: receiptSheet,
        values: ['RECEIPT-001', 'DRIVE-001', 'hash', 'U-001', '2026-07-21', '', '', 0, '']
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [['user_id', 'display_name', 'role', 'email', 'active', 'created_at'], ['U-001', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        return {};
      });
      const { api_deleteOrphanedReceipt } = require('../Api.js');
      const result = api_deleteOrphanedReceipt('RECEIPT-001');
      expect(result.success).toBe(true);
      expect(receiptSheet.deleteRow).toHaveBeenCalledWith(3);
      expect(global.Audit.append).toHaveBeenCalled();
    });

    it('should throw for unauthorized user', () => {
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 3,
        values: ['RECEIPT-001', 'DRIVE-001', 'hash', 'U-OTHER', '2026-07-21', '', '', 0, '']
      });
      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [['user_id', 'display_name', 'role', 'email', 'active', 'created_at'], ['U-001', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        return {};
      });
      const { api_deleteOrphanedReceipt } = require('../Api.js');
      expect(() => api_deleteOrphanedReceipt('RECEIPT-001')).toThrow('Unauthorized');
    });

    it('should throw for not found receipt', () => {
      global.Engine._loadRow.mockReturnValueOnce(null);
      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [['user_id', 'display_name', 'role', 'email', 'active', 'created_at'], ['U-001', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        return {};
      });
      const { api_deleteOrphanedReceipt } = require('../Api.js');
      expect(() => api_deleteOrphanedReceipt('RECEIPT-999')).toThrow('Receipt not found');
    });
  });

  describe('api_saveClaimDraft with receiptIds', () => {
    it('should create a claim draft with multiple receipt IDs', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'test@example.com' });
      global.Ids.nextId.mockReturnValueOnce('CLAIM-26A-002');
      global.Ids.childId.mockReturnValueOnce('CLAIMLINE-26A-002-01').mockReturnValueOnce('CLAIMLINE-26A-002-02');
      global.Config = { getNum: () => 14 };

      const expenseSheet = {
        getRange: jest.fn(() => ({ getValues: jest.fn(() => [['']]), setValues: jest.fn() })),
        getLastRow: () => 1,
        getMaxRows: () => 10,
        insertRowAfter: jest.fn()
      };
      const cliSheet = { appendRow: jest.fn(), deleteRow: jest.fn(), getRange: jest.fn(() => ({ setValues: jest.fn(), getValues: jest.fn(() => [['']]) })), getLastRow: () => 1, getMaxRows: () => 10, insertRowAfter: jest.fn() };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [[], ['USER-1', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        if (tab === 'ExpenseClaims') return expenseSheet;
        if (tab === 'ClaimLineItems') return cliSheet;
        return { getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn(), getValues: jest.fn(() => [['']]) })) };
      });

      // Mock no existing cli rows
      global.Engine._findRowsByColumn.mockReturnValueOnce([]);

      const { api_saveClaimDraft } = require('../Api.js');
      const result = api_saveClaimDraft({
        uuid: 'draft-2', claimantId: 'M-001', amount: 200, notes: 'Multi receipt',
        receiptIds: ['RECEIPT-001', 'RECEIPT-002'], expenseDate: '2026-07-15',
        payoutMethod: 'FPS', payoutHandle: '91234567'
      });
      expect(result.claim_id).toBe('CLAIM-26A-002');
      // _appendRow is called once per receipt (uses setValues, not appendRow)
      expect(cliSheet.getRange).toHaveBeenCalledTimes(4); // 2 calls per receipt (getRange("A:A") + getRange(pos))
      // Verify setValues was called on the range objects
      const setValuesCalls = cliSheet.getRange.mock.results.filter(r => r.value.setValues.mock.calls.length > 0);
      expect(setValuesCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('api_saveClaimDraft with receiptIds replacing existing lines', () => {
    it('should delete existing lines and create new ones per receiptId', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'test@example.com' });
      global.Ids.nextId.mockReturnValueOnce('CLAIM-26A-003');
      global.Ids.childId = jest.fn(() => 'CLAIMLINE-26A-003-N');
      global.Config = { getNum: () => 14 };

      // Mock _loadRow for the existing claim lookup (first call in check)
      global.Engine._loadRow
        .mockReturnValueOnce({
          rowIndex: 2,
          sheet: { getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn() })) },
          values: ['CLAIM-26A-003', 'M-001', 'DRAFT', '', '', '', '', '', '', '', 200, false, false, 'Note', 'uuid-3', 'USER-1', '2026-07-15', '26A', '', 'FPS', '91234567']
        })
        // Second call for the update path (row.sheet access)
        .mockReturnValueOnce({
          rowIndex: 2,
          sheet: {
            getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn() }))
          },
          values: ['CLAIM-26A-003', 'M-001', 'DRAFT', '', '', '', '', '', '', '', 200, false, false, 'Note', 'uuid-3', 'USER-1', '2026-07-15', '26A', '', 'FPS', '91234567']
        });

      const cliSheet = {
        appendRow: jest.fn(),
        deleteRow: jest.fn(),
        getRange: jest.fn(() => ({ setValues: jest.fn(), getValues: jest.fn(() => [['']]) })),
        getLastRow: () => 5,
        getMaxRows: () => 10,
        insertRowAfter: jest.fn()
      };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [[], ['USER-1', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        if (tab === 'ExpenseClaims') return { getRange: jest.fn(() => ({ setValues: jest.fn(), getValues: jest.fn(() => [['']]) })), getLastRow: () => 1, getMaxRows: () => 10, insertRowAfter: jest.fn() };
        if (tab === 'ClaimLineItems') return cliSheet;
        return { getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn(), getValues: jest.fn(() => [['']]) })) };
      });

      global.Engine._findRowsByColumn.mockReturnValueOnce([
        { rowIndex: 3, values: ['CLAIMLINE-1', 'CLAIM-26A-003', '', 'RECEIPT-001', 100, 'note', false] },
        { rowIndex: 4, values: ['CLAIMLINE-2', 'CLAIM-26A-003', '', 'RECEIPT-002', 100, 'note', false] }
      ]);

      const { api_saveClaimDraft } = require('../Api.js');
      const result = api_saveClaimDraft({
        uuid: 'draft-3', claimId: 'CLAIM-26A-003', claimantId: 'M-001',
        amount: 200, notes: 'Update receipts',
        receiptIds: ['RECEIPT-003', 'RECEIPT-004'], expenseDate: '2026-07-15',
        payoutMethod: 'FPS', payoutHandle: '91234567'
      });
      expect(result.status).toBe('DRAFT');
      expect(cliSheet.deleteRow).toHaveBeenCalledTimes(2);
      // _appendRow is called per receipt via setValues
      const setValuesCalls = cliSheet.getRange.mock.results.filter(r => r.value.setValues.mock.calls.length > 0);
      expect(setValuesCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('api_submitClaim idempotent retry', () => {
    it('should return Already processed when uuid is reused', () => {
      global.Session.getActiveUser.mockReturnValueOnce({ getEmail: () => 'test@example.com' });
      global.Ids.nextId.mockReturnValueOnce('C-RETRY');
      global.Ids.childId.mockReturnValueOnce('CL-RETRY');
      global.Audit = { _nowIso: () => '2026-07-21T12:00:00Z', append: jest.fn() };
      global.Config = { getNum: () => 14 };

      var claimsSheet = {
        getLastRow: () => 2,
        getRange: jest.fn(() => ({ getValues: jest.fn(() => [['uuid-existing']]) }))
      };

      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [[], ['USER-1', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        if (tab === 'ExpenseClaims') return claimsSheet;
        return { getLastRow: () => 1, getRange: () => ({ getValues: () => [], setValues: jest.fn() }), getMaxRows: () => 10, insertRowAfter: jest.fn() };
      });

      const { api_submitClaim } = require('../Api.js');
      const first = api_submitClaim({ uuid: 'uuid-existing', amount: 100, notes: 'Retry test', claimantId: 'M-001', budgetLineId: 'BL-1' });
      expect(first.success).toBe(true);
      expect(first.message).toBe('Already processed');
    });
  });

  describe('api_attachReceipts', () => {
    beforeEach(() => {
      global.Session.getActiveUser.mockReturnValue({ getEmail: () => 'test@example.com' });
      global.Ids.childId = jest.fn(() => 'CLAIMLINE-ATTACH-N');
      global.Audit = { _nowIso: jest.fn(() => '2026-07-21T12:00:00Z'), append: jest.fn() };
    });

    it('should attach receipts to a SUBMITTED claim', () => {
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        sheet: { getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn() })) },
        values: ['CLAIM-ATTACH-001', 'M-001', 'SUBMITTED', '2026-07-20', '', '', '', '', '', '', 200, false, false, 'Test', 'uuid', 'U-001', '2026-07-20', '26A', '', 'FPS', '91234567']
      });

      var cliSheet = {
        appendRow: jest.fn(),
        getRange: jest.fn(() => ({ setValues: jest.fn(), getValues: jest.fn(() => [['']]) })),
        getLastRow: () => 5,
        getMaxRows: () => 10,
        insertRowAfter: jest.fn()
      };

      global.Engine._findRowsByColumn.mockReturnValueOnce([
        { rowIndex: 2, values: ['CLI-001', 'CLAIM-ATTACH-001', 'BL-001', '', 200, 'Test note', false] }
      ]);

      global.getSheet_.mockImplementation((tab) => {
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [[], ['U-001', 'Test User', 'COMMITTEE', 'test@example.com', true, '2026-01-01']] }) };
        if (tab === 'ClaimLineItems') return cliSheet;
        return { getRange: jest.fn(() => ({ setValue: jest.fn(), setValues: jest.fn(), getValues: jest.fn(() => [['']]) })) };
      });

      const { api_attachReceipts } = require('../Api.js');
      const result = api_attachReceipts('CLAIM-ATTACH-001', ['RECEIPT-ATTACH-1', 'RECEIPT-ATTACH-2']);
      expect(result.claim_id).toBe('CLAIM-ATTACH-001');
      expect(result.status).toBe('SUBMITTED');
      expect(global.Audit.append).toHaveBeenCalledWith('U-001', 'ExpenseClaim', 'CLAIM-ATTACH-001', 'RECEIPTS_ATTACHED', { receiptIds: ['RECEIPT-ATTACH-1', 'RECEIPT-ATTACH-2'] });
    });

    it('should reject attaching receipts to an APPROVED_FOR_PAYOUT claim', () => {
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: ['CLAIM-ATTACH-002', 'M-001', 'APPROVED_FOR_PAYOUT', '', '', '', '', '', '', '', 200, false, false, '', 'uuid', 'U-001', '2026-07-20', '26A', '', 'FPS', '91234567']
      });

      const { api_attachReceipts } = require('../Api.js');
      expect(() => api_attachReceipts('CLAIM-ATTACH-002', ['RECEIPT-X'])).toThrow('Receipts can only be attached to DRAFT, SUBMITTED, NEEDS_INFO, or VERIFIED claims');
    });

    it('should reject attaching receipts by a different operator', () => {
      global.Engine._loadRow.mockReturnValueOnce({
        rowIndex: 2,
        values: ['CLAIM-ATTACH-003', 'M-001', 'SUBMITTED', '', '', '', '', '', '', '', 200, false, false, '', 'uuid', 'U-OTHER', '2026-07-20', '26A', '', 'FPS', '91234567']
      });

      const { api_attachReceipts } = require('../Api.js');
      expect(() => api_attachReceipts('CLAIM-ATTACH-003', ['RECEIPT-Y'])).toThrow('Unauthorized');
    });

    it('should reject empty receiptIds array', () => {
      const { api_attachReceipts } = require('../Api.js');
      expect(() => api_attachReceipts('CLAIM-001', [])).toThrow('receiptIds array is required');
    });
  });
});
