var GasSheetRepository = {
  getBudgetRequest: function(id) {
    // Stub for getting budget request
  },

  executeCommands: function(commands) {
    for (var i = 0; i < commands.length; i++) {
      var cmd = commands[i];
      if (cmd.action === 'UPDATE') {
        // e.g. sheet.getRange(...).setValue(cmd.value);
      }
    }
  }
};

if (typeof module !== 'undefined') {
  module.exports = { GasSheetRepository };
}
