"use strict";
/**
 * Onboarding.gs — committee/treasurer onboarding form handler (P3-3).
 * Distinct from IntakeForms.gs's create-only, dedupe-by-response-id model:
 * onboarding is upsert-by-identity (a person may legitimately resubmit to
 * update their payout handle), so there is no processed_response_id here.
 */

/**
 * Installable onFormSubmit trigger for the onboarding form.
 * @param {Object} e form submit event
 */
function onFormSubmitOnboarding(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30_000);
  } catch (err) {
    Discord.postTreasury(
      "🚨 CRITICAL: Script lock timeout in onFormSubmitOnboarding"
    );
    throw err;
  }
  try {
    var answers = IntakeForms_answersByTitle(e.response);
    var email = e.response.getRespondentEmail() || "";
    var displayName = answers["Full name"] || "(no name given)";

    var user = Onboarding_resolveOrCreateUser_(email, displayName);

    Onboarding_writeVaultRow_(user.userId, {
      consent_ts: Audit._nowIso(),
      full_name: displayName,
      payout_handle: answers["Payout handle"] || "",
      payout_method: answers["Payout method"] || "",
      student_id: answers["Student ID"] || "",
    });

    // PII (full_name/student_id/payout_handle) must never land in the
    // AuditLog — it's broadly readable by committee/treasurer, and Vault's
    // whole purpose (design §4.2) is to keep that data out of the ledger.
    Audit.append(user.userId, "User", user.userId, "ONBOARDED", {
      isNew: user.isNew,
      role: user.role,
      source: "ONBOARDING_FORM",
      userId: user.userId,
    });

    if (user.isNew) {
      Discord.postTreasury(
        "⚠️ New COMMITTEE user created via Onboarding form: " +
          user.userId +
          " (" +
          email +
          ") — verify this was an expected exco addition."
      );
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Find an existing Users row by email, or create a new COMMITTEE one.
 * Never downgrades an existing user's role.
 * @param {string} email
 * @param {string} displayName
 * @return {{userId: string, isNew: boolean, role: string}}
 * @private
 */
function Onboarding_resolveOrCreateUser_(email, displayName) {
  var sheet = getSheet_(TABS.USERS);
  var values = sheet.getDataRange().getValues();
  var c = COLS.Users;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][c.email - 1]).toLowerCase() === email.toLowerCase()) {
      return {
        isNew: false,
        role: values[i][c.role - 1],
        userId: values[i][c.user_id - 1],
      };
    }
  }
  var userId = Ids.nextId("User");
  var now = Audit._nowIso();
  sheet.appendRow([userId, displayName, ROLES.COMMITTEE, email, true, now]);
  return { isNew: true, role: ROLES.COMMITTEE, userId };
}

/**
 * Upsert a Vault row by user_id: update in place if one exists (a person
 * may legitimately resubmit to update their payout handle), else append.
 * @param {string} userId
 * @param {{full_name: string, student_id: string, payout_method: string, payout_handle: string, consent_ts: string}} fields
 * @private
 */
function Onboarding_writeVaultRow_(userId, fields) {
  var sheet = getVaultSheet_();
  var values = sheet.getDataRange().getValues();
  var c = COLS.Vault;
  var row = [
    userId,
    fields.full_name,
    fields.student_id,
    fields.payout_method,
    fields.payout_handle,
    fields.consent_ts,
  ];

  var targetRow;
  for (var i = 1; i < values.length; i++) {
    if (values[i][c.user_id - 1] === userId) {
      targetRow = i + 1;
      break;
    }
  }
  if (targetRow) {
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
    targetRow = sheet.getLastRow();
  }

  // Force student_id/payout_handle to plain text — Sheets otherwise
  // auto-coerces numeric-looking strings to numbers, silently dropping a
  // leading zero from a phone number or ID (e.g. "0912345678" -> 912345678).
  sheet
    .getRange(targetRow, c.student_id)
    .setNumberFormat("@")
    .setValue(fields.student_id);
  sheet
    .getRange(targetRow, c.payout_handle)
    .setNumberFormat("@")
    .setValue(fields.payout_handle);
}
