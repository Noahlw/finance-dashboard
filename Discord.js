"use strict";
/**
 * Discord.gs — outbound-only notifications via channel webhooks (D6).
 * Never throws: a notification failure must never roll back a transition.
 * Failures are swallowed and logged to AuditLog as NOTIFY_FAIL.
 */

var Discord = {
  /**
   * @param {string} url
   * @param {Object} options
   * @return {boolean} true if the response code is 2xx
   * @private
   */
  _attempt(url, options) {
    try {
      var resp = UrlFetchApp.fetch(url, options);
      var code = resp.getResponseCode();
      return code >= 200 && code < 300;
    } catch (e) {
      return false;
    }
  },

  /**
   * @param {string} entityType
   * @param {string} entityId
   * @param {string} message
   * @private
   */
  _logFailure(entityType, entityId, message) {
    try {
      Audit.append("SYSTEM", entityType, entityId, "NOTIFY_FAIL", { message });
    } catch (e) {
      // Even audit logging must not throw out of Discord.gs.
    }
  },

  /**
   * POST text to a webhook URL read from Config, retrying once on failure.
   * Never throws.
   * @param {string} configKey 'TREASURY_WEBHOOK_URL' | 'STATUS_WEBHOOK_URL'
   * @param {string} text
   * @param {string} entityType used for the AuditLog record if this fails
   * @param {string} entityId used for the AuditLog record if this fails
   * @private
   */
  _postToWebhook(configKey, text, entityType, entityId) {
    text = Discord._sanitize(text);
    var deliveryId = null;
    try {
      deliveryId = NotificationDeliveries.create(
        configKey,
        entityType,
        entityId,
        text
      );
    } catch (e) {
      // Delivery recording must not make notifications finance-critical.
    }
    var url = Config.getOptional(configKey);
    if (!url) {
      if (deliveryId) {
        NotificationDeliveries.mark(
          deliveryId,
          "FAILED",
          "Webhook URL not set (" + configKey + ")"
        );
      }
      Discord._logFailure(
        entityType,
        entityId,
        "Webhook URL not set (" + configKey + "); notification skipped."
      );
      return deliveryId;
    }
    var options = {
      contentType: "application/json",
      method: "post",
      muteHttpExceptions: true,
      payload: JSON.stringify({ content: text.substring(0, 1900) }),
    };
    var ok = Discord._attempt(url, options);
    if (!ok) {
      Utilities.sleep(2000);
      ok = Discord._attempt(url, options);
    }
    if (!ok) {
      if (deliveryId) {
        NotificationDeliveries.mark(
          deliveryId,
          "FAILED",
          "Discord webhook POST failed twice for " + configKey
        );
      }
      Discord._logFailure(
        entityType,
        entityId,
        "Discord webhook POST failed twice for " + configKey
      );
    } else if (deliveryId) {
      NotificationDeliveries.mark(deliveryId, "SENT", "");
    }
    return deliveryId;
  },
  _sanitize(text) {
    return String(text || "")
      .replace(/\s*\(ref:[^)]+\)/gi, "")
      .replace(
        /(transaction reference|txn reference|payout handle):?\s*\S+/gi,
        "$1: [REDACTED]"
      );
  },

  /**
   * Post a self-approval disclosure to #treasury (D5) — always sent,
   * never suppressed, regardless of who the approver/verifier is.
   * @param {string} entityId
   * @param {string} actorUserId
   * @param {number} amount
   */
  postSelfApproved(entityId, actorUserId, amount) {
    var text =
      "⚠️ **Self-approved**: " +
      entityId +
      " was approved/verified by its own requester/claimant (" +
      actorUserId +
      "), amount HK$" +
      Number(amount).toFixed(2) +
      ".";
    Discord._postToWebhook(
      "TREASURY_WEBHOOK_URL",
      text,
      "SelfApproved",
      entityId
    );
  },

  /**
   * Post a member-safe line to #finance-status. Never includes names or
   * payout handles. Includes the amount only if Config.PUBLIC_SHOW_AMOUNTS
   * is TRUE.
   * @param {string} entityId
   * @param {string} title
   * @param {string} status
   * @param {?number} amountOrNull
   */
  postStatus(entityId, title, status, amountOrNull) {
    var line = entityId + " · " + title + " · " + status;
    var showAmounts = false;
    try {
      showAmounts = Config.getBool("PUBLIC_SHOW_AMOUNTS");
    } catch (e) {
      showAmounts = false;
    }
    if (showAmounts && amountOrNull !== null && amountOrNull !== undefined) {
      line += " · HK$" + Number(amountOrNull).toFixed(2);
    }
    Discord._postToWebhook(
      "STATUS_WEBHOOK_URL",
      line,
      "FinanceStatus",
      entityId
    );
  },
  /**
   * Post full-detail text to the private #treasury channel.
   * Callers (Engine.gs) format the message, e.g.
   * "**CLAIM-26A-014** — Camp BBQ receipts — SUBMITTED → VERIFIED (by Noah)".
   * @param {string} text
   */
  postTreasury(text) {
    Discord._postToWebhook("TREASURY_WEBHOOK_URL", text, "Treasury", "CHANNEL");
  },

  retry(deliveryId) {
    var row = NotificationDeliveries.load(deliveryId);
    if (!row) {
      return { ok: false, reason: "NOT_FOUND" };
    }
    var c = COLS.NotificationDeliveries;
    if (row.values[c.status - 1] !== "FAILED") {
      return { ok: false, reason: "ONLY_FAILED_DELIVERIES_CAN_BE_RETRIED" };
    }
    var configKey = row.values[c.channel - 1];
    var url = Config.getOptional(configKey);
    if (!url) {
      NotificationDeliveries.mark(
        deliveryId,
        "FAILED",
        "Webhook URL not set (" + configKey + ")"
      );
      return { ok: false, reason: "WEBHOOK_NOT_CONFIGURED" };
    }
    var text = Discord._sanitize(row.values[c.message - 1]);
    var options = {
      contentType: "application/json",
      method: "post",
      muteHttpExceptions: true,
      payload: JSON.stringify({ content: text.substring(0, 1900) }),
    };
    var ok = Discord._attempt(url, options);
    NotificationDeliveries.mark(
      deliveryId,
      ok ? "SENT" : "FAILED",
      ok ? "" : "Discord webhook retry failed"
    );
    return { ok, reason: ok ? null : "DELIVERY_FAILED" };
  },
};

if (typeof module !== "undefined") {
  module.exports = { Discord };
}
