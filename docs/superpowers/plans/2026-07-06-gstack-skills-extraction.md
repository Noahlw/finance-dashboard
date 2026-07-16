# gstack Skills Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Programmatically extract and translate all 59 gstack skills from /tmp/gstack/ into clean, self-contained Antigravity skills, saving them both globally (~/.gemini/config/skills/) and locally (docs/skills/).

**Architecture:** A Node.js translation utility script parses the SKILL.md files, sanitizes YAML frontmatter (ensuring "Use when..." style description), strips gstack-specific bash preambles and telemetry, translates Claude Code tool references to native Antigravity tool names, and writes output files.

**Tech Stack:** Node.js (filesystem, path, regex).

## Global Constraints
- Target paths must be absolute:
  - Global: `/Users/noah.wong/.gemini/config/skills/`
  - Local: `/Users/noah.wong/Desktop/code/Budget/docs/skills/`
- Do not run git commands (git add, git commit, etc.) without explicit confirmation.
- Output files must be structured in standard Antigravity skill directory format (folder per skill containing SKILL.md).

---

### Task 1: Create Test and Implement Core Translation Function

**Files:**
- Create: `tests/port-skills.test.js`
- Create: `docs/skills/port-skills.js`

**Interfaces:**
- Consumes: `/tmp/gstack/` repository skill files
- Produces: `translateSkill(content)` helper function

- [ ] **Step 1: Write the failing test**
Create a test runner file that validates that the translation correctly extracts YAML fields, reformats description, removes the preamble section, and translates tool names.

Create `tests/port-skills.test.js` with the following content:
```javascript
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock content simulating a gstack SKILL.md file
const mockSkillContent = \`---
name: mock-skill
preamble-tier: 2
description: |
  Rethink the problem. (gstack)
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---
## When to invoke this skill
Use to do things.

## Preamble (run first)
\\\`\\\`\\\`bash
echo "doing setup..."
\\\`\\\`\\\`

## Step 1: Execute task
Use AskUserQuestion to prompt user, then run Bash command.

## Telemetry (run last)
\\\`\\\`\\\`bash
echo "sending telemetry"
\\\`\\\`\\\`
\`;

try {
  const { translateSkill } = require('../docs/skills/port-skills.js');
  const result = translateSkill(mockSkillContent);

  // Assertion 1: Check clean frontmatter
  assert.ok(result.includes('name: mock-skill'), 'Should contain skill name');
  assert.ok(result.includes('description: Use when rethink the problem'), 'Should start with Use when and strip gstack suffix');
  assert.ok(!result.includes('preamble-tier: 2'), 'Should strip custom metadata from frontmatter');

  // Assertion 2: Check preamble and telemetry removed
  assert.ok(!result.includes('## Preamble (run first)'), 'Should remove preamble title');
  assert.ok(!result.includes('doing setup...'), 'Should remove preamble code block');
  assert.ok(!result.includes('## Telemetry (run last)'), 'Should remove telemetry section');
  assert.ok(!result.includes('sending telemetry'), 'Should remove telemetry code block');

  // Assertion 3: Check tool name translation
  assert.ok(result.includes('ask_question'), 'Should translate AskUserQuestion to ask_question');
  assert.ok(result.includes('run_command'), 'Should translate Bash to run_command');

  console.log('PASS: translateSkill works correctly!');
} catch (err) {
  console.error('FAIL:', err.message);
  process.exit(1);
}
```

- [ ] **Step 2: Run test to verify it fails**
Run: `node tests/port-skills.test.js`
Expected: FAIL with "Cannot find module '../docs/skills/port-skills.js'"

- [ ] **Step 3: Write minimal implementation**
Create the translation logic in `docs/skills/port-skills.js`.

