const config = require('../appsscript.json');

describe('appsscript.json manifest', () => {
  test('webapp config', () => {
    expect(config.webapp.executeAs).toBe('USER_ACCESSING');
    expect(config.webapp.access).toBe('ANYONE');
  });
});
