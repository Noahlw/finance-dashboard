# E2E Browser Testing Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an End-to-End (E2E) browser testing framework using Puppeteer that simulates a real human filling out and submitting the live Google Forms, then checking the live Google Sheet to verify the data was processed correctly.

**Architecture:** 
1. Expose a new API endpoint in `Tests.js` (`doGet` parameter `run=get_form_urls`) that returns the live published URLs for the Request and Claim Google Forms.
2. Install `puppeteer` to automate Chromium.
3. Create `tests/e2e.js` that:
   - Fetches the live Google Form URLs from the Apps Script backend.
   - Launches a headless browser instance.
   - Navigates to the Budget Request form, interacts with the DOM to fill out the text fields, and clicks the Submit button.
   - Waits a few seconds, then calls another backend endpoint to verify that the form data correctly reached the `Budget Requests` tab in the ledger spreadsheet.

**Tech Stack:** Node.js, Puppeteer, Google Apps Script

## Global Constraints

- NEVER run any `git` commands (e.g. `git add`, `git commit`, etc.) without asking the user first.

---

### Task 1: Expose Form URLs & Validation via Backend API

**Files:**
- Modify: `Tests.js`

**Interfaces:**
- Produces: `get_form_urls` handling in `doGet`
- Produces: `verify_e2e_request` handling in `doGet`

- [ ] **Step 1: Modify `doGet` to support E2E API routes**

Update `doGet` in `Tests.js` to return the `FormSetup.createForms()` output if `e.parameter.run === 'get_form_urls'`, and to verify the spreadsheet if `e.parameter.run === 'verify_e2e_request'`. Add this right before `if (typeof this[testName] !== 'function')`:

```javascript
  if (testName === 'get_form_urls') {
    var urls = FormSetup.createForms();
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: urls })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (testName === 'verify_e2e_request') {
    var reqSheet = getSheet_(TABS.BUDGET_REQUESTS);
    var data = reqSheet.getDataRange().getValues();
    var c = COLS.BudgetRequests;
    var found = false;
    for (var i = 1; i < data.length; i++) {
      if (data[i][c.title - 1] === 'E2E Puppeteer Test Request') {
        found = true;
        // Clean up the E2E test data
        reqSheet.deleteRow(i + 1);
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: found, message: found ? 'Found E2E request in sheet' : 'E2E request not found in sheet' })).setMimeType(ContentService.MimeType.JSON);
  }
```

- [ ] **Step 2: Commit**

```bash
# Remember: wait for user approval
```

### Task 2: Build the E2E Puppeteer Script

**Files:**
- Create: `tests/e2e.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `doGet` API for Form URLs (`get_form_urls`) and Validation (`verify_e2e_request`)

- [ ] **Step 1: Install Puppeteer**

Run `npm install puppeteer` in the local directory.

- [ ] **Step 2: Write the E2E script**

Create `tests/e2e.js`:

```javascript
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

console.log('Deploying Web App...');
const deployOutput = execSync('npx clasp deploy').toString();
const match = deployOutput.match(/Deployed\s+([A-Za-z0-9_-]+)\s+@/);
const baseUrl = `https://script.google.com/macros/s/${match[1]}/exec`;

(async () => {
  console.log('Fetching live form URLs...');
  const res = await fetch(`${baseUrl}?run=get_form_urls`);
  const data = await res.json();
  const requestFormUrl = data.data.requestFormUrl;

  console.log(`Launching browser and navigating to: ${requestFormUrl}`);
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(requestFormUrl);
  
  // Wait for the form to load
  await page.waitForSelector('input[type="email"]');
  
  console.log('Filling out the Budget Request Form...');
  
  // 1. Email Address (first input[type="email"])
  await page.type('input[type="email"]', 'puppeteer@example.com');
  
  // 2. Title (first text input that is not email, usually an input[type="text"])
  // Google Forms renders text answers as inputs with type="text"
  const textInputs = await page.$$('input[type="text"]');
  await textInputs[0].type('E2E Puppeteer Test Request'); // Title
  
  // 3. Justification (textarea)
  await page.type('textarea', 'This is an automated E2E test using Puppeteer.');
  
  // 4. Needed By (date input)
  await page.type('input[type="date"]', '01012026'); // Format depends on locale, but typing numbers usually works
  
  // 5. Category (dropdown / list item)
  // Google Forms dropdowns are div roles "listbox".
  const listboxes = await page.$$('div[role="listbox"]');
  await listboxes[0].click(); // Open Category dropdown
  // Wait for options to appear (role="option")
  await page.waitForSelector('div[role="option"]:nth-child(3)', { visible: true });
  await page.click('div[role="option"]:nth-child(3)'); // Select the first actual category (skipping 'Choose')
  
  // 6. Description (text input 2)
  await textInputs[1].type('Line 1 description');
  
  // 7. Amount (text input 3)
  await textInputs[2].type('999');
  
  console.log('Submitting the form...');
  // Click the Submit button (role="button" containing text "Submit")
  const buttons = await page.$$('div[role="button"]');
  // Usually the submit button is the last button on the page. We will click the last one.
  await buttons[buttons.length - 1].click();
  
  // Wait for the confirmation page
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  console.log('Form submitted successfully!');
  
  await browser.close();
  
  console.log('Waiting 5 seconds for Apps Script trigger to process the form...');
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('Verifying backend state...');
  const verifyRes = await fetch(`${baseUrl}?run=verify_e2e_request`);
  const verifyData = await verifyRes.json();
  
  if (verifyData.success) {
    console.log('✅ E2E Test Passed! ' + verifyData.message);
  } else {
    console.error('❌ E2E Test Failed: ' + verifyData.message);
    process.exit(1);
  }
})();
```

- [ ] **Step 3: Run the E2E script**

Run: `node tests/e2e.js`
Expected: `✅ E2E Test Passed!`

- [ ] **Step 4: Commit**

```bash
# Remember: wait for user approval
```
