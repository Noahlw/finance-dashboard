import { useEffect, useState } from "react";
import MigrationWizard from "./MigrationWizard";
import { apiService } from "./services/api";
import type {
  ReportData,
  ReportFilters,
  ReportType,
  SessionRole,
} from "./types";

const REPORT_TABS: { type: ReportType; label: string }[] = [
  { label: "Claims", type: "claims" },
  { label: "Budget", type: "budget" },
  { label: "Income", type: "income" },
  { label: "Payouts", type: "payouts" },
  { label: "Accounts", type: "accounts" },
];

const STATUS_OPTIONS: Record<ReportType, string[]> = {
  accounts: [],
  budget: [
    "",
    "PENDING",
    "NEEDS_INFO",
    "APPROVED",
    "PARTIALLY_APPROVED",
    "REJECTED",
    "WITHDRAWN",
    "CLOSED",
  ],
  claims: [
    "",
    "SUBMITTED",
    "NEEDS_INFO",
    "VERIFIED",
    "REJECTED",
    "APPROVED_FOR_PAYOUT",
    "PAID",
    "LOCKED",
  ],
  income: ["", "PENDING", "NEEDS_INFO", "CONFIRMED", "REJECTED"],
  payouts: ["", "QUEUED", "SENT", "CONFIRMED", "FAILED"],
};

