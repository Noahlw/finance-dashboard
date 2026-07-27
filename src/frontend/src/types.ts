export type WorkspaceView =
  | "review"
  | "claims"
  | "members"
  | "budget-requests"
  | "income"
  | "events"
  | "payouts"
  | "reports";
export type SessionRole =
  | "COMMITTEE"
  | "TREASURER"
  | "MEMBER"
  | "ADVISOR_AUDITOR";
export type PayoutMethod = "FPS" | "PAYME" | "OTHER";

export interface SessionInfo {
  allowed: true;
  display_name: string;
  role: SessionRole;
  user_id: string;
  views: WorkspaceView[];
}

export interface SessionDenied {
  allowed: false;
  email?: string;
  reason: "no_session" | "unknown_user" | "unauthorized_role" | "inactive_user";
  role?: string;
}

export type SessionResponse = SessionInfo | SessionDenied;

export interface ReconciliationAccount {
  account_id: string;
  actual_balance: number;
  difference: number;
  expected_balance: number;
  ledger_total: number;
  name: string;
  opening_balance: number;
}

export interface ReconciliationData {
  accounts: ReconciliationAccount[];
  incomplete_payouts: {
    amount: number;
    claim_id: string;
    failure_reason: string;
    payout_id: string;
    status: string;
  }[];
  mismatches: ReconciliationAccount[];
  movement_count: number;
}

export interface Claim {
  claim_id: string;
  notes: string;
  status: string;
  submitted_at: string;
  total_amount: number;
}

export interface Request {
  request_id: string;
  status: string;
  submitted_at: string;
  title: string;
}

export interface BudgetLine {
  description: string;
  line_id: string;
  remaining: number;
  request_id: string;
}

// Event types (issue #73, ADR 0073)
export interface Event {
  closed_at?: string;
  created_at: string;
  event_id: string;
  name: string;
  owner_user_id: string;
  semester: string;
  status: "OPEN" | "CLOSED";
}

export interface EventPayload {
  name: string;
  owner_user_id: string;
  semester: string;
}

export interface EditEventPayload {
  event_id: string;
  name?: string;
  owner_user_id?: string;
  semester?: string;
}

export interface CorrectEventPayload {
  event_id: string;
  name?: string;
  owner_user_id?: string;
  semester?: string;
}

export interface CloseEventPayload {
  event_id: string;
  reason: string;
}

export interface CloseEventResult {
  closed_at: string;
  event_id: string;
  status: "CLOSED";
}

export interface MyClaimsResponse {
  budgetLines: BudgetLine[];
  claims: Claim[];
  requests: Request[];
}

export interface ClaimPayload {
  amount: number;
  budgetLineId?: string;
  claimantId: string;
  eventId?: string;
  expenseDate: string;
  notes: string;
  payoutHandle?: string;
  payoutMethod: PayoutMethod;
  receiptId?: string;
  receiptIds?: string[];
  semester?: string;
  uuid: string;
}

export interface EditClaimPayload {
  amount: number;
  budgetLineId?: string;
  claimantId: string;
  claimId: string;
  eventId?: string;
  expenseDate?: string;
  notes: string;
  payoutHandle?: string;
  payoutMethod?: PayoutMethod;
  receiptId?: string;
}

// Budget Request types
export interface BudgetRequestLine {
  approved_amount: number;
  category_id: string;
  claimed_amount: number;
  description: string;
  line_id: string;
  line_status: string;
  remaining: number;
  request_id: string;
  requested_amount: number;
}

export interface BudgetRequest {
  decided_at: string;
  decided_by: string;
  decision_note: string;
  event_id: string;
  justification: string;
  lines: BudgetRequestLine[];
  needed_by: string;
  request_id: string;
  requester_id: string;
  status: string;
  submitted_at: string;
  title: string;
}

export interface BudgetRequestDraftPayload {
  event_id?: string;
  justification: string;
  lines: {
    category_id?: string;
    description: string;
    requested_amount: number;
  }[];
  needed_by: string;
  request_id?: string;
  title: string;
  uuid: string;
}

export interface PendingBudgetRequest {
  justification: string;
  needed_by: string;
  request_id: string;
  requester_id: string;
  submitted_at: string;
  title: string;
  total_requested: number;
}

export interface BudgetDecisionPayload {
  action: "APPROVE" | "REDUCE" | "REJECT" | "REQUEST_INFO" | "CLOSE";
  decision_note?: string;
}

