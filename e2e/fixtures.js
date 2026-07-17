const { execPromise } = require('./utils.js');

async function ensureFixtureBudgetLine() {
  try {
    await execPromise(`clasp run setupAll`);
    console.log('[Fixture] setupAll completed');

    const params = JSON.stringify([
      'FIXTURE-REQ-1',
      'USER-0001',
      'APPROVED',
      [{
        categoryId: 'CAT-ACT',
        description: 'E2E Fixture Budget ' + new Date().toISOString(),
        amount: 500,
        approvedAmount: 500,
        lineStatus: 'APPROVED'
      }]
    ]);

    await execPromise(`clasp run TestHelpers_seedBudgetRequest --params '${params}'`);
    console.log('[Fixture] Approved budget request created: FIXTURE-REQ-1');

    return { requestId: 'FIXTURE-REQ-1', lineId: 'TEST-BUDGETLINE-FIXTURE-REQ-1-1' };
  } catch (err) {
    console.error('[Fixture] Failed:', err.message);
    throw err;
  }
}

if (require.main === module) {
  ensureFixtureBudgetLine()
    .then(result => {
      console.log(`Fixture ready: request=${result.requestId}, line=${result.lineId}`);
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { ensureFixtureBudgetLine };
