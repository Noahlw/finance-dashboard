"use strict";
/**
 * Config.gs — spreadsheet accessors + Config tab reader.
 * Every other file gets its CF-Ledger / CF-Vault handles through the
 * getLedger_/getVault_/getSheet_/getVaultSheet_ helpers defined here,
 * so there is exactly one place that knows how workbooks are located.
 */

var CONFIG_CACHE_SECONDS = 60;
var CONFIG_CACHE_KEY = "cf_config_cache_v1";

/**
 * @return {Spreadsheet} the CF-Ledger workbook.
 * @throws if Setup.setupAll() has not run yet (LEDGER_ID unset).
 */
function getLedger_() {
  var id = PropertiesService.getScriptProperties().getProperty("LEDGER_ID");
  if (!id) {
    throw new Error(
      "LEDGER_ID not set in Script Properties. Run Setup.setupAll() first."
    );
  }
  return SpreadsheetApp.openById(id);
}

/**
 * @return {Spreadsheet} the CF-Vault workbook (PII; treasurer-only).
 * @throws if Setup.setupAll() has not run yet (VAULT_ID unset).
 */
function getVault_() {
  var id = PropertiesService.getScriptProperties().getProperty("VAULT_ID");
  if (!id) {
    throw new Error(
      "VAULT_ID not set in Script Properties. Run Setup.setupAll() first."
    );
  }
  return SpreadsheetApp.openById(id);
}

/**
 * @param {string} tabName one of TABS.* (ledger-side tab name)
 * @return {Sheet}
 * @throws if the tab does not exist
 */
function getSheet_(tabName) {
  var sh = getLedger_().getSheetByName(tabName);
  if (!sh) {
    throw new Error("Tab not found in CF-Ledger: " + tabName);
  }
  return sh;
}

/**
 * @return {Sheet} the Vault tab in CF-Vault.
 * @throws if the tab does not exist
 */
function getVaultSheet_() {
  var sh = getVault_().getSheetByName(TABS.VAULT);
  if (!sh) {
    throw new Error("Vault tab not found in CF-Vault.");
  }
  return sh;
}

var Config = {
  /**
   * Read all Config rows into a plain object, cached for CONFIG_CACHE_SECONDS.
   * @return {Object<string,string>}
   */
  _readAll() {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(CONFIG_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    var sheet = getSheet_(TABS.CONFIG);
    var values = sheet.getDataRange().getValues();
    var map = {};
    for (var i = 1; i < values.length; i++) {
      // row 0 is the header
      var key = values[i][COLS.Config.key - 1];
      var val = values[i][COLS.Config.value - 1];
      if (key) {
        map[key] = val;
      }
    }
    cache.put(CONFIG_CACHE_KEY, JSON.stringify(map), CONFIG_CACHE_SECONDS);
    return map;
  },

  /**
   * @param {string} key
   * @return {string} the raw string value
   * @throws if the key is missing or empty (e.g. still 'PASTE_ME')
   */
  get(key) {
    var map = Config._readAll();
    if (
      !Object.hasOwn(map, key) ||
      map[key] === "" ||
      map[key] === "PASTE_ME"
    ) {
      throw new Error(
        "Config key missing/unset: " + key + ". Set it in the Config tab."
      );
    }
    return String(map[key]);
  },

  /**
   * @param {string} key
   * @return {boolean} true iff the stored value equals 'TRUE' (case-insensitive)
   */
  getBool(key) {
    return String(Config.get(key)).trim().toUpperCase() === "TRUE";
  },

  /**
   * @param {string} key
   * @return {number}
   * @throws if the value is not numeric
   */
  getNum(key) {
    var raw = Config.get(key);
    var n = Number(raw);
    if (isNaN(n)) {
      throw new Error("Config key is not a number: " + key + " = " + raw);
    }
    return n;
  },

  /**
   * Read a key without throwing (used for optional webhook URLs that may
   * legitimately still be 'PASTE_ME' before CP-A/CP-C are done).
   * @param {string} key
   * @return {?string} the value, or null if missing/empty/'PASTE_ME'
   */
  getOptional(key) {
    var map = Config._readAll();
    var val = map[key];
    if (!val || val === "PASTE_ME") {
      return null;
    }
    return String(val);
  },

  /** Invalidate the cache. Call after writing to the Config tab. */
  invalidate() {
    CacheService.getScriptCache().remove(CONFIG_CACHE_KEY);
  },
};
