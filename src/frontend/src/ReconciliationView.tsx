import { useEffect, useState } from "react";
import { apiService } from "./services/api";
import type { ReconciliationData } from "./types";

export default function ReconciliationView() {
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiService
      .getReconciliation()
      .then(setData)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  if (error) {
    return <div className="alert error">Reconciliation error: {error}</div>;
  }
  if (!data) {
    return <p>Loading reconciliation…</p>;
  }

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
                <th scope="row">{account.name}</th>
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
    </section>
  );
}
