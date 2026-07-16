# Automated Testing Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust, CLI-accessible testing pipeline that allows the agent to run Google Apps Script tests automatically, enabling a recursive `/goal` loop to fix bugs until production-ready.

**Architecture:** Because `clasp run` requires advanced GCP credentials, we will bypass it by deploying the script as a public Web App. We will add a `doGet()` endpoint to `Tests.js` to execute tests via HTTP. A local Node script (`test-runner.js`) will automate the `clasp push`, `clasp deploy`, and `curl` steps into a single command the agent can loop.

**Tech Stack:** Google Apps Script (Web App), Node.js (local test runner)

## Global Constraints

- Must maintain idempotent setup (do not modify setupAll safety guarantees).
- `Tests.js` functions must not require live forms; they use direct engine overrides.
- No `git` commands allowed without user approval.

---

### Task 1: Expose Web App Configuration

**Files:**
- Modify: `appsscript.json:2-3`

**Interfaces:**
- Consumes: None
- Produces: Web App deployment capability for the Apps Script project.

- [ ] **Step 1: Add webapp config to appsscript.json**
Add the `webapp` configuration block below `timeZone`:

```json
  "timeZone": "Asia/Hong_Kong",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  },
```

- [ ] **Step 2: Commit**

```bash
# Wait for user approval before git operations
```

### Task 2: Create HTTP Endpoint for Tests

**Files:**
- Modify: `Tests.js` (append to end of file)

**Interfaces:**
- Consumes: `test_phase1()`, `test_phase2()`, `test_phase3()`
- Produces: `doGet(e)` which returns JSON output.

- [ ] **Step 1: Append doGet function**
Add the following code to the bottom of `Tests.js`:

```javascript
/**
 * HTTP Endpoint for automated CLI testing loop.
 * Execute tests via: ?run=test_phase1
 */
function doGet(e) {
  var testName = e.parameter.run;
  try {
    var result;
    if (testName === 'test_phase1') {
      result = test_phase1(); // Assuming it returns a truthy/string result, or throws on fail
    } else {
      throw new Error("Unknown test: " + testName);
    }
    var payload = { success: true, message: "PASS: " + testName };
    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    var payload = { success: false, message: "FAIL: " + err.message, stack: err.stack };
    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
  }
}
```

- [ ] **Step 2: Commit**

```bash
# Wait for user approval before git operations
```

### Task 3: Build Local Test Runner

**Files:**
- Create: `tests/runner.js`

**Interfaces:**
- Consumes: The `clasp deploy` CLI output format, Node.js `child_process` and `https`.
- Produces: Terminal command `node tests/runner.js test_phase1`

- [ ] **Step 1: Write test runner script**
Create `tests/runner.js` with the following:

```javascript
const { execSync } = require('child_process');
const https = require('https');

const testName = process.argv[2] || 'test_phase1';

console.log('Pushing code...');
execSync('npx clasp push', { stdio: 'inherit' });

console.log('Deploying Web App...');
const deployOutput = execSync('npx clasp deploy').toString();
console.log(deployOutput);

// Extract Deployment ID: Deployed AKfy... @6
const match = deployOutput.match(/Deployed\s+([A-Za-z0-9_-]+)\s+@/);
if (!match) {
  console.error("Failed to parse deployment ID.");
  process.exit(1);
}
const deploymentId = match[1];
const url = `https://script.google.com/macros/s/${deploymentId}/exec?run=${testName}`;

console.log(`Running ${testName} via HTTP...`);
https.get(url, (res) => {
  // Handle redirects
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
    https.get(res.headers.location, (redirectRes) => {
      let data = '';
      redirectRes.on('data', chunk => data += chunk);
      redirectRes.on('end', () => console.log('\n--- TEST RESULT ---\n', data));
    });
  } else {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('\n--- TEST RESULT ---\n', data));
  }
}).on('error', (e) => {
  console.error(e);
});
```

- [ ] **Step 2: Test the runner**
Run `node tests/runner.js test_phase1`.
Verify that it prints the JSON output of the test pass/fail.

- [ ] **Step 3: Commit**

```bash
# Wait for user approval before git operations
```
