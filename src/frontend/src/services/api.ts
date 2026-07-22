import type { MyClaimsResponse, ClaimPayload, EditClaimPayload, SessionResponse, BudgetRequest, BudgetRequestDraftPayload, PendingBudgetRequest, BudgetDecisionPayload, Member, AddMemberPayload, ClaimDraftPayload, UploadReceiptResponse } from '../types';

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
            views: ['claims', 'budget-requests']
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
  }
};
