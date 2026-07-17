import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('\n[E2E Setup] Starting ephemeral environment provisioning...');

  const { provisionEnv } = await import('./env.js');
  let env: Record<string, string>;

  try {
    env = await provisionEnv();
    console.log(`[E2E Setup] Provisioned environment:`);
    console.log(`  - WebApp URL: ${env.webappUrl}`);
    console.log(`  - Project ID: ${env.projectId}`);
    process.env.E2E_WEBAPP_URL = env.webappUrl;
    process.env.E2E_PROJECT_ID = env.projectId;
    process.env.E2E_SPREADSHEET_ID = env.spreadsheetId;
  } catch (err) {
    console.warn(`[E2E Setup] Provisioning failed (will use dev/local mode): ${err}`);
    if (!process.env.E2E_WEBAPP_URL) {
      console.log('[E2E Setup] No E2E_WEBAPP_URL set, defaulting to localhost:5173');
      process.env.E2E_WEBAPP_URL = 'http://localhost:5173';
    }
  }
}

export default globalSetup;
