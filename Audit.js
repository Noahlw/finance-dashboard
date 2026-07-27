"use strict";
/**
 * Audit.gs — append-only, hash-chained audit log. The Engine (and Setup,
 * for system-created rows) call Audit.append for every mutation. Nothing
 * else may write to the AuditLog tab.
 */

var Audit = {
  /**
   * Compute a row's hash. Input format is fixed: seq|ts|actor|entityType|
   * entityId|action|detail|prevHash, SHA-256, lowercase hex. This format
   * MUST NOT change without updating Statement.gs's re-verification.
   * @private
   */
  _hashRow(seq, ts, actor, entityType, entityId, action, detail, prevHash) {
    var input = [
      seq,
      ts,
      actor,
      entityType,
      entityId,
      action,
      detail,
      prevHash,
    ].join("|");
    var digestBytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      input,
      Utilities.Charset.UTF_8
    );
    var hex = "";
    for (var i = 0; i < digestBytes.length; i++) {
      var b = digestBytes[i];
      var v = (b < 0 ? b + 256 : b).toString(16);
      hex += v.length === 1 ? "0" + v : v;
    }
    return hex;
  },

  /**
   * @return {string} current time as ISO-8601 in the Asia/Hong_Kong zone
   * @private
   */
  _nowIso() {
    return Utilities.formatDate(
      new Date(),
      "Asia/Hong_Kong",
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    );
  },
  /**
   * Append one audit row, chaining its hash to the previous row's hash.
   * @param {string} actorUserId a User.user_id, or 'SYSTEM' for automated actions
   * @param {string} entityType e.g. 'ExpenseClaim'
   * @param {string} entityId e.g. 'CLAIM-26A-014'
   * @param {string} action e.g. 'CREATE'|'TRANSITION'|'FIELD_SET'|'LOCK'|'SNAPSHOT'|'TRANSITION_DENIED'|'NOTIFY_FAIL'
   * @param {Object} detailObj JSON-serializable detail, e.g. {from:'SUBMITTED', to:'VERIFIED'}
   * @param {?string=} idempotencyKey optional key stored in detail; matching
   *        entity/action/key calls return the original row atomically
   * @return {{seq:number, rowHash:string}}
   */
  append(actorUserId, entityType, entityId, action, detailObj, idempotencyKey) {
    var lock = LockService.getScriptLock();
    lock.waitLock(30_000);
    try {
      var sheet = getSheet_(TABS.AUDIT_LOG);
      var lastRow = sheet.getLastRow();
      var numCols = Object.keys(COLS.AuditLog).length;
      var detailObject = Object.assign({}, detailObj || {});
      if (idempotencyKey) {
        detailObject.idempotencyKey = idempotencyKey;
        if (lastRow > 1) {
          var existingRows = sheet
            .getRange(2, 1, lastRow - 1, numCols)
            .getValues();
          for (
            var existingIndex = 0;
            existingIndex < existingRows.length;
            existingIndex++
          ) {
            var existing = existingRows[existingIndex];
            if (
              existing[COLS.AuditLog.entity_type - 1] !== entityType ||
              existing[COLS.AuditLog.entity_id - 1] !== entityId ||
              existing[COLS.AuditLog.action - 1] !== action
            ) {
              continue;
            }
            try {
              var existingDetail = JSON.parse(
                String(existing[COLS.AuditLog.detail - 1] || "{}")
              );
              if (existingDetail.idempotencyKey === idempotencyKey) {
                return {
                  rowHash: String(existing[COLS.AuditLog.row_hash - 1]),
                  seq: Number(existing[COLS.AuditLog.seq - 1]),
                };
              }
            } catch (e) {
              // A malformed historical detail row cannot satisfy the key.
            }
          }
        }
      }
      var prevHash = "GENESIS";
      var seq = 1;
      if (lastRow > 1) {
        // row 1 is the header; data starts at row 2
        var lastValues = sheet.getRange(lastRow, 1, 1, numCols).getValues()[0];
        seq = Number(lastValues[COLS.AuditLog.seq - 1]) + 1;
        prevHash = String(lastValues[COLS.AuditLog.row_hash - 1]);
      }
      var ts = Audit._nowIso();
      var detail = JSON.stringify(detailObject);
      var rowHash = Audit._hashRow(
        seq,
        ts,
        actorUserId,
        entityType,
        entityId,
        action,
        detail,
        prevHash
      );
      sheet.appendRow([
        seq,
        ts,
        actorUserId,
        entityType,
        entityId,
        action,
        detail,
        prevHash,
        rowHash,
      ]);
      SpreadsheetApp.flush(); // Crucial for rapid consecutive appends so getLastRow() isn't stale
      return { rowHash, seq };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Re-walk the entire AuditLog and confirm every row's hash matches
   * recomputation from its own fields + the previous row's stored hash.
   * @return {{ok: boolean, badSeq: ?number}}
   */
  verifyChain() {
    var sheet = getSheet_(TABS.AUDIT_LOG);
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { badSeq: null, ok: true };
    }
    var numCols = Object.keys(COLS.AuditLog).length;
    var values = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
    var expectedPrev = "GENESIS";
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var seq = row[COLS.AuditLog.seq - 1];
      var ts = row[COLS.AuditLog.ts - 1];
      var actor = row[COLS.AuditLog.actor_user_id - 1];
      var entityType = row[COLS.AuditLog.entity_type - 1];
      var entityId = row[COLS.AuditLog.entity_id - 1];
      var action = row[COLS.AuditLog.action - 1];
      var detail = row[COLS.AuditLog.detail - 1];
      var prevHash = row[COLS.AuditLog.prev_hash - 1];
      var rowHash = row[COLS.AuditLog.row_hash - 1];
      if (prevHash !== expectedPrev) {
        return { badSeq: seq, ok: false };
      }
      var recomputed = Audit._hashRow(
        seq,
        ts,
        actor,
        entityType,
        entityId,
        action,
        detail,
        prevHash
      );
      if (recomputed !== rowHash) {
        return { badSeq: seq, ok: false };
      }
      expectedPrev = rowHash;
    }
    return { badSeq: null, ok: true };
  },
};
