import type { MyClaimsResponse, ClaimPayload, EditClaimPayload, SessionResponse, BudgetRequest, BudgetRequestDraftPayload, PendingBudgetRequest, BudgetDecisionPayload, Member, AddMemberPayload, ClaimDraftPayload, UploadReceiptResponse, ClaimQueueItem, ClaimQueueFilters, TransitionResult, FinanceAccount, AddAccountPayload, IncomeItem, RecordIncomePayload, AccountTransfer, AccountAdjustment, PayoutQueueItem, DashboardSummary, ReportType, ReportFilters, ReportData, MigrationState, MigrationPreview, MigrationSelections } from '../types';

export const apiService = {
  resolveSession: (): Promise<SessionResponse> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({
            allowed: true,
            user_id: 'USER-MOCK',
            display_name: 'Mock User',
            role: 'COMMITTEE',
            views: ['review', 'claims', 'members', 'budget-requests', 'income', 'payouts', 'reports']
          });
        }, 300);
        return;
      }

      let attempts = 0;
      const maxAttempts = 3;

      const call = () => {
        attempts++;
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(() => {
            if (attempts < maxAttempts) {
              setTimeout(call, 1000);
            } else {
              resolve({ allowed: false, reason: 'no_session' });
            }
          })
          .api_resolveSession();
      };

      call();
    });
  },

  getMyClaims: (): Promise<MyClaimsResponse> => {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({
            claims: [
              { claim_id: 'CLAIM-001', claimant_id: 'MEMBER-1', status: 'SUBMITTED', submitted_at: '2026-07-16', total_amount: 150.50, notes: 'Conference tickets' },
              { claim_id: 'CLAIM-002', claimant_id: 'MEMBER-1', status: 'SUBMITTED', submitted_at: '2026-07-10', total_amount: 45.00, notes: 'Pizza for meeting' }
            ],
            requests: [
              { request_id: 'BUDGET-101', title: 'Fall Gala', status: 'APPROVED', submitted_at: '2026-07-01' }
            ],
            budgetLines: [
              { line_id: 'BUDGETLINE-123', request_id: 'BUDGET-101', description: 'Gala Food', remaining: 500.00 }
            ]
          });
        }, 500);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .api_getMyClaims();
    });
  },

  submitClaim: (payload: ClaimPayload): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          console.log('Mock submit claim:', payload);
          resolve({ success: true, claimId: 'CLAIM-MOCK' });
        }, 500);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .api_submitClaim(payload);
    });
  },

  editClaim: (payload: EditClaimPayload): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          console.log('Mock edit claim:', payload);
          resolve({ success: true });
        }, 500);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .api_editClaim(payload);
    });
  },

  uploadReceipt: (fileName: string, mimeType: string, base64Data: string, vendor: string, receiptDate: string, receiptTotal: number): Promise<UploadReceiptResponse> => {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          console.log('Mock upload receipt:', fileName);
          resolve({ receiptId: 'RECEIPT-MOCK' });
        }, 1000);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .api_uploadReceipt(fileName, mimeType, base64Data, vendor, receiptDate, receiptTotal);
    });
  },

  getMembers: (): Promise<Member[]> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve([
            { user_id: 'MEMBER-1', display_name: 'Alice Member', active: true },
            { user_id: 'MEMBER-2', display_name: 'Bob Member', active: false }
          ]);
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_getMembers();
    });
  },

  addMember: (payload: AddMemberPayload): Promise<Member> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({ user_id: 'MEMBER-MOCK', display_name: payload.display_name, active: true });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_addMember(payload);
    });
  },

  reactivateMember: (userId: string): Promise<{ user_id: string; active: boolean }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({ user_id: userId, active: true });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_reactivateMember(userId);
    });
  },

  saveClaimDraft: (payload: ClaimDraftPayload): Promise<{ claim_id: string; status: string }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({ claim_id: payload.claimId || 'CLAIM-MOCK', status: 'DRAFT' });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_saveClaimDraft(payload);
    });
  },

  submitDraftClaim: (claimId: string): Promise<{ claim_id: string; status: string }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({ claim_id: claimId, status: 'SUBMITTED' });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_submitDraftClaim(claimId);
    });
  },

  deleteOrphanedReceipt: (receiptId: string): Promise<{ success: boolean }> => {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({ success: true });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .api_deleteOrphanedReceipt(receiptId);
    });
  },

  getMyBudgetRequests: (): Promise<BudgetRequest[]> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve([{
            request_id: 'BUDGET-26A-001',
            requester_id: 'U-001',
            event_id: '',
            title: 'Mock Budget Request',
            justification: 'For testing',
            needed_by: '2026-08-15',
            status: 'PENDING',
            submitted_at: '2026-07-21',
            decided_at: '',
            decided_by: '',
            decision_note: '',
            lines: [{ line_id: 'BL-001', request_id: 'BUDGET-26A-001', category_id: 'CAT-1', description: 'Catering', requested_amount: 500, approved_amount: 0, line_status: 'PENDING', claimed_amount: 0, remaining: 500 }]
          }]);
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_getMyBudgetRequests();
    });
  },

  saveBudgetRequestDraft: (payload: BudgetRequestDraftPayload): Promise<{ request_id: string; status: string }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({ request_id: 'BUDGET-MOCK', status: 'DRAFT' });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_saveBudgetRequestDraft(payload);
    });
  },

  submitBudgetRequest: (requestId: string): Promise<{ request_id: string; status: string }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({ request_id: requestId, status: 'PENDING' });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_submitBudgetRequest(requestId);
    });
  },

  discardBudgetRequest: (requestId: string): Promise<{ request_id: string; status: string }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({ request_id: requestId, status: 'WITHDRAWN' });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_discardBudgetRequest(requestId);
    });
  },

  getPendingBudgetRequests: (): Promise<PendingBudgetRequest[]> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve([{
            request_id: 'BUDGET-26A-002',
            title: 'Pending Mock',
            requester_id: 'U-002',
            justification: 'Needs funds',
            needed_by: '2026-09-01',
            submitted_at: '2026-07-20',
            total_requested: 1000
          }]);
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_getPendingBudgetRequests();
    });
  },

  getClaimsQueue: (filters?: ClaimQueueFilters): Promise<ClaimQueueItem[]> => {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve([
            { claim_id: 'CLAIM-001', claimant_id: 'M-001', status: 'SUBMITTED', submitted_at: '2026-07-20', total_amount: 150, notes: 'Conference tickets', created_by: 'U-001' },
            { claim_id: 'CLAIM-002', claimant_id: 'M-002', status: 'VERIFIED', submitted_at: '2026-07-19', verified_at: '2026-07-21', total_amount: 200, notes: 'Supplies', created_by: 'U-002' }
          ]);
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .api_getClaimsQueue(filters || {});
    });
  },

  verifyClaim: (claimId: string, payload?: any): Promise<TransitionResult> => {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ claim_id: claimId, from: 'SUBMITTED', to: 'VERIFIED' }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .api_verifyClaim(claimId, payload || {});
    });
  },

  rejectClaim: (claimId: string, reason: string): Promise<TransitionResult> => {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ claim_id: claimId, from: 'SUBMITTED', to: 'REJECTED' }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .api_rejectClaim(claimId, reason);
    });
  },

  requestInfo: (claimId: string, reason: string): Promise<TransitionResult> => {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ claim_id: claimId, from: 'SUBMITTED', to: 'NEEDS_INFO' }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .api_requestInfo(claimId, reason);
    });
  },

  resubmitClaim: (claimId: string): Promise<TransitionResult> => {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ claim_id: claimId, from: 'NEEDS_INFO', to: 'SUBMITTED' }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .api_resubmitClaim(claimId);
    });
  },

  approvePayout: (claimId: string): Promise<TransitionResult> => {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ claim_id: claimId, from: 'VERIFIED', to: 'APPROVED_FOR_PAYOUT' }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .api_approvePayout(claimId);
    });
  },

  decisionBudgetRequest: (entityId: string, action: string, payload: BudgetDecisionPayload): Promise<{ request_id: string; from: string; to: string }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({ request_id: entityId, from: 'PENDING', to: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_decisionBudgetRequest(entityId, action, payload);
    });
  },

  // ─── Finance Accounts ───

  getAccounts: (): Promise<FinanceAccount[]> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve([{ account_id: 'AC-001', name: 'Main Checking', opening_balance: 10167.35, current_balance: 10167.35, pending_income: 0, reserved_payouts: 0, status: 'ACTIVE', created_at: '2026-07-01' }]);
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_getAccounts();
    });
  },

  addAccount: (payload: AddAccountPayload): Promise<FinanceAccount> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({ account_id: 'AC-MOCK', name: payload.name, opening_balance: payload.opening_balance || 0, current_balance: payload.opening_balance || 0, pending_income: 0, reserved_payouts: 0, status: 'ACTIVE', created_at: new Date().toISOString().slice(0, 10) });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_addAccount(payload);
    });
  },

  renameAccount: (accountId: string, name: string): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_renameAccount(accountId, name);
    });
  },

  deactivateAccount: (accountId: string): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_deactivateAccount(accountId);
    });
  },

  // ─── Income ───

  recordIncome: (payload: RecordIncomePayload): Promise<{ success: boolean; income_id?: string }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ success: true, income_id: 'INC-MOCK' }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_recordIncome(payload);
    });
  },

  getPendingIncome: (): Promise<IncomeItem[]> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve([]), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_getPendingIncome();
    });
  },

  confirmIncome: (incomeId: string, payload: { accountId?: string; note?: string }): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_confirmIncome(incomeId, payload);
    });
  },

  rejectIncome: (incomeId: string, note?: string): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_rejectIncome(incomeId, note);
    });
  },

  requestIncomeInfo: (incomeId: string, note?: string): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_requestIncomeInfo(incomeId, note);
    });
  },

  // ─── Account Transfers & Adjustments ───

  recordAdjustment: (payload: { accountId: string; amount: number; direction: string; reason: string }): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_recordAdjustment(payload);
    });
  },

  recordTransfer: (payload: { fromAccountId: string; toAccountId: string; amount: number; reason: string }): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_recordTransfer(payload);
    });
  },

  getTransfers: (): Promise<AccountTransfer[]> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve([]), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_getTransfers();
    });
  },

  getAdjustments: (): Promise<AccountAdjustment[]> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve([]), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_getAdjustments();
    });
  },

  // ─── Payout Queue ───

  getQueuedPayouts: (): Promise<PayoutQueueItem[]> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve([]), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_getQueuedPayouts();
    });
  },

  markPayoutSent: (payoutId: string, payload: { txnReference: string; amount?: number; accountId?: string }): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_markPayoutSent(payoutId, payload);
    });
  },

  recordPayoutFailed: (payoutId: string, reason: string): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_recordPayoutFailed(payoutId, reason);
    });
  },

  retryPayout: (payoutId: string): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_retryPayout(payoutId);
    });
  },

  approvePayoutWithAccount: (claimId: string, accountId: string): Promise<TransitionResult> => {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ claim_id: claimId, from: 'VERIFIED', to: 'APPROVED_FOR_PAYOUT' }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .api_approvePayout(claimId, accountId);
    });
  },

  // ─── Dashboard ───

  getDashboardSummary: (): Promise<DashboardSummary> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({
            missing_receipts: [
              { claim_id: 'CLAIM-MOCK-1', claim_status: 'SUBMITTED', notes: 'Office supplies', total_amount: 150.00 }
            ],
            over_budget_claims: [
              { claim_id: 'CLAIM-MOCK-2', budget_line_id: 'BL-MOCK', claimed: 600, remaining: 500, claim_status: 'SUBMITTED' }
            ],
            needs_info_claims: [
              { claim_id: 'CLAIM-MOCK-3', claim_status: 'NEEDS_INFO', notes: 'Event catering', total_amount: 200.00, submitted_at: '2026-07-20' }
            ],
            failed_payouts: [
              { payout_id: 'PAY-MOCK', claim_id: 'CLAIM-MOCK-4', amount: 300.00, failure_reason: 'Bank declined' }
            ],
            pending_requests: [
              { request_id: 'BUDGET-MOCK', title: 'Summer event', submitted_at: '2026-07-15', requester_id: 'U-001' }
            ],
            counts: { missing_receipts: 1, over_budget: 1, needs_info: 1, failed_payouts: 1, pending_requests: 1, total_attention: 5 }
          });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_getDashboardSummary();
    });
  },

  // ─── Reports ───

  getReportsData: (reportType: ReportType, filters?: ReportFilters): Promise<ReportData> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          const mockRows = (() => {
            switch (reportType) {
              case 'claims':
                return [
                  { claim_id: 'CLAIM-001', claimant_id: 'M-001', status: 'PAID', submitted_at: '2026-07-10', verified_at: '2026-07-12', approved_at: '2026-07-14', paid_at: '2026-07-16', total_amount: 150, notes: 'Test claim', created_by: 'U-001', event_id: '', semester: '26A', expense_date: '2026-07-05', payout_method: 'FPS' }
                ];
              case 'budget':
                return [
                  { request_id: 'BUDGET-001', title: 'Mock Budget', status: 'APPROVED', submitted_at: '2026-07-01', decided_at: '2026-07-03', total_requested: 500, total_approved: 450, lines: [] }
                ];
              case 'income':
                return [
                  { income_id: 'INC-001', date: '2026-07-01', category_id: 'CAT-1', amount: 1000, received_by: 'U-001', source_ref: '', notes: 'Mock income', account_id: 'AC-1', status: 'CONFIRMED' }
                ];
              case 'payouts':
                return [
                  { payout_id: 'PAY-001', claim_id: 'CLAIM-001', amount: 150, method: 'FPS', txn_reference: 'TXN123', status: 'SENT', account_id: 'AC-1', paid_at: '2026-07-16', confirmed_at: '', failure_reason: '' }
                ];
              default:
                return [];
            }
          })();
          resolve({ type: reportType, rows: mockRows, count: mockRows.length });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_getReportsData(reportType, filters || {});
    });
  },

  exportCsv: (reportType: ReportType, filters?: ReportFilters): Promise<string> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve('Claim ID,Claimant,Status,Amount,Notes\nCLAIM-001,M-001,PAID,150,Test\n');
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_exportCsv(reportType, filters || {});
    });
  },

  // ─── Semester ───

  getSemesterStatus: (): Promise<{ current_semester: string; start_date: string; end_date: string; closeable: boolean; blockers: any[]; blocker_count: number }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({ current_semester: 'SEM A', start_date: '2026-09-01', end_date: '2026-12-31', closeable: true, blockers: [], blocker_count: 0 });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_getSemesterStatus();
    });
  },

  suggestSemester: (expenseDate: string): Promise<{ semester: string }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ semester: 'SEM A' }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_suggestSemester(expenseDate);
    });
  },

  correctSemester: (entityType: string, entityId: string, newSemester: string): Promise<{ ok: boolean; from: string; to: string }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ ok: true, from: 'SEM A', to: newSemester }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_correctSemester(entityType, entityId, newSemester);
    });
  },

  closeSemester: (): Promise<{ ok: boolean; closed: string; next?: string; ready_for_migration?: boolean }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ ok: true, closed: 'SEM A', next: 'SEM B', ready_for_migration: false }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_closeSemester();
    });
  },

  // ─── Annual Migration ───

  getMigrationState: (): Promise<MigrationState | null> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve(null), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_getMigrationState();
    });
  },

  getMigrationPreview: (): Promise<MigrationPreview> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({
            current_year: 'SEM A',
            next_committee_year: 27,
            year_label: '26-27 (27)',
            active_members: [{ user_id: 'M-1', display_name: 'Alice', role: 'MEMBER', active: true, email: '' }],
            inactive_members: [],
            operators: [{ user_id: 'U-1', display_name: 'Treasurer', role: 'TREASURER', active: true, email: 'citycf41@gmail.com' }],
            accounts: [{ account_id: 'AC-1', name: 'Main', current_balance: 10000, status: 'ACTIVE' }],
            categories: [{ category_id: 'CAT-1', name: 'Marketing', kind: 'EXPENSE', active: true }],
            events: [{ event_id: 'EVT-1', name: 'Fall Gala', semester: 'SEM A' }],
            has_treasurer: true
          });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_getMigrationPreview();
    });
  },

  startMigration: (): Promise<{ ok: boolean; stage: string; year_label: string }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ ok: true, stage: 'CONFIGURE', year_label: '26-27 (27)' }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_startMigration();
    });
  },

  setMigrationSelections: (selections: MigrationSelections): Promise<{ ok: boolean; stage: string }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ ok: true, stage: 'REVIEW' }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_setMigrationSelections(selections);
    });
  },

  getMigrationSelections: (): Promise<MigrationSelections> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ memberIds: ['M-1'], accountIds: ['AC-1'], categoryIds: ['CAT-1'], eventIds: ['EVT-1'], accountBalances: {}, balanceReasons: {} }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_getMigrationSelections();
    });
  },

  executeMigration: (): Promise<{ ok: boolean; stage: string }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ ok: true, stage: 'REVIEW' }), 500);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_executeMigration();
    });
  },

  activateMigration: (): Promise<{ ok: boolean; stage: string }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ ok: true, stage: 'ACTIVATED' }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_activateMigration();
    });
  },

  cancelMigration: (): Promise<{ ok: boolean }> => {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => resolve({ ok: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler(resolve)
        .api_cancelMigration();
    });
  }
};
