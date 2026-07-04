const { CoreAudit } = require('../src/core/CoreAudit');
test('calculates correct sha256 hash', () => {
  const hash = CoreAudit.calculateHash('prev123', 'somedata');
  expect(hash).toBeDefined();
  expect(hash.length).toBe(64); // hex sha256
});
