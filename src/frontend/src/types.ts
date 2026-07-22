export type WorkspaceView = 'review' | 'claims' | 'members' | 'budget-requests' | 'income' | 'payouts' | 'reports';
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
  receiptIds?: string[];
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
export interface UploadingReceipt {
  fileName: string;
  mimeType: string;
  base64Data: string;
  vendor: string;
  receiptDate: string;
  receiptTotal: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  receiptId?: string;
  error?: string;
}

export interface UploadReceiptResponse {
  receiptId: string;
}

export interface ClaimDraftPayload {
  uuid: string;
  claimId?: string;
  claimantId: string;
  amount: number;
  notes: string;
  budgetLineId?: string;
  receiptId?: string;
  receiptIds?: string[];
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
  receiptIds?: string[];
}

export interface ClaimQueueItem {
  claim_id: string;
  claimant_id: string;
  status: string;
  submitted_at: string;
  verified_at?: string;
  total_amount: number;
  notes: string;
  created_by: string;
  event_id?: string;
}

export interface ClaimQueueFilters {
  status?: string;
  eventId?: string;
  creator?: string;
  budgetLine?: string;
  sid?: string;
}

export interface TransitionResult {
  claim_id: string;
  from: string;
  to: string;
}

// Finance Account types
export interface FinanceAccount {
  account_id: string;
  name: string;
  opening_balance: number;
  current_balance: number;
  pending_income: number;
  reserved_payouts: number;
  status: string;
  created_at: string;
  deactivated_at?: string;
}

export interface AddAccountPayload {
  name: string;
  opening_balance?: number;
}

export interface IncomeItem {
  income_id: string;
  date: string;
  category_id: string;
  amount: number;
  received_by: string;
  source_ref: string;
  event_id: string;
  notes: string;
  account_id?: string;
  status: string;
  decided_by?: string;
  decided_at?: string;
  decision_note?: string;
}

export interface RecordIncomePayload {
  uuid?: string;
  date: string;
  categoryId: string;
  amount: number;
  sourceRef?: string;
  eventId?: string;
  notes?: string;
  accountId?: string;
  proposedAccountId?: string;
}

export interface AccountTransfer {
  transfer_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  reason: string;
  transferred_by: string;
  transferred_at: string;
}

export interface AccountAdjustment {
  adjustment_id: string;
  account_id: string;
  amount: number;
  direction: string;
  reason: string;
  adjusted_by: string;
  adjusted_at: string;
}

export interface PayoutQueueItem {
  payout_id: string;
  claim_id: string;
  payee_user_id: string;
  amount: number;
  method: string;
  txn_reference: string;
  status: string;
  account_id?: string;
  failure_reason?: string;
  parent_payout_id?: string;
}

export type IncomeTab = 'pending' | 'record' | 'history';

export interface DashboardSummary {
  missing_receipts: DashboardItem[];
  over_budget_claims: OverBudgetItem[];
  needs_info_claims: DashboardItem[];
  failed_payouts: FailedPayoutItem[];
  pending_requests: PendingRequestItem[];
  counts: DashboardCounts;
}

export interface DashboardItem {
  claim_id: string;
  claim_status: string;
  notes: string;
  total_amount: number;
  submitted_at?: string;
}

export interface OverBudgetItem {
  claim_id: string;
  budget_line_id: string;
  claimed: number;
  remaining: number;
  claim_status: string;
}

export interface FailedPayoutItem {
  payout_id: string;
  claim_id: string;
  amount: number;
  failure_reason: string;
}

export interface PendingRequestItem {
  request_id: string;
  title: string;
  submitted_at: string;
  requester_id: string;
}

export interface DashboardCounts {
  missing_receipts: number;
  over_budget: number;
  needs_info: number;
  failed_payouts: number;
  pending_requests: number;
  total_attention: number;
}

export type ReportType = 'claims' | 'budget' | 'income' | 'payouts' | 'accounts';

export interface ReportFilters {
  status?: string;
  fromDate?: string;
  toDate?: string;
  budgetLine?: string;
  eventId?: string;
}

export interface ReportData {
  type: ReportType;
  rows: any[];
  count: number;
  accounts?: FinanceAccount[];
  transfers?: AccountTransfer[];
  adjustments?: AccountAdjustment[];
  total_current_balance?: number;
}

export interface ReportClaimRow {
  claim_id: string;
  claimant_id: string;
  status: string;
  submitted_at: string;
  verified_at: string;
  approved_at: string;
  paid_at: string;
  total_amount: number;
  notes: string;
  created_by: string;
  event_id: string;
  semester: string;
  expense_date: string;
  payout_method: string;
}

export interface ReportBudgetRow {
  request_id: string;
  title: string;
  status: string;
  submitted_at: string;
  decided_at: string;
  total_requested: number;
  total_approved: number;
  lines: {
    line_id: string;
    category_id: string;
    description: string;
    requested_amount: number;
    approved_amount: number;
    line_status: string;
    remaining: number;
  }[];
}

export interface ReportIncomeRow {
  income_id: string;
  date: string;
  category_id: string;
  amount: number;
  received_by: string;
  source_ref: string;
  notes: string;
  account_id: string;
  status: string;
}

export interface ReportPayoutRow {
  payout_id: string;
  claim_id: string;
  amount: number;
  method: string;
  txn_reference: string;
  status: string;
  account_id: string;
  paid_at: string;
  confirmed_at: string;
  failure_reason: string;
}

export interface MigrationState {
  stage: string;
  year_label: string;
  committee_year: string;
  target_spreadsheet_id: string;
  target_folder_id: string;
  active: boolean;
}

export interface MigrationPreview {
  current_year: string;
  next_committee_year: number;
  year_label: string;
  active_members: { user_id: string; display_name: string; role: string; active: boolean; email: string }[];
  inactive_members: { user_id: string; display_name: string; role: string; active: boolean; email: string }[];
  operators: { user_id: string; display_name: string; role: string; active: boolean; email: string }[];
  accounts: { account_id: string; name: string; current_balance: number; status: string }[];
  categories: { category_id: string; name: string; kind: string; active: boolean }[];
  events: { event_id: string; name: string; semester: string }[];
  has_treasurer: boolean;
}

export interface MigrationSelections {
  memberIds: string[];
  accountIds: string[];
  categoryIds: string[];
  eventIds: string[];
  accountBalances: Record<string, number>;
  balanceReasons: Record<string, string>;
}
