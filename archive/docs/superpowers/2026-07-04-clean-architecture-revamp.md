# Clean Architecture Revamp Implementation Plan

> **Superseded by [ADR 0003](/docs/adr/0003-extract-and-strangle-over-big-bang-clean-architecture.md).**
> Do not resume this plan. `CoreEngine.js`, `CoreValidations.js`, and `GasSheetRepository.js` (Tasks
> 5-6 below) were deleted; extraction now happens function-by-function from `Engine.gs` into
> `src/gas/CoreDecisions.js` instead. Kept here as historical record.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor CF-Budget Apps Script into a Clean Architecture to enable local TDD.

**Architecture:** Pure JS logic (`src/core/`) separated from Google Apps Script side-effects (`src/gas/`), allowing Jest testing without mocks. Commands are returned as explicit objects.

**Tech Stack:** JavaScript (ES5/ES6 hybrid for GAS), Node.js, Jest.

## Global Constraints
- We remain on the $0-budget constraint, relying entirely on Google Apps Script and Google Sheets.
- The system logic remains largely unchanged from the original `FINANCE-SYSTEM-DESIGN.md`.
- `clasp` will be used to deploy local `.js` files to `.gs` files on Apps Script.
- Each JS file must use the `typeof module !== 'undefined'` hack to export for Jest without breaking GAS.

---

### Task 1: Setup Node and Jest

**Files:**
- Create: `package.json`

**Interfaces:**
- Consumes: None
- Produces: `npm test` command

- [ ] **Step 1: Initialize npm and install jest**
```bash
npm init -y
npm install --save-dev jest
```

- [ ] **Step 2: Configure package.json**
```bash
node -e "const fs = require('fs'); const p = JSON.parse(fs.readFileSync('package.json')); p.scripts.test = 'jest'; fs.writeFileSync('package.json', JSON.stringify(p, null, 2));"
```

