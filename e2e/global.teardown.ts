import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  const projectId = process.env.E2E_PROJECT_ID;

  if (projectId) {
    console.log(`\n[E2E Teardown] Cleaning up environment ${projectId}...`);
    try {
      const { teardownEnv } = await import('./env.js');
      await teardownEnv({ projectId, spreadsheetId: process.env.E2E_SPREADSHEET_ID || '' });
    } catch (err) {
      console.warn(`[E2E Teardown] Cleanup failed (may need manual sweep): ${err}`);
    }
  } else {
    console.log('[E2E Teardown] No ephemeral environment to clean up.');
  }
}

export default globalTeardown;
