const { chromium } = require('playwright');
const readline = require('readline');

async function captureAuth(url, outputPath) {
  const browser = await chromium.launch({ headless: false });

  const sigintHandler = () => {
    console.log('\nAuth capture cancelled.');
    browser.close().finally(() => process.exit(0));
  };
  process.on('SIGINT', sigintHandler);

  try {
    const page = await browser.newPage();
    await page.goto(url);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise(resolve => {
      rl.question('Please log in via Google in the opened browser, then press Enter to save auth state...\n', resolve);
    });
    rl.close();

    const resolvedPath = outputPath || '.auth.json';
    await page.context().storageState({ path: resolvedPath });
    console.log(`Auth state saved to ${resolvedPath}`);
  } finally {
    process.removeListener('SIGINT', sigintHandler);
    await browser.close();
  }
}

if (require.main === module) {
  const help = `Usage: node e2e/auth-capture.js [--url=<webapp-url>]

Launches a headed Playwright browser to capture Google OAuth session cookies.

Options:
  --url=<webapp-url>  URL of the deployed GAS webapp (default: http://localhost:5173)
                      Also accepts E2E_WEBAPP_URL environment variable.

The script opens a browser window. Log in to Google, then press Enter
in the terminal. Playwright saves the session to .auth.json for reuse
by Playwright E2E tests.

Set E2E_WEBAPP_URL to the deployed webapp URL (the one clasp deploy outputs)
before running. Example:
  export E2E_WEBAPP_URL=https://script.google.com/macros/s/.../exec
  npm run e2e:auth
`;

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(help);
    process.exit(0);
  }

  const url = process.env.E2E_WEBAPP_URL || process.argv.find(a => a.startsWith('--url='))?.split('=')[1];

  if (!url) {
    console.error('Error: E2E_WEBAPP_URL not set and no --url flag provided.\n');
    console.error(help);
    process.exit(1);
  }

  captureAuth(url).catch(err => {
    console.error('Auth capture failed:', err);
    process.exit(1);
  });
}

module.exports = { captureAuth };
