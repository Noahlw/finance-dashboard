import { useEffect, useState } from "react";
import { apiService } from "./services/api";
import type { DashboardSummary, SessionRole } from "./types";

interface SemesterStatus {
  blocker_count: number;
  blockers: { type: string; id: string; reason: string }[];
  closeable: boolean;
  current_semester: string;
  end_date: string;
  start_date: string;
}

function plural(n: number, suffix?: string) {
  return n === 1 ? "" : suffix || "s";
}

export default function DashboardView({ role }: { role: SessionRole }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [semesterStatus, setSemesterStatus] = useState<SemesterStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    Promise.all([
      apiService.getDashboardSummary(),
      apiService.getSemesterStatus(),
    ])
      .then(([s, sem]) => {
        setSummary(s);
        setSemesterStatus(sem);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const handleCloseSemester = async () => {
    if (
      !confirm(
        `Close semester ${semesterStatus?.current_semester}? This will delete all DRAFT claims and requests, roll forward account balances, and advance to the next semester. This cannot be undone.`
      )
    ) {
      return;
    }
    setClosing(true);
    try {
      const result = await apiService.closeSemester();
      alert(
        `Semester ${result.closed} closed. ${result.next ? "Now active: " + result.next : "Ready for Annual Migration."}`
      );
      window.location.reload();
    } catch (e) {
      setError("Close failed: " + (e as Error).message);
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="view-container">
        <div className="loader" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="view-container">
        <div className="alert error">{error}</div>
      </div>
    );
  }

  const hasAttention = summary && summary.counts.total_attention > 0;

  return (
    <div className="view-container">
      {semesterStatus && (
        <section className="glass-card">
          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h2>Semester: {semesterStatus.current_semester}</h2>
              <p className="muted-text">
                {semesterStatus.start_date} — {semesterStatus.end_date}
              </p>
            </div>
            {role === "TREASURER" && (
              <div>
                {semesterStatus.closeable ? (
                  <button
                    className="warning-btn"
                    disabled={closing}
                    onClick={handleCloseSemester}
                  >
                    {closing ? "Closing..." : "Close Semester"}
                  </button>
                ) : (
                  <span className="attention-badge badge-warning">
                    {semesterStatus.blocker_count} blocker
                    {plural(semesterStatus.blocker_count)}
                  </span>
                )}
              </div>
            )}
          </div>
          {semesterStatus.blockers.length > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              <h4>Close Blockers:</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>ID</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterStatus.blockers.map((b, i) => (
                    <tr key={i}>
                      <td>{b.type}</td>
                      <td className="mono">{b.id}</td>
                      <td>{b.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {!hasAttention && (
        <section className="glass-card">
          <h2>All Clear</h2>
          <p className="placeholder-text">Nothing needs attention right now.</p>
        </section>
      )}

      {hasAttention && (
        <>
          <section className="glass-card">
            <h2>Needs Attention</h2>
            <div className="attention-counts">
              {summary.counts.missing_receipts > 0 && (
                <span className="attention-badge badge-warning">
                  {summary.counts.missing_receipts} Missing Receipt
                  {plural(summary.counts.missing_receipts)}
                </span>
              )}
              {summary.counts.over_budget > 0 && (
                <span className="attention-badge badge-danger">
                  {summary.counts.over_budget} Over Budget
                </span>
              )}
              {summary.counts.needs_info > 0 && (
                <span className="attention-badge badge-info">
                  {summary.counts.needs_info} Needs Info
                </span>
              )}
              {summary.counts.failed_payouts > 0 && (
                <span className="attention-badge badge-danger">
                  {summary.counts.failed_payouts} Failed Payout
                  {plural(summary.counts.failed_payouts)}
                </span>
              )}
              {summary.counts.pending_requests > 0 && (
                <span className="attention-badge badge-info">
                  {summary.counts.pending_requests} Pending Request
                  {plural(summary.counts.pending_requests)}
                </span>
              )}
            </div>
          </section>

          {summary.missing_receipts.length > 0 && (
            <section className="glass-card">
              <h3>Missing Receipts</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Claim</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.missing_receipts.map((item) => (
                    <tr key={item.claim_id}>
                      <td className="mono">{item.claim_id}</td>
                      <td>
                        <span
                          className={`status-chip chip-${item.claim_status.toLowerCase()}`}
                        >
                          {item.claim_status}
                        </span>
                      </td>
                      <td className="amount">
                        HKD {item.total_amount.toFixed(2)}
                      </td>
                      <td>{item.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {summary.over_budget_claims.length > 0 && (
            <section className="glass-card">
              <h3>Over Budget Claims</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Claim</th>
                    <th>Budget Line</th>
                    <th>Claimed</th>
                    <th>Remaining</th>
                    <th>Overage</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.over_budget_claims.map((item) => (
                    <tr key={`${item.claim_id}-${item.budget_line_id}`}>
                      <td className="mono">{item.claim_id}</td>
                      <td className="mono">{item.budget_line_id}</td>
                      <td className="amount">HKD {item.claimed.toFixed(2)}</td>
                      <td className="amount">
                        HKD {item.remaining.toFixed(2)}
                      </td>
                      <td className="amount amount-negative">
                        HKD {(item.claimed - item.remaining).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {summary.needs_info_claims.length > 0 && (
            <section className="glass-card">
              <h3>Needs Information</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Claim</th>
                    <th>Amount</th>
                    <th>Submitted</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.needs_info_claims.map((item) => (
                    <tr key={item.claim_id}>
                      <td className="mono">{item.claim_id}</td>
                      <td className="amount">
                        HKD {item.total_amount.toFixed(2)}
                      </td>
                      <td>{item.submitted_at}</td>
                      <td>{item.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {summary.failed_payouts.length > 0 && (
            <section className="glass-card">
              <h3>Failed Payouts</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Payout</th>
                    <th>Claim</th>
                    <th>Amount</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.failed_payouts.map((item) => (
                    <tr key={item.payout_id}>
                      <td className="mono">{item.payout_id}</td>
                      <td className="mono">{item.claim_id}</td>
                      <td className="amount">HKD {item.amount.toFixed(2)}</td>
                      <td className="reason">{item.failure_reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {summary.pending_requests.length > 0 && (
            <section className="glass-card">
              <h3>Pending Budget Requests</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Title</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.pending_requests.map((item) => (
                    <tr key={item.request_id}>
                      <td className="mono">{item.request_id}</td>
                      <td>{item.title}</td>
                      <td>{item.submitted_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}
