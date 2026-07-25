"use strict";
/**
 * Puppeteer E2E tests for CF-Ledger Google Forms.
 *
 * Scenarios:
 *   1. Budget Request form submission
 *   2. Expense Claim form submission
 *   3. Committee Onboarding form submission
 *
 * Usage: node tests/e2e.js [scenario]
 *   - No argument: runs all scenarios
 *   - "request":  Budget Request only
 *   - "claim":    Expense Claim only
 *   - "onboarding": Onboarding only
 */

const puppeteer = require("puppeteer");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const scenario = process.argv[2] || "all";
const SCREENSHOT_DIR = path.join(__dirname, "..", "e2e_screenshots");

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// ── helpers ──────────────────────────────────────────────────────────────────

function deployAndGetBaseUrl() {
  console.log("Deploying Web App...");
  const deployOutput = execSync("npx clasp deploy").toString();
  const match = deployOutput.match(/Deployed\s+([A-Za-z0-9_-]+)\s+@/);
  if (!match) {
    console.error("Failed to parse deployment ID from:", deployOutput);
    process.exit(1);
  }
  return `https://script.google.com/macros/s/${match[1]}/exec`;
}

async function getFormUrls(baseUrl) {
  console.log("Fetching live form URLs...");
  const res = await fetch(`${baseUrl}?run=get_form_urls`);
  const data = await res.json();
  console.log("Form URLs:", JSON.stringify(data.data, null, 2));
  return data.data;
}

async function fillEmail(page, email) {
  const emailEl = await page.$('input[type="email"]');
  if (!emailEl) {
    return;
  }
  await emailEl.focus();
  await emailEl.click();
  await new Promise((r) => setTimeout(r, 200));
  // Try execCommand first (bypasses Google's autocomplete interference)
  await page.evaluate((val) => {
    const el = document.querySelector('input[type="email"]');
    if (el) {
      el.focus();
      document.execCommand("insertText", false, val);
    }
  }, email);
  // Fallback: type manually
  const currentVal = await page.evaluate((el) => el.value, emailEl);
  if (currentVal === "" || currentVal !== email) {
    await emailEl.click({ clickCount: 3 }); // Select all
    await emailEl.type(email, { delay: 50 });
  }
  await page.keyboard.press("Tab");
}

async function clickSubmit(page) {
  console.log("Submitting the form...");
  const buttons = await page.$$('div[role="button"]');
  let clicked = false;
  for (const b of buttons) {
    const text = await b.evaluate((el) => el.innerText);
    if (text.includes("Submit") || text.includes("提交")) {
      await Promise.all([
        page
          .waitForNavigation({ timeout: 30_000, waitUntil: "networkidle0" })
          .catch(() => {}),
        b.click(),
      ]);
      clicked = true;
      break;
    }
  }
  if (!clicked) {
    console.log(
      "Could not find Submit button. Clicking the last button as fallback."
    );
    const lastBtn = buttons[buttons.length - 1];
    if (lastBtn) {
      await Promise.all([
        page
          .waitForNavigation({ timeout: 30_000, waitUntil: "networkidle0" })
          .catch(() => {}),
        lastBtn.click(),
      ]);
    }
  }
}

async function checkSubmissionSuccess(page) {
  await new Promise((r) => setTimeout(r, 2000));
  const pageText = await page.evaluate(() => document.body.innerText);
  const successPhrases = [
    "Your response has been recorded",
    "Your response has been recorded",
    "回覆",
    "紀錄",
    "記錄",
    "Response recorded",
  ];
  const isSuccess = successPhrases.some((phrase) => pageText.includes(phrase));
  if (isSuccess) {
    console.log("Form submitted successfully!");
    return true;
  }
  console.log("Form submission might have failed. Page text:");
  console.log(pageText.substring(0, 500));

  // Check for validation errors
  const errors = await page.$$eval('div[role="alert"]', (els) =>
    els.map((e) => e.innerText).filter((t) => t.trim() !== "")
  );
  if (errors.length > 0) {
    console.log("Validation errors:", errors);
  }
  return false;
}

async function verifyBackend(baseUrl, endpoint) {
  console.log("Waiting 15 seconds for Apps Script trigger to process...");
  await new Promise((r) => setTimeout(r, 15_000));

  console.log(`Verifying backend state via ${endpoint}...`);
  // Retry up to 3 times with 10-second intervals (form triggers can be slow)
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      console.log(`  Retry ${attempt + 1}/3...`);
      await new Promise((r) => setTimeout(r, 10_000));
    }
    const verifyRes = await fetch(`${baseUrl}?run=${endpoint}`);
    const verifyData = await verifyRes.json();
    if (verifyData.success) {
      console.log(`✅ ${endpoint} — passed!`);
      return true;
    }
    console.log(`  Attempt ${attempt + 1}: ${verifyData.message}`);
  }
  console.log(`❌ ${endpoint} — failed after retries.`);
  return false;
}

