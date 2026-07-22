declare namespace google {
  namespace script {
    namespace run {
      function withSuccessHandler(handler: Function): any;
      function withFailureHandler(handler: Function): any;
      function api_getMyClaims(): void;
      function api_submitClaim(payload: any): void;
      function api_editClaim(payload: any): void;
      function api_uploadReceipt(fileName: string, mimeType: string, base64Data: string, vendor: string, receiptDate: string, receiptTotal: number): void;
      function api_resolveSession(): void;
      function api_saveClaimDraft(payload: any): void;
      function api_submitDraftClaim(claimId: string): void;
      function api_deleteOrphanedReceipt(receiptId: string): void;
      function api_getMembers(): void;
      function api_addMember(payload: any): void;
      function api_reactivateMember(userId: string): void;
      function api_getMyBudgetRequests(): void;
      function api_saveBudgetRequestDraft(payload: any): void;
      function api_submitBudgetRequest(requestId: string): void;
      function api_discardBudgetRequest(requestId: string): void;
      function api_getPendingBudgetRequests(): void;
      function api_decisionBudgetRequest(entityId: string, action: string, payload: any): void;
      function api_getClaimsQueue(filters: any): void;
      function api_verifyClaim(claimId: string, payload: any): void;
      function api_rejectClaim(claimId: string, reason: string): void;
      function api_requestInfo(claimId: string, reason: string): void;
      function api_resubmitClaim(claimId: string): void;
      function api_approvePayout(claimId: string): void;
    }
  }
}
