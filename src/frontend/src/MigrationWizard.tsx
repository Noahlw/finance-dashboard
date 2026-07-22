import { useEffect, useState } from "react";
import { apiService } from "./services/api";
import type {
  MigrationPreview,
  MigrationSelections,
  MigrationState,
} from "./types";

export default function MigrationWizard() {
  const [state, setState] = useState<MigrationState | null>(null);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [selections, setSelections] = useState<MigrationSelections>({
    accountBalances: {},
    accountIds: [],
    balanceReasons: {},
    categoryIds: [],
    eventIds: [],
    memberIds: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, p, sel] = await Promise.all([
        apiService.getMigrationState(),
        apiService.getMigrationPreview(),
        apiService.getMigrationSelections(),
      ]);
      setState(s);
      setPreview(p);
      if (sel) {
        setSelections((prev) => ({ ...prev, ...sel }));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartMigration = async () => {
    setActionLoading("starting");
    try {
      await apiService.startMigration();
      loadAll();
    } catch (e) {
      setError("Start failed: " + (e as Error).message);
    } finally {
      setActionLoading("");
    }
  };

  const handleSaveMembers = async () => {
    setActionLoading("members");
    try {
      await apiService.setMemberSelections(selections.memberIds);
      loadAll();
    } catch (e) {
      setError("Save members failed: " + (e as Error).message);
    } finally {
      setActionLoading("");
    }
  };

  const handleSaveAccounts = async () => {
    setActionLoading("accounts");
    try {
      await apiService.setAccountSelections({
        accountBalances: selections.accountBalances,
        accountIds: selections.accountIds,
        balanceReasons: selections.balanceReasons,
      });
      loadAll();
    } catch (e) {
      setError("Save accounts failed: " + (e as Error).message);
    } finally {
      setActionLoading("");
    }
  };

  const handleSaveCategoriesEvents = async () => {
    setActionLoading("categoriesEvents");
    try {
      await apiService.setCategoryEventSelections({
        categoryIds: selections.categoryIds,
        eventIds: selections.eventIds,
      });
      loadAll();
    } catch (e) {
      setError("Save categories/events failed: " + (e as Error).message);
    } finally {
      setActionLoading("");
    }
  };

  const handleConfirmAllSelections = async () => {
    setActionLoading("review");
    try {
      await apiService.setMigrationSelections(selections);
      loadAll();
    } catch (e) {
      setError("Confirm selections failed: " + (e as Error).message);
    } finally {
      setActionLoading("");
    }
  };

  const toggleSelection = (
    list: string[],
    id: string,
    setter: (ids: string[]) => void
  ) => {
    if (list.includes(id)) {
      setter(list.filter((x) => x !== id));
    } else {
      setter([...list, id]);
    }
  };

  const handleExecute = async () => {
    if (
      !confirm(
        "Execute migration? This will create the new spreadsheet with selected data."
      )
    ) {
      return;
    }
    setActionLoading("executing");
    try {
      await apiService.executeMigration();
      alert(
        "Migration executed! Review the new spreadsheet before activating."
      );
      loadAll();
    } catch (e) {
      setError("Execution failed: " + (e as Error).message);
    } finally {
      setActionLoading("");
    }
  };

  const handleActivate = async () => {
    if (
      !confirm(
        "Activate migration? This will switch production to the new spreadsheet. The old one will be archived."
      )
    ) {
      return;
    }
    setActionLoading("activating");
    try {
      await apiService.activateMigration();
      alert(
        "Migration activated! The new spreadsheet is now the active ledger. Refresh to see changes."
      );
      window.location.reload();
    } catch (e) {
      setError("Activation failed: " + (e as Error).message);
    } finally {
      setActionLoading("");
    }
  };

  const handleCancel = async () => {
    if (
      !confirm(
        "Cancel migration? This will delete the created folder and spreadsheet."
      )
    ) {
      return;
    }
    setActionLoading("cancelling");
    try {
      await apiService.cancelMigration();
      alert("Migration cancelled.");
      loadAll();
    } catch (e) {
      setError("Cancel failed: " + (e as Error).message);
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <div className="glass-card">
        <div className="loader" style={{ margin: "2rem auto" }} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="glass-card">
        <div className="alert error">
          {error}
          <button
            className="btn btn-secondary"
            onClick={() => {
              setError("");
              loadAll();
            }}
            style={{ marginTop: "0.5rem" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasActiveMigration = state && state.active;

  // Stage: No migration started — show preview and start button
  if (!hasActiveMigration) {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Annual Migration</h2>
          <p className="muted-text">
            Create a new annual spreadsheet and carry forward selected members,
            accounts, categories, and events.
          </p>
          {preview && (
            <div style={{ marginTop: "1rem" }}>
              <p>
                Year Label: <strong>{preview.year_label}</strong>
              </p>
              <p>Active Members: {preview.active_members.length}</p>
              <p>Finance Accounts: {preview.accounts.length}</p>
              <p>Categories: {preview.categories.length}</p>
              <p>Events: {preview.events.length}</p>
              {!preview.has_treasurer && (
                <p className="alert warning" style={{ marginTop: "0.5rem" }}>
                  No active Treasurer found. Migration requires at least one
                  Treasurer.
                </p>
              )}
            </div>
          )}
          <div style={{ marginTop: "1rem" }}>
            <button
              className="primary-btn"
              disabled={!!actionLoading || !preview?.has_treasurer}
              onClick={handleStartMigration}
            >
              Start Migration
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Stage: INIT — folder + spreadsheet just created; show progress
  if (state.stage === "INIT") {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Migration Initialized — {state.year_label}</h2>
          <p className="muted-text">
            Target spreadsheet: <code>{state.target_spreadsheet_id}</code>
          </p>
          <p>
            Year folder and spreadsheet have been created. Continue with member
            selection below.
          </p>
          {preview && (
            <p>
              {preview.active_members.length} active members,{" "}
              {preview.inactive_members.length} inactive members,{" "}
              {preview.operators.length} operators
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              className="primary-btn"
              disabled={!!actionLoading}
              onClick={handleSaveMembers}
            >
              {actionLoading === "members" ? "Saving..." : "Continue to Members"}
            </button>
            <button
              className="danger-btn"
              disabled={!!actionLoading}
              onClick={handleCancel}
            >
              Cancel Migration
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Stage: MEMBERS — select members to carry forward
  if (state.stage === "MEMBERS" && preview) {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Select Members — {state.year_label}</h2>
          <p className="muted-text">
            Step 3 of 8: Choose which members to carry forward.
          </p>
        </section>

        <section className="glass-card">
          <h3>Members ({selections.memberIds.length} selected)</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {preview.operators.map((o) => (
                  <tr key={o.user_id}>
                    <td>
                      <input checked disabled type="checkbox" />
                    </td>
                    <td className="mono">{o.user_id}</td>
                    <td>{o.display_name}</td>
                    <td>{o.role}</td>
                    <td>{o.active ? "✓" : ""}</td>
                  </tr>
                ))}
                {preview.active_members.map((m) => (
                  <tr key={m.user_id}>
                    <td>
                      <input
                        checked={selections.memberIds.includes(m.user_id)}
                        onChange={() =>
                          toggleSelection(
                            selections.memberIds,
                            m.user_id,
                            (ids) =>
                              setSelections((s) => ({
                                ...s,
                                memberIds: ids,
                              }))
                          )
                        }
                        type="checkbox"
                      />
                    </td>
                    <td className="mono">{m.user_id}</td>
                    <td>{m.display_name}</td>
                    <td>{m.role}</td>
                    <td>✓</td>
                  </tr>
                ))}
                {preview.inactive_members.map((m) => (
                  <tr key={m.user_id} style={{ opacity: 0.6 }}>
                    <td>
                      <input
                        checked={selections.memberIds.includes(m.user_id)}
                        onChange={() =>
                          toggleSelection(
                            selections.memberIds,
                            m.user_id,
                            (ids) =>
                              setSelections((s) => ({
                                ...s,
                                memberIds: ids,
                              }))
                          )
                        }
                        type="checkbox"
                      />
                    </td>
                    <td className="mono">{m.user_id}</td>
                    <td>{m.display_name}</td>
                    <td>{m.role}</td>
                    <td>—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-card">
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="primary-btn"
              disabled={!!actionLoading || selections.memberIds.length === 0}
              onClick={handleSaveMembers}
            >
              {actionLoading === "members"
                ? "Saving..."
                : "Save Members & Continue"}
            </button>
            <button
              className="secondary-btn"
              onClick={() => {
                setSelections((s) => ({
                  ...s,
                  memberIds: [
                    ...preview.operators.map((o) => o.user_id),
                    ...preview.active_members.map((m) => m.user_id),
                  ],
                }));
              }}
            >
              Select All Active
            </button>
            <button
              className="danger-btn"
              disabled={!!actionLoading}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Stage: ACCOUNTS — select accounts with opening balances
  if (state.stage === "ACCOUNTS" && preview) {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Select Accounts — {state.year_label}</h2>
          <p className="muted-text">
            Step 4 of 8: Choose which accounts to carry forward and confirm
            opening balances.
          </p>
        </section>

        <section className="glass-card">
          <h3>
            Finance Accounts ({selections.accountIds.length} selected)
          </h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Current Balance</th>
                  <th>Opening Balance</th>
                </tr>
              </thead>
              <tbody>
                {preview.accounts.map((a) => (
                  <tr key={a.account_id}>
                    <td>
                      <input
                        checked={selections.accountIds.includes(a.account_id)}
                        onChange={() =>
                          toggleSelection(
                            selections.accountIds,
                            a.account_id,
                            (ids) =>
                              setSelections((s) => ({
                                ...s,
                                accountIds: ids,
                              }))
                          )
                        }
                        type="checkbox"
                      />
                    </td>
                    <td className="mono">{a.account_id}</td>
                    <td>{a.name}</td>
                    <td className="amount">
                      HKD {a.current_balance.toFixed(2)}
                    </td>
                    <td>
                      <input
                        className="filter-date"
                        onChange={(e) =>
                          setSelections((s) => ({
                            ...s,
                            accountBalances: {
                              ...s.accountBalances,
                              [a.account_id]: Number(e.target.value),
                            },
                          }))
                        }
                        style={{ width: "120px" }}
                        type="number"
                        value={
                          selections.accountBalances[a.account_id] ??
                          a.current_balance
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-card">
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="primary-btn"
              disabled={!!actionLoading || selections.accountIds.length === 0}
              onClick={handleSaveAccounts}
            >
              {actionLoading === "accounts"
                ? "Saving..."
                : "Save Accounts & Continue"}
            </button>
            <button
              className="danger-btn"
              disabled={!!actionLoading}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Stage: CATEGORIES_EVENTS — select categories and events
  if (state.stage === "CATEGORIES_EVENTS" && preview) {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Select Categories & Events — {state.year_label}</h2>
          <p className="muted-text">
            Step 5 of 8: Choose which categories and events to carry forward.
          </p>
        </section>

        <section className="glass-card">
          <h3>
            Categories ({selections.categoryIds.length} selected) & Events (
            {selections.eventIds.length} selected)
          </h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Type</th>
                  <th>ID</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {preview.categories.map((c) => (
                  <tr key={c.category_id}>
                    <td>
                      <input
                        checked={selections.categoryIds.includes(
                          c.category_id
                        )}
                        onChange={() =>
                          toggleSelection(
                            selections.categoryIds,
                            c.category_id,
                            (ids) =>
                              setSelections((s) => ({
                                ...s,
                                categoryIds: ids,
                              }))
                          )
                        }
                        type="checkbox"
                      />
                    </td>
                    <td>Category</td>
                    <td className="mono">{c.category_id}</td>
                    <td>{c.name}</td>
                  </tr>
                ))}
                {preview.events.map((e) => (
                  <tr key={e.event_id}>
                    <td>
                      <input
                        checked={selections.eventIds.includes(e.event_id)}
                        onChange={() =>
                          toggleSelection(
                            selections.eventIds,
                            e.event_id,
                            (ids) =>
                              setSelections((s) => ({
                                ...s,
                                eventIds: ids,
                              }))
                          )
                        }
                        type="checkbox"
                      />
                    </td>
                    <td>Event</td>
                    <td className="mono">{e.event_id}</td>
                    <td>{e.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-card">
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="primary-btn"
              disabled={!!actionLoading}
              onClick={handleSaveCategoriesEvents}
            >
              {actionLoading === "categoriesEvents"
                ? "Saving..."
                : "Save Categories & Events"}
            </button>
            <button
              className="secondary-btn"
              onClick={() => {
                setSelections((s) => ({
                  ...s,
                  categoryIds: preview.categories
                    .filter((c) => c.active)
                    .map((c) => c.category_id),
                  eventIds: preview.events.map((e) => e.event_id),
                }));
              }}
            >
              Select All Active
            </button>
            <button
              className="danger-btn"
              disabled={!!actionLoading}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Stage: REVIEW — final review before execute
  if (state.stage === "REVIEW") {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Review Migration — {state.year_label}</h2>
          <p className="muted-text">
            Step 6 of 8: Confirm all selections before executing.
          </p>
          <p>
            Target spreadsheet: <code>{state.target_spreadsheet_id}</code>
          </p>
          <p>
            Selected: {selections.memberIds.length} members,{" "}
            {selections.accountIds.length} accounts,{" "}
            {selections.categoryIds.length} categories,{" "}
            {selections.eventIds.length} events
          </p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              className="warning-btn"
              disabled={!!actionLoading}
              onClick={handleExecute}
            >
              {actionLoading === "executing"
                ? "Executing..."
                : "Execute Migration"}
            </button>
            <button
              className="secondary-btn"
              disabled={!!actionLoading}
              onClick={handleConfirmAllSelections}
            >
              Re-confirm Selections
            </button>
            <button
              className="danger-btn"
              disabled={!!actionLoading}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Stage: EXECUTE — migration data written, ready to activate
  if (state.stage === "EXECUTE") {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Migration Executed — {state.year_label}</h2>
          <p className="muted-text">
            Step 7 of 8: Data has been written to the new spreadsheet. Review
            the target spreadsheet before activating.
          </p>
          <p>
            Target spreadsheet: <code>{state.target_spreadsheet_id}</code>
          </p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              className="primary-btn"
              disabled={!!actionLoading}
              onClick={handleActivate}
            >
              {actionLoading === "activating" ? "Activating..." : "Activate"}
            </button>
            <button
              className="danger-btn"
              disabled={!!actionLoading}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Stage: ACTIVATED or done
  return (
    <div className="migration-wizard">
      <section className="glass-card">
        <h2>Migration Complete</h2>
        <p>
          The annual migration to <strong>{state.year_label}</strong> has been
          activated.
        </p>
        <p className="muted-text">
          The previous annual file is now archived and read-only.
        </p>
      </section>
    </div>
  );
}