// ── scenario 1: Budget Request ───────────────────────────────────────────────

async function testBudgetRequest(baseUrl, formUrls) {
  console.log("\n═══════════════════════════════════════");
  console.log("  Scenario 1: Budget Request Form");
  console.log("═══════════════════════════════════════\n");

  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.goto(formUrls.requestFormUrl, {
      timeout: 30_000,
      waitUntil: "networkidle2",
    });
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });

    console.log("Filling out the Budget Request Form...");
    await fillEmail(page, "puppeteer@example.com");

    // 1: Title
    const inputs = await page.$$("input.whsOnd, textarea.KHxj8b");
    if (inputs.length > 1) {
      await inputs[1].click();
      await inputs[1].type("E2E Puppeteer Test Request", { delay: 30 });
    }
    // 2: Justification
    if (inputs.length > 2) {
      await inputs[2].click();
      await inputs[2].type("This is an automated E2E test using Puppeteer.", {
        delay: 30,
      });
    }
    // 3: Date
    if (inputs.length > 3) {
      await page.evaluate((el) => {
        el.value = "2026-01-01";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, inputs[3]);
    }
    // Category dropdown
    const listbox = await page.$('div[role="listbox"]');
    if (listbox) {
      await listbox.click();
      await new Promise((r) => setTimeout(r, 1000));
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
    }
    // 4: Description
    if (inputs.length > 4) {
      await inputs[4].click();
      await inputs[4].type("Line 1 description", { delay: 30 });
    }
    // 5: Amount
    if (inputs.length > 5) {
      await inputs[5].click();
      await inputs[5].type("999", { delay: 30 });
    }

    const screenshotPath = path.join(SCREENSHOT_DIR, "e2e_request.png");
    await page.screenshot({ fullPage: true, path: screenshotPath });
    console.log(`Screenshot saved: ${screenshotPath}`);

    await clickSubmit(page);
    const success = await checkSubmissionSuccess(page);

    if (!success) {
      console.log("❌ Scenario 1 (Budget Request) — submission failed.");
      return false;
    }

    return await verifyBackend(baseUrl, "verify_e2e_request");
  } finally {
    await browser.close();
  }
}

// ── scenario 2: Expense Claim ────────────────────────────────────────────────

async function testExpenseClaim(baseUrl, formUrls) {
  console.log("\n═══════════════════════════════════════");
  console.log("  Scenario 2: Expense Claim Form");
  console.log("═══════════════════════════════════════\n");

  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.goto(formUrls.claimFormUrl, {
      timeout: 30_000,
      waitUntil: "networkidle2",
    });
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });

    console.log("Filling out the Expense Claim Form...");
    await fillEmail(page, "puppeteer@example.com");

    const inputs = await page.$$("input.whsOnd, textarea.KHxj8b");

    // 0: Description (first non-email input)
    if (inputs.length > 1) {
      await inputs[1].click();
      await inputs[1].type("E2E Puppeteer Test Claim", { delay: 30 });
    }
    // 1: Vendor
    if (inputs.length > 2) {
      await inputs[2].click();
      await inputs[2].type("Puppeteer Test Store", { delay: 30 });
    }
    // 2: Receipt date
    if (inputs.length > 3) {
      await page.evaluate((el) => {
        el.value = "2026-06-01";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, inputs[3]);
    }
    // 3: Receipt total
    if (inputs.length > 4) {
      await inputs[4].click();
      await inputs[4].type("500", { delay: 30 });
    }

    // File upload — upload a test receipt image
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      // Create a tiny test image if one doesn't exist
      const testImagePath = path.join(__dirname, "test_receipt.png");
      if (!fs.existsSync(testImagePath)) {
        // Create a minimal 1x1 PNG (valid PNG bytes)
        const minimalPng = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk" +
            "+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          "base64"
        );
        fs.writeFileSync(testImagePath, minimalPng);
        console.log("Created test receipt image:", testImagePath);
      }
      await fileInput.uploadFile(testImagePath);
      console.log("Uploaded test receipt image.");
    } else {
      console.log("⚠ No file input found — receipt upload skipped.");
    }

    // Budget line dropdown
    const listboxes = await page.$$('div[role="listbox"]');
    if (listboxes.length > 0) {
      await listboxes[0].click();
      await new Promise((r) => setTimeout(r, 1000));
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
    }

    // Remaining inputs: budget line amount
    const allInputsAfter = await page.$$("input.whsOnd, textarea.KHxj8b");
    const amountIdx = allInputsAfter.length - 1;
    if (allInputsAfter.length > 5) {
      await allInputsAfter[amountIdx].click();
      await allInputsAfter[amountIdx].type("100", { delay: 30 });
    }

    // Missing receipt checkbox — skip by checking for "No" option
    // (default is No, so we don't need to change it)

    const screenshotPath = path.join(SCREENSHOT_DIR, "e2e_claim.png");
    await page.screenshot({ fullPage: true, path: screenshotPath });
    console.log(`Screenshot saved: ${screenshotPath}`);

    await clickSubmit(page);
    const success = await checkSubmissionSuccess(page);

    if (!success) {
      console.log("❌ Scenario 2 (Expense Claim) — submission failed.");
      return false;
    }

    return await verifyBackend(baseUrl, "verify_e2e_claim");
  } finally {
    await browser.close();
  }
}

