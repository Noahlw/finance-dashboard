# Form Simplification and Receipt Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify budget request and expense claim forms to one line per submission, allow deduplicated receipt uploads across multiple claims safely (per ADR 0001), enforce strict VERIFY invariants for receipts, and surface receipt links on the Approvals dashboard.

**Architecture:** We will modify `FormSetup.js` and `IntakeForms.js` to only generate and process a single line per form submission. The deduplication logic in `IntakeForms.js` will be relaxed to return existing `receiptId`s for duplicate photos IF uploaded by the same user. We will add a hyperlink formula to the `Receipts` sheet, and surface it on the `Approvals` dashboard. Finally, `Engine.js` will enforce receipt constraints during the `VERIFY` transition.

**Tech Stack:** Google Apps Script

## Global Constraints

- Must maintain existing `Constants.js` pattern (1-indexed column layouts)
- Forms will be generated programmatically (except the manual file upload).
- No arbitrary loops or duplicate code blocks where a single variable lookup suffices.

---

### Task 1: Update Constants.js for Receipts Column and Approvals Column

**Files:**
- Modify: `Constants.js:65-68`
- Modify: `Constants.js:81-84`

**Interfaces:**
- Consumes: None
- Produces: `COLS.Receipts.file_link` instead of `ocr_json`, and `COLS.Approvals.receipt_link`

- [ ] **Step 1: Replace `ocr_json` with `file_link` in `Constants.js`**

Modify `Constants.js` `COLS.Receipts` definition to use `file_link: 9` instead of `ocr_json: 9`:

```javascript
  Receipts: Object.freeze({
    receipt_id: 1, drive_file_id: 2, sha256: 3, uploaded_by: 4,
    uploaded_at: 5, vendor: 6, receipt_date: 7, receipt_total: 8, file_link: 9
  }),
```

- [ ] **Step 2: Add `receipt_link: 12` to `COLS.Approvals`**

Modify `Constants.js` `COLS.Approvals`:

```javascript
  Approvals: Object.freeze({
    entity_id: 1, entity_type: 2, title: 3, requester_or_claimant: 4,
    amount: 5, status: 6, action: 7, amount_override: 8, note: 9,
    confirm: 10, intent_actor_email: 11, receipt_link: 12
  }),
```

- [ ] **Step 3: Commit**

```bash
git add Constants.js
git commit -m "refactor: rename ocr_json to file_link and add receipt_link to Approvals"
```

---

### Task 2: Simplify FormSetup.js

**Files:**
- Modify: `FormSetup.js:73-84` (Request form)
- Modify: `FormSetup.js:101-114` (Claim form)

**Interfaces:**
- Consumes: None
- Produces: Forms with only Line 1.

- [ ] **Step 1: Remove Lines 2 and 3 from `_buildRequestForm`**

Modify `FormSetup.js` `_buildRequestForm` to remove calls for Line 2 and 3:

```javascript
  _buildRequestForm: function () {
    var form = FormApp.create('CF Budget Request');
    form.setDescription('Submit a budget request for an upcoming event or expense. The treasurer will review and approve it. You will be notified in Discord when approved.');
    form.setCollectEmail(true);
    try { form.setRequireLogin(true); } catch (e) { /* ponytail: ignore if not on Workspace */ }
    form.addTextItem().setTitle('Title').setHelpText('e.g., Summer Camp Supplies').setRequired(true);
    form.addParagraphTextItem().setTitle('Justification').setHelpText('Why is this budget needed? Provide enough detail for the treasurer to approve.').setRequired(true);
    form.addDateItem().setTitle('Needed by').setHelpText('When do you need to spend this money?').setRequired(true);
    FormSetup._addRequestLineQuestions(form, 1, true);
    return form;
  },
```

- [ ] **Step 2: Remove Lines 2 and 3 from `_buildClaimForm`**

Modify `FormSetup.js` `_buildClaimForm` similarly:

