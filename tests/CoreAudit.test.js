const { CoreAudit } = require('../src/core/CoreAudit');
test('calculates correct sha256 hash', () => {
  const hash = CoreAudit.calculateHash('prev123', 'somedata');
  expect(hash).toBe('1cead0c1b63a0357069b3cccc14331c91901d51c7aaf00ca84724b6b21a3b049');
});
