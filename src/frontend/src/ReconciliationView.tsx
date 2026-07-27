import { useEffect, useState } from "react";
import { apiService } from "./services/api";
import type { ReconciliationData } from "./types";

export default function ReconciliationView() {
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [error, setError] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [reason, setReason] = useState("");
  const [adjustmentId, setAdjustmentId] = useState("");

  const reload = () =>
    apiService
      .getReconciliation()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    reload();
  }, []);

  if (error)
    return <div className="alert error">Reconciliation error: {error}</div>;
  if (!data) return <p>Loading reconciliation…</p>;

  const selected = data.accounts.find(
    (account) => account.account_id === selectedAccountId
  );
  const movements = selectedAccountId
    ? Object.values(data.drilldown)
        .flat()
        .filter((movement) => movement.account_id === selectedAccountId)
    : [];
  const submitCorrection = () => {
    const parsedAmount = Number(amount);
    if (!(parsedAmount > 0) || !reason.trim() || !selected) return;
    apiService
      .correctReconciliation({
        accountId: selected.account_id,
        amount: parsedAmount,
        direction,
        reason,
      })
      .then((result) => {
        setAdjustmentId(result.adjustment_id);
        setAmount("");
        setReason("");
        return reload();
      })
      .catch((e: Error) => setError(e.message));
  };

  return (
    <section className="glass-card">
      <h2>Movement Ledger Reconciliation</h2>
      <p>
        {data.movement_count} movements · {data.mismatches.length} balance
        mismatches · {data.incomplete_payouts.length} incomplete payouts
      </p>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col">Opening</th>
              <th scope="col">Ledger</th>
              <th scope="col">Expected</th>
              <th scope="col">Recorded</th>
              <th scope="col">Difference</th>
            </tr>
          </thead>
          <tbody>
            {data.accounts.map((account) => (
              <tr key={account.account_id}>
                <th scope="row">
                  <button
                    type="button"
                    aria-expanded={selectedAccountId === account.account_id}
                    onClick={() =>
                      setSelectedAccountId(
                        selectedAccountId === account.account_id
                          ? null
                          : account.account_id
                      )
                    }
                  >
                    {account.name}
                  </button>
                </th>
                <td>HK${account.opening_balance.toFixed(2)}</td>
                <td>HK${account.ledger_total.toFixed(2)}</td>
                <td>HK${account.expected_balance.toFixed(2)}</td>
                <td>HK${account.actual_balance.toFixed(2)}</td>
                <td>HK${account.difference.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div aria-label={`Movement Ledger for ${selected.name}`} role="region">
          {movements.length === 0 ? (
            <p>No movements for this account.</p>
          ) : (
            <ul>
              {movements.map((movement) => (
                <li key={movement.movement_id}>
                  {movement.movement_type}: HK${movement.amount.toFixed(2)} ·{" "}
                  {movement.source_type} {movement.source_id} ·{" "}
                  {movement.reason || "No reason"}
                </li>
              ))}
            </ul>
          )}
          <h3>Correct mismatch</h3>
          <label>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label>
            Direction
            <select
              value={direction}
              onChange={(e) =>
                setDirection(e.target.value as "CREDIT" | "DEBIT")
              }
            >
              <option value="CREDIT">CREDIT</option>
              <option value="DEBIT">DEBIT</option>
            </select>
          </label>
          <label>
            Reason
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={!(Number(amount) > 0) || !reason.trim()}
            onClick={submitCorrection}
          >
            Submit correction
          </button>
          {adjustmentId && (
            <p role="status">Adjustment recorded: {adjustmentId}</p>
          )}
        </div>
      )}
    </section>
  );
}