// ── scenario 3: Committee Onboarding ─────────────────────────────────────────

async function testOnboarding(baseUrl, formUrls) {
  console.log("\n═══════════════════════════════════════");
  console.log("  Scenario 3: Committee Onboarding Form");
  console.log("═══════════════════════════════════════\n");

  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.goto(formUrls.onboardingFormUrl, {
      timeout: 30_000,
      waitUntil: "networkidle2",
    });
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });

    console.log("Filling out the Onboarding Form...");
    await fillEmail(page, "puppeteer-onboarding@example.com");

    const inputs = await page.$$("input.whsOnd, textarea.KHxj8b");

    // Consent checkbox — first checkbox on the form
    const checkboxes = await page.$$('div[role="checkbox"]');
    if (checkboxes.length > 0) {
      // Check the consent checkbox by clicking its role="checkbox" div
      await checkboxes[0].click();
      await new Promise((r) => setTimeout(r, 300));
      console.log("Checked consent checkbox.");
    }

    // Full name
    if (inputs.length > 1) {
      await inputs[1].click();
      await inputs[1].type("Puppeteer Test User", { delay: 30 });
    }
    // Student ID
    if (inputs.length > 2) {
      await inputs[2].click();
      await inputs[2].type("12345678", { delay: 30 });
    }

    // Payout method dropdown
    const listboxes = await page.$$('div[role="listbox"]');
    if (listboxes.length > 0) {
      await listboxes[0].click();
      await new Promise((r) => setTimeout(r, 1000));
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
    }

    // Payout handle
    const allInputsAfter = await page.$$("input.whsOnd");
    const handleIdx = allInputsAfter.length - 1;
    if (allInputsAfter.length > 3) {
      await allInputsAfter[handleIdx].click();
      await allInputsAfter[handleIdx].type("puppeteer-fps-handle", {
        delay: 30,
      });
    }

    const screenshotPath = path.join(SCREENSHOT_DIR, "e2e_onboarding.png");
    await page.screenshot({ fullPage: true, path: screenshotPath });
    console.log(`Screenshot saved: ${screenshotPath}`);

    await clickSubmit(page);
    const success = await checkSubmissionSuccess(page);

    if (!success) {
      console.log("❌ Scenario 3 (Onboarding) — submission failed.");
      return false;
    }

    return await verifyBackend(baseUrl, "verify_e2e_onboarding");
  } finally {
    await browser.close();
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

(async () => {
  const baseUrl = deployAndGetBaseUrl();
  const formUrls = await getFormUrls(baseUrl);

  const scenarios = [];
  if (scenario === "all" || scenario === "request") {
    scenarios.push({
      fn: () => testBudgetRequest(baseUrl, formUrls),
      name: "Budget Request",
    });
  }
  if (scenario === "all" || scenario === "claim") {
    scenarios.push({
      fn: () => testExpenseClaim(baseUrl, formUrls),
      name: "Expense Claim",
    });
  }
  if (scenario === "all" || scenario === "onboarding") {
    scenarios.push({
      fn: () => testOnboarding(baseUrl, formUrls),
      name: "Committee Onboarding",
    });
  }

  if (scenarios.length === 0) {
    console.error(
      `Unknown scenario: "${scenario}". Use "request", "claim", "onboarding", or omit for all.`
    );
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  for (const s of scenarios) {
    console.log(`\n▶ Running: ${s.name}`);
    const ok = await s.fn();
    if (ok) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log("\n═══════════════════════════════════════");
  console.log(`  E2E Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
})();
