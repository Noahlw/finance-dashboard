var CoreEngine = {
  getDeps: function() {
    if (typeof module !== 'undefined') {
      return {
        STATUS: require('./Constants').STATUS,
        ACTIONS: require('./Constants').ACTIONS,
        CoreValidations: require('./CoreValidations').CoreValidations,
        CoreAudit: require('./CoreAudit').CoreAudit
      };
    }
    return { STATUS: STATUS, ACTIONS: ACTIONS, CoreValidations: CoreValidations, CoreAudit: CoreAudit };
  },
  transition: function(entityType, id, action, payload, currentState, actorRole, prevHash) {
    var deps = this.getDeps();
    if (entityType === 'BudgetRequest' && action === deps.ACTIONS.APPROVE) {
      if (!deps.CoreValidations.canApprove(currentState, actorRole)) {
        return { success: false, error: 'Invalid' };
      }
      
      var newHash = deps.CoreAudit.calculateHash(prevHash, id + '|' + deps.ACTIONS.APPROVE);
      return {
        success: true,
        commands: [
          { action: 'UPDATE', id: id, field: 'status', value: deps.STATUS.BudgetRequest.APPROVED },
          { action: 'APPEND_AUDIT', row_hash: newHash, detail: deps.ACTIONS.APPROVE }
        ]
      };
    }
    return { success: false, error: 'Unknown route' };
  }
};
if (typeof module !== 'undefined') { module.exports = { CoreEngine }; }