```javascript
  _buildClaimForm: function () {
    var form = FormApp.create('CF Expense Claim');
    form.setDescription('Submit a claim for reimbursement. Ensure you upload a clear photo of the receipt matching the exact amount claimed.');
    form.setCollectEmail(true);
    try { form.setRequireLogin(true); } catch (e) { /* ponytail: ignore if not on Workspace */ }
    form.addTextItem().setTitle('What is this claim for? (short description)').setHelpText('e.g., Drinks for Summer Camp').setRequired(true);
    form.addTextItem().setTitle('Receipt vendor').setHelpText('Name of the store or vendor').setRequired(false);
    form.addDateItem().setTitle('Receipt date').setHelpText('The date printed on the receipt').setRequired(true);
    form.addTextItem().setTitle('Receipt total (HKD)').setHelpText('Must match the receipt exactly. Numbers only.').setRequired(true);
    // "Receipt photo" file-upload question: ADD MANUALLY, see CP-C.
    FormSetup._addClaimLineQuestions(form, 1, true);
    return form;
  },
```

- [ ] **Step 3: Commit**

```bash
git add FormSetup.js
git commit -m "feat: simplify intake forms to single line"
```

---

### Task 3: Update IntakeForms.js for Single Line and Receipt Links

**Files:**
- Modify: `IntakeForms.js:38-49` (`onFormSubmitRequest` loop)
- Modify: `IntakeForms.js:102-176` (`onFormSubmitClaim` loop)
- Modify: `IntakeForms.js:300-346` (`IntakeForms_storeReceipt`)

**Interfaces:**
- Consumes: Single line form submissions
- Produces: Correct claim records and linked receipt file URLs

- [ ] **Step 1: Simplify `onFormSubmitRequest` loop**

In `IntakeForms.js`, remove the `for (var n = 1; n <= 3; n++)` loop and just process Line 1. Change lines 38-49 to:

```javascript
  var lineCount = 0;
  var category = answers['Line 1 — Category'];
  var desc = answers['Line 1 — Description'];
  var amount = Number(answers['Line 1 — Amount (HKD)']);
  if (category && desc && amount) {
    lineCount++;
    var lineId = Ids.childId(requestId, lineCount, 'BUDGETLINE');
    getSheet_(TABS.BUDGET_REQUEST_LINES).appendRow([
      lineId, requestId, IntakeForms_categoryIdByName(category), desc, amount, 0, STATUS.BudgetRequestLine.PENDING, 0, 0
    ]);
  }
```

- [ ] **Step 2: Simplify `onFormSubmitClaim` loop**

In `IntakeForms.js`, remove the `for (var n = 1; n <= 3; n++)` loop (lines 102-176) and just process Line 1:

