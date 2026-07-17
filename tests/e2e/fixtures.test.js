const mockExec = jest.fn();
jest.mock('child_process', () => ({ exec: mockExec }));

const { ensureFixtureBudgetLine } = require('../../e2e/fixtures.js');

describe('ensureFixtureBudgetLine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExec.mockImplementation((cmd, cb) => {
      if (typeof cmd === 'string' && cmd.startsWith('clasp run setupAll')) {
        cb(null, '{"result":"ok"}', '');
      } else if (cmd.startsWith('clasp run TestHelpers_seedBudgetRequest')) {
        cb(null, '"FIXTURE-REQ-1"', '');
      } else {
        cb(null, '', '');
      }
    });
  });

  it('runs setupAll', async () => {
    await ensureFixtureBudgetLine();
    const setupCall = mockExec.mock.calls.find(c => c[0].includes('clasp run setupAll'));
    expect(setupCall).toBeDefined();
  });

  it('calls TestHelpers_seedBudgetRequest with parameters', async () => {
    await ensureFixtureBudgetLine();
    const seedCall = mockExec.mock.calls.find(c => c[0].includes('clasp run TestHelpers_seedBudgetRequest'));
    expect(seedCall).toBeDefined();
    expect(seedCall[0]).toContain('FIXTURE-REQ-1');
    expect(seedCall[0]).toContain('USER-0001');
    expect(seedCall[0]).toContain('APPROVED');
  });

  it('returns the request and line IDs', async () => {
    const result = await ensureFixtureBudgetLine();
    expect(result.requestId).toBe('FIXTURE-REQ-1');
    expect(result.lineId).toContain('TEST-BUDGETLINE');
  });

  it('throws on failure', async () => {
    mockExec.mockImplementation((cmd, cb) => {
      cb(new Error('clasp failed'), '', '');
    });
    await expect(ensureFixtureBudgetLine()).rejects.toThrow('clasp failed');
  });
});