- [ ] **Step 3: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore: setup jest for local tdd"
```

### Task 2: Core Constants

**Files:**
- Create: `src/core/Constants.js`

**Interfaces:**
- Consumes: None
- Produces: `TABS`, `COLS`, `STATUS`, `ROLES`, `ENTITY_PREFIX`, `ACTIONS` (global constants)

- [ ] **Step 1: Write the implementation**
Copy the exact contents from the original `Constants.gs` (or a simplified version for now) into `src/core/Constants.js`.
```javascript
// ... standard constants ...
if (typeof module !== 'undefined') {
  module.exports = { TABS, COLS, ROLES, STATUS, ENTITY_PREFIX, ACTIONS };
}
```

- [ ] **Step 2: Commit**
```bash
git add src/core/Constants.js
git commit -m "feat: migrate constants to core"
```

### Task 3: Core Audit (Hashing)

**Files:**
- Create: `src/core/CoreAudit.js`
- Test: `tests/CoreAudit.test.js`

**Interfaces:**
- Consumes: `crypto` (for local Node hashing)
- Produces: `CoreAudit.calculateHash(prevHash, rowDataStr)`

- [ ] **Step 1: Write failing test**
```javascript
const { CoreAudit } = require('../src/core/CoreAudit');
test('calculates correct sha256 hash', () => {
  const hash = CoreAudit.calculateHash('prev123', 'somedata');
  expect(hash).toBeDefined();
  expect(hash.length).toBe(64); // hex sha256
});
```

- [ ] **Step 2: Run test**
Run: `npm test tests/CoreAudit.test.js`
Expected: FAIL

- [ ] **Step 3: Write implementation**
```javascript
var CoreAudit = {
  calculateHash: function(prevHash, rowDataStr) {
    var raw = prevHash + '|' + rowDataStr;
    if (typeof Utilities !== 'undefined') {
      // GAS environment
      var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
      return signature.map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0'); }).join('');
    } else {
      // Node environment
      return require('crypto').createHash('sha256').update(raw).digest('hex');
    }
  }
};
if (typeof module !== 'undefined') { module.exports = { CoreAudit }; }
```

- [ ] **Step 4: Run test**
Run: `npm test tests/CoreAudit.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add tests/CoreAudit.test.js src/core/CoreAudit.js
git commit -m "feat: core audit hashing logic"
```

### Task 4: Core Validations

**Files:**
- Create: `src/core/CoreValidations.js`
- Test: `tests/CoreValidations.test.js`

**Interfaces:**
- Consumes: None
- Produces: `CoreValidations.canApprove(request, role)`

- [ ] **Step 1: Write failing test**
```javascript
const { CoreValidations } = require('../src/core/CoreValidations');
test('canApprove requires TREASURER role', () => {
  expect(CoreValidations.canApprove({ status: 'PENDING' }, 'MEMBER')).toBe(false);
  expect(CoreValidations.canApprove({ status: 'PENDING' }, 'TREASURER')).toBe(true);
});
```

- [ ] **Step 2: Run test**
Run: `npm test tests/CoreValidations.test.js`
Expected: FAIL

- [ ] **Step 3: Write implementation**
```javascript
var CoreValidations = {
  canApprove: function(request, actorRole) {
    return request.status === 'PENDING' && actorRole === 'TREASURER';
  }
};
if (typeof module !== 'undefined') { module.exports = { CoreValidations }; }
```

- [ ] **Step 4: Run test**
Run: `npm test tests/CoreValidations.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add tests/CoreValidations.test.js src/core/CoreValidations.js
git commit -m "feat: core validations"
```

### Task 5: Core Engine

**Files:**
- Create: `src/core/CoreEngine.js`
- Test: `tests/CoreEngine.test.js`

**Interfaces:**
- Consumes: `CoreValidations`, `CoreAudit`, `Constants`
- Produces: `CoreEngine.transition(entityType, id, action, payload, currentState, actorRole, prevHash)` -> `{ success, commands, error }`

- [ ] **Step 1: Write failing test**
```javascript
const { CoreEngine } = require('../src/core/CoreEngine');
test('transitions BudgetRequest to APPROVED and emits commands', () => {
  const result = CoreEngine.transition('BudgetRequest', 'BR-001', 'APPROVE', {}, { status: 'PENDING' }, 'TREASURER', 'hash123');
  expect(result.success).toBe(true);
  expect(result.commands.length).toBe(2);
  expect(result.commands[0]).toEqual({ action: 'UPDATE', id: 'BR-001', field: 'status', value: 'APPROVED' });
  expect(result.commands[1].action).toBe('APPEND_AUDIT');
});
```

- [ ] **Step 2: Run test**
Run: `npm test tests/CoreEngine.test.js`
Expected: FAIL

- [ ] **Step 3: Write implementation**
```javascript
var CoreEngine = {
  transition: function(entityType, id, action, payload, currentState, actorRole, prevHash) {
    if (entityType === 'BudgetRequest' && action === 'APPROVE') {
      if (actorRole !== 'TREASURER' || currentState.status !== 'PENDING') return { success: false, error: 'Invalid' };
      
      var newHash = 'dummyhash'; // CoreAudit.calculateHash(prevHash, '...'); // simplified for plan
      return {
        success: true,
        commands: [
          { action: 'UPDATE', id: id, field: 'status', value: 'APPROVED' },
          { action: 'APPEND_AUDIT', row_hash: newHash, detail: 'APPROVED' }
        ]
      };
    }
    return { success: false, error: 'Unknown route' };
  }
};
if (typeof module !== 'undefined') { module.exports = { CoreEngine }; }
```

- [ ] **Step 4: Run test**
Run: `npm test tests/CoreEngine.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add tests/CoreEngine.test.js src/core/CoreEngine.js
git commit -m "feat: core engine transitions"
```

### Task 6: Gas Sheet Repository

**Files:**
- Create: `src/gas/GasSheetRepository.js`

**Interfaces:**
- Consumes: `SpreadsheetApp`
- Produces: `GasSheetRepository.getBudgetRequest(id)`, `GasSheetRepository.executeCommands(commands)`

- [ ] **Step 1: Write implementation**
*(Note: No Jest tests for this file since it requires GAS)*
```javascript
var GasSheetRepository = {
  executeCommands: function(commands) {
    for (var i = 0; i < commands.length; i++) {
      var cmd = commands[i];
      if (cmd.action === 'UPDATE') {
        // e.g. sheet.getRange(...).setValue(cmd.value);
      }
    }
  }
};
```

- [ ] **Step 2: Commit**
```bash
git add src/gas/GasSheetRepository.js
git commit -m "feat: gas sheet repository"
```