Create `docs/skills/port-skills.js` with the following content:
```javascript
const fs = require('fs');
const path = require('path');

function translateSkill(content) {
  // 1. Extract and clean YAML frontmatter
  let frontmatter = '';
  let body = content;
  const match = content.match(/^---([\\s\\S]*?)---/);
  if (match) {
    frontmatter = match[1];
    body = content.slice(match[0].length);
  }

  // Parse name and description
  const nameMatch = frontmatter.match(/name:\\s*([^\\n\\r]+)/);
  const descMatch = frontmatter.match(/description:\\s*([\\s\\S]*?)(?=(?:\\n\\w+:)|$)/);

  const name = nameMatch ? nameMatch[1].trim() : '';
  let description = descMatch ? descMatch[1].trim() : '';

  if (description.startsWith('|')) {
    description = description.slice(1).trim();
  }
  description = description.replace(/^["']|["']$/g, '').trim();

  // Normalize description to "Use when..."
  if (!description.toLowerCase().startsWith('use when')) {
    description = 'Use when ' + description.charAt(0).toLowerCase() + description.slice(1);
  }
  // Strip (gstack) or similar suffixes
  description = description.replace(/\\s*\\(\\s*gstack\\s*\\)\\s*$/gi, '').trim();

  const cleanFrontmatter = \`---
name: \${name}
description: \${description}
---\`;

  // 2. Clean the body (preamble and telemetry)
  let cleanBody = body;
  // Remove preamble title and code block
  cleanBody = cleanBody.replace(/## Preamble \\(run first\\)[\\s\\S]*?```bash[\\s\\S]*?```/gi, '');
  // Remove telemetry section and code block
  cleanBody = cleanBody.replace(/## Telemetry \\(run last\\)[\\s\\S]*?```bash[\\s\\S]*?```/gi, '');
  cleanBody = cleanBody.replace(/## Telemetry \\(run last\\)[\\s\\S]*?(?=(?:## )|$)/gi, '');

  // 3. Translate tool names
  const toolMap = {
    'AskUserQuestion': 'ask_question',
    'Bash': 'run_command',
    'Read': 'view_file',
    'Write': 'write_to_file',
    'Edit': 'replace_file_content',
    'Grep': 'grep_search',
    'Glob': 'list_dir',
    'WebSearch': 'search_web'
  };

  for (const [oldTool, newTool] of Object.entries(toolMap)) {
    const regex = new RegExp(\`\\\\b\${oldTool}\\\\b\`, 'g');
    cleanBody = cleanBody.replace(regex, newTool);
  }

  return \`\${cleanFrontmatter}\\n\${cleanBody.trim()}\\n\`;
}

module.exports = { translateSkill };
```

- [ ] **Step 4: Run test to verify it passes**
Run: `node tests/port-skills.test.js`
Expected: PASS with output "PASS: translateSkill works correctly!"

- [ ] **Step 5: Commit (Requesting user approval first)**
Wait for explicit confirmation from user, then run:
```bash
git add tests/port-skills.test.js docs/skills/port-skills.js
git commit -m "feat: implement gstack skill translation logic"
```

---

### Task 2: Build the Bulk Porting Loop and Execute Porting

**Files:**
- Modify: `docs/skills/port-skills.js` (add dir iteration and file writing)

**Interfaces:**
- Consumes: `/tmp/gstack/`
- Produces: Translated skill files in `~/.gemini/config/skills/` and `docs/skills/`

- [ ] **Step 1: Write test for bulk porting**
Add tests to `tests/port-skills.test.js` verifying the script correctly traverses directories and outputs the files.

Append to `tests/port-skills.test.js`:
```javascript
// Test 2: Check bulk porting loop interface exists
const scriptPath = path.resolve(__dirname, '../docs/skills/port-skills.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
assert.ok(scriptContent.includes('function runBulkPorting'), 'Should contain runBulkPorting function');
```

- [ ] **Step 2: Run test to verify it fails**
Run: `node tests/port-skills.test.js`
Expected: FAIL with "AssertionError [ERR_ASSERTION]: Should contain runBulkPorting function"

- [ ] **Step 3: Implement runBulkPorting in script**
Modify `docs/skills/port-skills.js` to add the bulk directories traversal and file writing.

