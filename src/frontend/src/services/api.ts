import type { MyClaimsResponse, ClaimPayload, EditClaimPayload } from '../types';

export const apiService = {
  getMyClaims: (): Promise<MyClaimsResponse> => {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script) {
        setTimeout(() => {
          resolve({
            claims: [
              { claim_id: 'CLAIM-001', status: 'SUBMITTED', submitted_at: '2026-07-16', total_amount: 150.50, notes: 'Conference tickets' },
              { claim_id: 'CLAIM-002', status: 'REIMBURSED', submitted_at: '2026-07-10', total_amount: 45.00, notes: 'Pizza for meeting' }
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

  uploadReceipt: (fileName: string, mimeType: string, base64Data: string, vendor: string, receiptDate: string, receiptTotal: number): Promise<{ receiptId: string }> => {
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
  }
};
