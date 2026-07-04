var CoreAudit = {
  calculateHash: function(prevHash, rowDataStr) {
    var raw = prevHash + '|' + rowDataStr;
    if (typeof Utilities !== 'undefined') {
      // GAS environment
      var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
      return signature.map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0'); }).join('');
    } else {
      // Node environment
      return require('crypto').createHash('sha256').update(raw).digest('hex');
    }
  }
};
if (typeof module !== 'undefined') { module.exports = { CoreAudit }; }
