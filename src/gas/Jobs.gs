/**
 * Jobs.gs — Scheduled background jobs.
 */

/**
 * Run this function daily via a time-driven trigger.
 * Tasks: SLA nudges, auto-confirm payouts, lock old paid claims.
 */
function dailyJob() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    var now = new Date();
    
    // 1. SLA Nudges (BudgetRequests)
    Jobs_nudgeBudgetRequests(now);
    
    // 2. SLA Nudges (ExpenseClaims)
    Jobs_nudgeExpenseClaims(now);
    
    // 3. Auto-confirm Payouts
    Jobs_autoConfirmPayouts(now);
    
    // 4. Lock Claims
    Jobs_lockClaims(now);
    
    Audit.append('SYSTEM', 'Job', 'DAILY', 'EXECUTE', { timestamp: now.toISOString() });
  } finally {
    lock.releaseLock();
  }
}

function Jobs_nudgeBudgetRequests(now) {
  var sheet = getSheet_(TABS.BUDGET_REQUESTS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.BudgetRequests;
  var slaHours = Config.getNum('APPROVAL_SLA_HOURS') || 72;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.status - 1] === STATUS.BudgetRequest.PENDING) {
      var submitTs = new Date(values[i][c.submitted_at - 1]);
      if (isNaN(submitTs.getTime())) continue;
      var hoursPending = (now.getTime() - submitTs.getTime()) / (1000 * 60 * 60);
      if (hoursPending > slaHours) {
         var reqId = values[i][c.request_id - 1];
         Discord.postTreasury('⏰ Nudge: BudgetRequest **' + reqId + '** has been pending for over ' + slaHours + ' hours.');
      }
    }
  }
}

function Jobs_nudgeExpenseClaims(now) {
  var sheet = getSheet_(TABS.EXPENSE_CLAIMS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.ExpenseClaims;
  var slaHours = Config.getNum('APPROVAL_SLA_HOURS') || 72;
  
  for (var i = 1; i < values.length; i++) {
    var status = values[i][c.status - 1];
    if (status === STATUS.ExpenseClaim.SUBMITTED || status === STATUS.ExpenseClaim.VERIFIED) {
      var tsField = status === STATUS.ExpenseClaim.SUBMITTED ? c.submitted_at : c.verified_at;
      var ts = new Date(values[i][tsField - 1]);
      if (isNaN(ts.getTime())) continue;
      var hoursPending = (now.getTime() - ts.getTime()) / (1000 * 60 * 60);
      if (hoursPending > slaHours) {
         var claimId = values[i][c.claim_id - 1];
         Discord.postTreasury('⏰ Nudge: ExpenseClaim **' + claimId + '** has been ' + status + ' for over ' + slaHours + ' hours.');
      }
    }
  }
}

function Jobs_autoConfirmPayouts(now) {
  var sheet = getSheet_(TABS.PAYOUTS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Payouts;
  var autoHours = Config.getNum('PAYOUT_AUTOCONFIRM_HOURS') || 72;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.status - 1] === STATUS.Payout.SENT) {
      var sentTs = new Date(values[i][c.paid_at - 1]);
      if (isNaN(sentTs.getTime())) continue;
      var hoursSent = (now.getTime() - sentTs.getTime()) / (1000 * 60 * 60);
      if (hoursSent > autoHours) {
         var payoutId = values[i][c.payout_id - 1];
         Payouts.confirmPayout(payoutId);
      }
    }
  }
}

function Jobs_lockClaims(now) {
  var sheet = getSheet_(TABS.EXPENSE_CLAIMS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.ExpenseClaims;
  var lockHours = Config.getNum('LOCK_AFTER_PAID_HOURS') || 24;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.status - 1] === STATUS.ExpenseClaim.PAID) {
      var paidTs = new Date(values[i][c.paid_at - 1]);
      if (isNaN(paidTs.getTime())) continue;
      var hoursPaid = (now.getTime() - paidTs.getTime()) / (1000 * 60 * 60);
      if (hoursPaid > lockHours) {
         var claimId = values[i][c.claim_id - 1];
         Engine.transition('ExpenseClaim', claimId, 'LOCK', 'SYSTEM', {});
      }
    }
  }
}
