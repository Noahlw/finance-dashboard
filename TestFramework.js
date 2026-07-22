"use strict";
/**
 * TestFramework.js
 */

function TestFramework_assert(condition, message) {
  if (!condition) {
    throw new Error("Assertion failed: " + message);
  }
}

function TestFramework_teardown() {
  var ledger = getLedger_();
  var tabsToClear = [
    TABS.USERS,
    TABS.CATEGORIES,
    TABS.EVENTS,
    TABS.BUDGET_REQUESTS,
    TABS.BUDGET_REQUEST_LINES,
    TABS.EXPENSE_CLAIMS,
    TABS.CLAIM_LINE_ITEMS,
    TABS.RECEIPTS,
    TABS.INCOME,
    TABS.PAYOUTS,
    TABS.AUDIT_LOG,
    TABS.APPROVALS,
  ];

  for (var i = 0; i < tabsToClear.length; i++) {
    var sheet = ledger.getSheetByName(tabsToClear[i]);
    if (!sheet) {
      continue;
    }
    var data = sheet.getDataRange().getValues();
    // Scan backwards so row deletion doesn't mess up indexes
    for (var r = data.length - 1; r >= 1; r--) {
      var id = String(data[r][0] || "");
      if (id.indexOf("TEST-") === 0) {
        sheet.deleteRow(r + 1);
      }
    }
  }
}
