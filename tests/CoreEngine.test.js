const { CoreEngine } = require('../src/core/CoreEngine');

test('transitions BudgetRequest to APPROVED and emits commands', () => {
  const result = CoreEngine.transition('BudgetRequest', 'BR-001', 'APPROVE', {}, { status: 'PENDING' }, 'TREASURER', 'hash123');
  expect(result.success).toBe(true);
  expect(result.commands.length).toBe(2);
  expect(result.commands[0]).toEqual({ action: 'UPDATE', id: 'BR-001', field: 'status', value: 'APPROVED' });
  expect(result.commands[1].action).toBe('APPEND_AUDIT');
});
