global.Session = {
  getActiveUser: jest.fn(() => ({ getEmail: jest.fn(() => 'test@example.com') }))
};
global.getSheet_ = jest.fn();
global.Engine = {
  _findRowsByColumn: jest.fn()
};
global.TABS = { EXPENSE_CLAIMS: 'ExpenseClaims', BUDGET_REQUESTS: 'BudgetRequests', USERS: 'Users', CLAIM_LINE_ITEMS: 'ClaimLineItems', RECEIPTS: 'Receipts' };
global.COLS = {
  ExpenseClaims: { claim_id: 1, claimant_id: 2, status: 3, submitted_at: 4, total_amount: 11, notes: 14, processed_response_id: 15 },
  BudgetRequests: { request_id: 1, requester_id: 2, title: 4, status: 7, submitted_at: 8 },
  Users: { user_id: 1, email: 4 },
  ClaimLineItems: { claim_id: 2, amount: 5, description: 6 },
  Receipts: { receipt_id: 1, file_id: 2, sha256: 3, uploaded_by: 4 }
};
global.STATUS = { ExpenseClaim: { SUBMITTED: 'SUBMITTED' } };
global.Discord = { postStatus: jest.fn() };

const { api_getMyClaims } = require('../Api.js');

describe('Api.js', () => {
  const testUserEmail = 'test@example.com';
  const testUserId = 'U-001';

  beforeEach(() => {
    jest.clearAllMocks();
    // Shared mocks for all tests
    global.Session.getActiveUser.mockReturnValue({ getEmail: () => testUserEmail });
    const mockUsersData = [
      ['user_id', 'name', 'role', 'email'],
      [testUserId, 'Test User', 'MEMBER', testUserEmail]
    ];
    global.getSheet_.mockImplementation(name => {
      if (name === global.TABS.USERS) {
        return { getDataRange: () => ({ getValues: () => mockUsersData }) };
      }
      if (name === global.TABS.BUDGET_REQUEST_LINES) {
        return { getDataRange: () => ({ getValues: () => [[]] }) };
      }
      return { name: name, appendRow: jest.fn(), getDataRange: jest.fn(), getRange: jest.fn(), getLastRow: jest.fn() };
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
        ['user_id', 'name', 'role', 'email'],
        [testUserId, 'Test User', 'MEMBER', testUserEmail]
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
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [[], ['USER-1', '', '', 'test@example.com']] }) };
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
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [[], ['USER-1', '', '', 'test@example.com']] }) };
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
        if (tab === 'Users') return { getDataRange: () => ({ getValues: () => [[], ['USER-1', '', '', 'test@example.com']] }) };
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
