const { execPromise } = require('./utils.js');

async function ensureFixtureBudgetLine() {
  try {
    await execPromise(`clasp run setupAll`);
    console.log('[Fixture] setupAll completed successfully');
    return true;
  } catch (err) {
    console.error('[Fixture] setupAll failed:', err.message);
    return false;
  }
}

async function approveBudgetLine(lineId) {
  try {
    await execPromise(`clasp run Engine.transition --params '{"rowId":"${lineId}","transition":"APPROVE"}'`);
    console.log(`[Fixture] Budget line ${lineId} approved`);
    return true;
  } catch (err) {
    console.error(`[Fixture] Failed to approve budget line ${lineId}:`, err.message);
    return false;
  }
}

if (require.main === module) {
  ensureFixtureBudgetLine()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { ensureFixtureBudgetLine, approveBudgetLine };
