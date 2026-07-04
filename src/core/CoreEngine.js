let _STATUS, _ACTIONS, _CoreValidations, _CoreAudit;

if (typeof module !== 'undefined') {
  const Constants = require('./Constants');
  const CoreValidations = require('./CoreValidations').CoreValidations;
  const CoreAudit = require('./CoreAudit').CoreAudit;
  
  _STATUS = Constants.STATUS;
  _ACTIONS = Constants.ACTIONS;
  _CoreValidations = CoreValidations;
  _CoreAudit = CoreAudit;
} else {
  _STATUS = STATUS;
  _ACTIONS = ACTIONS;
  _CoreValidations = CoreValidations;
  _CoreAudit = CoreAudit;
}

var CoreEngine = {
  transition: function(entityType, id, action, payload, currentState, actorRole, prevHash) {
    if (entityType === 'BudgetRequest' && action === _ACTIONS.APPROVE) {
      if (!_CoreValidations.canApprove(currentState, actorRole)) {
        return { success: false, error: 'Invalid' };
      }
      
      var newHash = _CoreAudit.calculateHash(prevHash, id + '|' + _ACTIONS.APPROVE);
      return {
        success: true,
        commands: [
          { action: 'UPDATE', id: id, field: 'status', value: _STATUS.BudgetRequest.APPROVED },
          { action: 'APPEND_AUDIT', row_hash: newHash, detail: _ACTIONS.APPROVE }
        ]
      };
    }
    return { success: false, error: 'Unknown route' };
  }
};
if (typeof module !== 'undefined') { module.exports = { CoreEngine }; }
