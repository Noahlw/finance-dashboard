import type {
  AccountAdjustment,
  AccountTransfer,
  AddAccountPayload,
  AddMemberPayload,
  AtomicClaimPayload,
  BudgetDecisionPayload,
  BudgetRequest,
  BudgetRequestDraftPayload,
  ClaimDraftPayload,
  ClaimDraftResponse,
  ClaimPayload,
  ClaimQueueFilters,
  ClaimQueueItem,
  CloseEventPayload,
  CloseEventResult,
  CorrectEventPayload,
  DashboardSummary,
  EditClaimPayload,
  EditEventPayload,
  Event,
  EventPayload,
  FinanceAccount,
  IncomeItem,
  Member,
  MigrationPreview,
  MigrationSelections,
  MigrationState,
  MyClaimsResponse,
  PayoutQueueItem,
  PendingBudgetRequest,
  ReconciliationData,
  RecordIncomePayload,
  ReportData,
  ReportFilters,
  ReportType,
  SessionResponse,
  TransitionResult,
  UploadReceiptResponse,
} from "../types";

export const apiService = {
  activateMigration: (): Promise<{ ok: boolean; stage: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ ok: true, stage: "ACTIVATED" }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_activateMigration();
    }),

  addAccount: (payload: AddAccountPayload): Promise<FinanceAccount> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({
            account_id: "AC-MOCK",
            created_at: new Date().toISOString().slice(0, 10),
            current_balance: payload.opening_balance || 0,
            name: payload.name,
            opening_balance: payload.opening_balance || 0,
            pending_income: 0,
            reserved_payouts: 0,
            status: "ACTIVE",
          });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_addAccount(payload);
    }),

  addMember: (payload: AddMemberPayload): Promise<Member> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({
            active: true,
            display_name: payload.display_name,
            user_id: "MEMBER-MOCK",
          });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_addMember(payload);
    }),

  approvePayout: (claimId: string): Promise<TransitionResult> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () =>
            resolve({
              claim_id: claimId,
              from: "VERIFIED",
              to: "APPROVED_FOR_PAYOUT",
            }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_approvePayout(claimId);
    }),

  approvePayoutWithAccount: (
    claimId: string,
    accountId: string
  ): Promise<TransitionResult> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () =>
            resolve({
              claim_id: claimId,
              from: "VERIFIED",
              to: "APPROVED_FOR_PAYOUT",
            }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_approvePayout(claimId, accountId);
    }),
  atomicSubmitClaim: (
    payload: AtomicClaimPayload
  ): Promise<{ claim_id: string; status: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () =>
            resolve({
              claim_id: payload.claimId || "CLAIM-MOCK",
              status: "SUBMITTED",
            }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            const error = new Error(result.error.message);
            Object.assign(error, { details: result.error.details });
            reject(error);
          }
        })
        .withFailureHandler(reject)
        .api_atomicSubmitClaim(payload);
    }),

  cancelMigration: (): Promise<{ ok: boolean }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ ok: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_cancelMigration();
    }),

  closeEvent: (payload: CloseEventPayload): Promise<CloseEventResult> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () =>
            resolve({
              closed_at: new Date().toISOString(),
              event_id: payload.event_id,
              status: "CLOSED",
            }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_closeEvent(payload);
    }),

  closeSemester: (): Promise<{
    ok: boolean;
    closed: string;
    next?: string;
    ready_for_migration?: boolean;
  }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () =>
            resolve({
              closed: "SEM A",
              next: "SEM B",
              ok: true,
              ready_for_migration: false,
            }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_closeSemester();
    }),

  confirmIncome: (
    incomeId: string,
    payload: { accountId?: string; note?: string }
  ): Promise<{ success: boolean }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_confirmIncome(incomeId, payload);
    }),

  correctEvent: (payload: CorrectEventPayload): Promise<{ event_id: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ event_id: payload.event_id }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_correctEvent(payload);
    }),

  correctSemester: (
    entityType: string,
    entityId: string,
    newSemester: string
  ): Promise<{ ok: boolean; from: string; to: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () => resolve({ from: "SEM A", ok: true, to: newSemester }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_correctSemester(entityType, entityId, newSemester);
    }),

  createEvent: (
    payload: EventPayload
  ): Promise<{ event_id: string; status: "OPEN" }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () => resolve({ event_id: "EVENT-MOCK", status: "OPEN" }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_createEvent(payload);
    }),

  deactivateAccount: (accountId: string): Promise<{ success: boolean }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_deactivateAccount(accountId);
    }),

  decisionBudgetRequest: (
    entityId: string,
    action: string,
    payload: BudgetDecisionPayload
  ): Promise<{ request_id: string; from: string; to: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({
            from: "PENDING",
            request_id: entityId,
            to: action === "APPROVE" ? "APPROVED" : "REJECTED",
          });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_decisionBudgetRequest(entityId, action, payload);
    }),

  deleteOrphanedReceipt: (receiptId: string): Promise<{ success: boolean }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({ success: true });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_deleteOrphanedReceipt(receiptId);
    }),

  discardBudgetRequest: (
    requestId: string
  ): Promise<{ request_id: string; status: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({ request_id: requestId, status: "WITHDRAWN" });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_discardBudgetRequest(requestId);
    }),

  editClaim: (payload: EditClaimPayload): Promise<any> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          console.log("Mock edit claim:", payload);
          resolve({ success: true });
        }, 500);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_editClaim(payload);
    }),

  editEvent: (payload: EditEventPayload): Promise<{ event_id: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ event_id: payload.event_id }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_editEvent(payload);
    }),

  executeMigration: (): Promise<{ ok: boolean; stage: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ ok: true, stage: "REVIEW" }), 500);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_executeMigration();
    }),

  exportCsv: (
    reportType: ReportType,
    filters?: ReportFilters
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve(
            "Claim ID,Claimant,Status,Amount,Notes\nCLAIM-001,M-001,PAID,150,Test\n"
          );
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_exportCsv(reportType, filters || {});
    }),

  // ─── Finance Accounts ───

  getAccounts: (): Promise<FinanceAccount[]> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve([
            {
              account_id: "AC-001",
              created_at: "2026-07-01",
              current_balance: 10_167.35,
              name: "Main Checking",
              opening_balance: 10_167.35,
              pending_income: 0,
              reserved_payouts: 0,
              status: "ACTIVE",
            },
          ]);
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getAccounts();
    }),

  getAdjustments: (): Promise<AccountAdjustment[]> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve([]), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getAdjustments();
    }),

  getClaimDraft: (claimId: string): Promise<ClaimDraftResponse> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () =>
            resolve({
              budget_line_id: "",
              claim_id: claimId,
              claimant_id: "MEMBER-MOCK",
              created_by: "USER-MOCK",
              draft: true,
              line_items: [],
              notes: "",
              receipt_ids: [],
              status: "DRAFT",
              total_amount: 0,
              uuid: "UUID-MOCK",
            }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_getClaimDraft(claimId);
    }),

  getClaimsQueue: (filters?: ClaimQueueFilters): Promise<ClaimQueueItem[]> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve([
            {
              claim_id: "CLAIM-001",
              claimant_id: "M-001",
              created_by: "U-001",
              notes: "Conference tickets",
              status: "SUBMITTED",
              submitted_at: "2026-07-20",
              total_amount: 150,
            },
            {
              claim_id: "CLAIM-002",
              claimant_id: "M-002",
              created_by: "U-002",
              notes: "Supplies",
              status: "VERIFIED",
              submitted_at: "2026-07-19",
              total_amount: 200,
              verified_at: "2026-07-21",
            },
          ]);
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_getClaimsQueue(filters || {});
    }),

  // ─── Dashboard ───

  getDashboardSummary: (): Promise<DashboardSummary> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({
            counts: {
              failed_payouts: 1,
              missing_receipts: 1,
              needs_info: 1,
              over_budget: 1,
              pending_requests: 1,
              total_attention: 5,
            },
            failed_payouts: [
              {
                amount: 300.0,
                claim_id: "CLAIM-MOCK-4",
                failure_reason: "Bank declined",
                payout_id: "PAY-MOCK",
              },
            ],
            missing_receipts: [
              {
                claim_id: "CLAIM-MOCK-1",
                claim_status: "SUBMITTED",
                notes: "Office supplies",
                total_amount: 150.0,
              },
            ],
            needs_info_claims: [
              {
                claim_id: "CLAIM-MOCK-3",
                claim_status: "NEEDS_INFO",
                notes: "Event catering",
                submitted_at: "2026-07-20",
                total_amount: 200.0,
              },
            ],
            over_budget_claims: [
              {
                budget_line_id: "BL-MOCK",
                claim_id: "CLAIM-MOCK-2",
                claim_status: "SUBMITTED",
                claimed: 600,
                remaining: 500,
              },
            ],
            pending_requests: [
              {
                request_id: "BUDGET-MOCK",
                requester_id: "U-001",
                submitted_at: "2026-07-15",
                title: "Summer event",
              },
            ],
          });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getDashboardSummary();
    }),

  getEvents: (): Promise<Event[]> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve([]), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_listEvents();
    }),

  getMembers: (): Promise<Member[]> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve([
            { active: true, display_name: "Alice Member", user_id: "MEMBER-1" },
            { active: false, display_name: "Bob Member", user_id: "MEMBER-2" },
          ]);
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getMembers();
    }),

  getMigrationPreview: (): Promise<MigrationPreview> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({
            accounts: [
              {
                account_id: "AC-1",
                current_balance: 10_000,
                name: "Main",
                status: "ACTIVE",
              },
            ],
            active_members: [
              {
                active: true,
                display_name: "Alice",
                email: "",
                role: "MEMBER",
                user_id: "M-1",
              },
            ],
            categories: [
              {
                active: true,
                category_id: "CAT-1",
                kind: "EXPENSE",
                name: "Marketing",
              },
            ],
            current_year: "SEM A",
            events: [
              { event_id: "EVT-1", name: "Fall Gala", semester: "SEM A" },
            ],
            has_treasurer: true,
            inactive_members: [],
            next_committee_year: 27,
            operators: [
              {
                active: true,
                display_name: "Treasurer",
                email: "citycf41@gmail.com",
                role: "TREASURER",
                user_id: "U-1",
              },
            ],
            year_label: "26-27 (27)",
          });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getMigrationPreview();
    }),

  getMigrationSelections: (): Promise<MigrationSelections> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () =>
            resolve({
              accountBalances: {},
              accountIds: ["AC-1"],
              balanceReasons: {},
              categoryIds: ["CAT-1"],
              confirmedAccountIds: ["AC-1"],
              eventIds: ["EVT-1"],
              memberIds: ["M-1"],
              userIds: ["U-1"],
            }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getMigrationSelections();
    }),

  // ─── Annual Migration ───

  getMigrationState: (): Promise<MigrationState | null> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve(null), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getMigrationState();
    }),

  getMyBudgetRequests: (): Promise<BudgetRequest[]> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve([
            {
              decided_at: "",
              decided_by: "",
              decision_note: "",
              event_id: "",
              justification: "For testing",
              lines: [
                {
                  approved_amount: 0,
                  category_id: "CAT-1",
                  claimed_amount: 0,
                  description: "Catering",
                  line_id: "BL-001",
                  line_status: "PENDING",
                  remaining: 500,
                  request_id: "BUDGET-26A-001",
                  requested_amount: 500,
                },
              ],
              needed_by: "2026-08-15",
              request_id: "BUDGET-26A-001",
              requester_id: "U-001",
              status: "PENDING",
              submitted_at: "2026-07-21",
              title: "Mock Budget Request",
            },
          ]);
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getMyBudgetRequests();
    }),

  getMyClaims: (): Promise<MyClaimsResponse> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({
            budgetLines: [
              {
                description: "Gala Food",
                line_id: "BUDGETLINE-123",
                remaining: 500.0,
                request_id: "BUDGET-101",
              },
            ],
            claims: [
              {
                claim_id: "CLAIM-001",
                claimant_id: "MEMBER-1",
                notes: "Conference tickets",
                status: "SUBMITTED",
                submitted_at: "2026-07-16",
                total_amount: 150.5,
              },
              {
                claim_id: "CLAIM-002",
                claimant_id: "MEMBER-1",
                notes: "Pizza for meeting",
                status: "SUBMITTED",
                submitted_at: "2026-07-10",
                total_amount: 45.0,
              },
            ],
            requests: [
              {
                request_id: "BUDGET-101",
                status: "APPROVED",
                submitted_at: "2026-07-01",
                title: "Fall Gala",
              },
            ],
          });
        }, 500);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_getMyClaims();
    }),

  getPendingBudgetRequests: (): Promise<PendingBudgetRequest[]> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve([
            {
              justification: "Needs funds",
              needed_by: "2026-09-01",
              request_id: "BUDGET-26A-002",
              requester_id: "U-002",
              submitted_at: "2026-07-20",
              title: "Pending Mock",
              total_requested: 1000,
            },
          ]);
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getPendingBudgetRequests();
    }),

  getPendingIncome: (): Promise<IncomeItem[]> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve([]), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getPendingIncome();
    }),

  // ─── Payout Queue ───

  getQueuedPayouts: (): Promise<PayoutQueueItem[]> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve([]), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getQueuedPayouts();
    }),

  getReconciliation: (): Promise<ReconciliationData> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () =>
            resolve({
              accounts: [],
              incomplete_payouts: [],
              mismatches: [],
              movement_count: 0,
            }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getReconciliation();
    }),

  // ─── Reports ───

  getReportsData: (
    reportType: ReportType,
    filters?: ReportFilters
  ): Promise<ReportData> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          const mockRows = (() => {
            switch (reportType) {
              case "claims":
                return [
                  {
                    approved_at: "2026-07-14",
                    claim_id: "CLAIM-001",
                    claimant_id: "M-001",
                    created_by: "U-001",
                    event_id: "",
                    expense_date: "2026-07-05",
                    notes: "Test claim",
                    paid_at: "2026-07-16",
                    payout_method: "FPS",
                    semester: "26A",
                    status: "PAID",
                    submitted_at: "2026-07-10",
                    total_amount: 150,
                    verified_at: "2026-07-12",
                  },
                ];
              case "budget":
                return [
                  {
                    decided_at: "2026-07-03",
                    lines: [],
                    request_id: "BUDGET-001",
                    status: "APPROVED",
                    submitted_at: "2026-07-01",
                    title: "Mock Budget",
                    total_approved: 450,
                    total_requested: 500,
                  },
                ];
              case "income":
                return [
                  {
                    account_id: "AC-1",
                    amount: 1000,
                    category_id: "CAT-1",
                    date: "2026-07-01",
                    income_id: "INC-001",
                    notes: "Mock income",
                    received_by: "U-001",
                    source_ref: "",
                    status: "CONFIRMED",
                  },
                ];
              case "payouts":
                return [
                  {
                    account_id: "AC-1",
                    amount: 150,
                    claim_id: "CLAIM-001",
                    confirmed_at: "",
                    failure_reason: "",
                    method: "FPS",
                    paid_at: "2026-07-16",
                    payout_id: "PAY-001",
                    status: "SENT",
                    txn_reference: "TXN123",
                  },
                ];
              default:
                return [];
            }
          })();
          resolve({ count: mockRows.length, rows: mockRows, type: reportType });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getReportsData(reportType, filters || {});
    }),

  // ─── Semester ───

  getSemesterStatus: (): Promise<{
    current_semester: string;
    start_date: string;
    end_date: string;
    closeable: boolean;
    blockers: any[];
    blocker_count: number;
  }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({
            blocker_count: 0,
            blockers: [],
            closeable: true,
            current_semester: "SEM A",
            end_date: "2026-12-31",
            start_date: "2026-09-01",
          });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getSemesterStatus();
    }),

  getTransfers: (): Promise<AccountTransfer[]> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve([]), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_getTransfers();
    }),

  markPayoutSent: (
    payoutId: string,
    payload: { txnReference: string; amount?: number; accountId?: string }
  ): Promise<{ success: boolean }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_markPayoutSent(payoutId, payload);
    }),

  reactivateMember: (
    userId: string
  ): Promise<{ user_id: string; active: boolean }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({ active: true, user_id: userId });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_reactivateMember(userId);
    }),

  // ─── Account Transfers & Adjustments ───

  recordAdjustment: (payload: {
    accountId: string;
    amount: number;
    direction: string;
    reason: string;
  }): Promise<{ success: boolean }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_recordAdjustment(payload);
    }),

  // ─── Income ───

  recordIncome: (
    payload: RecordIncomePayload
  ): Promise<{ success: boolean; income_id?: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () => resolve({ income_id: "INC-MOCK", success: true }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_recordIncome(payload);
    }),

  recordPayoutFailed: (
    payoutId: string,
    reason: string
  ): Promise<{ success: boolean }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_recordPayoutFailed(payoutId, reason);
    }),

  recordTransfer: (payload: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    reason: string;
  }): Promise<{ success: boolean }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_recordTransfer(payload);
    }),

  rejectClaim: (claimId: string, reason: string): Promise<TransitionResult> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () =>
            resolve({ claim_id: claimId, from: "SUBMITTED", to: "REJECTED" }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_rejectClaim(claimId, reason);
    }),

  rejectIncome: (
    incomeId: string,
    note?: string
  ): Promise<{ success: boolean }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_rejectIncome(incomeId, note);
    }),

  renameAccount: (
    accountId: string,
    name: string
  ): Promise<{ success: boolean }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_renameAccount(accountId, name);
    }),

  requestIncomeInfo: (
    incomeId: string,
    note?: string
  ): Promise<{ success: boolean }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_requestIncomeInfo(incomeId, note);
    }),

  requestInfo: (claimId: string, reason: string): Promise<TransitionResult> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () =>
            resolve({ claim_id: claimId, from: "SUBMITTED", to: "NEEDS_INFO" }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_requestInfo(claimId, reason);
    }),
  resolveSession: (): Promise<SessionResponse> =>
    new Promise((resolve) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({
            allowed: true,
            display_name: "Mock User",
            role: "COMMITTEE",
            user_id: "USER-MOCK",
            views: [
              "review",
              "claims",
              "members",
              "budget-requests",
              "income",
              "payouts",
              "reports",
            ],
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
              resolve({ allowed: false, reason: "no_session" });
            }
          })
          .api_resolveSession();
      };

      call();
    }),

  resubmitClaim: (claimId: string): Promise<TransitionResult> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () =>
            resolve({ claim_id: claimId, from: "NEEDS_INFO", to: "SUBMITTED" }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_resubmitClaim(claimId);
    }),

  retryPayout: (payoutId: string): Promise<{ success: boolean }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ success: true }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_retryPayout(payoutId);
    }),

  saveBudgetRequestDraft: (
    payload: BudgetRequestDraftPayload
  ): Promise<{ request_id: string; status: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({ request_id: "BUDGET-MOCK", status: "DRAFT" });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_saveBudgetRequestDraft(payload);
    }),

  saveClaimDraft: (
    payload: ClaimDraftPayload
  ): Promise<{ claim_id: string; status: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({
            claim_id: payload.claimId || "CLAIM-MOCK",
            status: "DRAFT",
          });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_saveClaimDraft(payload);
    }),

  setAccountSelections: (payload: {
    accountIds: string[];
    accountBalances: Record<string, number>;
    balanceReasons: Record<string, string>;
    confirmedAccountIds: string[];
  }): Promise<{ ok: boolean; stage: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ ok: true, stage: "ACCOUNTS" }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_setAccountSelections(payload);
    }),

  setCategorySelections: (
    categoryIds: string[]
  ): Promise<{ ok: boolean; stage: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ ok: true, stage: "CATEGORIES" }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_setCategorySelections(categoryIds);
    }),

  setEventSelections: (
    eventIds: string[]
  ): Promise<{ ok: boolean; stage: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ ok: true, stage: "EVENTS" }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_setEventSelections(eventIds);
    }),

  setMemberSelections: (
    memberIds: string[]
  ): Promise<{ ok: boolean; stage: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ ok: true, stage: "MEMBERS" }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_setMemberSelections(memberIds);
    }),

  setMigrationSelections: (
    selections: MigrationSelections
  ): Promise<{ ok: boolean; stage: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ ok: true, stage: "REVIEW" }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_setMigrationSelections(selections);
    }),

  setUserSelections: (
    userIds: string[]
  ): Promise<{ ok: boolean; stage: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ ok: true, stage: "USERS" }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_setUserSelections(userIds);
    }),

  startMigration: (): Promise<{
    ok: boolean;
    stage: string;
    year_label: string;
  }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () =>
            resolve({ ok: true, stage: "CONFIGURE", year_label: "26-27 (27)" }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_startMigration();
    }),

  submitBudgetRequest: (
    requestId: string
  ): Promise<{ request_id: string; status: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({ request_id: requestId, status: "PENDING" });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_submitBudgetRequest(requestId);
    }),

  submitClaim: (payload: ClaimPayload): Promise<any> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          console.log("Mock submit claim:", payload);
          resolve({ claimId: "CLAIM-MOCK", success: true });
        }, 500);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_submitClaim(payload);
    }),

  submitDraftClaim: (
    claimId: string
  ): Promise<{ claim_id: string; status: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          resolve({ claim_id: claimId, status: "SUBMITTED" });
        }, 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_submitDraftClaim(claimId);
    }),

  suggestSemester: (expenseDate: string): Promise<{ semester: string }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ semester: "SEM A" }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .api_suggestSemester(expenseDate);
    }),

  uploadReceipt: (
    fileName: string,
    mimeType: string,
    base64Data: string,
    vendor: string,
    receiptDate: string,
    receiptTotal: number
  ): Promise<UploadReceiptResponse> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => {
          console.log("Mock upload receipt:", fileName);
          resolve({ receiptId: "RECEIPT-MOCK" });
        }, 1000);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_uploadReceipt(
          fileName,
          mimeType,
          base64Data,
          vendor,
          receiptDate,
          receiptTotal
        );
    }),

  validateMigration: (): Promise<{
    errors: string[];
    ok: boolean;
    warnings: string[];
  }> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(() => resolve({ errors: [], ok: true, warnings: [] }), 300);
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(result.error);
          }
        })
        .api_validateMigration();
    }),

  verifyClaim: (claimId: string, payload?: any): Promise<TransitionResult> =>
    new Promise((resolve, reject) => {
      if (typeof google === "undefined" || !google.script) {
        setTimeout(
          () =>
            resolve({ claim_id: claimId, from: "SUBMITTED", to: "VERIFIED" }),
          300
        );
        return;
      }
      google.script.run
        .withSuccessHandler((result: any) => {
          if (result.ok) {
            resolve(result.data);
          } else {
            reject(new Error(result.error.message));
          }
        })
        .withFailureHandler(reject)
        .api_verifyClaim(claimId, payload || {});
    }),
};
