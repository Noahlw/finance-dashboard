const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function execPromise(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, opts, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

function timestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:-]/g, '').replace(/\.\d{3}/, '');
}

async function provisionEnv() {
  const ts = timestamp();
  const title = `E2E-${ts}`;

  const createResult = await execPromise(`clasp create --type sheets --title "${title}"`);
  const scriptUrl = createResult.stdout.match(/https:\/\/script\.google\.com\/d\/([^/]+)/);
  if (!scriptUrl) throw new Error('Failed to extract script ID from clasp create output');
  const projectId = scriptUrl[1];

  const manifestPath = path.join(process.cwd(), 'appsscript.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  manifest.executionApi = { access: 'MYSELF' };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  try {
    await execPromise(`clasp push --force`);

    const deployResult = await execPromise(`clasp deploy`);
    const deploymentMatch = deployResult.stdout.match(/-\s+([\w-]+)/);
    if (!deploymentMatch) throw new Error('Failed to extract deployment ID from clasp deploy output');
    const deploymentId = deploymentMatch[1];
    const webappUrl = `https://script.google.com/macros/s/${deploymentId}/exec`;

    await execPromise(`clasp run setupAll`);

    const fileContent = fs.readFileSync(manifestPath, 'utf-8');
    const newManifest = JSON.parse(fileContent);
    delete newManifest.executionApi;
    fs.writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2) + '\n');

    const spreadsheetId = await getSpreadsheetId(projectId);

    return { projectId, spreadsheetId, webappUrl };
  } catch (err) {
    try {
      const current = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      delete current.executionApi;
      fs.writeFileSync(manifestPath, JSON.stringify(current, null, 2) + '\n');
    } catch {}
    throw err;
  }
}

async function getSpreadsheetId(projectId) {
  try {
    const infoResult = await execPromise(`clasp info`);
    const sheetMatch = infoResult.stdout.match(/https:\/\/docs\.google\.com\/spreadsheets\/d\/([^/]+)/);
    return sheetMatch ? sheetMatch[1] : '';
  } catch {
    return '';
  }
}

async function teardownEnv(envInfo) {
  try {
    await execPromise(`clasp delete ${envInfo.projectId}`);
  } catch {
  }
}

async function sweepEnvironments(maxAgeHours = 4) {
  try {
    const listResult = await execPromise(`clasp list`);
    const lines = listResult.stdout.split('\n');
    const deadline = Date.now() - maxAgeHours * 3600000;

    for (const line of lines) {
      const match = line.match(/E2E-(\d{8}T\d{6})/);
      if (match) {
        const ts = match[1];
        const year = ts.slice(0, 4);
        const month = ts.slice(4, 6);
        const day = ts.slice(6, 8);
        const hour = ts.slice(9, 11);
        const min = ts.slice(11, 13);
        const sec = ts.slice(13, 15);
        const created = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`).getTime();

        if (created < deadline) {
          const idMatch = line.match(/([a-zA-Z0-9_-]{30,})/);
          if (idMatch) {
            await execPromise(`clasp delete ${idMatch[1]}`).catch(() => {});
          }
        }
      }
    }
  } catch {
  }
}

module.exports = { provisionEnv, teardownEnv, sweepEnvironments };
