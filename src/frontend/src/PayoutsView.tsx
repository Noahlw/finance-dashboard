import { useEffect, useState } from "react";
import { apiService } from "./services/api";
import type { FinanceAccount, PayoutQueueItem, SessionRole } from "./types";

interface PayoutsViewProps {
  role: SessionRole;
}

export default function PayoutsView({ role }: PayoutsViewProps) {
  const [payouts, setPayouts] = useState<PayoutQueueItem[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isTreasurer = role === "TREASURER";

  const loadPayouts = () => {
    setLoading(true);
    Promise.all([apiService.getQueuedPayouts(), apiService.getAccounts()])
      .then(([p, a]) => {
        setPayouts(p);
        setAccounts(a);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const queued = payouts.filter((p) => p.status === "QUEUED");
  const failed = payouts.filter((p) => p.status === "FAILED");
  const sent = payouts.filter((p) => p.status === "SENT");

  const getAccountName = (accountId?: string) => {
    if (!accountId) {
      return "-";
    }
    return accounts.find((a) => a.account_id === accountId)?.name || accountId;
  };

  return (
    <div className="view-container">
      {error && <div className="alert error">{error}</div>}

      <section className="glass-card">
        <div className="card-header">
          <h2>Payout Queue</h2>
          <button
            className="secondary-btn"
            disabled={loading}
            onClick={loadPayouts}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="loader" />
            <p>Loading payouts...</p>
          </div>
        ) : payouts.length === 0 ? (
          <div className="empty-state">No payouts yet</div>
        ) : (
          <>
            {queued.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <h3
                  style={{
                    color: "var(--status-pending)",
                    fontSize: "1rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  Queued ({queued.length})
                </h3>
                {queued.map((p) => (
                  <PayoutCard
                    accountName={getAccountName(p.account_id)}
                    isTreasurer={isTreasurer}
                    key={p.payout_id}
                    onChanged={loadPayouts}
                    payout={p}
                  />
                ))}
              </div>
            )}

            {failed.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <h3
                  style={{
                    color: "var(--status-rejected)",
                    fontSize: "1rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  Failed ({failed.length})
                </h3>
                {failed.map((p) => (
                  <PayoutCard
                    accountName={getAccountName(p.account_id)}
                    isTreasurer={isTreasurer}
                    key={p.payout_id}
                    onChanged={loadPayouts}
                    payout={p}
                  />
                ))}
              </div>
            )}

            {sent.length > 0 && (
              <div>
                <h3
                  style={{
                    color: "var(--status-approved)",
                    fontSize: "1rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  Sent ({sent.length})
                </h3>
                {sent.map((p) => (
                  <PayoutCard
                    accountName={getAccountName(p.account_id)}
                    isTreasurer={isTreasurer}
                    key={p.payout_id}
                    onChanged={loadPayouts}
                    payout={p}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function PayoutCard({
  payout,
  accountName,
  isTreasurer,
  onChanged,
}: {
  payout: PayoutQueueItem;
  accountName: string;
  isTreasurer: boolean;
  onChanged: () => void;
}) {
  const [showSentModal, setShowSentModal] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--card-border)",
        borderRadius: 12,
        marginBottom: "0.75rem",
        padding: "1rem",
      }}
    >
      <div
        style={{
          alignItems: "flex-start",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <span className="mono">{payout.payout_id}</span>
            <span className={`badge status-${payout.status.toLowerCase()}`}>
              {payout.status}
            </span>
          </div>
          <span className="muted-text" style={{ fontSize: "0.85rem" }}>
            Claim: {payout.claim_id} | Method: {payout.method} | Account:{" "}
            {accountName}
          </span>
          {payout.parent_payout_id && (
            <span
              className="muted-text"
              style={{ display: "block", fontSize: "0.8rem" }}
            >
              Partial payment of: {payout.parent_payout_id}
            </span>
          )}
          {payout.failure_reason && (
            <span
              style={{
                color: "var(--status-rejected)",
                display: "block",
                fontSize: "0.85rem",
                marginTop: "0.25rem",
              }}
            >
              Reason: {payout.failure_reason}
            </span>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="amount" style={{ fontSize: "1.1rem" }}>
            ${Number(payout.amount).toFixed(2)}
          </div>
          {payout.status === "QUEUED" && isTreasurer && (
            <div
              style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}
            >
              <button
                className="primary-btn"
                onClick={() => setShowSentModal(true)}
              >
                Mark Sent
              </button>
              <button
                className="danger-btn"
                onClick={() => setShowFailModal(true)}
              >
                Failed
              </button>
            </div>
          )}
          {payout.status === "FAILED" && isTreasurer && (
            <button
              className="warning-btn"
              onClick={async () => {
                try {
                  await apiService.retryPayout(payout.payout_id);
                  onChanged();
                } catch (err: any) {
                  alert(err.message || "Retry failed");
                }
              }}
              style={{ marginTop: "0.5rem" }}
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {showSentModal && (
        <MarkSentModal
          onClose={() => setShowSentModal(false)}
          onDone={() => {
            setShowSentModal(false);
            onChanged();
          }}
          payout={payout}
        />
      )}
      {showFailModal && (
        <FailModal
          onClose={() => setShowFailModal(false)}
          onDone={() => {
            setShowFailModal(false);
            onChanged();
          }}
          payout={payout}
        />
      )}
    </div>
  );
}

function MarkSentModal({
  payout,
  onClose,
  onDone,
}: {
  payout: PayoutQueueItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const [txnReference, setTxnReference] = useState(payout.txn_reference || "");
  const [amount, setAmount] = useState(Number(payout.amount).toString());
  const [saving, setSaving] = useState(false);
  const [isPartial, setIsPartial] = useState(false);

  const needsTxnRef = payout.method === "FPS" || payout.method === "PAYME";

  const handleSubmit = async () => {
    if (needsTxnRef && !txnReference.trim()) {
      alert("Transaction reference is required for FPS/PAYME");
      return;
    }
    setSaving(true);
    try {
      await apiService.markPayoutSent(payout.payout_id, {
        amount: isPartial ? Number.parseFloat(amount) : undefined,
        txnReference: txnReference.trim(),
      });
      alert(
        isPartial
          ? "Partial payout recorded. Remainder re-queued."
          : "Payout marked as sent"
      );
      onDone();
    } catch (err: any) {
      alert(err.message || "Failed to mark sent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Mark Payout Sent</h2>
        <p className="muted-text" style={{ marginBottom: "1rem" }}>
          {payout.payout_id} — ${Number(payout.amount).toFixed(2)} via{" "}
          {payout.method}
        </p>
        <div
          className="form-group"
          style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}
        >
          <input
            checked={isPartial}
            id="partial"
            onChange={(e) => setIsPartial(e.target.checked)}
            style={{ width: "auto" }}
            type="checkbox"
          />
          <label htmlFor="partial" style={{ marginBottom: 0 }}>
            Partial payment (remainder will be re-queued)
          </label>
        </div>
        {isPartial && (
          <div className="form-group">
            <label>Actual Amount Sent ($)</label>
            <input
              min="0.01"
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              type="number"
              value={amount}
            />
          </div>
        )}
        <div className="form-group">
          <label>
            Transaction Reference{" "}
            {needsTxnRef ? "(required for FPS/PAYME)" : "(optional)"}
          </label>
          <input
            onChange={(e) => setTxnReference(e.target.value)}
            placeholder={
              needsTxnRef ? "FPS reference..." : "Optional reference..."
            }
            type="text"
            value={txnReference}
          />
        </div>
        <div className="modal-actions">
          <button className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-btn"
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? "Saving..." : "Confirm Sent"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FailModal({
  payout,
  onClose,
  onDone,
}: {
  payout: PayoutQueueItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert("Failure reason is required");
      return;
    }
    setSaving(true);
    try {
      await apiService.recordPayoutFailed(payout.payout_id, reason.trim());
      alert("Payout marked as failed");
      onDone();
    } catch (err: any) {
      alert(err.message || "Failed to record failure");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Record Payout Failure</h2>
        <p className="muted-text" style={{ marginBottom: "1rem" }}>
          {payout.payout_id} — ${Number(payout.amount).toFixed(2)}
        </p>
        <div className="form-group">
          <label>Failure Reason</label>
          <textarea
            autoFocus
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the failure reason..."
            rows={3}
            value={reason}
          />
        </div>
        <div className="modal-actions">
          <button className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="danger-btn"
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? "Saving..." : "Confirm Failure"}
          </button>
        </div>
      </div>
    </div>
  );
}