```javascript
  var lineCount = 0;
  var rejectedLines = [];
  var budgetLineChoice = answers['Line 1 — Budget line'];
  var amount = Number(answers['Line 1 — Amount (HKD)']);
  if (budgetLineChoice && amount) {
    var budgetLineId = IntakeForms_parseBudgetLineId(budgetLineChoice);
    var missingReceiptFlag = (answers['Missing receipt?'] === 'Yes');
    
    var check = Engine.validateClaimLineAmount(budgetLineId, amount);
    if (!check.ok) {
      if (check.remaining < 0) check.remaining = 0; // sanity
      var excessAmount = amount - check.remaining;
      
      var topUpRequestId = Ids.nextId('BudgetRequest');
      var topUpLineId = Ids.childId(topUpRequestId, 1, 'BUDGETLINE');
      
      var bLineSheet = getSheet_(TABS.BUDGET_REQUEST_LINES);
      var bLineRows = bLineSheet.getDataRange().getValues();
      var categoryId = '';
      var reqId = '';
      for (var i=1; i<bLineRows.length; i++) {
        if (bLineRows[i][0] === budgetLineId) {
          reqId = bLineRows[i][COLS.BudgetRequestLines.request_id - 1];
          categoryId = bLineRows[i][COLS.BudgetRequestLines.category_id - 1];
          break;
        }
      }
      var bReqSheet = getSheet_(TABS.BUDGET_REQUESTS);
      var bReqRows = bReqSheet.getDataRange().getValues();
      var eventId = '';
      for (var i=1; i<bReqRows.length; i++) {
        if (bReqRows[i][0] === reqId) {
          eventId = bReqRows[i][COLS.BudgetRequests.event_id - 1];
          break;
        }
      }
      
      var topUpTitle = '[OVERBUDGET TOP-UP] for ' + budgetLineId;
      var topUpJustification = 'Auto-generated top-up. User claimed HK$' + amount + ' but remaining was HK$' + check.remaining + '.';
      
      bReqSheet.appendRow([
        topUpRequestId, user.userId, eventId, topUpTitle, topUpJustification, '',
        STATUS.BudgetRequest.PENDING, now, '', '', '', false, ''
      ]);
      bLineSheet.appendRow([
        topUpLineId, topUpRequestId, categoryId, 'Excess cover for claim', excessAmount, 0, STATUS.BudgetRequestLine.PENDING, 0, 0
      ]);
      Audit.append('SYSTEM', 'BudgetRequest', topUpRequestId, 'CREATE', { autoTopUpFor: budgetLineId });
      Discord.postTreasury('**' + topUpRequestId + '** — Auto-generated top-up for ' + budgetLineId + ' (HK$' + excessAmount + ')');

      if (check.remaining > 0) {
        lineCount++;
        var cliId1 = Ids.childId(claimId, lineCount, 'CLAIMLINE');
        getSheet_(TABS.CLAIM_LINE_ITEMS).appendRow([
          cliId1, claimId, budgetLineId, receipt ? receipt.receiptId : '', check.remaining, notes, missingReceiptFlag
        ]);
      }
      
      lineCount++;
      var cliId2 = Ids.childId(claimId, lineCount, 'CLAIMLINE');
      getSheet_(TABS.CLAIM_LINE_ITEMS).appendRow([
        cliId2, claimId, topUpLineId, receipt ? receipt.receiptId : '', excessAmount, notes + ' (Top-Up)', missingReceiptFlag
      ]);
      
      rejectedLines.push(budgetLineId + ' (auto-created top-up ' + topUpRequestId + ' for excess HK$' + excessAmount + ')');
    } else {
      lineCount++;
      var cliId = Ids.childId(claimId, lineCount, 'CLAIMLINE');
      getSheet_(TABS.CLAIM_LINE_ITEMS).appendRow([
        cliId, claimId, budgetLineId, receipt ? receipt.receiptId : '', amount, notes, missingReceiptFlag
      ]);
    }
  }
```

- [ ] **Step 3: Update `IntakeForms_storeReceipt` duplicate check and file_link**

Modify `IntakeForms_storeReceipt` to check `uploaderUserId` and append a HYPERLINK formula to `Receipts`. Note that the final field in `appendRow` is changed to the hyperlink formula.

```javascript
  if (file) {
    var folderId = PropertiesService.getScriptProperties().getProperty('RECEIPTS_FOLDER_ID');
    var folder = DriveApp.getFolderById(folderId);
    var bytes = file.getBlob().getBytes();
    sha256 = IntakeForms_sha256Hex(bytes);
    
    var receiptSheet = getSheet_(TABS.RECEIPTS);
    var receiptData = receiptSheet.getDataRange().getValues();
    var hashCol = COLS.Receipts.sha256 - 1;
    var vendorCol = COLS.Receipts.vendor - 1;
    var dateCol = COLS.Receipts.date - 1;
    var totalCol = COLS.Receipts.total_amount - 1;
    var idCol = COLS.Receipts.receipt_id - 1;
    var uploaderCol = COLS.Receipts.uploaded_by - 1;
    for (var i = 1; i < receiptData.length; i++) {
      if (receiptData[i][hashCol] === sha256) {
        if (receiptData[i][uploaderCol] === uploaderUserId) {
          return { receiptId: receiptData[i][idCol] };
        } else {
          throw new Error('Duplicate receipt detected. This exact file was already uploaded by a different user.');
        }
      }
      if (vendor && receiptDate && receiptTotal > 0 && receiptData[i][vendorCol] === vendor && receiptData[i][dateCol] === receiptDate && Number(receiptData[i][totalCol]) === receiptTotal) {
        Discord.postTreasury('⚠️ Soft Warning: Receipt matches existing receipt **' + receiptData[i][idCol] + '** on Vendor, Date, and Total. Possible duplicate claim.');
      }
    }

    var newName = receiptId + '_' + file.getName();
    file.moveTo(folder);
    file.setName(newName);
    driveFileId = file.getId();
  }

  var fileLink = driveFileId ? '=HYPERLINK("https://drive.google.com/open?id=' + driveFileId + '", "View Receipt")' : '';
  getSheet_(TABS.RECEIPTS).appendRow([receiptId, driveFileId, sha256, uploaderUserId, now, vendor, receiptDate, receiptTotal, fileLink]);
  return { receiptId: receiptId };
```

