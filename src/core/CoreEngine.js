if (typeof module !== 'undefined') {
  var Constants = require('./Constants');
  var STATUS = Constants.STATUS;
  var ACTIONS = Constants.ACTIONS;
  var CoreValidations = require('./CoreValidations').CoreValidations;
  var CoreAudit = require('./CoreAudit').CoreAudit;
}

var CoreEngine = {
  transition: function(entityType, id, action, payload, currentState, actorRole, prevHash) {
    if (entityType === 'BudgetRequest' && action === ACTIONS.APPROVE) {
      if (!CoreValidations.canApprove(currentState, actorRole)) {
        return { success: false, error: 'Invalid' };
      }
      
      var newHash = CoreAudit.calculateHash(prevHash, id + '|' + ACTIONS.APPROVE);
      return {
        success: true,
        commands: [
          { action: 'UPDATE', id: id, field: 'status', value: STATUS.BudgetRequest.APPROVED },
          { action: 'APPEND_AUDIT', row_hash: newHash, detail: ACTIONS.APPROVE }
        ]
      };
    }
    return { success: false, error: 'Unknown route' };
  }
};
if (typeof module !== 'undefined') { module.exports = { CoreEngine }; }