Update `docs/skills/port-skills.js` to look like this:
```javascript
const fs = require('fs');
const path = require('path');

function translateSkill(content) {
  let frontmatter = '';
  let body = content;
  const match = content.match(/^---([\\s\\S]*?)---/);
  if (match) {
    frontmatter = match[1];
    body = content.slice(match[0].length);
  }

  const nameMatch = frontmatter.match(/name:\\s*([^\\n\\r]+)/);
  const descMatch = frontmatter.match(/description:\\s*([\\s\\S]*?)(?=(?:\\n\\w+:)|$)/);

  const name = nameMatch ? nameMatch[1].trim() : '';
  let description = descMatch ? descMatch[1].trim() : '';

  if (description.startsWith('|')) {
    description = description.slice(1).trim();
  }
  description = description.replace(/^["']|["']$/g, '').trim();

  if (!description.toLowerCase().startsWith('use when')) {
    description = 'Use when ' + description.charAt(0).toLowerCase() + description.slice(1);
  }
  description = description.replace(/\\s*\\(\\s*gstack\\s*\\)\\s*$/gi, '').trim();

  const cleanFrontmatter = \`---
name: \${name}
description: \${description}
---\`;

  let cleanBody = body;
  cleanBody = cleanBody.replace(/## Preamble \\(run first\\)[\\s\\S]*?```bash[\\s\\S]*?```/gi, '');
  cleanBody = cleanBody.replace(/## Telemetry \\(run last\\)[\\s\\S]*?```bash[\\s\\S]*?```/gi, '');
  cleanBody = cleanBody.replace(/## Telemetry \\(run last\\)[\\s\\S]*?(?=(?:## )|$)/gi, '');

  const toolMap = {
    'AskUserQuestion': 'ask_question',
    'Bash': 'run_command',
    'Read': 'view_file',
    'Write': 'write_to_file',
    'Edit': 'replace_file_content',
    'Grep': 'grep_search',
    'Glob': 'list_dir',
    'WebSearch': 'search_web'
  };

  for (const [oldTool, newTool] of Object.entries(toolMap)) {
    const regex = new RegExp(\`\\\\b\${oldTool}\\\\b\`, 'g');
    cleanBody = cleanBody.replace(regex, newTool);
  }

  return \`\${cleanFrontmatter}\\n\${cleanBody.trim()}\\n\`;
}

function runBulkPorting(srcRoot, globalDest, localDest) {
  if (!fs.existsSync(srcRoot)) {
    console.error(\`Source directory does not exist: \${srcRoot}\`);
    return;
  }

  const items = fs.readdirSync(srcRoot);
  let count = 0;

  for (const item of items) {
    const itemPath = path.join(srcRoot, item);
    if (!fs.statSync(itemPath).isDirectory()) continue;

    const skillFile = path.join(itemPath, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    const rawContent = fs.readFileSync(skillFile, 'utf-8');
    const translated = translateSkill(rawContent);

    // Get clean name from YAML or dir name
    const nameMatch = translated.match(/name:\\s*([^\\n\\r]+)/);
    const skillName = nameMatch ? nameMatch[1].trim() : item;

    // Paths
    const globalSkillDir = path.join(globalDest, skillName);
    const localSkillDir = path.join(localDest, skillName);

    // Write to global target
    fs.mkdirSync(globalSkillDir, { recursive: true });
    fs.writeFileSync(path.join(globalSkillDir, 'SKILL.md'), translated);

    // Write to local target
    fs.mkdirSync(localSkillDir, { recursive: true });
    fs.writeFileSync(path.join(localSkillDir, 'SKILL.md'), translated);

    console.log(\`Ported skill: \${skillName}\`);
    count++;
  }

  // Also handle the top-level SKILL.md router if any
  const rootSkillFile = path.join(srcRoot, 'SKILL.md');
  if (fs.existsSync(rootSkillFile)) {
    const rawContent = fs.readFileSync(rootSkillFile, 'utf-8');
    const translated = translateSkill(rawContent);
    fs.writeFileSync(path.join(globalDest, 'SKILL-router.md'), translated);
    fs.writeFileSync(path.join(localDest, 'SKILL-router.md'), translated);
    console.log('Ported top-level SKILL.md router as SKILL-router.md');
  }

  console.log(\`Successfully completed porting of \${count} skills!\`);
}

// If run directly
if (require.main === module) {
  const src = '/tmp/gstack';
  const globalDest = '/Users/noah.wong/.gemini/config/skills';
  const localDest = '/Users/noah.wong/Desktop/code/Budget/docs/skills';
  runBulkPorting(src, globalDest, localDest);
}

module.exports = { translateSkill, runBulkPorting };
```

- [ ] **Step 4: Run test to verify it passes**
Run: `node tests/port-skills.test.js`
Expected: PASS

- [ ] **Step 5: Run the full script to port the skills**
Run: `node docs/skills/port-skills.js`
Expected: Outputs list of ported skills and finishes with "Successfully completed porting of X skills!"

- [ ] **Step 6: Update code-review-graph and Commit changes**
Run: `code-review-graph update --skip-flows` to update codebase graph stats.
Ask user for permission, then run:
```bash
git add docs/skills/port-skills.js
git commit -m "feat: complete bulk porting of gstack skills to Antigravity"
```
