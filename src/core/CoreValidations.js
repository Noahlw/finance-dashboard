var CoreValidations = {
  canApprove: function(request, actorRole) {
    var _STATUS = typeof module !== 'undefined' ? require('./Constants').STATUS : STATUS;
    var _ROLES = typeof module !== 'undefined' ? require('./Constants').ROLES : ROLES;
    return request.status === _STATUS.BudgetRequest.PENDING && actorRole === _ROLES.TREASURER;
  }
};
if (typeof module !== 'undefined') { module.exports = { CoreValidations }; }
