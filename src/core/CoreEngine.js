var CoreEngine = {
  transition: function(entityType, id, action, payload, currentState, actorRole, prevHash) {
    if (entityType === 'BudgetRequest' && action === 'APPROVE') {
      if (actorRole !== 'TREASURER' || currentState.status !== 'PENDING') return { success: false, error: 'Invalid' };
      
      var newHash = 'dummyhash'; // CoreAudit.calculateHash(prevHash, '...'); // simplified for plan
      return {
        success: true,
        commands: [
          { action: 'UPDATE', id: id, field: 'status', value: 'APPROVED' },
          { action: 'APPEND_AUDIT', row_hash: newHash, detail: 'APPROVED' }
        ]
      };
    }
    return { success: false, error: 'Unknown route' };
  }
};
if (typeof module !== 'undefined') { module.exports = { CoreEngine }; }