- [ ] **Step 4: Commit**

```bash
git add IntakeForms.js
git commit -m "feat: handle single line forms and allow safe receipt deduplication splitting"
```

---

### Task 4: Enforce Financial Controls in Engine.js (VERIFY invariant)

**Files:**
- Modify: `Engine.js:142-232` (`_validateClaimVerification`)

**Interfaces:**
- Consumes: Claim Line Items and Receipts
- Produces: Enhanced validation block during ExpenseClaim VERIFY

- [ ] **Step 1: Enforce receipt invariants in `_validateClaimVerification`**

Add logic to group ClaimLineItems by `receipt_id`, check for missing receipt declarations, and enforce that total amount against a receipt does not exceed its total.

Replace the first loop and logic in `_validateClaimVerification` with the following:

```javascript
    var hasMissingReceipt = false;
    var totalMissingAmount = 0;
    
    // Group all claim lines for this claim by receipt_id for the first check
    var claimReceiptMap = {}; // receipt_id -> sum of amounts from this claim
    var allReceiptMap = {}; // receipt_id -> sum of amounts from ALL claims (to be populated later)
    var receiptIdsToCheck = [];

    for (var i = 0; i < cliRows.length; i++) {
      var bLineId = cliRows[i].values[c.budget_line_id - 1];
      var amount = Number(cliRows[i].values[c.amount - 1]) || 0;
      var isMissing = cliRows[i].values[c.missing_receipt_flag - 1] === true;
      var rId = cliRows[i].values[c.receipt_id - 1];
      
      var bLineRow = Engine._loadRow('BudgetRequestLine', bLineId);
      if (bLineRow) {
         var remaining = Number(bLineRow.values[COLS.BudgetRequestLines.remaining - 1]);
         if (remaining < 0) {
           return { ok: false, reason: 'Budget line ' + bLineId + ' over-claimed. Wait for top-up to be approved.' };
         }
      }
      
      if (!rId && !isMissing) {
        return { ok: false, reason: 'Claim line ' + cliRows[i].values[c.claim_line_id - 1] + ' has no receipt_id and is not marked as missing receipt.' };
      }

      if (isMissing) {
        hasMissingReceipt = true;
        totalMissingAmount += amount;
      } else if (rId) {
        if (!claimReceiptMap[rId]) {
          claimReceiptMap[rId] = 0;
          receiptIdsToCheck.push(rId);
        }
        claimReceiptMap[rId] += amount;
      }
    }

    // Now check if total claims against a receipt exceed its printed total
    if (receiptIdsToCheck.length > 0) {
      var allCliData = cliSheet.getDataRange().getValues();
      var claimSheet = getSheet_(TABS.EXPENSE_CLAIMS);
      var claimData = claimSheet.getDataRange().getValues();
      var claimStatusMap = {};
      for (var j = 1; j < claimData.length; j++) {
        claimStatusMap[claimData[j][0]] = claimData[j][COLS.ExpenseClaims.status - 1];
      }

      for (var k = 1; k < allCliData.length; k++) {
        var cliClaimId = allCliData[k][c.claim_id - 1];
        var cliReceiptId = allCliData[k][c.receipt_id - 1];
        if (receiptIdsToCheck.indexOf(cliReceiptId) !== -1) {
          // Ignore REJECTED claims in sum
          if (claimStatusMap[cliClaimId] !== STATUS.ExpenseClaim.REJECTED) {
             if (!allReceiptMap[cliReceiptId]) allReceiptMap[cliReceiptId] = 0;
             allReceiptMap[cliReceiptId] += (Number(allCliData[k][c.amount - 1]) || 0);
          }
        }
      }

      for (var r = 0; r < receiptIdsToCheck.length; r++) {
        var checkReceiptId = receiptIdsToCheck[r];
        var receiptRow = Engine._loadRow('Receipt', checkReceiptId);
        if (receiptRow) {
          var printedTotal = Number(receiptRow.values[COLS.Receipts.receipt_total - 1]) || 0;
          var totalClaimedAgainstIt = allReceiptMap[checkReceiptId] || 0;
          if (totalClaimedAgainstIt > printedTotal) {
            return { ok: false, reason: 'Total claimed amount (' + totalClaimedAgainstIt + ') across all claims for receipt ' + checkReceiptId + ' exceeds printed receipt total (' + printedTotal + ').' };
          }
        } else {
          return { ok: false, reason: 'Receipt ' + checkReceiptId + ' not found in Receipts tab.' };
        }
      }
    }
```

