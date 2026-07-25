"use strict";

const originalGlobals = {
  Audit: global.Audit,
  Config: global.Config,
  NotificationDeliveries: global.NotificationDeliveries,
  UrlFetchApp: global.UrlFetchApp,
  Utilities: global.Utilities,
};

describe("Discord delivery audit", () => {
  beforeEach(() => {
    jest.resetModules();
    global.NotificationDeliveries = {
      create: jest.fn(() => "NOTICE-1"),
      mark: jest.fn(),
    };
    global.Config = { getOptional: jest.fn(() => "https://example.invalid") };
    global.Audit = { append: jest.fn() };
    global.Utilities = { sleep: jest.fn() };
    global.UrlFetchApp = {
      fetch: jest.fn(() => ({ getResponseCode: () => 204 })),
    };
  });

  afterEach(() => {
    Object.assign(global, originalGlobals);
  });

  it("records pending then sent without exposing transaction references", () => {
    const { Discord } = require("../Discord");

    Discord._postToWebhook(
      "TREASURY_WEBHOOK_URL",
      "PAYOUT-1 sent (ref: SECRET-123)",
      "Payout",
      "PAYOUT-1"
    );

    expect(global.NotificationDeliveries.create).toHaveBeenCalledWith(
      "TREASURY_WEBHOOK_URL",
      "Payout",
      "PAYOUT-1",
      "PAYOUT-1 sent"
    );
    expect(global.NotificationDeliveries.mark).toHaveBeenCalledWith(
      "NOTICE-1",
      "SENT",
      ""
    );
  });

  it("records failed delivery without throwing", () => {
    global.UrlFetchApp.fetch.mockImplementation(() => {
      throw new Error("network");
    });
    const { Discord } = require("../Discord");

    expect(() =>
      Discord._postToWebhook(
        "TREASURY_WEBHOOK_URL",
        "Safe notice",
        "Payout",
        "PAYOUT-1"
      )
    ).not.toThrow();
    expect(global.NotificationDeliveries.mark).toHaveBeenCalledWith(
      "NOTICE-1",
      "FAILED",
      expect.stringContaining("failed twice")
    );
  });
});
