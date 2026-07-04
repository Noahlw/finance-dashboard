const { CoreEngine } = require('../src/core/CoreEngine');

test('transitions BudgetRequest to APPROVED and emits commands', () => {
  const result = CoreEngine.transition('BudgetRequest', 'BR-001', 'APPROVE', {}, { status: 'PENDING' }, 'TREASURER', 'hash123');
  expect(result.success).toBe(true);
  expect(result.commands.length).toBe(2);
  expect(result.commands[0]).toEqual({ action: 'UPDATE', id: 'BR-001', field: 'status', value: 'APPROVED' });
  expect(result.commands[1].action).toBe('APPEND_AUDIT');
  expect(result.commands[1].row_hash).not.toBe('dummyhash');
});

test('fails on invalid role or status', () => {
  const result = CoreEngine.transition('BudgetRequest', 'BR-001', 'APPROVE', {}, { status: 'APPROVED' }, 'TREASURER', 'hash123');
  expect(result.success).toBe(false);
  expect(result.error).toBe('Invalid');

  const result2 = CoreEngine.transition('BudgetRequest', 'BR-001', 'APPROVE', {}, { status: 'PENDING' }, 'MEMBER', 'hash123');
  expect(result2.success).toBe(false);
  expect(result2.error).toBe('Invalid');
});

test('fails on unknown route', () => {
  const result = CoreEngine.transition('BudgetRequest', 'BR-001', 'UNKNOWN_ACTION', {}, { status: 'PENDING' }, 'TREASURER', 'hash123');
  expect(result.success).toBe(false);
  expect(result.error).toBe('Unknown route');

  const result2 = CoreEngine.transition('UnknownEntity', 'BR-001', 'APPROVE', {}, { status: 'PENDING' }, 'TREASURER', 'hash123');
  expect(result2.success).toBe(false);
  expect(result2.error).toBe('Unknown route');
});