- [ ] **Step 2: Commit**

```bash
git add Engine.js
git commit -m "feat: enforce VERIFY invariants for receipt uploads and totals"
```

---

### Task 5: Surface Receipt Link on Approvals Dashboard

**Files:**
- Modify: `Approvals.js:46-52` (`Approvals_pendingRequestRows`)
- Modify: `Approvals.js:68-75` (`Approvals_claimRows`)
- Modify: `Approvals.js:90-95` (`Approvals_queuedPayoutRows`)

**Interfaces:**
- Consumes: `Constants.js` (`COLS.Approvals.receipt_link`) and `Receipt` data.
- Produces: Approvals tab output with the hyperlink in the 12th column.

- [ ] **Step 1: Update `Approvals_pendingRequestRows`**

Update the returned array to include an empty 12th column:

```javascript
    out.push([
      requestId, 'BudgetRequest', values[i][c.title - 1], values[i][c.requester_id - 1],
      amount, STATUS.BudgetRequest.PENDING, '', '', '', false, '', ''
    ]);
```

- [ ] **Step 2: Update `Approvals_claimRows` to fetch receipt link**

Update `Approvals.js` to look up the receipt hyperlink for the claim:

```javascript
  for (var i = 1; i < values.length; i++) {
    var status = values[i][c.status - 1];
    if (status !== STATUS.ExpenseClaim.SUBMITTED && status !== STATUS.ExpenseClaim.VERIFIED) continue;
    var claimId = values[i][c.claim_id - 1];
    var amount = Engine._sumClaimLineItems(claimId);
    
    // Find receipt link
    var receiptLink = '';
    var claimLines = Engine._findRowsByColumn(getSheet_(TABS.CLAIM_LINE_ITEMS), COLS.ClaimLineItems.claim_id, claimId);
    if (claimLines.length > 0) {
       var receiptId = claimLines[0].values[COLS.ClaimLineItems.receipt_id - 1];
       if (receiptId) {
         var receiptRow = Engine._loadRow('Receipt', receiptId);
         if (receiptRow) receiptLink = receiptRow.values[COLS.Receipts.file_link - 1];
       }
    }

    out.push([
      claimId, 'ExpenseClaim', values[i][c.notes - 1] || claimId, values[i][c.claimant_id - 1],
      amount, status, '', '', '', false, '', receiptLink
    ]);
  }
```

- [ ] **Step 3: Update `Approvals_queuedPayoutRows`**

Update the returned array to include an empty 12th column:

```javascript
    out.push([
      payoutId, 'Payout', 'Payout for ' + values[i][c.claim_id - 1], values[i][c.payee_user_id - 1],
      values[i][c.amount - 1], STATUS.Payout.QUEUED, '', '', '', false, '', ''
    ]);
```

- [ ] **Step 4: Commit**

```bash
git add Approvals.js
git commit -m "feat: surface receipt hyperlink on Approvals dashboard"
```