export type BudgetRequestsTab = "my-requests" | "create" | "pending";

// Member directory types
export interface Member {
  active: boolean;
  display_name: string;
  user_id: string;
}

export interface AddMemberPayload {
  display_name: string;
  full_name?: string;
  payout_handle?: string;
  payout_method?: PayoutMethod;
  student_id: string;
}

// Claim intake types
export interface UploadingReceipt {
  base64Data: string;
  error?: string;
  fileName: string;
  mimeType: string;
  receiptDate: string;
  receiptId?: string;
  receiptTotal: number;
  status: "pending" | "uploading" | "done" | "error";
  vendor: string;
}

export interface ClaimFilePayload {
  base64Data: string;
  fileName: string;
  mimeType: string;
  receiptDate?: string;
  receiptTotal?: number;
  vendor?: string;
}

export interface UploadReceiptResponse {
  receiptId: string;
}

export interface ClaimDraftPayload {
  amount: number;
  budgetLineId?: string;
  claimantId: string;
  claimId?: string;
  eventId?: string;
  expenseDate?: string;
  fpsAccount?: string;
  fpsPhone?: string;
  notes: string;
  otherDetails?: string;
  paymePhone?: string;
  payoutHandle?: string;
  payoutMethod?: PayoutMethod;
  receiptId?: string;
  receiptIds?: string[];
  semester?: string;
  uuid: string;
}

export interface AtomicClaimPayload extends ClaimDraftPayload {
  budgetLineId: string;
  expenseDate: string;
  payoutMethod: PayoutMethod;
  qrFile?: ClaimFilePayload;
  receipts?: ClaimFilePayload[];
}

export interface ClaimDraftLineItem {
  amount: number;
  budget_line_id: string;
  claim_line_id: string;
  description: string;
  missing_receipt_flag: boolean;
  receipt_id: string;
}

export interface Claim {
  claim_id: string;
  claimant_id: string;
  draft?: boolean;
  event_id?: string;
  expense_date?: string;
  missingReceipt?: boolean;
  notes: string;
  payout_handle?: string;
  payout_method?: string;
  receiptIds?: string[];
  semester?: string;
  status: string;
  submitted_at: string;
  total_amount: number;
}

export interface ClaimDraftResponse {
  budget_line_id: string;
  claim_id: string;
  claimant_id: string;
  created_by: string;
  draft: boolean;
  event_id?: string;
  expense_date?: string;
  line_items: ClaimDraftLineItem[];
  notes: string;
  payout_handle?: string;
  payout_method?: string;
  receipt_ids: string[];
  semester?: string;
  status: string;
  total_amount: number;
  uuid: string;
}

export interface ClaimQueueItem {
  claim_id: string;
  claimant_id: string;
  created_by: string;
  event_id?: string;
  notes: string;
  status: string;
  submitted_at: string;
  total_amount: number;
  verified_at?: string;
}

export interface ClaimQueueFilters {
  budgetLine?: string;
  creator?: string;
  eventId?: string;
  sid?: string;
  status?: string;
}

export interface TransitionResult {
  claim_id: string;
  from: string;
  to: string;
}

// Finance Account types
export interface FinanceAccount {
  account_id: string;
  created_at: string;
  current_balance: number;
  deactivated_at?: string;
  name: string;
  opening_balance: number;
  pending_income: number;
  reserved_payouts: number;
  status: string;
}

export interface AddAccountPayload {
  name: string;
  opening_balance?: number;
}

export interface IncomeItem {
  account_id?: string;
  amount: number;
  category_id: string;
  date: string;
  decided_at?: string;
  decided_by?: string;
  decision_note?: string;
  event_id: string;
  income_id: string;
  notes: string;
  received_by: string;
  source_ref: string;
  status: string;
}

export interface RecordIncomePayload {
  accountId?: string;
  amount: number;
  categoryId: string;
  date: string;
  eventId?: string;
  notes?: string;
  proposedAccountId?: string;
  sourceRef?: string;
  uuid?: string;
}

export interface AccountTransfer {
  amount: number;
  from_account_id: string;
  reason: string;
  to_account_id: string;
  transfer_id: string;
  transferred_at: string;
  transferred_by: string;
}

export interface AccountAdjustment {
  account_id: string;
  adjusted_at: string;
  adjusted_by: string;
  adjustment_id: string;
  amount: number;
  direction: string;
  reason: string;
}

