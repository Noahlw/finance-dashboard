const mockExec = jest.fn();
jest.mock('child_process', () => ({ exec: mockExec }));
jest.mock('fs');

const { provisionEnv, teardownEnv } = require('../../e2e/env.js');

const REAL_APPSSCRIPT = JSON.stringify({
  timeZone: 'Asia/Hong_Kong',
  webapp: { executeAs: 'USER_ACCESSING', access: 'ANYONE' },
  exceptionLogging: 'STACKDRIVER',
  runtimeVersion: 'V8',
});

beforeEach(() => {
  jest.clearAllMocks();
  const fs = require('fs');
  fs.readFileSync.mockImplementation((p) => {
    if (p.includes('appsscript.json')) return REAL_APPSSCRIPT;
    return '';
  });
  fs.writeFileSync.mockImplementation(() => {});
  mockExec.mockImplementation((cmd, opts, cb) => {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    if (cmd.startsWith('clasp create')) {
      cb(null, 'Created new Sheets script: https://script.google.com/d/12345/edit\n', '');
    } else if (cmd.startsWith('clasp push')) {
      cb(null, 'Pushed 20 files.\n', '');
      } else if (cmd.startsWith('clasp deploy')) {
        cb(null, 'Created version 1.\n- AKfycbw1ZZ2YY3XX4W\n', '');
    } else if (cmd.startsWith('clasp run')) {
      cb(null, '{"result":"ok"}', '');
    } else {
      cb(null, '', '');
    }
  });
});

describe('provisionEnv', () => {
  it('creates a clasp project with E2E- prefix and timestamp', async () => {
    await provisionEnv();
    const createCall = mockExec.mock.calls.find(c => c[0].startsWith('clasp create'));
    expect(createCall).toBeDefined();
    expect(createCall[0]).toMatch(/clasp create --type sheets --title "E2E-\d{8}T\d{6}(Z)?"/);
  });

  it('returns projectId, spreadsheetId, and webappUrl', async () => {
    const result = await provisionEnv();
    expect(result).toHaveProperty('projectId');
    expect(result).toHaveProperty('spreadsheetId');
    expect(result).toHaveProperty('webappUrl');
    expect(result.webappUrl).toMatch(/^https:\/\/script\.google\.com/);
  });

  it('pushes files after creation', async () => {
    await provisionEnv();
    const pushCalls = mockExec.mock.calls.filter(c => c[0].startsWith('clasp push'));
    expect(pushCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('injects executionApi into appsscript.json before pushing', async () => {
    const fs = require('fs');
    fs.writeFileSync.mockClear();

    await provisionEnv();

    const manifestCalls = fs.writeFileSync.mock.calls.filter(c => c[0].includes('appsscript.json'));
    expect(manifestCalls.length).toBeGreaterThanOrEqual(1);
    const written = JSON.parse(manifestCalls[0][1]);
    expect(written.executionApi).toEqual({ access: 'MYSELF' });
  });

  it('runs setupAll via clasp run after deploy', async () => {
    await provisionEnv();
    const runCalls = mockExec.mock.calls.filter(c => c[0].includes('clasp run setupAll'));
    expect(runCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('deploys the web app and extracts URL', async () => {
    const result = await provisionEnv();
    expect(result.webappUrl).toContain('/exec');
  });

  it('throws on clasp creation failure', async () => {
    mockExec.mockImplementation((cmd, opts, cb) => {
      if (typeof opts === 'function') { cb = opts; opts = {}; }
      cb(new Error('clasp create failed'), '', '');
    });
    await expect(provisionEnv()).rejects.toThrow('clasp create failed');
  });
});

describe('teardownEnv', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExec.mockImplementation((cmd, opts, cb) => {
      if (typeof opts === 'function') { cb = opts; opts = {}; }
      cb(null, 'Deleted.', '');
    });
  });

  it('deletes the script project', async () => {
    await teardownEnv({ projectId: '12345', spreadsheetId: '1abc' });
    const deleteCalls = mockExec.mock.calls.filter(c => c[0].includes('clasp delete'));
    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('does not throw if deletion fails gracefully', async () => {
    mockExec.mockImplementation((cmd, opts, cb) => {
      if (typeof opts === 'function') { cb = opts; opts = {}; }
      cb(new Error('Not found'), '', '');
    });
    await expect(teardownEnv({ projectId: '12345', spreadsheetId: '1abc' })).resolves.not.toThrow();
  });
});
