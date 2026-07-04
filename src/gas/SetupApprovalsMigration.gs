/**
 * SetupApprovalsMigration.gs — one-time, idempotent repair of the
 * Approvals tab's column layout for spreadsheets that already have the
 * pre-payout_method/payout_reference-split layout deployed.
 * Setup_ensureAllTabsExist only writes headers to BRAND NEW tabs, so an
 * existing Approvals tab never picks up new COLS.Approvals entries on its
 * own — this function is that missing piece. Safe to call on every
 * setupAll() run: no-ops once the header row already contains
 * 'payout_method'.
 */

/**
 * @param {Spreadsheet} ledger
 * @return {{migrated: boolean, reason: ?string}}
 */
function Setup_migrateApprovalsColumns(ledger) {
  var sheet = ledger.getSheetByName(TABS.APPROVALS);
  if (!sheet) return { migrated: false, reason: 'NO_SHEET' };

  var lastCol = Math.max(sheet.getLastColumn(), Object.keys(COLS.Approvals).length);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  if (headers.indexOf('payout_method') !== -1) {
    return { migrated: false, reason: 'ALREADY_CURRENT' };
  }

  // Locate 'confirm' by header text (not a hardcoded old column number) so
  // this still works even if someone hand-edited the header row.
  var confirmColIndex = headers.indexOf('confirm') + 1; // 1-indexed; 0 if absent
  if (confirmColIndex === 0) {
    Discord.postTreasury(
      '🚨 Approvals tab exists but its header row has no "confirm" column — cannot ' +
      'auto-migrate payout_method/payout_reference. Fix the header row manually, then re-run setupAll().'
    );
    return { migrated: false, reason: 'NO_CONFIRM_HEADER' };
  }

  sheet.insertColumnsBefore(confirmColIndex, 2);
  sheet.getRange(1, confirmColIndex, 1, 2).setValues([['payout_method', 'payout_reference']]);

  return { migrated: true, reason: null };
}
