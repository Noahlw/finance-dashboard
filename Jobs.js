"use strict";
/**
 * Jobs.gs — Scheduled background jobs.
 */

/**
 * Run this function daily via a time-driven trigger.
 * Tasks: SLA nudges, auto-confirm payouts, lock old paid claims.
 */
function dailyJob() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30_000)) {
    return;
  }
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

    Audit.append("SYSTEM", "Job", "DAILY", "EXECUTE", {
      timestamp: now.toISOString(),
    });
  } finally {
    lock.releaseLock();
  }
}

function Jobs_nudgeBudgetRequests(now) {
  var sheet = getSheet_(TABS.BUDGET_REQUESTS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.BudgetRequests;
  var slaHours = Config.getNum("APPROVAL_SLA_HOURS") || 72;

  for (var i = 1; i < values.length; i++) {
    if (values[i][c.status - 1] === STATUS.BudgetRequest.PENDING) {
      var submitTs = new Date(values[i][c.submitted_at - 1]);
      if (isNaN(submitTs.getTime())) {
        continue;
      }
      var hoursPending =
        (now.getTime() - submitTs.getTime()) / (1000 * 60 * 60);
      if (hoursPending > slaHours) {
        var reqId = values[i][c.request_id - 1];
        Discord.postTreasury(
          "⏰ Nudge: BudgetRequest **" +
            reqId +
            "** has been pending for over " +
            slaHours +
            " hours."
        );
      }
    }
  }
}

function Jobs_nudgeExpenseClaims(now) {
  var sheet = getSheet_(TABS.EXPENSE_CLAIMS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.ExpenseClaims;
  var slaHours = Config.getNum("APPROVAL_SLA_HOURS") || 72;

  for (var i = 1; i < values.length; i++) {
    var status = values[i][c.status - 1];
    if (
      status === STATUS.ExpenseClaim.SUBMITTED ||
      status === STATUS.ExpenseClaim.VERIFIED
    ) {
      var tsField =
        status === STATUS.ExpenseClaim.SUBMITTED
          ? c.submitted_at
          : c.verified_at;
      var ts = new Date(values[i][tsField - 1]);
      if (isNaN(ts.getTime())) {
        continue;
      }
      var hoursPending = (now.getTime() - ts.getTime()) / (1000 * 60 * 60);
      if (hoursPending > slaHours) {
        var claimId = values[i][c.claim_id - 1];
        Discord.postTreasury(
          "⏰ Nudge: ExpenseClaim **" +
            claimId +
            "** has been " +
            status +
            " for over " +
            slaHours +
            " hours."
        );
      }
    }
  }
}

function Jobs_autoConfirmPayouts(now) {
  var sheet = getSheet_(TABS.PAYOUTS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Payouts;
  var autoHours = Config.getNum("PAYOUT_AUTOCONFIRM_HOURS") || 72;

  for (var i = 1; i < values.length; i++) {
    if (values[i][c.status - 1] === STATUS.Payout.SENT) {
      var sentTs = new Date(values[i][c.paid_at - 1]);
      if (isNaN(sentTs.getTime())) {
        continue;
      }
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
  var lockHours = Config.getNum("LOCK_AFTER_PAID_HOURS") || 24;

  for (var i = 1; i < values.length; i++) {
    if (values[i][c.status - 1] === STATUS.ExpenseClaim.PAID) {
      var paidTs = new Date(values[i][c.paid_at - 1]);
      if (isNaN(paidTs.getTime())) {
        continue;
      }
      var hoursPaid = (now.getTime() - paidTs.getTime()) / (1000 * 60 * 60);
      if (hoursPaid > lockHours) {
        var claimId = values[i][c.claim_id - 1];
        Engine.transition("ExpenseClaim", claimId, "LOCK", "SYSTEM", {});
      }
    }
  }
}

/**
 * Run this nightly via a time-driven trigger (P3-2). Exports a CF-Ledger
 * xlsx + AuditLog csv snapshot into /CF-Finance/Snapshots/<date>/, shares
 * the parent Snapshots folder read-only with the backup account (a no-op
 * until BACKUP_ACCOUNT_EMAIL is configured), then runs the integrity sweep.
 */
function nightlyJob() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30_000)) {
    return;
  }
  try {
    var now = new Date();
    var snapshot = Jobs_exportSnapshot(now);
    var integrity = Jobs_integritySweep();

    Audit.append("SYSTEM", "Job", "NIGHTLY", "SNAPSHOT", {
      integrityOk: integrity.ok,
      issueCount: integrity.issues.length,
      snapshotOk: snapshot.ok,
      warningCount: integrity.warnings.length,
    });

    if (!(snapshot.ok && integrity.ok)) {
      var lines = [];
      if (!snapshot.ok) {
        lines.push("- snapshot export failed: " + snapshot.error);
      }
      integrity.issues.forEach((issue) => {
        lines.push("- " + issue);
      });
      Discord.postTreasury("🚨 Nightly job issues:\n" + lines.join("\n"));
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Export CF-Ledger to xlsx + AuditLog to csv into a dated Drive folder,
 * and one-way-share the parent /Snapshots folder with the backup account.
 * @param {Date} now
 * @return {{ok: boolean, snapshotFolderUrl: ?string, error: ?string}}
 * @private
 */
function Jobs_exportSnapshot(now) {
  try {
    var dateStr = Utilities.formatDate(now, "Asia/Hong_Kong", "yyyy-MM-dd");
    var snapshotsRootId = PropertiesService.getScriptProperties().getProperty(
      "SNAPSHOTS_FOLDER_ID"
    );
    var snapshotsRoot = DriveApp.getFolderById(snapshotsRootId);
    var dateFolder = Setup_getOrCreateFolder(snapshotsRoot, dateStr);

    var ledgerId =
      PropertiesService.getScriptProperties().getProperty("LEDGER_ID");
    var exportUrl =
      "https://docs.google.com/spreadsheets/d/" +
      ledgerId +
      "/export?format=xlsx";
    var resp = UrlFetchApp.fetch(exportUrl, {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
    });
    if (resp.getResponseCode() !== 200) {
      return {
        error: "Ledger export HTTP " + resp.getResponseCode(),
        ok: false,
        snapshotFolderUrl: null,
      };
    }
    var xlsxBlob = resp.getBlob().setName("CF-Ledger_" + dateStr + ".xlsx");
    dateFolder.createFile(xlsxBlob);

    var auditValues = getSheet_(TABS.AUDIT_LOG).getDataRange().getValues();
    var csv = auditValues
      .map((row) => row.map(Jobs_csvEscape_).join(","))
      .join("\n");
    var csvBlob = Utilities.newBlob(
      csv,
      "text/csv",
      "AuditLog_" + dateStr + ".csv"
    );
    dateFolder.createFile(csvBlob);

    var backupEmail = Config.getOptional("BACKUP_ACCOUNT_EMAIL");
    if (backupEmail) {
      try {
        snapshotsRoot.addViewer(backupEmail);
      } catch (shareErr) {
        // Don't fail the whole job over a sharing hiccup; the integrity
        // sweep / next nightly run will retry this idempotent call.
      }
    }

    return { error: null, ok: true, snapshotFolderUrl: dateFolder.getUrl() };
  } catch (e) {
    return { error: e.message, ok: false, snapshotFolderUrl: null };
  }
}

/**
 * @param {*} cell
 * @return {string} CSV-escaped cell value
 * @private
 */
function Jobs_csvEscape_(cell) {
  var s = cell === null || cell === undefined ? "" : String(cell);
  if (
    s.indexOf(",") !== -1 ||
    s.indexOf('"') !== -1 ||
    s.indexOf("\n") !== -1
  ) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Nightly integrity sweep: FK resolution, receipt-total and payout-sum
 * invariants, LOCKED-row tamper detection, and the AuditLog hash chain.
 * `ok` reflects `issues` (hard failures) only — `warnings` (e.g. claims
 * LOCKED before hash-tracking existed) never flip `ok` to false.
 * @return {{ok: boolean, issues: string[], warnings: string[]}}
 * @private
 */
function Jobs_integritySweep() {
  var issues = [];
  issues = issues.concat(Jobs_checkForeignKeys_());
  issues = issues.concat(Jobs_checkReceiptTotals_());
  issues = issues.concat(Jobs_checkPayoutSums_());
  var lockedCheck = Jobs_checkLockedRowsUnchanged_();
  issues = issues.concat(lockedCheck.issues);

  var chain = Audit.verifyChain();
  if (!chain.ok) {
    issues.push("AuditLog hash chain broken at seq " + chain.badSeq);
  }

  return { issues, ok: issues.length === 0, warnings: lockedCheck.warnings };
}

/**
 * @return {string[]} one message per FK that fails to resolve
 * @private
 */
function Jobs_checkForeignKeys_() {
  var issues = [];

  // Sheets with array-formula-derived columns (e.g. BudgetRequestLines'
  // claimed_amount/remaining) report a getDataRange() far taller than the
  // real data — every loop below MUST skip rows whose own primary key is
  // blank, or every phantom formula row gets misread as a broken record.

  var userIds = {};
  getSheet_(TABS.USERS)
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach((r) => {
      var id = r[COLS.Users.user_id - 1];
      if (id) {
        userIds[id] = true;
      }
    });
  var lineIds = {};
  getSheet_(TABS.BUDGET_REQUEST_LINES)
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach((r) => {
      var id = r[COLS.BudgetRequestLines.line_id - 1];
      if (id) {
        lineIds[id] = true;
      }
    });
  var receiptIds = {};
  getSheet_(TABS.RECEIPTS)
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach((r) => {
      var id = r[COLS.Receipts.receipt_id - 1];
      if (id) {
        receiptIds[id] = true;
      }
    });

  var brc = COLS.BudgetRequests;
  getSheet_(TABS.BUDGET_REQUESTS)
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach((r) => {
      var id = r[brc.request_id - 1];
      if (!id) {
        return;
      }
      if (!userIds[r[brc.requester_id - 1]]) {
        issues.push("BudgetRequest " + id + ": requester_id does not resolve");
      }
    });

  var brlc = COLS.BudgetRequestLines;
  getSheet_(TABS.BUDGET_REQUEST_LINES)
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach((r) => {
      var id = r[brlc.line_id - 1];
      if (!id) {
        return;
      }
      if (!r[brlc.request_id - 1]) {
        issues.push("BudgetRequestLine " + id + ": missing request_id");
      }
    });

  var ecc = COLS.ExpenseClaims;
  getSheet_(TABS.EXPENSE_CLAIMS)
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach((r) => {
      var id = r[ecc.claim_id - 1];
      if (!id) {
        return;
      }
      if (!userIds[r[ecc.claimant_id - 1]]) {
        issues.push("ExpenseClaim " + id + ": claimant_id does not resolve");
      }
    });

  var clic = COLS.ClaimLineItems;
  getSheet_(TABS.CLAIM_LINE_ITEMS)
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach((r) => {
      var id = r[clic.claim_line_id - 1];
      if (!id) {
        return;
      }
      if (!lineIds[r[clic.budget_line_id - 1]]) {
        issues.push(
          "ClaimLineItem " + id + ": budget_line_id does not resolve"
        );
      }
      var receiptId = r[clic.receipt_id - 1];
      var missingReceiptFlag = r[clic.missing_receipt_flag - 1];
      if (!(missingReceiptFlag || receiptIds[receiptId])) {
        issues.push(
          "ClaimLineItem " +
            id +
            ": receipt_id does not resolve and missing_receipt_flag is not set"
        );
      }
    });

  var pc = COLS.Payouts;
  getSheet_(TABS.PAYOUTS)
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach((r) => {
      var id = r[pc.payout_id - 1];
      if (!id) {
        return;
      }
      if (!userIds[r[pc.payee_user_id - 1]]) {
        issues.push("Payout " + id + ": payee_user_id does not resolve");
      }
    });

  return issues;
}

/**
 * @return {string[]} one message per receipt whose linked ClaimLineItems
 *   sum exceeds its receipt_total
 * @private
 */
function Jobs_checkReceiptTotals_() {
  var issues = [];
  var receipts = getSheet_(TABS.RECEIPTS).getDataRange().getValues().slice(1);
  var rc = COLS.Receipts;
  var totalsByReceipt = {};
  receipts.forEach((r) => {
    var receiptId = r[rc.receipt_id - 1];
    if (!receiptId) {
      return;
    }
    totalsByReceipt[receiptId] = Number(r[rc.receipt_total - 1]) || 0;
  });

  var sumsByReceipt = {};
  var clic = COLS.ClaimLineItems;
  getSheet_(TABS.CLAIM_LINE_ITEMS)
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach((r) => {
      if (!r[clic.claim_line_id - 1]) {
        return;
      }
      var receiptId = r[clic.receipt_id - 1];
      if (!receiptId) {
        return;
      }
      sumsByReceipt[receiptId] =
        (sumsByReceipt[receiptId] || 0) + (Number(r[clic.amount - 1]) || 0);
    });

  Object.keys(sumsByReceipt).forEach((receiptId) => {
    if (!(receiptId in totalsByReceipt)) {
      return; // already flagged by the FK check
    }
    var check = CoreDecisions.checkReceiptTotal(
      sumsByReceipt[receiptId],
      totalsByReceipt[receiptId]
    );
    if (!check.ok) {
      issues.push(
        "Receipt " +
          receiptId +
          ": ClaimLineItems sum " +
          sumsByReceipt[receiptId] +
          " exceeds receipt_total " +
          totalsByReceipt[receiptId]
      );
    }
  });

  return issues;
}

/**
 * @return {string[]} one message per PAID claim whose payouts don't sum to
 *   its total_amount
 * @private
 */
function Jobs_checkPayoutSums_() {
  var issues = [];
  var pc = COLS.Payouts;
  var payoutSumsByClaim = {};
  getSheet_(TABS.PAYOUTS)
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach((r) => {
      if (!r[pc.payout_id - 1]) {
        return;
      }
      var claimId = r[pc.claim_id - 1];
      payoutSumsByClaim[claimId] =
        (payoutSumsByClaim[claimId] || 0) + (Number(r[pc.amount - 1]) || 0);
    });

  var ecc = COLS.ExpenseClaims;
  getSheet_(TABS.EXPENSE_CLAIMS)
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach((r) => {
      if (!r[ecc.claim_id - 1]) {
        return;
      }
      if (r[ecc.status - 1] !== STATUS.ExpenseClaim.PAID) {
        return;
      }
      var claimId = r[ecc.claim_id - 1];
      var claimTotal = Number(r[ecc.total_amount - 1]) || 0;
      var payoutsSum = payoutSumsByClaim[claimId] || 0;
      var check = CoreDecisions.checkPayoutSum(payoutsSum, claimTotal);
      if (!check.ok) {
        issues.push(
          "ExpenseClaim " +
            claimId +
            ": payouts sum " +
            payoutsSum +
            " != total_amount " +
            claimTotal
        );
      }
    });

  return issues;
}

/**
 * @return {{issues: string[], warnings: string[]}} a hard-failure issue per
 *   LOCKED claim whose current values no longer match the hash stored at
 *   LOCK time; a soft warning per claim LOCKED before that hash existed
 *   (cannot verify, but not itself evidence of tampering)
 * @private
 */
function Jobs_checkLockedRowsUnchanged_() {
  var issues = [];
  var warnings = [];
  var ecc = COLS.ExpenseClaims;
  var lockedClaimIds = [];
  getSheet_(TABS.EXPENSE_CLAIMS)
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach((r) => {
      if (!r[ecc.claim_id - 1]) {
        return;
      }
      if (r[ecc.status - 1] === STATUS.ExpenseClaim.LOCKED) {
        lockedClaimIds.push(r[ecc.claim_id - 1]);
      }
    });
  if (lockedClaimIds.length === 0) {
    return { issues, warnings };
  }

  var alc = COLS.AuditLog;
  var lockedHashByClaim = {};
  getSheet_(TABS.AUDIT_LOG)
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach((r) => {
      if (!r[alc.seq - 1]) {
        return;
      }
      if (
        r[alc.entity_type - 1] !== "ExpenseClaim" ||
        r[alc.action - 1] !== "TRANSITION"
      ) {
        return;
      }
      var detail;
      try {
        detail = JSON.parse(r[alc.detail - 1]);
      } catch (e) {
        return;
      }
      if (detail.action === "LOCK" && detail.lockedHash) {
        lockedHashByClaim[r[alc.entity_id - 1]] = detail.lockedHash;
      }
    });

  lockedClaimIds.forEach((claimId) => {
    var storedHash = lockedHashByClaim[claimId];
    if (!storedHash) {
      warnings.push(
        "ExpenseClaim " +
          claimId +
          ": LOCKED before hash-tracking, cannot verify"
      );
      return;
    }
    var currentHash = Engine.computeCurrentLockedHash(claimId);
    if (currentHash !== storedHash) {
      issues.push(
        "ExpenseClaim " +
          claimId +
          ": LOCKED row hash mismatch - possible tampering"
      );
    }
  });

  return { issues, warnings };
}
