"use strict";

const fs = require("node:fs");
const path = require("node:path");

describe("safe annual setup", () => {
  it("keeps destructive clearing out of setupAll", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "Setup.js"),
      "utf8"
    );
    const setupBody = source.slice(
      source.indexOf("function setupAll()"),
      source.indexOf("function Setup_ensureAllTabsExist")
    );

    expect(setupBody).not.toContain("Setup_clearAllData");
  });

  it("denies resetAllData when the active user is not the owner", () => {
    global.SpreadsheetApp = {
      getActive: () => ({
        getOwner: () => ({ getEmail: () => "owner@example.com" }),
      }),
    };
    global.Session = {
      getActiveUser: () => ({ getEmail: () => "operator@example.com" }),
    };

    const { resetAllData } = require("../Setup.js");

    expect(() => resetAllData()).toThrow("AUTH_DENIED");
  });
});