export interface PayoutQueueItem {
  account_id?: string;
  amount: number;
  claim_id: string;
  failure_reason?: string;
  method: string;
  parent_payout_id?: string;
  payee_user_id: string;
  payout_id: string;
  status: string;
  txn_reference: string;
}

export type IncomeTab = "pending" | "record" | "history";

export interface DashboardSummary {
  counts: DashboardCounts;
  failed_payouts: FailedPayoutItem[];
  missing_receipts: DashboardItem[];
  needs_info_claims: DashboardItem[];
  over_budget_claims: OverBudgetItem[];
  pending_requests: PendingRequestItem[];
}

export interface DashboardItem {
  claim_id: string;
  claim_status: string;
  notes: string;
  submitted_at?: string;
  total_amount: number;
}

export interface OverBudgetItem {
  budget_line_id: string;
  claim_id: string;
  claim_status: string;
  claimed: number;
  remaining: number;
}

export interface FailedPayoutItem {
  amount: number;
  claim_id: string;
  failure_reason: string;
  payout_id: string;
}

export interface PendingRequestItem {
  request_id: string;
  requester_id: string;
  submitted_at: string;
  title: string;
}

export interface DashboardCounts {
  failed_payouts: number;
  missing_receipts: number;
  needs_info: number;
  over_budget: number;
  pending_requests: number;
  total_attention: number;
}

export type ReportType =
  | "claims"
  | "budget"
  | "income"
  | "payouts"
  | "accounts";

export interface ReportFilters {
  budgetLine?: string;
  eventId?: string;
  fromDate?: string;
  status?: string;
  toDate?: string;
}

export interface ReportData {
  accounts?: FinanceAccount[];
  adjustments?: AccountAdjustment[];
  count: number;
  rows: any[];
  total_current_balance?: number;
  transfers?: AccountTransfer[];
  type: ReportType;
}

export interface ReportClaimRow {
  approved_at: string;
  claim_id: string;
  claimant_id: string;
  created_by: string;
  event_id: string;
  expense_date: string;
  notes: string;
  paid_at: string;
  payout_method: string;
  semester: string;
  status: string;
  submitted_at: string;
  total_amount: number;
  verified_at: string;
}

export interface ReportBudgetRow {
  decided_at: string;
  lines: {
    line_id: string;
    category_id: string;
    description: string;
    requested_amount: number;
    approved_amount: number;
    line_status: string;
    remaining: number;
  }[];
  request_id: string;
  status: string;
  submitted_at: string;
  title: string;
  total_approved: number;
  total_requested: number;
}

export interface ReportIncomeRow {
  account_id: string;
  amount: number;
  category_id: string;
  date: string;
  income_id: string;
  notes: string;
  received_by: string;
  source_ref: string;
  status: string;
}

export interface ReportPayoutRow {
  account_id: string;
  amount: number;
  claim_id: string;
  confirmed_at: string;
  failure_reason: string;
  method: string;
  paid_at: string;
  payout_id: string;
  status: string;
  txn_reference: string;
}

export interface MigrationState {
  active: boolean;
  committee_year: string;
  stage: string;
  target_folder_id: string;
  target_spreadsheet_id: string;
  year_label: string;
}

export interface MigrationPreview {
  accounts: {
    account_id: string;
    name: string;
    current_balance: number;
    status: string;
  }[];
  active_members: {
    user_id: string;
    display_name: string;
    role: string;
    active: boolean;
    email: string;
  }[];
  categories: {
    category_id: string;
    name: string;
    kind: string;
    active: boolean;
  }[];
  current_year: string;
  events: { event_id: string; name: string; semester: string }[];
  has_treasurer: boolean;
  inactive_members: {
    user_id: string;
    display_name: string;
    role: string;
    active: boolean;
    email: string;
  }[];
  next_committee_year: number;
  operators: {
    user_id: string;
    display_name: string;
    role: string;
    active: boolean;
    email: string;
  }[];
  year_label: string;
}

export interface MigrationSelections {
  accountBalances: Record<string, number>;
  accountIds: string[];
  balanceReasons: Record<string, string>;
  categoryIds: string[];
  confirmedAccountIds: string[];
  eventIds: string[];
  memberIds: string[];
  userIds: string[];
}

export interface MigrationValidation {
  errors: string[];
  ok: boolean;
  warnings: string[];
}
