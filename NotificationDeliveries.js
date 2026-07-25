"use strict";

var NotificationDeliveries = {
  create(channel, entityType, entityId, message) {
    var deliveryId = Ids.nextId("NotificationDelivery");
    var now = Audit._nowIso();
    _appendRow(getSheet_(TABS.NOTIFICATION_DELIVERIES), [
      deliveryId,
      channel,
      entityType,
      entityId,
      message,
      "PENDING",
      0,
      "",
      now,
      "",
      now,
    ]);
    Audit.append("SYSTEM", "NotificationDelivery", deliveryId, "CREATE", {
      channel,
      entityId,
      entityType,
      status: "PENDING",
    });
    return deliveryId;
  },

  listFailed() {
    var values = getSheet_(TABS.NOTIFICATION_DELIVERIES)
      .getDataRange()
      .getValues();
    var c = COLS.NotificationDeliveries;
    var deliveries = [];
    for (var i = 1; i < values.length; i++) {
      if (values[i][c.status - 1] !== "FAILED") {
        continue;
      }
      deliveries.push({
        attempts: Number(values[i][c.attempts - 1]) || 0,
        channel: values[i][c.channel - 1],
        delivery_id: values[i][c.delivery_id - 1],
        entity_id: values[i][c.entity_id - 1],
        entity_type: values[i][c.entity_type - 1],
        last_error: values[i][c.last_error - 1] || "",
        status: "FAILED",
        updated_at: values[i][c.updated_at - 1],
      });
    }
    return deliveries;
  },

  load(deliveryId) {
    var sheet = getSheet_(TABS.NOTIFICATION_DELIVERIES);
    var values = sheet.getDataRange().getValues();
    var c = COLS.NotificationDeliveries;
    for (var i = 1; i < values.length; i++) {
      if (values[i][c.delivery_id - 1] === deliveryId) {
        return { rowIndex: i + 1, sheet, values: values[i] };
      }
    }
    return null;
  },

  mark(deliveryId, status, errorMessage) {
    var row = NotificationDeliveries.load(deliveryId);
    if (!row) {
      return;
    }
    var c = COLS.NotificationDeliveries;
    var attempts = Number(row.values[c.attempts - 1]) || 0;
    var now = Audit._nowIso();
    row.sheet.getRange(row.rowIndex, c.status).setValue(status);
    row.sheet.getRange(row.rowIndex, c.attempts).setValue(attempts + 1);
    row.sheet.getRange(row.rowIndex, c.last_error).setValue(errorMessage || "");
    row.sheet.getRange(row.rowIndex, c.updated_at).setValue(now);
    if (status === "SENT") {
      row.sheet.getRange(row.rowIndex, c.sent_at).setValue(now);
    }
    Audit.append("SYSTEM", "NotificationDelivery", deliveryId, status, {
      attempts: attempts + 1,
      error: errorMessage || null,
    });
  },
};

if (typeof module !== "undefined") {
  module.exports = { NotificationDeliveries };
}
