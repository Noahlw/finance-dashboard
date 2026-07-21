export type WorkspaceView = 'claims' | 'budget-requests' | 'income' | 'payouts' | 'reports';
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
  amount: number;
  notes: string;
  receiptDate: string;
  budgetLineId: string;
  receiptId?: string;
}

export interface EditClaimPayload {
  claimId: string;
  amount: number;
  notes: string;
}
