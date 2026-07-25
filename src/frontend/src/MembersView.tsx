import { useEffect, useState } from "react";
import { askForConfirmation, showNotice } from "./components/AccessibleDialog";
import { apiService } from "./services/api";
import type { AddMemberPayload, Member } from "./types";

export default function MembersView() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [payoutMethod, setPayoutMethod] =
    useState<AddMemberPayload["payout_method"]>("FPS");
  const [payoutHandle, setPayoutHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadMembers = () => {
    setLoading(true);
    apiService
      .getMembers()
      .then(setMembers)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(studentId.trim() && displayName.trim())) {
      showNotice("Student ID and display name are required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiService.addMember({
        display_name: displayName,
        full_name: fullName,
        payout_handle: payoutHandle,
        payout_method: payoutMethod,
        student_id: studentId,
      });
      setShowForm(false);
      setStudentId("");
      setDisplayName("");
      setFullName("");
      setPayoutMethod("FPS");
      setPayoutHandle("");
      loadMembers();
    } catch (err: any) {
      showNotice(err.message || "Failed to add member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (m: Member) => {
    if (!(await askForConfirmation("Reactivate " + m.display_name + "?"))) {
      return;
    }
    try {
      await apiService.reactivateMember(m.user_id);
      loadMembers();
    } catch (err: any) {
      showNotice(err.message || "Failed to reactivate");
    }
  };

  return (
    <div className="view-container">
      {error && <div className="alert error">{error}</div>}

      <section className="glass-card">
        <div className="card-header">
          <h2>Member Directory</h2>
          <button className="primary-btn" onClick={() => setShowForm(true)}>
            + Add Member
          </button>
        </div>

        {showForm && (
          <div className="modal-backdrop">
            <div className="modal-content glass-card">
              <h2>Add Member</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Student ID</label>
                  <input
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                    value={studentId}
                  />
                </div>
                <div className="form-group">
                  <label>Display Name / Nickname</label>
                  <input
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    value={displayName}
                  />
                </div>
                <div className="form-group">
                  <label>Full Name (optional)</label>
                  <input
                    onChange={(e) => setFullName(e.target.value)}
                    value={fullName}
                  />
                </div>
                <div className="form-group">
                  <label>Default Payout Method</label>
                  <select
                    onChange={(e) =>
                      setPayoutMethod(
                        e.target.value as AddMemberPayload["payout_method"]
                      )
                    }
                    value={payoutMethod}
                  >
                    <option value="FPS">FPS</option>
                    <option value="PAYME">PayMe</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Default Payout Handle (optional)</label>
                  <input
                    onChange={(e) => setPayoutHandle(e.target.value)}
                    placeholder="e.g. phone number for FPS"
                    value={payoutHandle}
                  />
                </div>
                <div className="modal-actions">
                  <button
                    className="secondary-btn"
                    disabled={submitting}
                    onClick={() => setShowForm(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="primary-btn"
                    disabled={submitting}
                    type="submit"
                  >
                    {submitting ? "Saving..." : "Add Member"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loader-container">
            <div className="loader" />
            <p>Loading...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="empty-state">No members found.</div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.user_id}>
                    <td className="mono">{m.user_id}</td>
                    <td>{m.display_name}</td>
                    <td>
                      <span
                        className={`badge ${m.active ? "status-approved" : "status-draft"}`}
                      >
                        {m.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {!m.active && (
                        <button
                          className="primary-btn"
                          onClick={() => handleReactivate(m)}
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
