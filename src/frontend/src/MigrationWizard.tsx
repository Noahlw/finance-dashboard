import { useEffect, useState } from "react";
import { askForConfirmation, showNotice } from "./components/AccessibleDialog";
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
    confirmedAccountIds: [],
    eventIds: [],
    memberIds: [],
    userIds: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

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
      const accountBalances = { ...selections.accountBalances };
      for (const id of selections.accountIds) {
        if (accountBalances[id] === undefined) {
          const acct = preview?.accounts.find((a) => a.account_id === id);
          accountBalances[id] = acct?.current_balance ?? 0;
        }
      }
      const balanceReasons = { ...selections.balanceReasons };
      for (const id of selections.accountIds) {
        if (!(balanceReasons[id] || "").trim()) {
          balanceReasons[id] = "Carry forward opening balance";
        }
      }
      await apiService.setAccountSelections({
        accountBalances,
        accountIds: selections.accountIds,
        balanceReasons,
        confirmedAccountIds: selections.accountIds,
      });
      setSelections((s) => ({
        ...s,
        accountBalances,
        balanceReasons,
        confirmedAccountIds: selections.accountIds,
      }));
      loadAll();
    } catch (e) {
      setError("Save accounts failed: " + (e as Error).message);
    } finally {
      setActionLoading("");
    }
  };

  const handleSaveEvents = async () => {
    setActionLoading("events");
    try {
      await apiService.setEventSelections(selections.eventIds);
      loadAll();
    } catch (e) {
      setError("Save events failed: " + (e as Error).message);
    } finally {
      setActionLoading("");
    }
  };

  const handleSaveCategories = async () => {
    setActionLoading("categories");
    try {
      await apiService.setCategorySelections(selections.categoryIds);
      loadAll();
    } catch (e) {
      setError("Save categories failed: " + (e as Error).message);
    } finally {
      setActionLoading("");
    }
  };

  const handleSaveUsers = async () => {
    setActionLoading("users");
    try {
      await apiService.setUserSelections(selections.userIds);
      const result = await apiService.validateMigration();
      setValidationErrors(result.errors || []);
      setValidationWarnings(result.warnings || []);
      if (!result.ok) {
        setError("Validation failed: review the errors below.");
        return;
      }
      await apiService.executeMigration();
      await loadAll();
    } catch (e) {
      const validation = e as {
        details?: { errors?: string[]; warnings?: string[] };
        message?: string;
      };
      const errors = validation.details?.errors || [];
      setValidationErrors(errors);
      setValidationWarnings(validation.details?.warnings || []);
      if (errors.length === 0) {
        setError(
          "Save users failed: " + (validation.message || "Unknown error")
        );
      }
    } finally {
      setActionLoading("");
    }
  };

  const handleValidate = async () => {
    setActionLoading("validating");
    try {
      const result = await apiService.validateMigration();
      setValidationErrors(result.errors || []);
      setValidationWarnings(result.warnings || []);
      if (result.ok) {
        await apiService.executeMigration();
        await loadAll();
      } else {
        setError("Validation failed: review the errors below.");
      }
    } catch (e) {
      const err = e as {
        details?: { errors?: string[]; warnings?: string[] };
        errors?: string[];
        warnings?: string[];
      };
      const errors = err.details?.errors || err.errors || [];
      setValidationErrors(errors);
      setValidationWarnings(err.details?.warnings || err.warnings || []);
      if (errors.length === 0) {
        setError("Validation failed. Retry or contact a Treasurer.");
      }
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

  const handleActivate = async () => {
    if (
      !(await askForConfirmation(
        "Activate migration? This will switch production to the new spreadsheet. The old one will be archived."
      ))
    ) {
      return;
    }
    setActionLoading("activating");
    try {
      await apiService.activateMigration();
      showNotice(
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
      !(await askForConfirmation(
        "Cancel migration? This will delete the created folder and spreadsheet."
      ))
    ) {
      return;
    }
    setActionLoading("cancelling");
    try {
      await apiService.cancelMigration();
      showNotice("Migration cancelled.");
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
            accounts, categories, events, and operators. The migration walks
            through 8 stages: Preview, Members, Accounts, Events, Categories,
            Users, Validate, Activate.
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

  // Stage: MEMBERS — select members to carry forward
  if (state.stage === "MEMBERS" && preview) {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Select Members — {state.year_label}</h2>
          <p className="muted-text">
            Step 2 of 8: Choose MEMBER rows to carry forward. Committee
            Operators are selected separately in the Users stage and roles are
            never promoted.
          </p>
          <p>
            Target spreadsheet: <code>{state.target_spreadsheet_id}</code>
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
                  memberIds: preview.active_members.map((m) => m.user_id),
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
            Step 3 of 8: Choose which accounts to carry forward and confirm
            opening balances. A non-empty reason is required for any changed or
            new balance.
          </p>
        </section>

        <section className="glass-card">
          <h3>Finance Accounts ({selections.accountIds.length} selected)</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Current Balance</th>
                  <th>Opening Balance</th>
                  <th>Reason (if changed)</th>
                </tr>
              </thead>
              <tbody>
                {preview.accounts.map((a) => {
                  const currentBal = a.current_balance;
                  const newBal = selections.accountBalances[a.account_id];
                  const isChanged =
                    newBal !== undefined && Number(newBal) !== currentBal;
                  return (
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
                      <td>
                        <input
                          aria-label={`Balance reason for ${a.name}`}
                          className="filter-date"
                          disabled={!isChanged}
                          onChange={(e) =>
                            setSelections((s) => ({
                              ...s,
                              balanceReasons: {
                                ...s.balanceReasons,
                                [a.account_id]: e.target.value,
                              },
                            }))
                          }
                          placeholder={isChanged ? "Reason required" : "—"}
                          style={{ width: "200px" }}
                          type="text"
                          value={selections.balanceReasons[a.account_id] || ""}
                        />
                      </td>
                    </tr>
                  );
                })}
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

  // Stage: EVENTS — select events to carry forward (fresh annual records)
  if (state.stage === "EVENTS" && preview) {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Select Events — {state.year_label}</h2>
          <p className="muted-text">
            Step 4 of 8: Choose which events to carry forward. Selected events
            become fresh annual records — Claims, Budget Requests, Payouts, and
            other finance history are never copied. Event identity is preserved
            so future Claims can link.
          </p>
        </section>

        <section className="glass-card">
          <h3>Events ({selections.eventIds.length} selected)</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Semester</th>
                </tr>
              </thead>
              <tbody>
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
                    <td className="mono">{e.event_id}</td>
                    <td>{e.name}</td>
                    <td>{e.semester}</td>
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
              onClick={handleSaveEvents}
            >
              {actionLoading === "events"
                ? "Saving..."
                : "Save Events & Continue"}
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

  // Stage: CATEGORIES — select categories to carry forward (fresh records)
  if (state.stage === "CATEGORIES" && preview) {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Select Categories — {state.year_label}</h2>
          <p className="muted-text">
            Step 5 of 8: Choose which categories to carry forward. Selected
            categories become fresh annual records; no finance history is
            copied. Semester caps reset to 0 so the new committee must
            re-establish budget caps.
          </p>
        </section>

        <section className="glass-card">
          <h3>Categories ({selections.categoryIds.length} selected)</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Kind</th>
                </tr>
              </thead>
              <tbody>
                {preview.categories.map((c) => (
                  <tr key={c.category_id}>
                    <td>
                      <input
                        checked={selections.categoryIds.includes(c.category_id)}
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
                    <td className="mono">{c.category_id}</td>
                    <td>{c.name}</td>
                    <td>{c.kind}</td>
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
              onClick={handleSaveCategories}
            >
              {actionLoading === "categories"
                ? "Saving..."
                : "Save Categories & Continue"}
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

  // Stage: USERS — select allowlisted operators (>=1 Treasurer required)
  if (state.stage === "USERS" && preview) {
    const citycf = preview.operators.find(
      (o) => o.email.toLowerCase() === "citycf41@gmail.com" && o.active
    );
    const hasTreasurer = selections.userIds.some((uid) => {
      const op = preview.operators.find((o) => o.user_id === uid);
      return op && op.role === "TREASURER" && op.active;
    });
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Select Operators — {state.year_label}</h2>
          <p className="muted-text">
            Step 6 of 8: Choose which active allowlisted operators (Committee,
            Treasurer) carry forward to the new annual file. MEMBER rows are
            excluded here. At least one active Treasurer is required.
          </p>
          {citycf && !selections.userIds.includes(citycf.user_id) && (
            <p className="alert warning">
              Recommendation: citycf41@gmail.com is an active Treasurer and
              should be carried forward.
            </p>
          )}
          {!hasTreasurer && (
            <p className="alert error">
              At least one active Treasurer must be selected.
            </p>
          )}
        </section>

        <section className="glass-card">
          <h3>Operators ({selections.userIds.length} selected)</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {preview.operators.map((o) => (
                  <tr key={o.user_id}>
                    <td>
                      <input
                        checked={selections.userIds.includes(o.user_id)}
                        disabled={!o.active}
                        onChange={() =>
                          toggleSelection(
                            selections.userIds,
                            o.user_id,
                            (ids) =>
                              setSelections((s) => ({
                                ...s,
                                userIds: ids,
                              }))
                          )
                        }
                        type="checkbox"
                      />
                    </td>
                    <td className="mono">{o.user_id}</td>
                    <td>{o.display_name}</td>
                    <td>{o.email}</td>
                    <td>{o.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {validationErrors.length > 0 && (
          <section className="glass-card">
            <div className="alert error" role="alert">
              <strong>Validation errors:</strong>
              <ul>
                {validationErrors.map((validationError) => (
                  <li key={validationError}>{validationError}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="glass-card">
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="primary-btn"
              disabled={!!actionLoading || !hasTreasurer}
              onClick={handleSaveUsers}
            >
              {actionLoading === "users"
                ? "Saving..."
                : "Save Users & Validate"}
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

  // Stage: VALIDATE — run pre-activation checks
  if (state.stage === "VALIDATE") {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Validate Migration — {state.year_label}</h2>
          <p className="muted-text">
            Step 7 of 8: Run pre-activation checks. The validator verifies
            schema/tabs, folder structure, member references, balance reasons,
            Treasurer availability, and target accessibility.
          </p>
          <p>
            Target spreadsheet: <code>{state.target_spreadsheet_id}</code>
          </p>
          <p>
            Selected: {selections.memberIds.length} members,{" "}
            {selections.accountIds.length} accounts,{" "}
            {selections.categoryIds.length} categories,{" "}
            {selections.eventIds.length} events, {selections.userIds.length}{" "}
            operators
          </p>
        </section>

        {(validationErrors.length > 0 || validationWarnings.length > 0) && (
          <section className="glass-card">
            {validationErrors.length > 0 && (
              <div className="alert error">
                <strong>Errors (must fix before activation):</strong>
                <ul>
                  {validationErrors.map((e, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static render
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {validationWarnings.length > 0 && (
              <div className="alert warning">
                <strong>Warnings:</strong>
                <ul>
                  {validationWarnings.map((w, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static render
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <section className="glass-card">
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="primary-btn"
              disabled={!!actionLoading || validationErrors.length > 0}
              onClick={handleActivate}
            >
              {actionLoading === "activating" ? "Activating..." : "Activate"}
            </button>
            <button
              className="secondary-btn"
              disabled={!!actionLoading}
              onClick={handleValidate}
            >
              {actionLoading === "validating"
                ? "Re-validating..."
                : "Re-run Validation"}
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

  // Stage: ACTIVATE — migration data written, ready to activate
  if (state.stage === "ACTIVATE") {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Activate Migration — {state.year_label}</h2>
          <p className="muted-text">
            Step 8 of 8: Activation switches the production ledger and archives
            the previous file as read-only.
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
              className="secondary-btn"
              disabled={!!actionLoading}
              onClick={handleValidate}
            >
              Re-run Validation
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

  // Stage: ACTIVE (= ACTIVATE) or done
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
