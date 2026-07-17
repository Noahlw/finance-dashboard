const mockExec = jest.fn();
jest.mock('child_process', () => ({ exec: mockExec }));

const { sweepEnvironments } = require('../../e2e/sweep.js');

describe('sweepEnvironments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes environments older than maxAgeHours', async () => {
    const oldLine = `E2E-20200101T000000 - ABCdef123GHIjkl456MNOpqr789STU (my-project)`;
    mockExec.mockImplementation((cmd, cb) => {
      if (typeof cmd === 'string' && cmd.startsWith('clasp list')) {
        cb(null, oldLine, '');
      } else if (cmd.startsWith('clasp delete')) {
        cb(null, 'Deleted.', '');
      }
    });

    const result = await sweepEnvironments(1);
    expect(mockExec.mock.calls.some(c => c[0].startsWith('clasp delete'))).toBe(true);
    expect(result.deletedCount).toBe(1);
  });

  it('does not delete recent environments', async () => {
    const freshLine = `E2E-20991231T235959 - ABCdef123GHIjkl456MNOpqr789STU (my-project)`;
    mockExec.mockImplementation((cmd, cb) => {
      if (typeof cmd === 'string' && cmd.startsWith('clasp list')) {
        cb(null, freshLine, '');
      } else {
        cb(null, '', '');
      }
    });

    const result = await sweepEnvironments(48);
    expect(mockExec.mock.calls.some(c => c[0].startsWith('clasp delete'))).toBe(false);
    expect(result.deletedCount).toBe(0);
  });

  it('handles empty clasp list gracefully', async () => {
    mockExec.mockImplementation((cmd, cb) => {
      cb(null, '', '');
    });
    const result = await sweepEnvironments(4);
    expect(result.deletedCount).toBe(0);
  });

  it('handles clasp list failure gracefully', async () => {
    mockExec.mockImplementation((cmd, cb) => {
      cb(new Error('clasp not found'), '', '');
    });
    const result = await sweepEnvironments(4);
    expect(result.deletedCount).toBe(0);
  });
});
