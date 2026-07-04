const { CoreValidations } = require('../src/core/CoreValidations');
test('canApprove requires TREASURER role', () => {
  expect(CoreValidations.canApprove({ status: 'PENDING' }, 'MEMBER')).toBe(false);
  expect(CoreValidations.canApprove({ status: 'PENDING' }, 'TREASURER')).toBe(true);
});
