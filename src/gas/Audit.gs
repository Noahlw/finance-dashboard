/**
 * Audit.gs — append-only, hash-chained audit log. The Engine (and Setup,
 * for system-created rows) call Audit.append for every mutation. Nothing
 * else may write to the AuditLog tab.
 */

var Audit = {
  /**
   * Append one audit row, chaining its hash to the previous row's hash.
   * @param {string} actorUserId a User.user_id, or 'SYSTEM' for automated actions
   * @param {string} entityType e.g. 'ExpenseClaim'
   * @param {string} entityId e.g. 'EC-26A-014'
   * @param {string} action e.g. 'CREATE'|'TRANSITION'|'FIELD_SET'|'LOCK'|'SNAPSHOT'|'TRANSITION_DENIED'|'NOTIFY_FAIL'
   * @param {Object} detailObj JSON-serializable detail, e.g. {from:'SUBMITTED', to:'VERIFIED'}
   * @return {{seq:number, rowHash:string}}
   */
  append: function (actorUserId, entityType, entityId, action, detailObj) {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var sheet = getSheet_(TABS.AUDIT_LOG);
      var lastRow = sheet.getLastRow();
      var numCols = Object.keys(COLS.AuditLog).length;
      var prevHash = 'GENESIS';
      var seq = 1;
      if (lastRow > 1) { // row 1 is the header; data starts at row 2
        var lastValues = sheet.getRange(lastRow, 1, 1, numCols).getValues()[0];
        seq = Number(lastValues[COLS.AuditLog.seq - 1]) + 1;
        prevHash = String(lastValues[COLS.AuditLog.row_hash - 1]);
      }
      var ts = Audit._nowIso();
      var detail = JSON.stringify(detailObj || {});
      var rowHash = Audit._hashRow(seq, ts, actorUserId, entityType, entityId, action, detail, prevHash);
      sheet.appendRow([seq, ts, actorUserId, entityType, entityId, action, detail, prevHash, rowHash]);
      return { seq: seq, rowHash: rowHash };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Re-walk the entire AuditLog and confirm every row's hash matches
   * recomputation from its own fields + the previous row's stored hash.
   * @return {{ok: boolean, badSeq: ?number}}
   */
  verifyChain: function () {
    var sheet = getSheet_(TABS.AUDIT_LOG);
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { ok: true, badSeq: null };
    var numCols = Object.keys(COLS.AuditLog).length;
    var values = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
    var expectedPrev = 'GENESIS';
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
      if (prevHash !== expectedPrev) return { ok: false, badSeq: seq };
      var recomputed = Audit._hashRow(seq, ts, actor, entityType, entityId, action, detail, prevHash);
      if (recomputed !== rowHash) return { ok: false, badSeq: seq };
      expectedPrev = rowHash;
    }
    return { ok: true, badSeq: null };
  },

  /**
   * @return {string} current time as ISO-8601 in the Asia/Hong_Kong zone
   * @private
   */
  _nowIso: function () {
    return Utilities.formatDate(new Date(), 'Asia/Hong_Kong', "yyyy-MM-dd'T'HH:mm:ssXXX");
  },

  /**
   * Compute a row's hash. Input format is fixed: seq|ts|actor|entityType|
   * entityId|action|detail|prevHash, SHA-256, lowercase hex. This format
   * MUST NOT change without updating Statement.gs's re-verification.
   * @private
   */
  _hashRow: function (seq, ts, actor, entityType, entityId, action, detail, prevHash) {
    var input = [seq, ts, actor, entityType, entityId, action, detail, prevHash].join('|');
    var digestBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
    var hex = '';
    for (var i = 0; i < digestBytes.length; i++) {
      var b = digestBytes[i];
      var v = (b < 0 ? b + 256 : b).toString(16);
      hex += (v.length === 1 ? '0' + v : v);
    }
    return hex;
  }
};
