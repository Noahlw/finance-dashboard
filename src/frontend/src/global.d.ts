declare namespace google {
  namespace script {
    namespace run {
      function withSuccessHandler(handler: Function): any;
      function withFailureHandler(handler: Function): any;

      // Session + deprecated claim flows
      function api_resolveSession(): void;
      function api_getMyClaims(): void;
      function api_submitClaim(payload: any): void;
      function api_editClaim(payload: any): void;
      function api_uploadReceipt(
        fileName: string,
        mimeType: string,
        base64Data: string,
        vendor: string,
        receiptDate: string,
        receiptTotal: number
      ): void;
      function api_deleteOrphanedReceipt(receiptId: string): void;

      // Claim intake + draft
      function api_saveClaimDraft(payload: any): void;
      function api_submitDraftClaim(claimId: string): void;
      function api_attachReceipts(claimId: string, receiptIds: string[]): void;

      // Member directory
      function api_getMembers(): void;
      function api_addMember(payload: any): void;
      function api_reactivateMember(userId: string): void;

      // Budget Requests
      function api_getMyBudgetRequests(): void;
      function api_saveBudgetRequestDraft(payload: any): void;
      function api_submitBudgetRequest(requestId: string): void;
      function api_discardBudgetRequest(requestId: string): void;
      function api_getPendingBudgetRequests(): void;
      function api_decisionBudgetRequest(
        entityId: string,
        action: string,
        payload: any
      ): void;

      // Claim Review
      function api_getClaimsQueue(filters: any): void;
      function api_verifyClaim(claimId: string, payload: any): void;
      function api_rejectClaim(claimId: string, reason: string): void;
      function api_requestInfo(claimId: string, reason: string): void;
      function api_resubmitClaim(claimId: string): void;

      // Finance Accounts
      function api_getAccounts(): void;
      function api_addAccount(payload: any): void;
      function api_renameAccount(accountId: string, newName: string): void;
      function api_deactivateAccount(accountId: string): void;

      // Income
      function api_recordIncome(payload: any): void;
      function api_getPendingIncome(): void;
      function api_confirmIncome(incomeId: string, accountId: string): void;
      function api_rejectIncome(incomeId: string, reason: string): void;
      function api_requestIncomeInfo(incomeId: string, reason: string): void;

      // Account Adjustments & Transfers
      function api_recordAdjustment(payload: any): void;
      function api_recordTransfer(payload: any): void;
      function api_getTransfers(): void;
      function api_getAdjustments(accountId?: string): void;

      // Payout Lifecycle
      function api_approvePayout(claimId: string, accountId?: string): void;
      function api_getQueuedPayouts(): void;
      function api_markPayoutSent(payoutId: string, payload: any): void;
      function api_recordPayoutFailed(
        payoutId: string,
        failureReason: string
      ): void;
      function api_retryPayout(payoutId: string): void;

      // Dashboard + Reports
      function api_getDashboardSummary(): void;
      function api_getReportsData(reportType: string, filters?: any): void;
      function api_exportCsv(reportType: string, filters?: any): void;

      // Semester Close
      function api_getSemesterStatus(): void;
      function api_suggestSemester(expenseDate: string): void;
      function api_correctSemester(
        entityType: string,
        entityId: string,
        newSemester: string
      ): void;
      function api_closeSemester(): void;

      // Annual Migration
      function api_getMigrationState(): void;
      function api_getMigrationPreview(): void;
      function api_startMigration(): void;
      function api_setMigrationSelections(selections: any): void;
      function api_getMigrationSelections(): void;
      function api_executeMigration(): void;
      function api_activateMigration(): void;
      function api_cancelMigration(): void;
    }
  }
}
