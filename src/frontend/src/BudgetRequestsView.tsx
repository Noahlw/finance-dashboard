import { useEffect, useState } from "react";
import { apiService } from "./services/api";
import type {
  BudgetRequest,
  BudgetRequestsTab,
  PendingBudgetRequest,
  SessionRole,
} from "./types";

interface BudgetRequestsViewProps {
  role: SessionRole;
}

export default function BudgetRequestsView({ role }: BudgetRequestsViewProps) {
  const [activeTab, setActiveTab] = useState<BudgetRequestsTab>("my-requests");
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [pending, setPending] = useState<PendingBudgetRequest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editRequest, setEditRequest] = useState<BudgetRequest | null>(null);

  const [reqTitle, setReqTitle] = useState("");
  const [reqJustification, setReqJustification] = useState("");
  const [reqNeededBy, setReqNeededBy] = useState("");
  const [reqLines, setReqLines] = useState<
    { description: string; requested_amount: number }[]
  >([{ description: "", requested_amount: 0 }]);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [pendingDetail, setPendingDetail] =
    useState<PendingBudgetRequest | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  const isTreasurer = role === "TREASURER";

  const loadMyRequests = () => {
    setLoading(true);
    apiService
      .getMyBudgetRequests()
      .then(setRequests)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const loadPending = () => {
    setLoading(true);
    apiService
      .getPendingBudgetRequests()
      .then(setPending)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (activeTab === "pending") {
      loadPending();
    } else {
      loadMyRequests();
    }
  }, [activeTab]);

  const openNewForm = () => {
    setEditRequest(null);
    setReqTitle("");
    setReqJustification("");
    setReqNeededBy("");
    setReqLines([{ description: "", requested_amount: 0 }]);
    setShowForm(true);
  };

  const openEditForm = (r: BudgetRequest) => {
    setEditRequest(r);
    setReqTitle(r.title);
    setReqJustification(r.justification);
    setReqNeededBy(r.needed_by);
    setReqLines(
      r.lines.map((l) => ({
        description: l.description,
        requested_amount: l.requested_amount,
      }))
    );
    setShowForm(true);
  };

  const addLine = () => {
    setReqLines((prev) => [...prev, { description: "", requested_amount: 0 }]);
  };

  const updateLine = (
    index: number,
    field: "description" | "requested_amount",
    value: string | number
  ) => {
    setReqLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeLine = (index: number) => {
    setReqLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!reqTitle.trim()) {
      alert("Title is required.");
      return;
    }
    const nonEmptyLines = reqLines.filter((l) => l.description.trim());
    if (nonEmptyLines.length === 0) {
      alert("At least one line item is required.");
      return;
    }

    setSubmitLoading(true);
    try {
      await apiService.saveBudgetRequestDraft({
        justification: reqJustification,
        lines: nonEmptyLines,
        needed_by: reqNeededBy,
        request_id: editRequest?.request_id,
        title: reqTitle,
        uuid: crypto.randomUUID(),
      });
      setShowForm(false);
      loadMyRequests();
    } catch (err: any) {
      alert(err.message || "Failed to save");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSubmit = async (r: BudgetRequest) => {
    if (!confirm("Submit this budget request?")) {
      return;
    }
    try {
      await apiService.submitBudgetRequest(r.request_id);
      loadMyRequests();
    } catch (err: any) {
      alert(err.message || "Failed to submit");
    }
  };

  const handleDiscard = async (r: BudgetRequest) => {
    if (!confirm("Discard this DRAFT request?")) {
      return;
    }
    try {
      await apiService.discardBudgetRequest(r.request_id);
      loadMyRequests();
    } catch (err: any) {
      alert(err.message || "Failed to discard");
    }
  };

  const handleDecision = async (action: string) => {
    if (!pendingDetail) {
      return;
    }
    try {
      await apiService.decisionBudgetRequest(pendingDetail.request_id, action, {
        action: action as any,
        decision_note: decisionNote,
      });
      setPendingDetail(null);
      setDecisionNote("");
      loadPending();
    } catch (err: any) {
      alert(err.message || "Failed to process decision");
    }
  };

  const canEdit = (s: string) => s === "DRAFT" || s === "NEEDS_INFO";

  return (
    <div className="view-container">
      {error && <div className="alert error">{error}</div>}

      <div className="tabs">
        <button
          className={`tab ${activeTab === "my-requests" ? "active" : ""}`}
          onClick={() => setActiveTab("my-requests")}
        >
          My Requests
        </button>
        {isTreasurer && (
          <button
            className={`tab ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending Approvals
          </button>
        )}
      </div>

      {activeTab === "my-requests" && (
        <section className="glass-card">
          <div className="card-header">
            <h2>Budget Requests</h2>
            <button className="primary-btn" onClick={openNewForm}>
              + New Request
            </button>
          </div>
          {loading ? (
            <div className="loader-container">
              <div className="loader" />
              <p>Loading...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="empty-state">No budget requests found.</div>
          ) : (
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const total = r.lines.reduce(
                      (s, l) => s + l.requested_amount,
                      0
                    );
                    return (
                      <tr key={r.request_id}>
                        <td className="mono">{r.request_id}</td>
                        <td>{r.title}</td>
                        <td>
                          <span
                            className={`badge status-${r.status.toLowerCase()}`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td>
                          {r.submitted_at
                            ? new Date(r.submitted_at).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="amount">${total.toFixed(2)}</td>
                        <td>
                          {canEdit(r.status) && (
                            <>
                              <button
                                className="secondary-btn edit-btn"
                                onClick={() => openEditForm(r)}
                              >
                                Edit
                              </button>
                              <button
                                className="primary-btn"
                                onClick={() => handleSubmit(r)}
                              >
                                Submit
                              </button>
                              <button
                                className="danger-btn"
                                onClick={() => handleDiscard(r)}
                              >
                                Discard
                              </button>
                            </>
                          )}
                          {!canEdit(r.status) && r.status !== "WITHDRAWN" && (
                            <span className="muted-text">Locked</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === "pending" && isTreasurer && (
        <section className="glass-card">
          <div className="card-header">
            <h2>Pending Approvals</h2>
          </div>
          {loading ? (
            <div className="loader-container">
              <div className="loader" />
              <p>Loading...</p>
            </div>
          ) : pending.length === 0 ? (
            <div className="empty-state">No pending requests.</div>
          ) : (
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Requester</th>
                    <th>Needed By</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((p) => (
                    <tr key={p.request_id}>
                      <td className="mono">{p.request_id}</td>
                      <td>{p.title}</td>
                      <td>{p.requester_id}</td>
                      <td>
                        {p.needed_by
                          ? new Date(p.needed_by).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="amount">
                        ${p.total_requested.toFixed(2)}
                      </td>
                      <td>
                        <button
                          className="primary-btn"
                          onClick={() => setPendingDetail(p)}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Create/Edit modal */}
      {showForm && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card wide-modal">
            <h2>
              {editRequest ? "Edit Budget Request" : "New Budget Request"}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="form-group">
                <label>Title</label>
                <input
                  onChange={(e) => setReqTitle(e.target.value)}
                  required
                  type="text"
                  value={reqTitle}
                />
              </div>
              <div className="form-group">
                <label>Justification</label>
                <textarea
                  onChange={(e) => setReqJustification(e.target.value)}
                  rows={3}
                  value={reqJustification}
                />
              </div>
              <div className="form-group">
                <label>Needed By</label>
                <input
                  onChange={(e) => setReqNeededBy(e.target.value)}
                  required
                  type="date"
                  value={reqNeededBy}
                />
              </div>
              <div className="form-group">
                <label>Line Items</label>
                {reqLines.map((line, i) => (
                  <div className="line-row" key={i}>
                    <input
                      onChange={(e) =>
                        updateLine(i, "description", e.target.value)
                      }
                      placeholder="Description"
                      required
                      type="text"
                      value={line.description}
                    />
                    <input
                      min="0"
                      onChange={(e) =>
                        updateLine(
                          i,
                          "requested_amount",
                          Number(e.target.value)
                        )
                      }
                      placeholder="Amount"
                      required
                      step="0.01"
                      type="number"
                      value={line.requested_amount || ""}
                    />
                    {reqLines.length > 1 && (
                      <button
                        className="danger-btn"
                        onClick={() => removeLine(i)}
                        type="button"
                      >
                        X
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="secondary-btn"
                  onClick={addLine}
                  type="button"
                >
                  + Add Line
                </button>
              </div>
              <div className="modal-actions">
                <button
                  className="secondary-btn"
                  disabled={submitLoading}
                  onClick={() => setShowForm(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="primary-btn"
                  disabled={submitLoading}
                  type="submit"
                >
                  {submitLoading
                    ? "Saving..."
                    : editRequest
                      ? "Update Draft"
                      : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending detail / decision modal */}
      {pendingDetail && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card">
            <h2>Review: {pendingDetail.title}</h2>
            <div className="detail-grid">
              <div>
                <strong>Requester:</strong> {pendingDetail.requester_id}
              </div>
              <div>
                <strong>Total Requested:</strong> $
                {pendingDetail.total_requested.toFixed(2)}
              </div>
              <div>
                <strong>Justification:</strong> {pendingDetail.justification}
              </div>
              <div>
                <strong>Needed By:</strong>{" "}
                {pendingDetail.needed_by
                  ? new Date(pendingDetail.needed_by).toLocaleDateString()
                  : "-"}
              </div>
              <div>
                <strong>Submitted:</strong>{" "}
                {new Date(pendingDetail.submitted_at).toLocaleDateString()}
              </div>
            </div>
            <div className="form-group">
              <label>Decision Note (optional)</label>
              <textarea
                onChange={(e) => setDecisionNote(e.target.value)}
                rows={2}
                value={decisionNote}
              />
            </div>
            <div className="modal-actions decision-actions">
              <button
                className="secondary-btn"
                onClick={() => {
                  setPendingDetail(null);
                  setDecisionNote("");
                }}
                type="button"
              >
                Back
              </button>
              <button
                className="primary-btn"
                onClick={() => handleDecision("APPROVE")}
                type="button"
              >
                Approve
              </button>
              <button
                className="warning-btn"
                onClick={() => handleDecision("REQUEST_INFO")}
                type="button"
              >
                Request Info
              </button>
              <button
                className="danger-btn"
                onClick={() => handleDecision("REJECT")}
                type="button"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
