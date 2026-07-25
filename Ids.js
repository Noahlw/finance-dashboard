"use strict";
/**
 * Ids.gs — ID generation for every entity, backed by the Counters tab.
 * Allocation happens under a script lock so concurrent triggers (e.g.
 * two form submissions arriving together) never hand out the same ID.
 */

var Ids = {
  /**
   * @param {string} entityType
   * @param {number} n
   * @return {string}
   * @private
   */
  _formatId(entityType, n) {
    var prefix = ENTITY_PREFIX[entityType];
    if (!prefix) {
      throw new Error("Unknown entity type for ID generation: " + entityType);
    }
    var padded = Ids._padNumber(n, entityType);
    var semesterScoped =
      entityType === "Event" ||
      entityType === "BudgetRequest" ||
      entityType === "ExpenseClaim" ||
      entityType === "Income" ||
      entityType === "Payout";
    if (semesterScoped) {
      var sem = Config.get("CURRENT_SEMESTER");
      return prefix + "-" + sem + "-" + padded;
    }
    return prefix + "-" + padded;
  },

  /**
   * Zero-pad a sequence number. Global entities (User, Receipt) use 4
   * digits; semester-scoped entities use 3 digits.
   * @param {number} n
   * @param {string} entityType
   * @return {string}
   * @private
   */
  _padNumber(n, entityType) {
    var width = entityType === "User" || entityType === "Receipt" ? 4 : 3;
    var s = String(n);
    while (s.length < width) {
      s = "0" + s;
    }
    return s;
  },

  /**
   * Build a child ID from a parent ID's semester+sequence portion.
   * e.g. childId('BUDGET-26A-003', 1, 'BUDGETLINE') -> 'BUDGETLINE-26A-003-01'
   *      childId('CLAIM-26A-014', 2, 'CLAIMLINE') -> 'CLAIMLINE-26A-014-02'
   * @param {string} parentId
   * @param {number} seq 1-based child sequence number
   * @param {string} childPrefix 'BUDGETLINE' or 'CLAIMLINE'
   * @return {string}
   */
  childId(parentId, seq, childPrefix) {
    var parts = parentId.split("-"); // e.g. ['BUDGET','26A','003']
    var semAndSeq = parts.slice(1).join("-"); // '26A-003'
    var seqStr = String(seq);
    while (seqStr.length < 2) {
      seqStr = "0" + seqStr;
    }
    return childPrefix + "-" + semAndSeq + "-" + seqStr;
  },
  /**
   * Allocate the next sequential ID for an entity type.
   * @param {string} entityType a key of ENTITY_PREFIX (e.g. 'BudgetRequest', 'User', 'Receipt')
   * @return {string} formatted ID, e.g. 'BUDGET-26A-001', 'USER-0001', 'RECEIPT-0001'
   */
  nextId(entityType) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30_000);
    } catch (e) {
      Discord.postTreasury(
        "🚨 CRITICAL: Script lock timeout in Ids.nextId (" + entityType + ")"
      );
      throw e;
    }
    try {
      var sheet = getSheet_(TABS.COUNTERS);
      var values = sheet.getDataRange().getValues();
      var rowIndex = -1; // 1-indexed sheet row of the matching Counters row
      var lastN = 0;
      for (var i = 1; i < values.length; i++) {
        // row 0 is the header
        if (values[i][COLS.Counters.entity - 1] === entityType) {
          rowIndex = i + 1;
          lastN = Number(values[i][COLS.Counters.last_n - 1]) || 0;
          break;
        }
      }
      var next = lastN + 1;
      if (rowIndex === -1) {
        sheet.appendRow([entityType, next]);
      } else {
        sheet.getRange(rowIndex, COLS.Counters.last_n).setValue(next);
      }
      return Ids._formatId(entityType, next);
    } finally {
      lock.releaseLock();
    }
  },
};
