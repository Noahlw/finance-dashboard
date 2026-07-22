"use strict";
var CoreAudit = {
  calculateHash(prevHash, rowDataStr) {
    var raw = prevHash + "|" + rowDataStr;
    if (typeof Utilities === "undefined") {
      // Node environment
      return require("crypto").createHash("sha256").update(raw).digest("hex");
    }
    // GAS environment
    var signature = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      raw
    );
    return signature
      .map((b) => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0"))
      .join("");
  },
};
if (typeof module !== "undefined") {
  module.exports = { CoreAudit };
}