export default function ReportsView({ role }: { role: SessionRole }) {
  const [activeTab, setActiveTab] = useState<ReportType>("claims");
  const [showMigration, setShowMigration] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<ReportFilters>({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (showMigration) {
      return;
    }
    setLoading(true);
    setError("");
    apiService
      .getReportsData(activeTab, filters)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [activeTab, filters, showMigration]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const csv = await apiService.exportCsv(activeTab, filters);
      if (csv) {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${activeTab}-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setError("Export failed: " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="view-container">
      <section className="glass-card">
        <h2>Reports</h2>
        <div className="report-tabs">
          {REPORT_TABS.map((t) => (
            <button
              className={`tab-btn ${!showMigration && activeTab === t.type ? "active" : ""}`}
              key={t.type}
              onClick={() => {
                setActiveTab(t.type);
                setShowMigration(false);
                setFilters({});
              }}
            >
              {t.label}
            </button>
          ))}
          {role === "TREASURER" && (
            <button
              className={`tab-btn ${showMigration ? "active" : ""}`}
              onClick={() => setShowMigration(true)}
            >
              Migration
            </button>
          )}
        </div>

        {!showMigration && (
          <>
            <div className="report-filters">
              {STATUS_OPTIONS[activeTab].length > 0 && (
                <select
                  className="filter-select"
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, status: e.target.value }))
                  }
                  value={filters.status || ""}
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS[activeTab].filter(Boolean).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
              <input
                className="filter-date"
                onChange={(e) =>
                  setFilters((f) => ({ ...f, fromDate: e.target.value }))
                }
                placeholder="From"
                type="date"
                value={filters.fromDate || ""}
              />
              <input
                className="filter-date"
                onChange={(e) =>
                  setFilters((f) => ({ ...f, toDate: e.target.value }))
                }
                placeholder="To"
                type="date"
                value={filters.toDate || ""}
              />
              <button
                className="btn btn-secondary"
                onClick={() => setFilters({})}
              >
                Clear
              </button>
              <button
                className="btn btn-secondary"
                disabled={exporting}
                onClick={handleExportCsv}
              >
                {exporting ? "Exporting..." : "Export CSV"}
              </button>
            </div>
          </>
        )}
      </section>

      {showMigration && <MigrationWizard />}

      {!showMigration && loading && (
        <div className="loader" style={{ margin: "2rem auto" }} />
      )}
      {!showMigration && error && <div className="alert error">{error}</div>}

      {!showMigration && data && !loading && (
        <section className="glass-card">
          <div className="report-summary">
            {data.count} {data.type === "accounts" ? "accounts" : "records"}
            {data.type === "accounts" && data.total_current_balance != null && (
              <span className="report-balance">
                {" "}
                — Total Balance: HKD {data.total_current_balance.toFixed(2)}
              </span>
            )}
          </div>

          {data.type === "claims" && <ClaimsReportTable rows={data.rows} />}
          {data.type === "budget" && <BudgetReportTable rows={data.rows} />}
          {data.type === "income" && <IncomeReportTable rows={data.rows} />}
          {data.type === "payouts" && <PayoutsReportTable rows={data.rows} />}
          {data.type === "accounts" && <AccountsReportTable data={data} />}

          {data.count === 0 && (
            <p className="empty-state">No data matches the current filters.</p>
          )}
        </section>
      )}
    </div>
  );
}

function ClaimsReportTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Claim ID</th>
            <th>Claimant</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Submitted</th>
            <th>Event</th>
            <th>Semester</th>
            <th>Method</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.claim_id}>
              <td className="mono">{r.claim_id}</td>
              <td className="mono">{r.claimant_id}</td>
              <td>
                <span
                  className={`status-chip chip-${(r.status || "").toLowerCase()}`}
                >
                  {r.status}
                </span>
              </td>
              <td className="amount">
                HKD {Number(r.total_amount || 0).toFixed(2)}
              </td>
              <td>{r.submitted_at}</td>
              <td>{r.event_id}</td>
              <td>{r.semester}</td>
              <td>{r.payout_method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BudgetReportTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Request ID</th>
            <th>Title</th>
            <th>Status</th>
            <th>Requested</th>
            <th>Approved</th>
            <th>Submitted</th>
            <th>Decided</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.request_id}>
              <td className="mono">{r.request_id}</td>
              <td>{r.title}</td>
              <td>
                <span
                  className={`status-chip chip-${(r.status || "").toLowerCase()}`}
                >
                  {r.status}
                </span>
              </td>
              <td className="amount">
                HKD {Number(r.total_requested || 0).toFixed(2)}
              </td>
              <td className="amount">
                HKD {Number(r.total_approved || 0).toFixed(2)}
              </td>
              <td>{r.submitted_at}</td>
              <td>{r.decided_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IncomeReportTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Income ID</th>
            <th>Date</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Received By</th>
            <th>Source</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.income_id}>
              <td className="mono">{r.income_id}</td>
              <td>{r.date}</td>
              <td>{r.category_id}</td>
              <td className="amount">HKD {Number(r.amount || 0).toFixed(2)}</td>
              <td className="mono">{r.received_by}</td>
              <td>{r.source_ref}</td>
              <td>
                <span
                  className={`status-chip chip-${(r.status || "").toLowerCase()}`}
                >
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PayoutsReportTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Payout ID</th>
            <th>Claim ID</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th>TXN Ref</th>
            <th>Paid</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.payout_id}>
              <td className="mono">{r.payout_id}</td>
              <td className="mono">{r.claim_id}</td>
              <td className="amount">HKD {Number(r.amount || 0).toFixed(2)}</td>
              <td>{r.method}</td>
              <td>
                <span
                  className={`status-chip chip-${(r.status || "").toLowerCase()}`}
                >
                  {r.status}
                </span>
              </td>
              <td className="mono">{r.txn_reference}</td>
              <td>{r.paid_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccountsReportTable({ data }: { data: ReportData }) {
  const accounts = data.accounts || [];
  return (
    <div>
      {accounts.length > 0 && (
        <>
          <h3>Finance Accounts</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account ID</th>
                  <th>Name</th>
                  <th>Balance</th>
                  <th>Pending Income</th>
                  <th>Reserved Payouts</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a: any) => (
                  <tr key={a.account_id}>
                    <td className="mono">{a.account_id}</td>
                    <td>{a.name}</td>
                    <td className="amount">
                      HKD {Number(a.current_balance || 0).toFixed(2)}
                    </td>
                    <td className="amount">
                      HKD {Number(a.pending_income || 0).toFixed(2)}
                    </td>
                    <td className="amount">
                      HKD {Number(a.reserved_payouts || 0).toFixed(2)}
                    </td>
                    <td>
                      <span className={"status-chip chip-active"}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data.transfers && data.transfers.length > 0 && (
        <>
          <h3>Transfers</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transfer ID</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.transfers.map((t: any) => (
                  <tr key={t.transfer_id}>
                    <td className="mono">{t.transfer_id}</td>
                    <td className="mono">{t.from_account_id}</td>
                    <td className="mono">{t.to_account_id}</td>
                    <td className="amount">
                      HKD {Number(t.amount || 0).toFixed(2)}
                    </td>
                    <td>{t.reason}</td>
                    <td>{t.transferred_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data.adjustments && data.adjustments.length > 0 && (
        <>
          <h3>Adjustments</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Adjustment ID</th>
                  <th>Account</th>
                  <th>Amount</th>
                  <th>Direction</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.adjustments.map((a: any) => (
                  <tr key={a.adjustment_id}>
                    <td className="mono">{a.adjustment_id}</td>
                    <td className="mono">{a.account_id}</td>
                    <td className="amount">
                      HKD {Number(a.amount || 0).toFixed(2)}
                    </td>
                    <td>{a.direction}</td>
                    <td>{a.reason}</td>
                    <td>{a.adjusted_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
