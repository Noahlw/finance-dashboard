export type WorkspaceView = 'claims' | 'members' | 'budget-requests' | 'income' | 'payouts' | 'reports';
export type SessionRole = 'COMMITTEE' | 'TREASURER' | 'MEMBER' | 'ADVISOR_AUDITOR';

export interface SessionInfo {
  allowed: true;
  user_id: string;
  display_name: string;
  role: SessionRole;
  views: WorkspaceView[];
}

export interface SessionDenied {
  allowed: false;
  reason: 'no_session' | 'unknown_user' | 'unauthorized_role' | 'inactive_user';
  email?: string;
  role?: string;
}

export type SessionResponse = SessionInfo | SessionDenied;

export interface Claim {
  claim_id: string;
  status: string;
  submitted_at: string;
  total_amount: number;
  notes: string;
}

export interface Request {
  request_id: string;
  title: string;
  status: string;
  submitted_at: string;
}

export interface BudgetLine {
  line_id: string;
  request_id: string;
  description: string;
  remaining: number;
}

export interface MyClaimsResponse {
  claims: Claim[];
  requests: Request[];
  budgetLines: BudgetLine[];
}

export interface ClaimPayload {
  uuid: string;
  claimantId: string;
  amount: number;
  notes: string;
  expenseDate: string;
  budgetLineId?: string;
  receiptId?: string;
  semester?: string;
  eventId?: string;
  payoutMethod: 'FPS' | 'PAYME' | 'BANK' | 'CASH' | 'OTHER';
  payoutHandle?: string;
}

export interface EditClaimPayload {
  claimId: string;
  claimantId: string;
  amount: number;
  notes: string;
  expenseDate?: string;
  budgetLineId?: string;
  receiptId?: string;
  payoutMethod?: 'FPS' | 'PAYME' | 'BANK' | 'CASH' | 'OTHER';
  payoutHandle?: string;
}

// Budget Request types
export interface BudgetRequestLine {
  line_id: string;
  request_id: string;
  category_id: string;
  description: string;
  requested_amount: number;
  approved_amount: number;
  line_status: string;
  claimed_amount: number;
  remaining: number;
}

export interface BudgetRequest {
  request_id: string;
  requester_id: string;
  event_id: string;
  title: string;
  justification: string;
  needed_by: string;
  status: string;
  submitted_at: string;
  decided_at: string;
  decided_by: string;
  decision_note: string;
  lines: BudgetRequestLine[];
}

export interface BudgetRequestDraftPayload {
  request_id?: string;
  title: string;
  justification: string;
  needed_by: string;
  event_id?: string;
  lines: { category_id?: string; description: string; requested_amount: number }[];
  uuid: string;
}

export interface PendingBudgetRequest {
  request_id: string;
  title: string;
  requester_id: string;
  justification: string;
  needed_by: string;
  submitted_at: string;
  total_requested: number;
}

export interface BudgetDecisionPayload {
  action: 'APPROVE' | 'REDUCE' | 'REJECT' | 'REQUEST_INFO' | 'CLOSE';
  decision_note?: string;
}

export type BudgetRequestsTab = 'my-requests' | 'create' | 'pending';

// Member directory types
export interface Member {
  user_id: string;
  display_name: string;
  active: boolean;
}

export interface AddMemberPayload {
  student_id: string;
  display_name: string;
  full_name?: string;
  payout_method?: 'FPS' | 'PAYME' | 'BANK' | 'CASH' | 'OTHER';
  payout_handle?: string;
}

// Claim intake types
export interface ClaimDraftPayload {
  uuid: string;
  claimId?: string;
  claimantId: string;
  amount: number;
  notes: string;
  budgetLineId?: string;
  receiptId?: string;
  expenseDate?: string;
  semester?: string;
  eventId?: string;
  payoutMethod?: 'FPS' | 'PAYME' | 'BANK' | 'CASH' | 'OTHER';
  payoutHandle?: string;
}

export interface Claim {
  claim_id: string;
  claimant_id: string;
  status: string;
  submitted_at: string;
  total_amount: number;
  notes: string;
  missingReceipt?: boolean;
  payout_method?: string;
}
