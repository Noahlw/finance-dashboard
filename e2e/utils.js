const { exec } = require('child_process');

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

module.exports = { execPromise };
