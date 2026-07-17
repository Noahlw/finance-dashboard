const { exec } = require('child_process');

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

function parseE2eTimestamp(str) {
  const match = str.match(/E2E-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  return new Date(
    parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]),
    parseInt(match[4]), parseInt(match[5]), parseInt(match[6])
  ).getTime();
}

async function sweepEnvironments(maxAgeHours = 4) {
  const deadline = Date.now() - maxAgeHours * 3600000;
  let deletedCount = 0;

  try {
    const listResult = await execPromise(`clasp list`);
    const lines = listResult.stdout.split('\n');

    for (const line of lines) {
      const created = parseE2eTimestamp(line);
      if (created && created < deadline) {
        const idMatch = line.match(/([a-zA-Z0-9_-]{30,})/);
        if (idMatch) {
          try {
            await execPromise(`clasp delete ${idMatch[1]}`);
            deletedCount++;
          } catch {
          }
        }
      }
    }
  } catch {
  }

  return { deletedCount };
}

if (require.main === module) {
  const maxAge = parseInt(process.argv.find(a => a.startsWith('--max-age='))?.split('=')[1] || '4', 10);
  sweepEnvironments(maxAge)
    .then(result => {
      console.log(`Sweep complete: ${result.deletedCount} environments deleted.`);
      process.exit(0);
    })
    .catch(err => {
      console.error('Sweep failed:', err);
      process.exit(1);
    });
}

module.exports = { sweepEnvironments };
