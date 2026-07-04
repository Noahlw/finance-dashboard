/**
 * SetupStyling.gs — purely cosmetic formatting for the CF-Ledger tabs.
 * Never touches data, validation, or protection; safe to call on every
 * setupAll() run (each function is a plain overwrite, never additive).
 */

/**
 * Color-code Approvals rows by entity_type for scanability, and set
 * sensible column widths. Idempotent: setConditionalFormatRules replaces
 * the whole rule list rather than appending to it, so re-running never
 * stacks duplicate rules.
 * @param {Spreadsheet} ledger
 */
function Setup_styleApprovalsTab(ledger) {
  var sheet = ledger.getSheetByName(TABS.APPROVALS);
  if (!sheet) return;
  var c = COLS.Approvals;
  var numCols = Object.keys(c).length;
  var dataRange = sheet.getRange(2, 1, 999, numCols);

  // whenTextEqualTo evaluates per-cell, so it would only tint the
  // entity_type cell itself. Anchor a column-locked, row-relative formula
  // on entity_type instead so the whole row tints.
  var entityTypeCol = '$' + Setup_columnToLetter_(c.entity_type) + '2';
  var rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=' + entityTypeCol + '="BudgetRequest"').setBackground('#e3f2fd').setRanges([dataRange]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=' + entityTypeCol + '="ExpenseClaim"').setBackground('#e8f5e9').setRanges([dataRange]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=' + entityTypeCol + '="Payout"').setBackground('#fff3e0').setRanges([dataRange]).build()
  ];
  sheet.setConditionalFormatRules(rules);

  sheet.setColumnWidth(c.title, 220);
  sheet.setColumnWidth(c.requester_or_claimant, 160);
  sheet.setColumnWidth(c.note, 220);
  sheet.setColumnWidth(c.confirm, 70);
}

/**
 * @param {number} col 1-indexed column number
 * @return {string} A1-style column letter(s)
 * @private
 */
function Setup_columnToLetter_(col) {
  var letter = '';
  while (col > 0) {
    var rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

/**
 * Bold + background header row and reasonable column widths for every
 * user-facing CF-Ledger tab. Idempotent: re-setting formatting/width is
 * always a plain overwrite, never additive.
 * @param {Spreadsheet} ledger
 */
function Setup_styleTabHeaders(ledger) {
  var tabNames = [
    TABS.USERS, TABS.CATEGORIES, TABS.EVENTS, TABS.BUDGET_REQUESTS,
    TABS.BUDGET_REQUEST_LINES, TABS.EXPENSE_CLAIMS, TABS.CLAIM_LINE_ITEMS,
    TABS.RECEIPTS, TABS.INCOME, TABS.PAYOUTS, TABS.AUDIT_LOG,
    TABS.APPROVALS, TABS.CONFIG
  ]; // Counters excluded: hidden, implementation detail, not for humans
  for (var i = 0; i < tabNames.length; i++) {
    var sheet = ledger.getSheetByName(tabNames[i]);
    if (!sheet) continue;
    var numCols = Object.keys(COLS[tabNames[i]]).length;
    sheet.getRange(1, 1, 1, numCols).setFontWeight('bold').setBackground('#f1f3f4');
    for (var col = 1; col <= numCols; col++) {
      try { sheet.autoResizeColumn(col); } catch (e) { /* ignore if column not renderable yet */ }
    }
  }
}
