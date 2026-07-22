/**
 * Engine.gs — the Engine (see CONTEXT.md): the sole mutator of status on
 * BudgetRequest and ExpenseClaim. Nothing else may write a status column,
 * a *_by/*_at stamp, an approved_amount, or a self_approved flag.
 *
 * Payout status is handled separately in Payouts.gs (simpler lifecycle,
 * see BUILD-PLAN.md P1-9), but also goes through Audit.append so every
 * mutation everywhere is logged.
 */

/**
 * The declarative transition table (which (entityType, from, action) tuples
 * are legal, who may perform them, and what they require) lives in
 * CoreDecisions.TRANSITIONS so it can be exercised under Jest without a
 * GAS runtime. See CoreDecisions.js for the table and its documentation.
 * This table is exhaustive for FINANCE-SYSTEM-DESIGN.md §1.5 — no
 * transition exists outside it, so any (from, action) pair not listed
 * there is automatically illegal (see the five illegal cases in
 * BUILD-PLAN.md §4.1, cases 1 and 4 are denied purely by table lookup).
 */

var Engine = {
  /**
   * Perform (or deny) a status transition. Never throws to the caller —
   * illegal transitions return {ok:false, reason} and are logged.
   * @param {string} entityType 'BudgetRequest' | 'ExpenseClaim'
   * @param {string} entityId
   * @param {string} action e.g. 'APPROVE', 'REDUCE', 'REJECT', 'REQUEST_INFO', 'VERIFY', 'APPROVE_PAYOUT', 'SUBMIT', 'WITHDRAW', 'RESUBMIT', 'CLOSE'
   * @param {string} actorUserId a Users.user_id
   * @param {Object} payload optional: {decision_note, amount_override}
   * @return {{ok: boolean, reason: ?string, from: ?string, to: ?string, selfApproved: ?boolean}}
   */
  transition: function (entityType, entityId, action, actorUserId, payload) {
    payload = payload || {};
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
    } catch (e) {
      Discord.postTreasury('🚨 CRITICAL: Script lock timeout in Engine.transition');
      throw e;
    }
    try {
      var actor = actorUserId === 'SYSTEM' ? { role: ROLES.TREASURER, displayName: 'System' } : Engine._loadActor(actorUserId);
      if (!actor) return Engine._deny(entityType, entityId, action, actorUserId, 'ACTOR_NOT_FOUND', null);

      var row = Engine._loadRow(entityType, entityId);
      if (!row) return Engine._deny(entityType, entityId, action, actorUserId, 'ENTITY_NOT_FOUND', null);

      var cols = COLS[entityType + 's'];
      var currentStatus = row.values[cols.status - 1];
      var def = Engine._findTransition(entityType, currentStatus, action);
      if (!def) return Engine._deny(entityType, entityId, action, actorUserId, 'ILLEGAL_TRANSITION', currentStatus);

      var ownerId = Engine._ownerId(entityType, row.values);
      var isSelf = (actorUserId === ownerId);

      var authCheck = CoreDecisions.authorize(def, isSelf, actor.role, payload);
      if (!authCheck.ok) {
        return Engine._deny(entityType, entityId, action, actorUserId, authCheck.reason, currentStatus);
      }

      var selfApproved = CoreDecisions.isSelfApproval(isSelf, action);

      if (entityType === 'ExpenseClaim' && action === 'VERIFY') {
        var verifyCheck = Engine._validateClaimVerification(entityId, actorUserId, payload);
        if (!verifyCheck.ok) {
           return Engine._deny(entityType, entityId, action, actorUserId, verifyCheck.reason, currentStatus);
        }
      }

      var effectDetail = {};
      var nextStatus = (entityType === 'BudgetRequest')
        ? Engine._applyBudgetRequestEffect(entityId, row, action, def, actorUserId, payload, selfApproved)
        : Engine._applyExpenseClaimEffect(entityId, row, action, def, actorUserId, payload, selfApproved, effectDetail);

      var auditDetail = {
        action: action, from: currentStatus, to: nextStatus, payload: payload, selfApproved: selfApproved
      };
      if (effectDetail.lockedHash) auditDetail.lockedHash = effectDetail.lockedHash;
      Audit.append(actorUserId, entityType, entityId, 'TRANSITION', auditDetail);

      Engine._notify(entityType, entityId, action, currentStatus, nextStatus, actorUserId, selfApproved);

      return { ok: true, reason: null, from: currentStatus, to: nextStatus, selfApproved: selfApproved };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Record new income with optional proposed account. PENDING until confirmed
   * by a Treasurer. Any committee member can record income.
   */
  recordIncome: function (date, categoryId, amount, sourceRef, eventId, notes, actorUserId, accountId, uuid) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
    } catch (e) {
      Discord.postTreasury('🚨 CRITICAL: Script lock timeout in Engine.recordIncome');
      throw e;
    }
    try {
      if (uuid && Engine._alreadyProcessedIncome(uuid)) {
        return { ok: true, incomeId: Engine._findIncomeByUuid(uuid) };
      }
      var incomeId = Ids.nextId('Income');
      var sheet = getSheet_(TABS.INCOME);
      var c = COLS.Income;
      var row = [];
      row[c.income_id - 1] = incomeId;
      row[c.date - 1] = date;
      row[c.category_id - 1] = categoryId;
      row[c.amount - 1] = amount;
      row[c.received_by - 1] = actorUserId;
      row[c.source_ref - 1] = sourceRef || '';
      row[c.event_id - 1] = eventId || '';
      row[c.notes - 1] = notes || '';
      row[c.account_id - 1] = accountId || '';
      row[c.status - 1] = STATUS.Income.PENDING;
      row[c.processed_response_id - 1] = uuid || '';

      _appendRow(sheet, row);
      Audit.append(actorUserId, 'Income', incomeId, 'CREATE', { amount: amount, sourceRef: sourceRef, accountId: accountId || null });
      return { ok: true, incomeId: incomeId };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Confirm pending income — posts to the given account's current_balance
   * and pending_income, and marks the income row CONFIRMED. Idempotent.
   * Only a Treasurer may confirm.
   * @return {{ok: boolean, reason: ?string, accountId: ?string}}
   */
  confirmIncome: function (incomeId, accountId, actorUserId) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
    } catch (e) { throw e; }
    try {
      var actor = Engine._loadActor(actorUserId);
      if (!actor || actor.role !== ROLES.TREASURER) {
        return { ok: false, reason: 'Only a Treasurer can confirm income.', accountId: null };
      }

      var row = Engine._loadRow('Income', incomeId);
      if (!row) return { ok: false, reason: 'Income not found.', accountId: null };

      var c = COLS.Income;
      var currentStatus = row.values[c.status - 1];
      if (currentStatus === STATUS.Income.CONFIRMED) {
        return { ok: true, reason: null, accountId: row.values[c.account_id - 1] || accountId };
      }
      if (currentStatus !== STATUS.Income.PENDING && currentStatus !== STATUS.Income.NEEDS_INFO) {
        return { ok: false, reason: 'Income is ' + currentStatus + ', not PENDING.', accountId: null };
      }

      if (!accountId) {
        accountId = row.values[c.account_id - 1];
        if (!accountId) return { ok: false, reason: 'No account_id specified and income has no proposed account.', accountId: null };
      }

      var acctRow = Engine._loadRow('FinanceAccount', accountId);
      if (!acctRow) return { ok: false, reason: 'Account not found.', accountId: null };
      if (acctRow.values[COLS.FinanceAccounts.status - 1] !== STATUS.FinanceAccount.ACTIVE) {
        return { ok: false, reason: 'Account is not active.', accountId: null };
      }

      var amount = Number(row.values[c.amount - 1]) || 0;
      var now = Audit._nowIso();
      var sheet = row.sheet;

      sheet.getRange(row.rowIndex, c.account_id).setValue(accountId);
      sheet.getRange(row.rowIndex, c.status).setValue(STATUS.Income.CONFIRMED);
      sheet.getRange(row.rowIndex, c.decided_by).setValue(actorUserId);
      sheet.getRange(row.rowIndex, c.decided_at).setValue(now);

      Engine._postToAccountBalance(accountId, amount, 'income');

      Audit.append(actorUserId, 'Income', incomeId, 'CONFIRM', { accountId: accountId, amount: amount });
      Discord.postTreasury('**' + incomeId + '** — confirmed HK$' + Number(amount).toFixed(2) + ' → ' + accountId + ' (by ' + actorUserId + ').');
      return { ok: true, reason: null, accountId: accountId };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Reject pending income. Note is required.
   */
  rejectIncome: function (incomeId, actorUserId, reason) {
    var row = Engine._loadRow('Income', incomeId);
    if (!row) return { ok: false, reason: 'Income not found.' };
    var c = COLS.Income;
    var currentStatus = row.values[c.status - 1];
    if (currentStatus !== STATUS.Income.PENDING && currentStatus !== STATUS.Income.NEEDS_INFO) {
      return { ok: false, reason: 'Income is ' + currentStatus + ', cannot reject.' };
    }
    var now = Audit._nowIso();
    row.sheet.getRange(row.rowIndex, c.status).setValue(STATUS.Income.REJECTED);
    row.sheet.getRange(row.rowIndex, c.decided_by).setValue(actorUserId);
    row.sheet.getRange(row.rowIndex, c.decided_at).setValue(now);
    row.sheet.getRange(row.rowIndex, c.decision_note).setValue(reason || '');
    Audit.append(actorUserId, 'Income', incomeId, 'REJECT', { reason: reason });
    Discord.postTreasury('**' + incomeId + '** — rejected by ' + actorUserId + ': ' + (reason || ''));
    return { ok: true };
  },

  /**
   * Request info on pending income.
   */
  requestIncomeInfo: function (incomeId, actorUserId, reason) {
    var row = Engine._loadRow('Income', incomeId);
    if (!row) return { ok: false, reason: 'Income not found.' };
    var c = COLS.Income;
    var currentStatus = row.values[c.status - 1];
    if (currentStatus !== STATUS.Income.PENDING) {
      return { ok: false, reason: 'Income is ' + currentStatus + ', cannot request info.' };
    }
    var now = Audit._nowIso();
    row.sheet.getRange(row.rowIndex, c.status).setValue(STATUS.Income.NEEDS_INFO);
    row.sheet.getRange(row.rowIndex, c.decided_by).setValue(actorUserId);
    row.sheet.getRange(row.rowIndex, c.decided_at).setValue(now);
    row.sheet.getRange(row.rowIndex, c.decision_note).setValue(reason || '');
    Audit.append(actorUserId, 'Income', incomeId, 'REQUEST_INFO', { reason: reason });
    return { ok: true };
  },

  /**
   * Post a monetary change to an account's balance columns and return the new balance.
   * direction: 'income' (adds to current_balance), 'payout' (subtracts from current_balance),
   *            'adjustment_credit' (adds), 'adjustment_debit' (subtracts)
   * @private
   */
  _postToAccountBalance: function (accountId, amount, direction) {
    var acctRow = Engine._loadRow('FinanceAccount', accountId);
    if (!acctRow) return;
    var ac = COLS.FinanceAccounts;
    var sheet = acctRow.sheet;
    var currentBalance = Number(acctRow.values[ac.current_balance - 1]) || 0;
    var pendingIncome = Number(acctRow.values[ac.pending_income - 1]) || 0;
    var reservedPayouts = Number(acctRow.values[ac.reserved_payouts - 1]) || 0;

    if (direction === 'income') {
      currentBalance += amount;
      pendingIncome -= amount;
    } else if (direction === 'payout') {
      currentBalance -= amount;
      reservedPayouts -= amount;
    } else if (direction === 'reserve') {
      reservedPayouts += amount;
    } else if (direction === 'adjustment_credit') {
      currentBalance += amount;
    } else if (direction === 'adjustment_debit') {
      currentBalance -= amount;
    } else if (direction === 'pending_income_add') {
      pendingIncome += amount;
    } else if (direction === 'pending_income_sub') {
      pendingIncome -= amount;
    }

    sheet.getRange(acctRow.rowIndex, ac.current_balance).setValue(currentBalance);
    sheet.getRange(acctRow.rowIndex, ac.pending_income).setValue(Math.max(pendingIncome, 0));
    sheet.getRange(acctRow.rowIndex, ac.reserved_payouts).setValue(Math.max(reservedPayouts, 0));
  },

  /**
   * Record an account adjustment (correction). Creates a row in
   * AccountAdjustments and updates the account balance.
   * direction: 'CREDIT' (money in) or 'DEBIT' (money out)
   */
  adjustAccount: function (accountId, amount, direction, reason, actorUserId) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
    } catch (e) { throw e; }
    try {
      var actor = Engine._loadActor(actorUserId);
      if (!actor || actor.role !== ROLES.TREASURER) {
        return { ok: false, reason: 'Only a Treasurer can adjust accounts.' };
      }
      var acctRow = Engine._loadRow('FinanceAccount', accountId);
      if (!acctRow) return { ok: false, reason: 'Account not found.' };
      if (acctRow.values[COLS.FinanceAccounts.status - 1] !== STATUS.FinanceAccount.ACTIVE) {
        return { ok: false, reason: 'Account is not active.' };
      }

      var adjId = Ids.nextId('AccountAdjustment');
      var now = Audit._nowIso();
      var adjDir = direction === 'CREDIT' ? 'adjustment_credit' : 'adjustment_debit';

      _appendRow(getSheet_(TABS.ACCOUNT_ADJUSTMENTS), [
        adjId, accountId, amount, direction, reason, actorUserId, now
      ]);

      Engine._postToAccountBalance(accountId, amount, adjDir);

      Audit.append(actorUserId, 'AccountAdjustment', adjId, 'CREATE', {
        accountId: accountId, amount: amount, direction: direction, reason: reason
      });
      Discord.postTreasury('**' + adjId + '** — ' + direction + ' of HK$' + Number(amount).toFixed(2) + ' on ' + accountId + ' — ' + (reason || '') + ' (by ' + actorUserId + ').');
      return { ok: true, adjustmentId: adjId };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Transfer money between two active accounts.
   */
  transferBetweenAccounts: function (fromAccountId, toAccountId, amount, reason, actorUserId) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
    } catch (e) { throw e; }
    try {
      var actor = Engine._loadActor(actorUserId);
      if (!actor || actor.role !== ROLES.TREASURER) {
        return { ok: false, reason: 'Only a Treasurer can transfer between accounts.' };
      }
      if (fromAccountId === toAccountId) {
        return { ok: false, reason: 'Cannot transfer to the same account.' };
      }

      var fromRow = Engine._loadRow('FinanceAccount', fromAccountId);
      if (!fromRow) return { ok: false, reason: 'Source account not found.' };
      if (fromRow.values[COLS.FinanceAccounts.status - 1] !== STATUS.FinanceAccount.ACTIVE) {
        return { ok: false, reason: 'Source account is not active.' };
      }
      if ((Number(fromRow.values[COLS.FinanceAccounts.current_balance - 1]) || 0) < amount) {
        return { ok: false, reason: 'Insufficient balance in source account.' };
      }

      var toRow = Engine._loadRow('FinanceAccount', toAccountId);
      if (!toRow) return { ok: false, reason: 'Destination account not found.' };
      if (toRow.values[COLS.FinanceAccounts.status - 1] !== STATUS.FinanceAccount.ACTIVE) {
        return { ok: false, reason: 'Destination account is not active.' };
      }

      var xferId = Ids.nextId('AccountTransfer');
      var now = Audit._nowIso();
      _appendRow(getSheet_(TABS.ACCOUNT_TRANSFERS), [
        xferId, fromAccountId, toAccountId, amount, reason, actorUserId, now
      ]);

      Engine._postToAccountBalance(fromAccountId, amount, 'adjustment_debit');
      Engine._postToAccountBalance(toAccountId, amount, 'adjustment_credit');

      Audit.append(actorUserId, 'AccountTransfer', xferId, 'CREATE', {
        from: fromAccountId, to: toAccountId, amount: amount, reason: reason
      });
      Discord.postTreasury('**' + xferId + '** — HK$' + Number(amount).toFixed(2) + ' ' + fromAccountId + ' → ' + toAccountId + ' — ' + (reason || '') + ' (by ' + actorUserId + ').');
      return { ok: true, transferId: xferId };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Compute the effective balance of an account: current_balance + pending_income - reserved_payouts.
   */
  _computeEffectiveBalance: function (accountId) {
    var row = Engine._loadRow('FinanceAccount', accountId);
    if (!row) return 0;
    var ac = COLS.FinanceAccounts;
    var balance = Number(row.values[ac.current_balance - 1]) || 0;
    var pending = Number(row.values[ac.pending_income - 1]) || 0;
    var reserved = Number(row.values[ac.reserved_payouts - 1]) || 0;
    return balance + pending - reserved;
  },

  /**
   * Check if an income uuid was already processed (idempotency).
   * @private
   */
  _alreadyProcessedIncome: function (uuid) {
    var sheet = getSheet_(TABS.INCOME);
    var values = sheet.getDataRange().getValues();
    var c = COLS.Income;
    for (var i = 1; i < values.length; i++) {
      if (values[i][c.processed_response_id - 1] === uuid) return true;
    }
    return false;
  },

  /**
   * Find an income row by its processed_response_id (uuid).
   * @private
   */
  _findIncomeByUuid: function (uuid) {
    var sheet = getSheet_(TABS.INCOME);
    var values = sheet.getDataRange().getValues();
    var c = COLS.Income;
    for (var i = 1; i < values.length; i++) {
      if (values[i][c.processed_response_id - 1] === uuid) return values[i][c.income_id - 1];
    }
    return null;
  },

  /**
   * Edge case 5 (BUILD-PLAN §4.1): a ClaimLineItem's amount must never
   * exceed its BudgetRequestLine's remaining balance. Called by
   * IntakeForms.gs before creating a ClaimLineItem.
   * @param {string} budgetLineId
   * @param {number} amount
   * @return {{ok: boolean, remaining: number}}
   */
  validateClaimLineAmount: function (budgetLineId, amount) {
    var line = Engine._loadRow('BudgetRequestLine', budgetLineId);
    if (!line) return { ok: false, remaining: 0 };
    var c = COLS.BudgetRequestLines;
    var approved = Number(line.values[c.approved_amount - 1]) || 0;
    var claimed = Engine._sumClaimedAgainstLine(budgetLineId);
    return CoreDecisions.checkClaimLineAmount(amount, approved, claimed);
  },

  /**
   * P2 Engine completeness checks for VERIFY on ExpenseClaims.
   * Checks:
   *   - every claim line has a valid receipt_id or missing-receipt flag
   *   - Σ ClaimLineItems.amount per receipt_id ≤ Receipt.receipt_total
   *   - budget remaining is not negative
   *   - missing-receipt cap, role, and per-semester rules
   *
   * TODO(known gap): late_flag is only computed once at claim intake
   * (IntakeForms.gs); it's never re-checked here at verify time.
   */
  _validateClaimVerification: function (claimId, actorUserId, payload) {
    var cliSheet = getSheet_(TABS.CLAIM_LINE_ITEMS);
    var cliRows = Engine._findRowsByColumn(cliSheet, COLS.ClaimLineItems.claim_id, claimId);
    var c = COLS.ClaimLineItems;
    
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
         var approved = Number(bLineRow.values[COLS.BudgetRequestLines.approved_amount - 1]) || 0;
         var claimed = Engine._sumClaimedAgainstLine(bLineId);
         var remaining = approved - claimed;
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
    
    if (hasMissingReceipt) {
      var actor = Engine._loadActor(actorUserId);
      if (actor.role !== ROLES.TREASURER) {
        return { ok: false, reason: 'Missing receipt claims must be verified by the TREASURER.' };
      }
      
      var note = payload.decision_note || '';
      if (note.indexOf('EXCEPTION_GRANTED') === -1) {
        var cap = Config.getNum('MISSING_RECEIPT_CAP');
        if (totalMissingAmount > cap) {
          return { ok: false, reason: 'Missing receipt amount (' + totalMissingAmount + ') exceeds cap (' + cap + '). To bypass, type EXCEPTION_GRANTED in note.' };
        }
        
        var maxPerSem = Config.getNum('MISSING_RECEIPT_MAX_PER_SEM');
        var claimRow = Engine._loadRow('ExpenseClaim', claimId);
        var claimantId = claimRow.values[COLS.ExpenseClaims.claimant_id - 1];
        
        var allCliData = cliSheet.getDataRange().getValues();
        var claimSheet = getSheet_(TABS.EXPENSE_CLAIMS);
        var claimData = claimSheet.getDataRange().getValues();
        
        var count = 0;
        var claimCache = {};
        for (var j=1; j<claimData.length; j++) {
           claimCache[claimData[j][0]] = {
             status: claimData[j][COLS.ExpenseClaims.status - 1],
             claimant: claimData[j][COLS.ExpenseClaims.claimant_id - 1]
           };
        }
        
        for (var k=1; k<allCliData.length; k++) {
          var cid = allCliData[k][c.claim_id - 1];
          if (cid === claimId) continue;
          var cInfo = claimCache[cid];
          if (!cInfo) continue;
          if (cInfo.claimant === claimantId && cInfo.status !== STATUS.ExpenseClaim.REJECTED) {
            if (allCliData[k][c.missing_receipt_flag - 1] === true) {
              count++;
            }
          }
        }
        
        if (count >= maxPerSem) {
          return { ok: false, reason: 'Claimant has exceeded missing receipt limit (' + maxPerSem + ' per sem). To bypass, type EXCEPTION_GRANTED in note.' };
        }
      }
    }
    
    return { ok: true };
  },

  // ---- internal helpers ----

  /** @private */
  _loadActor: function (userId) {
    var row = Engine._loadRow('User', userId);
    if (!row) return null;
    return { role: row.values[COLS.Users.role - 1], displayName: row.values[COLS.Users.display_name - 1] };
  },

  /**
   * Generic row finder by primary key.
   * @param {string} entityType 'BudgetRequest'|'ExpenseClaim'|'User'|'BudgetRequestLine'|'ClaimLineItem'
   * @param {string} id
   * @return {?{sheet: Sheet, rowIndex: number, values: Array}}
   * @private
   */
  _loadRow: function (entityType, id) {
    var tabMap = {
      BudgetRequest: TABS.BUDGET_REQUESTS, ExpenseClaim: TABS.EXPENSE_CLAIMS,
      User: TABS.USERS, BudgetRequestLine: TABS.BUDGET_REQUEST_LINES,
      ClaimLineItem: TABS.CLAIM_LINE_ITEMS, Payout: TABS.PAYOUTS,
      Receipt: TABS.RECEIPTS, Income: TABS.INCOME,
      FinanceAccount: TABS.FINANCE_ACCOUNTS
    };
    var sheet = getSheet_(tabMap[entityType]);
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === id) return { sheet: sheet, rowIndex: i + 1, values: values[i] };
    }
    return null;
  },

  /**
   * @param {Sheet} sheet
   * @param {number} pkColIndex 1-indexed column holding the FK to match
   * @param {string} matchValue
   * @return {Array<{rowIndex:number, values:Array}>}
   * @private
   */
  _findRowsByColumn: function (sheet, pkColIndex, matchValue) {
    var values = sheet.getDataRange().getValues();
    var out = [];
    for (var i = 1; i < values.length; i++) {
      if (values[i][pkColIndex - 1] === matchValue) out.push({ rowIndex: i + 1, values: values[i] });
    }
    return out;
  },

  /** @private */
  _findTransition: function (entityType, fromStatus, action) {
    return CoreDecisions.findTransition(entityType, fromStatus, action);
  },

  /** @private */
  _ownerId: function (entityType, values) {
    return CoreDecisions.ownerId(entityType, values);
  },

  /**
   * Apply a BudgetRequest transition's effects (line updates + request
   * status/stamps). Returns the resulting request status.
   * @private
   */
  _applyBudgetRequestEffect: function (requestId, row, action, def, actorUserId, payload, selfApproved) {
    var c = COLS.BudgetRequests;
    var sheet = row.sheet;
    var now = Audit._nowIso();
    var nextStatus;

    if (action === 'APPROVE' || action === 'REDUCE' || action === 'REJECT') {
      Engine._applyLineDecision(requestId, action, payload);
      nextStatus = Engine_deriveRequestStatus(requestId);
      sheet.getRange(row.rowIndex, c.decided_at).setValue(now);
      sheet.getRange(row.rowIndex, c.decided_by).setValue(actorUserId);
      sheet.getRange(row.rowIndex, c.decision_note).setValue(payload.decision_note || '');
      // Approved-amount changes shift what's available to claim against;
      // keep the Claim form's budget-line dropdown in sync (best-effort:
      // forms may not exist yet, e.g. under Tests.gs).
      try { FormSetup.refreshClaimFormChoices(); } catch (e) { /* forms not set up yet */ }
    } else if (action === 'REQUEST_INFO') {
      nextStatus = def.to;
      sheet.getRange(row.rowIndex, c.decided_at).setValue(now);
      sheet.getRange(row.rowIndex, c.decided_by).setValue(actorUserId);
      sheet.getRange(row.rowIndex, c.decision_note).setValue(payload.decision_note || '');
    } else if (action === 'SUBMIT') {
      nextStatus = def.to;
      sheet.getRange(row.rowIndex, c.submitted_at).setValue(now);
    } else if (action === 'WITHDRAW') {
      nextStatus = def.to;
      sheet.getRange(row.rowIndex, c.decided_at).setValue(now);
      sheet.getRange(row.rowIndex, c.decided_by).setValue(actorUserId);
      sheet.getRange(row.rowIndex, c.decision_note).setValue('Withdrawn by requester');
    } else if (action === 'RESUBMIT') {
      nextStatus = def.to;
      sheet.getRange(row.rowIndex, c.submitted_at).setValue(now);
    } else { // CLOSE
      nextStatus = def.to;
    }

    sheet.getRange(row.rowIndex, c.status).setValue(nextStatus);
    if (selfApproved) sheet.getRange(row.rowIndex, c.self_approved).setValue(true);
    return nextStatus;
  },

  /**
   * Distribute a decision across a request's BudgetRequestLines.
   * APPROVE: every line fully approved. REJECT: every line rejected.
   * REDUCE: proportional split of payload.amount_override across lines,
   * each line individually landing on APPROVED/REDUCED/REJECTED.
   * @private
   */
  _applyLineDecision: function (requestId, action, payload) {
    var sheet = getSheet_(TABS.BUDGET_REQUEST_LINES);
    var lines = Engine._findRowsByColumn(sheet, COLS.BudgetRequestLines.request_id, requestId);
    var c = COLS.BudgetRequestLines;

    if (action === 'APPROVE') {
      lines.forEach(function (line) {
        var requested = Number(line.values[c.requested_amount - 1]) || 0;
        sheet.getRange(line.rowIndex, c.approved_amount).setValue(requested);
        sheet.getRange(line.rowIndex, c.line_status).setValue(STATUS.BudgetRequestLine.APPROVED);
      });
      return;
    }
    if (action === 'REJECT') {
      lines.forEach(function (line) {
        sheet.getRange(line.rowIndex, c.approved_amount).setValue(0);
        sheet.getRange(line.rowIndex, c.line_status).setValue(STATUS.BudgetRequestLine.REJECTED);
      });
      return;
    }
    // REDUCE: proportional split
    var requestedAmounts = lines.map(function (l) { return Number(l.values[c.requested_amount - 1]) || 0; });
    var outcomes = CoreDecisions.computeReduceSplit(requestedAmounts, payload.amount_override);
    lines.forEach(function (line, i) {
      sheet.getRange(line.rowIndex, c.approved_amount).setValue(outcomes[i].approved_amount);
      sheet.getRange(line.rowIndex, c.line_status).setValue(outcomes[i].line_status);
    });
  },

  /**
   * Apply an ExpenseClaim transition's effects. Returns the resulting status.
   * ExpenseClaims has no decision_note column, so REQUEST_INFO/REJECT notes
   * are appended to `notes` instead (documented choice, see CONTEXT.md).
   * @private
   */
  _applyExpenseClaimEffect: function (claimId, row, action, def, actorUserId, payload, selfApproved, effectDetail) {
    var c = COLS.ExpenseClaims;
    var sheet = row.sheet;
    var now = Audit._nowIso();
    var nextStatus = def.to;

    if (action === 'VERIFY') {
      sheet.getRange(row.rowIndex, c.verified_at).setValue(now);
      sheet.getRange(row.rowIndex, c.verified_by).setValue(actorUserId);
      sheet.getRange(row.rowIndex, c.total_amount).setValue(Engine._sumClaimLineItems(claimId));
    } else if (action === 'SUBMIT') {
      sheet.getRange(row.rowIndex, c.submitted_at).setValue(now);
    } else     if (action === 'APPROVE_PAYOUT') {
      sheet.getRange(row.rowIndex, c.approved_at).setValue(now);
      sheet.getRange(row.rowIndex, c.approved_by).setValue(actorUserId);
      var payoutAccountId = payload && payload.account_id;
    } else if (action === 'REJECT' || action === 'REQUEST_INFO') {
      Engine._appendNote(sheet, row.rowIndex, c.notes, action + ' by ' + actorUserId + ': ' + (payload.decision_note || ''));
    } else if (action === 'RESUBMIT') {
      sheet.getRange(row.rowIndex, c.submitted_at).setValue(now);
    } else if (action === 'LOCK') {
      sheet.getRange(row.rowIndex, c.locked_at).setValue(now);
      var protection = sheet.getRange(row.rowIndex, 1, 1, sheet.getMaxColumns()).protect().setDescription('LOCKED: ' + claimId);
      protection.setWarningOnly(false);
      var me = Session.getEffectiveUser();
      var editors = protection.getEditors();
      for (var e = 0; e < editors.length; e++) {
        if (editors[e].getEmail() !== me.getEmail()) protection.removeEditor(editors[e]);
      }
      if (protection.canDomainEdit()) protection.setDomainEdit(false);
    }

    sheet.getRange(row.rowIndex, c.status).setValue(nextStatus);
    if (selfApproved) sheet.getRange(row.rowIndex, c.self_approved).setValue(true);
    if (action === 'APPROVE_PAYOUT') Payouts.onClaimApprovedForPayout(claimId, payoutAccountId);
    if (action === 'LOCK' && effectDetail) {
      effectDetail.lockedHash = Engine._computeLockedRowHash(sheet, row.rowIndex);
    }
    return nextStatus;
  },

  /**
   * A hash of an ExpenseClaim row's current values, taken at LOCK time and
   * re-derivable forever after by the nightly integrity sweep to detect any
   * tampering with a locked row. Distinct from AuditLog's hash-chain
   * (prevHash semantics) — 'LOCK_V1' is a versioned marker, not a chain link.
   * This format MUST NOT change without a version bump, or every
   * already-locked claim's stored hash becomes unverifiable.
   * @param {Sheet} sheet the ExpenseClaims sheet
   * @param {number} rowIndex
   * @return {string}
   * @private
   */
  _computeLockedRowHash: function (sheet, rowIndex) {
    var numCols = Object.keys(COLS.ExpenseClaims).length;
    var values = sheet.getRange(rowIndex, 1, 1, numCols).getValues()[0];
    return CoreAudit.calculateHash('LOCK_V1', JSON.stringify(values));
  },

  /**
   * Recompute a LOCKED claim's row hash as it stands right now, for the
   * nightly integrity sweep to compare against the hash stored on its LOCK
   * transition's audit row.
   * @param {string} claimId
   * @return {?string} null if the claim can't be loaded
   */
  computeCurrentLockedHash: function (claimId) {
    var row = Engine._loadRow('ExpenseClaim', claimId);
    if (!row) return null;
    return Engine._computeLockedRowHash(row.sheet, row.rowIndex);
  },

  /** @private */
  _appendNote: function (sheet, rowIndex, colIndex, extra) {
    var existing = sheet.getRange(rowIndex, colIndex).getValue() || '';
    var stamped = '[' + Audit._nowIso() + '] ' + extra;
    sheet.getRange(rowIndex, colIndex).setValue(existing ? (existing + '\n' + stamped) : stamped);
  },

  /**
   * Sum ClaimLineItems.amount for one claim.
   * @param {string} claimId
   * @return {number}
   * @private
   */
  _sumClaimLineItems: function (claimId) {
    var sheet = getSheet_(TABS.CLAIM_LINE_ITEMS);
    var rows = Engine._findRowsByColumn(sheet, COLS.ClaimLineItems.claim_id, claimId);
    var c = COLS.ClaimLineItems;
    return rows.reduce(function (sum, r) { return sum + (Number(r.values[c.amount - 1]) || 0); }, 0);
  },

  /**
   * Sum ClaimLineItems.amount charged against one budget line, counting
   * only claims that are not REJECTED (rejected claims free up the line).
   * @param {string} budgetLineId
   * @return {number}
   * @private
   */
  _sumClaimedAgainstLine: function (budgetLineId) {
    var cliSheet = getSheet_(TABS.CLAIM_LINE_ITEMS);
    var cliRows = Engine._findRowsByColumn(cliSheet, COLS.ClaimLineItems.budget_line_id, budgetLineId);
    var cliC = COLS.ClaimLineItems;
    var claimSheet = getSheet_(TABS.EXPENSE_CLAIMS);
    var claimStatusCache = {};
    var total = 0;
    cliRows.forEach(function (r) {
      var claimId = r.values[cliC.claim_id - 1];
      if (!(claimId in claimStatusCache)) {
        var claimRow = Engine._findRowsByColumn(claimSheet, COLS.ExpenseClaims.claim_id, claimId)[0];
        claimStatusCache[claimId] = claimRow ? claimRow.values[COLS.ExpenseClaims.status - 1] : null;
      }
      if (claimStatusCache[claimId] !== STATUS.ExpenseClaim.REJECTED) {
        total += Number(r.values[cliC.amount - 1]) || 0;
      }
    });
    return total;
  },

  /** @private */
  _deny: function (entityType, entityId, action, actorUserId, reason, currentStatus) {
    Audit.append(actorUserId || 'SYSTEM', entityType, entityId, 'TRANSITION_DENIED', {
      action: action, reason: reason, currentStatus: currentStatus
    });
    Discord.postTreasury('🚫 Denied: ' + action + ' on ' + entityType + ' ' + entityId +
      ' by ' + (actorUserId || 'unknown') + ' — ' + reason);
    return { ok: false, reason: reason, from: currentStatus, to: null, selfApproved: false };
  },

  /** @private */
  _notify: function (entityType, entityId, action, fromStatus, toStatus, actorUserId, selfApproved) {
    var row = Engine._loadRow(entityType, entityId);
    var title = entityType === 'BudgetRequest'
      ? row.values[COLS.BudgetRequests.title - 1]
      : (row.values[COLS.ExpenseClaims.notes - 1] || entityId);
    var amount = entityType === 'BudgetRequest'
      ? Engine._sumBudgetRequestLines(entityId, 'approved_amount')
      : Engine._sumClaimLineItems(entityId);

    if (action === 'REQUEST_INFO') {
      var roleId = Config.getOptional('NEEDS_INFO_ROLE_ID');
      var mention = roleId ? '<@&' + roleId + '>' : '';
      Discord.postTreasury('**' + entityId + '** — ' + title + ' — ' + fromStatus + ' → ' + toStatus + ' (by ' + actorUserId + ')' + (mention ? ' — ' + mention : ''));
      Discord.postStatus(entityId, title, toStatus, amount);
      return;
    }

    Discord.postTreasury('**' + entityId + '** — ' + title + ' — ' + fromStatus + ' → ' + toStatus + ' (by ' + actorUserId + ')');
    Discord.postStatus(entityId, title, toStatus, amount);
    if (selfApproved) Discord.postSelfApproved(entityId, actorUserId, amount);
  },

  /**
   * @param {string} requestId
   * @param {string} field 'requested_amount' | 'approved_amount'
   * @return {number}
   * @private
   */
  _sumBudgetRequestLines: function (requestId, field) {
    var sheet = getSheet_(TABS.BUDGET_REQUEST_LINES);
    var rows = Engine._findRowsByColumn(sheet, COLS.BudgetRequestLines.request_id, requestId);
    var colIndex = COLS.BudgetRequestLines[field];
    return rows.reduce(function (sum, r) { return sum + (Number(r.values[colIndex - 1]) || 0); }, 0);
  },

  /**
   * Return the current semester status including close blockers.
   * Returns null if semester config is not set up.
   */
  getSemesterStatus: function () {
    var currentSemester = Config.getOptional('CURRENT_SEMESTER') || '26A';
    var semStart = Config.getOptional('SEM_' + currentSemester + '_START') || '';
    var semEnd = Config.getOptional('SEM_' + currentSemester + '_END') || '';

    var blockers = Engine._findCloseBlockers();
    return {
      current_semester: currentSemester,
      start_date: semStart,
      end_date: semEnd,
      closeable: blockers.length === 0,
      blockers: blockers,
      blocker_count: blockers.length
    };
  },

  /**
   * Suggest a semester for a given expense date.
   * Returns the matching semester or the current open semester for out-of-range dates.
   */
  suggestSemester: function (expenseDate) {
    if (!expenseDate) return Config.getOptional('CURRENT_SEMESTER') || '26A';

    var semesters = ['SEM A', 'SEM B', 'SUMMER'];
    for (var i = 0; i < semesters.length; i++) {
      var start = Config.getOptional('SEM_' + semesters[i] + '_START');
      var end = Config.getOptional('SEM_' + semesters[i] + '_END');
      if (start && end && expenseDate >= start && expenseDate <= end) {
        return semesters[i];
      }
    }
    return Config.getOptional('CURRENT_SEMESTER') || '26A';
  },

  /**
   * Correct the semester assignment on a claim or budget request.
   * Only allowed for operators, records an audit trail.
   */
  correctSemester: function (entityType, entityId, newSemester, actorUserId) {
    var row = Engine._loadRow(entityType, entityId);
    if (!row) return { ok: false, reason: 'Entity not found' };

    var cols = COLS[entityType + 's'];
    if (!cols.semester) return { ok: false, reason: 'Semester not applicable for ' + entityType };

    var currentSemester = row.values[cols.semester - 1];
    if (currentSemester === newSemester) return { ok: true, reason: 'Already assigned to ' + newSemester };

    row.sheet.getRange(row.rowIndex, cols.semester).setValue(newSemester);
    Audit.append(actorUserId, entityType, entityId, 'SEMESTER_CORRECTED', {
      from_semester: currentSemester,
      to_semester: newSemester
    });

    return { ok: true, from: currentSemester, to: newSemester };
  },

  /**
   * Close the given semester. Treasurer only.
   * 1. Check for unresolved blockers
   * 2. Delete private DRAFT claims and DRAFT budget requests
   * 3. Lock closed-period finance records
   * 4. Roll forward finance account balances
   * 5. Advance to next semester (or prepare for migration if closing SUMMER)
   */
  closeSemester: function (semester, actorUserId) {
    var currentSemester = Config.getOptional('CURRENT_SEMESTER') || '26A';
    if (semester !== currentSemester) return { ok: false, reason: 'Can only close the current semester: ' + currentSemester };

    var blockers = Engine._findCloseBlockers();
    if (blockers.length > 0) {
      return { ok: false, reason: blockers.length + ' blocker(s) prevent close', blockers: blockers };
    }

    var now = Audit._nowIso();
    var lock = LockService.getScriptLock();
    try { lock.waitLock(30000); } catch (e) { return { ok: false, reason: 'Lock timeout' }; }

    try {
      // Delete private drafts
      Engine._deleteDrafts(STATUS.ExpenseClaim.DRAFT, TABS.EXPENSE_CLAIMS, COLS.ExpenseClaims);
      Engine._deleteDrafts(STATUS.BudgetRequest.DRAFT, TABS.BUDGET_REQUESTS, COLS.BudgetRequests);

      // Roll forward account balances
      var accountsSheet = getSheet_(TABS.FINANCE_ACCOUNTS);
      var accValues = accountsSheet.getDataRange().getValues();
      var ac = COLS.FinanceAccounts;
      for (var i = 1; i < accValues.length; i++) {
        if (!accValues[i][ac.account_id - 1]) continue;
        var currentBal = Number(accValues[i][ac.current_balance - 1]) || 0;
        accountsSheet.getRange(i + 1, ac.opening_balance).setValue(currentBal);
        accountsSheet.getRange(i + 1, ac.pending_income).setValue(0);
        accountsSheet.getRange(i + 1, ac.reserved_payouts).setValue(0);
      }

      // Determine next semester
      var semesters = ['SEM A', 'SEM B', 'SUMMER'];
      var currentIdx = semesters.indexOf(currentSemester);
      var nextSemester = currentIdx < semesters.length - 1 ? semesters[currentIdx + 1] : null;

      if (nextSemester) {
        // Update Config
        var configSheet = getSheet_(TABS.CONFIG);
        var configValues = configSheet.getDataRange().getValues();
        for (var j = 1; j < configValues.length; j++) {
          if (configValues[j][0] === 'CURRENT_SEMESTER') {
            configSheet.getRange(j + 1, 2).setValue(nextSemester);
            break;
          }
        }
        Config.invalidate();
        Audit.append(actorUserId, 'Semester', currentSemester, 'CLOSE', {
          next_semester: nextSemester,
          accounts_rolled_forward: true,
          drafts_deleted: true
        });
        try { Discord.postTreasury('📅 Semester **' + currentSemester + '** closed. Now active: **' + nextSemester + '**'); } catch (e) {}
        return { ok: true, closed: currentSemester, next: nextSemester, ready_for_migration: false };
      } else {
        // Closing SUMMER — prepare for migration
        Audit.append(actorUserId, 'Semester', currentSemester, 'CLOSE', {
          ready_for_migration: true,
          accounts_rolled_forward: true,
          drafts_deleted: true
        });
        try { Discord.postTreasury('📅 Final semester **' + currentSemester + '** closed. Annual Migration is now available.'); } catch (e) {}
        return { ok: true, closed: currentSemester, next: null, ready_for_migration: true };
      }
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Find all blockers that prevent closing the current semester.
   * @private
   * @return {Array<{type: string, id: string, reason: string}>}
   */
  _findCloseBlockers: function () {
    var blockers = [];

    // Unresolved claims (not DRAFT, REJECTED, PAID, LOCKED)
    var claimsSheet = getSheet_(TABS.EXPENSE_CLAIMS);
    var claimsValues = claimsSheet.getDataRange().getValues();
    var cc = COLS.ExpenseClaims;
    var closedClaimStatuses = [STATUS.ExpenseClaim.DRAFT, STATUS.ExpenseClaim.REJECTED,
      STATUS.ExpenseClaim.PAID, STATUS.ExpenseClaim.LOCKED];
    for (var i = 1; i < claimsValues.length; i++) {
      var cId = claimsValues[i][cc.claim_id - 1];
      if (!cId) continue;
      var cStatus = claimsValues[i][cc.status - 1];
      if (closedClaimStatuses.indexOf(cStatus) < 0) {
        blockers.push({ type: 'claim', id: cId, reason: 'Unresolved claim: ' + cStatus });
      }
    }

    // Unresolved budget requests (not DRAFT, APPROVED, PARTIALLY_APPROVED, REJECTED, WITHDRAWN, CLOSED)
    var reqSheet = getSheet_(TABS.BUDGET_REQUESTS);
    var reqValues = reqSheet.getDataRange().getValues();
    var rc = COLS.BudgetRequests;
    var closedReqStatuses = [STATUS.BudgetRequest.DRAFT, STATUS.BudgetRequest.APPROVED,
      STATUS.BudgetRequest.PARTIALLY_APPROVED, STATUS.BudgetRequest.REJECTED,
      STATUS.BudgetRequest.WITHDRAWN, STATUS.BudgetRequest.CLOSED];
    for (var j = 1; j < reqValues.length; j++) {
      var rId = reqValues[j][rc.request_id - 1];
      if (!rId) continue;
      var rStatus = reqValues[j][rc.status - 1];
      if (closedReqStatuses.indexOf(rStatus) < 0) {
        blockers.push({ type: 'budget_request', id: rId, reason: 'Unresolved budget request: ' + rStatus });
      }
    }

    // Unfinished payouts (QUEUED)
    var payoutSheet = getSheet_(TABS.PAYOUTS);
    var payoutValues = payoutSheet.getDataRange().getValues();
    var pc = COLS.Payouts;
    for (var k = 1; k < payoutValues.length; k++) {
      var pId = payoutValues[k][pc.payout_id - 1];
      if (!pId) continue;
      if (payoutValues[k][pc.status - 1] === STATUS.Payout.QUEUED) {
        blockers.push({ type: 'payout', id: pId, reason: 'Queued payout' });
      }
    }

    return blockers;
  },

  /**
   * Delete all rows with a given status from a tab.
   * @private
   */
  _deleteDrafts: function (draftStatus, tabName, cols) {
    var sheet = getSheet_(tabName);
    var values = sheet.getDataRange().getValues();
    var statusCol = cols.status - 1;
    // Delete from bottom to preserve row indices
    for (var i = values.length - 1; i >= 1; i--) {
      if (values[i][statusCol] === draftStatus) {
        sheet.deleteRow(i + 1);
      }
    }
  }
};

/**
 * Derive a BudgetRequest's status from its lines. Loads the line rows
 * (I/O) then delegates the pure branching to
 * CoreDecisions.deriveRequestStatusFromLineStatuses.
 * @param {string} requestId
 * @return {string}
 */
function Engine_deriveRequestStatus(requestId) {
  var sheet = getSheet_(TABS.BUDGET_REQUEST_LINES);
  var rows = Engine._findRowsByColumn(sheet, COLS.BudgetRequestLines.request_id, requestId);
  var c = COLS.BudgetRequestLines;
  var statuses = rows.map(function (r) { return r.values[c.line_status - 1]; });
  return CoreDecisions.deriveRequestStatusFromLineStatuses(statuses);
}

if (typeof module !== 'undefined') { module.exports = { Engine: Engine }; }
