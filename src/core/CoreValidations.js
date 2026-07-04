var CoreValidations = {
  canApprove: function(request, actorRole) {
    return request.status === 'PENDING' && actorRole === 'TREASURER';
  }
};
if (typeof module !== 'undefined') { module.exports = { CoreValidations }; }
