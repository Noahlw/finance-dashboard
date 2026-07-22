"use strict";
const { execSync } = require("child_process");
const fs = require("fs");

console.log("Pushing code...");
execSync("npx clasp push", { stdio: "inherit" });

console.log("Deploying Web App...");
const deployOutput = execSync("npx clasp deploy").toString();
console.log(deployOutput);

const match = deployOutput.match(/Deployed\s+([A-Za-z0-9_-]+)\s+@/);
if (!match) {
  console.error("Failed to parse deployment ID.");
  process.exit(1);
}
const deploymentId = match[1];
const baseUrl = `https://script.google.com/macros/s/${deploymentId}/exec`;

// Parse tests from Tests.js
const testsJs = fs.readFileSync("Tests.js", "utf8");
const testMatches = [
  ...testsJs.matchAll(/function\s+(test_[A-Za-z0-9_]+)\s*\(/g),
];
const testNames = testMatches.map((m) => m[1]);

console.log(`Found ${testNames.length} tests. Running sequentially...\n`);

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const testName of testNames) {
    process.stdout.write(`Running ${testName}... `);
    try {
      const url = `${baseUrl}?run=${testName}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        console.log("✅ PASS");
        passed++;
      } else {
        console.log(`❌ FAIL\n   ${data.message}`);
        if (data.stack) {
          console.log(`   ${data.stack.split("\n")[1]}`); // Print top of stack
        }
        failed++;
        break; // Stop on first failure
      }
    } catch (e) {
      console.log(`❌ CRASH: ${e.message}`);
      failed++;
      break;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
