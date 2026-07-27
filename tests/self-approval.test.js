"use strict";

const { COLS, ROLES, STATUS } = require("../Constants");
const originalGlobals = {
  COLS: global.COLS,
  ROLES: global.ROLES,
  STATUS: global.STATUS,
};

global.COLS = COLS;
global.ROLES = ROLES;
global.STATUS = STATUS;

const { CoreDecisions } = require("../CoreDecisions");

describe("committee-operated Claim self-approval", () => {
  afterAll(() => {
    Object.assign(global, originalGlobals);
  });

  it("uses created_by as the Claim review owner", () => {
    const values = [];
    values[COLS.ExpenseClaims.claimant_id - 1] = "MEMBER-1";
    values[COLS.ExpenseClaims.created_by - 1] = "OPERATOR-1";

    expect(CoreDecisions.ownerId("ExpenseClaim", values)).toBe("OPERATOR-1");
  });

  it("rejects Committee self-verification", () => {
    const definition = CoreDecisions.findTransition(
      "ExpenseClaim",
      STATUS.ExpenseClaim.SUBMITTED,
      "VERIFY"
    );

    expect(
      CoreDecisions.authorize(definition, true, ROLES.COMMITTEE, {})
    ).toEqual({ ok: false, reason: "COMMITTEE_SELF_VERIFICATION" });
  });

  it("allows and flags Treasurer self-verification", () => {
    const definition = CoreDecisions.findTransition(
      "ExpenseClaim",
      STATUS.ExpenseClaim.SUBMITTED,
      "VERIFY"
    );

    expect(
      CoreDecisions.authorize(definition, true, ROLES.TREASURER, {})
    ).toEqual({ ok: true, reason: null });
    expect(CoreDecisions.isSelfApproval(true, "VERIFY")).toBe(true);
  });

  it("flags only self-actions for information, rejection, and closure", () => {
    for (const action of ["REQUEST_INFO", "REJECT", "CLOSE"]) {
      expect(CoreDecisions.isSelfApproval(true, action)).toBe(true);
      expect(CoreDecisions.isSelfApproval(false, action)).toBe(false);
    }
  });
});
