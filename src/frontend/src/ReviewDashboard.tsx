import { useEffect, useState } from "react";
import { showNotice } from "./components/AccessibleDialog";
import { apiService } from "./services/api";
import type {
  ClaimQueueFilters,
  ClaimQueueItem,
  FinanceAccount,
  Member,
  SessionResponse,
  SessionRole,
} from "./types";

interface ReviewDashboardProps {
  members?: Member[];
  role: SessionRole;
}

export default function ReviewDashboard({
  role,
  members = [],
}: ReviewDashboardProps) {
  const [queue, setQueue] = useState<ClaimQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterStatus, setFilterStatus] = useState("");
  const [filterCreator, setFilterCreator] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterBudgetLine, setFilterBudgetLine] = useState("");
  const [filterSid, setFilterSid] = useState("");

  const [selectedClaim, setSelectedClaim] = useState<ClaimQueueItem | null>(
    null
  );
  const [decisionNote, setDecisionNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  // #72 — Finance accounts + payment-state for the approve-payout modal.
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedTxnReference, setSelectedTxnReference] = useState("");

  const isTreasurer = role === "TREASURER";

  const loadQueue = () => {
    setLoading(true);
    const filters: ClaimQueueFilters = {};
    if (filterStatus) {
      filters.status = filterStatus;
    }
    if (filterCreator) {
      filters.creator = filterCreator;
    }
    if (filterEvent) {
      filters.eventId = filterEvent;
    }
    if (filterBudgetLine) {
      filters.budgetLine = filterBudgetLine;
    }
    if (filterSid) {
      filters.sid = filterSid;
    }
    apiService
      .getClaimsQueue(filters)
      .then(setQueue)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQueue();
  }, []);
  useEffect(() => {
    apiService.resolveSession().then((session: SessionResponse) => {
      if (session.allowed) {
        setCurrentUserId(session.user_id);
      }
    });
  }, []);

  // #72 — Treasurer picks a Finance Account when approving a claim for payout.
  useEffect(() => {
    apiService
      .getAccounts()
      .then(setAccounts)
      .catch((err: Error) => setError(err.message));
  }, []);
  const isSelfReview =
    !!currentUserId &&
    !!selectedClaim &&
    (currentUserId === selectedClaim.created_by ||
      currentUserId === selectedClaim.claimant_id);

  const statuses = ["", "SUBMITTED", "NEEDS_INFO", "VERIFIED"];

  const handleAction = async (
    action: "verify" | "reject" | "request-info" | "approve-payout"
  ) => {
    if (!selectedClaim) {
      return;
    }
    setActionLoading(true);
    try {
      switch (action) {
        case "verify":
          await apiService.verifyClaim(selectedClaim.claim_id, {
            decision_note: decisionNote,
          });
          break;
        case "reject":
          if (!decisionNote.trim()) {
            showNotice("Rejection reason is required");
            setActionLoading(false);
            return;
          }
          await apiService.rejectClaim(selectedClaim.claim_id, decisionNote);
          break;
        case "request-info":
          if (!decisionNote.trim()) {
            showNotice("Request note is required");
            setActionLoading(false);
            return;
          }
          await apiService.requestInfo(selectedClaim.claim_id, decisionNote);
          break;
        case "approve-payout":
          if (!selectedAccountId) {
            showNotice("Finance Account is required");
            setActionLoading(false);
            return;
          }
          if (requiresTxnReference && !selectedTxnReference.trim()) {
            showNotice("Transaction reference is required for FPS/PAYME");
            setActionLoading(false);
            return;
          }
          await apiService.approvePayoutWithAccount(
            selectedClaim.claim_id,
            selectedAccountId,
            requiresTxnReference ? selectedTxnReference.trim() : undefined
          );
          break;
      }
      setSelectedClaim(null);
      setDecisionNote("");
      setSelectedAccountId("");
      setSelectedTxnReference("");
      loadQueue();
    } catch (err: any) {
      showNotice(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const getCreatorName = (creatorId: string) =>
    members.find((m) => m.user_id === creatorId)?.display_name || creatorId;

  const getClaimantName = (claimantId: string) =>
    members.find((m) => m.user_id === claimantId)?.display_name || claimantId;

  // #72 — derive the approve gating rules from the claimant's chosen method.
  const selectedPayoutMethod = selectedClaim?.payout_method || "";
  const requiresTxnReference =
    selectedPayoutMethod === "FPS" || selectedPayoutMethod === "PAYME";
  const approveDisabled =
    !selectedAccountId ||
    actionLoading ||
    (requiresTxnReference && !selectedTxnReference.trim());

  const openClaim = (c: ClaimQueueItem) => {
    setSelectedClaim(c);
    setDecisionNote("");
    setSelectedAccountId("");
    setSelectedTxnReference("");
  };

  return (
    <div className="view-container">
      {error && <div className="alert error">{error}</div>}

      <section className="glass-card">
        <div className="card-header">
          <h2>Claims Review Queue</h2>
          <button
            className="secondary-btn"
            disabled={loading}
            onClick={loadQueue}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div
          style={{
            alignItems: "flex-end",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <div
            className="form-group"
            style={{ marginBottom: 0, minWidth: 140 }}
          >
            <label>Status</label>
            <select
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setTimeout(loadQueue, 0);
              }}
              value={filterStatus}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s || "All Statuses"}
                </option>
              ))}
            </select>
          </div>
          <div
            className="form-group"
            style={{ marginBottom: 0, minWidth: 140 }}
          >
            <label>Creator</label>
            <input
              onChange={(e) => setFilterCreator(e.target.value)}
              placeholder="User ID"
              style={{
                background: "rgba(0,0,0,0.2)",
                border: "1px solid var(--card-border)",
                borderRadius: 8,
                color: "var(--text-main)",
                fontFamily: "inherit",
                padding: "0.75rem",
                width: "100%",
              }}
              type="text"
              value={filterCreator}
            />
          </div>
          <div
            className="form-group"
            style={{ marginBottom: 0, minWidth: 140 }}
          >
            <label>Event</label>
            <input
              onChange={(e) => setFilterEvent(e.target.value)}
              placeholder="Event ID"
              style={{
                background: "rgba(0,0,0,0.2)",
                border: "1px solid var(--card-border)",
                borderRadius: 8,
                color: "var(--text-main)",
                fontFamily: "inherit",
                padding: "0.75rem",
                width: "100%",
              }}
              type="text"
              value={filterEvent}
            />
          </div>
          <div
            className="form-group"
            style={{ marginBottom: 0, minWidth: 140 }}
          >
            <label>Budget Line</label>
            <input
              onChange={(e) => setFilterBudgetLine(e.target.value)}
              placeholder="Budget Line ID"
              style={{
                background: "rgba(0,0,0,0.2)",
                border: "1px solid var(--card-border)",
                borderRadius: 8,
                color: "var(--text-main)",
                fontFamily: "inherit",
                padding: "0.75rem",
                width: "100%",
              }}
              type="text"
              value={filterBudgetLine}
            />
          </div>
          <div
            className="form-group"
            style={{ marginBottom: 0, minWidth: 140 }}
          >
            <label>SID</label>
            <input
              onChange={(e) => setFilterSid(e.target.value)}
              placeholder="Student ID"
              style={{
                background: "rgba(0,0,0,0.2)",
                border: "1px solid var(--card-border)",
                borderRadius: 8,
                color: "var(--text-main)",
                fontFamily: "inherit",
                padding: "0.75rem",
                width: "100%",
              }}
              type="text"
              value={filterSid}
            />
          </div>
          <button
            className="primary-btn"
            onClick={loadQueue}
            style={{ alignSelf: "flex-end" }}
          >
            Filter
          </button>
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="loader" />
            <p>Loading queue...</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="empty-state">No claims in the review queue.</div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Claimant</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Creator</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((c) => (
                  <tr key={c.claim_id}>
                    <td className="mono">{c.claim_id}</td>
                    <td>{getClaimantName(c.claimant_id)}</td>
                    <td className="amount">
                      ${Number(c.total_amount).toFixed(2)}
                    </td>
                    <td>
                      <span
                        className={`badge status-${c.status.toLowerCase()}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td>
                      {c.submitted_at
                        ? new Date(c.submitted_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>{getCreatorName(c.created_by)}</td>
                    <td>
                      <button
                        className="primary-btn"
                        onClick={() => openClaim(c)}
                      >
                        {c.status === "SUBMITTED"
                          ? "Review"
                          : c.status === "NEEDS_INFO"
                            ? "View"
                            : "Review"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedClaim && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card wide-modal">
            <h2>Review: {selectedClaim.claim_id}</h2>
            <div className="detail-grid">
              <div>
                <strong>Claimant:</strong>{" "}
                {getClaimantName(selectedClaim.claimant_id)}
              </div>
              <div>
                <strong>Amount:</strong> HK$
                {Number(selectedClaim.total_amount).toFixed(2)}
              </div>
              <div>
                <strong>Status:</strong>{" "}
                <span
                  className={`badge status-${selectedClaim.status.toLowerCase()}`}
                >
                  {selectedClaim.status}
                </span>
              </div>
              <div>
                <strong>Submitted:</strong>{" "}
                {selectedClaim.submitted_at
                  ? new Date(selectedClaim.submitted_at).toLocaleDateString()
                  : "-"}
              </div>
              {selectedClaim.verified_at && (
                <div>
                  <strong>Verified:</strong>{" "}
                  {new Date(selectedClaim.verified_at).toLocaleDateString()}
                </div>
              )}
              {selectedClaim.event_id && (
                <div>
                  <strong>Event:</strong> {selectedClaim.event_id}
                </div>
              )}
              <div>
                <strong>Created by:</strong>{" "}
                {getCreatorName(selectedClaim.created_by)}
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <div
                style={{
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: 8,
                  color: "var(--text-main)",
                  fontSize: "0.9rem",
                  padding: "0.75rem",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedClaim.notes || "No notes"}
              </div>
            </div>
            <div className="form-group">
              <label>
                Decision Note{" "}
                {selectedClaim.status === "SUBMITTED"
                  ? "(required for reject/request-info)"
                  : ""}
              </label>
              <textarea
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder={
                  selectedClaim.status === "SUBMITTED"
                    ? "Reason for decision..."
                    : "Note for the record..."
                }
                rows={3}
                value={decisionNote}
              />
            </div>
            {selectedClaim.status === "VERIFIED" && (
              <div className="detail-grid" style={{ marginTop: "1rem" }}>
                <div>
                  <strong>Payout method:</strong>{" "}
                  {selectedPayoutMethod || "Not set by claimant"}
                </div>
                <div>
                  <strong>Payout handle:</strong>{" "}
                  {selectedClaim.payout_handle || "-"}
                </div>
              </div>
            )}
            {selectedClaim.status === "VERIFIED" && isTreasurer && (
              <>
                <div className="form-group">
                  <label htmlFor="approve-account">Finance Account *</label>
                  <select
                    id="approve-account"
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    value={selectedAccountId}
                  >
                    <option value="">Select an account...</option>
                    {accounts
                      .filter((a) => a.status === "ACTIVE")
                      .map((a) => (
                        <option key={a.account_id} value={a.account_id}>
                          {a.name} (bal: HK$
                          {Number(a.current_balance).toFixed(2)})
                        </option>
                      ))}
                  </select>
                </div>
                {requiresTxnReference && (
                  <div className="form-group">
                    <label htmlFor="approve-txn">Transaction reference *</label>
                    <input
                      id="approve-txn"
                      onChange={(e) => setSelectedTxnReference(e.target.value)}
                      placeholder="e.g. FPS reference or PayMe txn id"
                      type="text"
                      value={selectedTxnReference}
                    />
                  </div>
                )}
              </>
            )}
            <div
              className="modal-actions decision-actions"
              style={{ justifyContent: "space-between" }}
            >
              <div>
                <button
                  className="secondary-btn"
                  onClick={() => {
                    setSelectedClaim(null);
                    setDecisionNote("");
                    setSelectedAccountId("");
                    setSelectedTxnReference("");
                  }}
                  type="button"
                >
                  Close
                </button>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {selectedClaim.status === "SUBMITTED" && (
                  <>
                    {!!currentUserId && !isSelfReview && (
                      <button
                        className="primary-btn"
                        disabled={actionLoading}
                        onClick={() => handleAction("verify")}
                        type="button"
                      >
                        {actionLoading ? "Processing..." : "Verify"}
                      </button>
                    )}
                    <button
                      className="warning-btn"
                      disabled={actionLoading}
                      onClick={() => handleAction("request-info")}
                      type="button"
                    >
                      Request Info
                    </button>
                    <button
                      className="danger-btn"
                      disabled={actionLoading}
                      onClick={() => handleAction("reject")}
                      type="button"
                    >
                      Reject
                    </button>
                  </>
                )}
                {selectedClaim.status === "NEEDS_INFO" && (
                  <span className="muted-text" style={{ padding: "0.5rem" }}>
                    Awaiting resubmission by creator
                  </span>
                )}
                {selectedClaim.status === "VERIFIED" && (
                  <>
                    {isTreasurer && (
                      <button
                        className="primary-btn"
                        disabled={approveDisabled}
                        onClick={() => handleAction("approve-payout")}
                        type="button"
                      >
                        {actionLoading ? "Processing..." : "Approve for Payout"}
                      </button>
                    )}
                    <button
                      className="danger-btn"
                      disabled={actionLoading}
                      onClick={() => handleAction("reject")}
                      type="button"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
