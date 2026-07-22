import { useEffect, useState } from 'react';
import { apiService } from './services/api';
import type { MigrationState, MigrationPreview, MigrationSelections } from './types';

export default function MigrationWizard() {
  const [state, setState] = useState<MigrationState | null>(null);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [selections, setSelections] = useState<MigrationSelections>({
    memberIds: [], accountIds: [], categoryIds: [], eventIds: [],
    accountBalances: {}, balanceReasons: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, p, sel] = await Promise.all([
        apiService.getMigrationState(),
        apiService.getMigrationPreview(),
        apiService.getMigrationSelections()
      ]);
      setState(s);
      setPreview(p);
      if (sel) setSelections(prev => ({ ...prev, ...sel }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartMigration = async () => {
    setActionLoading('starting');
    try {
      await apiService.startMigration();
      alert('Migration started! Year folder and spreadsheet created.');
      loadAll();
    } catch (e) {
      setError('Start failed: ' + (e as Error).message);
    } finally {
      setActionLoading('');
    }
  };

  const toggleSelection = (list: string[], id: string, setter: (ids: string[]) => void) => {
    if (list.includes(id)) setter(list.filter(x => x !== id));
    else setter([...list, id]);
  };

  const handleConfirmSelections = async () => {
    if (selections.memberIds.length === 0) {
      setError('At least one member must be selected');
      return;
    }
    setActionLoading('configuring');
    try {
      await apiService.setMigrationSelections(selections);
      alert('Selections saved! Review the selections.');
      loadAll();
    } catch (e) {
      setError('Save failed: ' + (e as Error).message);
    } finally {
      setActionLoading('');
    }
  };

  const handleExecute = async () => {
    if (!confirm('Execute migration? This will create the new spreadsheet with selected data.')) return;
    setActionLoading('executing');
    try {
      await apiService.executeMigration();
      alert('Migration executed! Review the new spreadsheet before activating.');
      loadAll();
    } catch (e) {
      setError('Execution failed: ' + (e as Error).message);
    } finally {
      setActionLoading('');
    }
  };

  const handleActivate = async () => {
    if (!confirm('Activate migration? This will switch production to the new spreadsheet. The old one will be archived.')) return;
    setActionLoading('activating');
    try {
      await apiService.activateMigration();
      alert('Migration activated! The new spreadsheet is now the active ledger. Refresh to see changes.');
      window.location.reload();
    } catch (e) {
      setError('Activation failed: ' + (e as Error).message);
    } finally {
      setActionLoading('');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel migration? This will delete the created folder and spreadsheet.')) return;
    setActionLoading('cancelling');
    try {
      await apiService.cancelMigration();
      alert('Migration cancelled.');
      loadAll();
    } catch (e) {
      setError('Cancel failed: ' + (e as Error).message);
    } finally {
      setActionLoading('');
    }
  };

  if (loading) return <div className="glass-card"><div className="loader" style={{ margin: '2rem auto' }} /></div>;
  if (error) return <div className="glass-card"><div className="alert error">{error}<button className="btn btn-secondary" style={{ marginTop: '0.5rem' }} onClick={() => { setError(''); loadAll(); }}>Retry</button></div></div>;

  const hasActiveMigration = state && state.active;

  // Stage: No migration started — show preview and start button
  if (!hasActiveMigration) {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Annual Migration</h2>
          <p className="muted-text">Create a new annual spreadsheet and carry forward selected members, accounts, categories, and events.</p>
          {preview && (
            <div style={{ marginTop: '1rem' }}>
              <p>Year Label: <strong>{preview.year_label}</strong></p>
              <p>Active Members: {preview.active_members.length}</p>
              <p>Finance Accounts: {preview.accounts.length}</p>
              <p>Categories: {preview.categories.length}</p>
              <p>Events: {preview.events.length}</p>
              {!preview.has_treasurer && (
                <p className="alert warning" style={{ marginTop: '0.5rem' }}>No active Treasurer found. Migration requires at least one Treasurer.</p>
              )}
            </div>
          )}
          <div style={{ marginTop: '1rem' }}>
            <button className="primary-btn" onClick={handleStartMigration} disabled={!!actionLoading || !preview?.has_treasurer}>
              Start Migration
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Stage: CONFIGURE — select what to migrate
  if (state.stage === 'CONFIGURE') {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Configure Migration — {state.year_label}</h2>
          <p className="muted-text">Select what to carry forward to the new annual file.</p>
          <button className="danger-btn" style={{ marginTop: '0.5rem' }} onClick={handleCancel} disabled={!!actionLoading}>
            Cancel Migration
          </button>
        </section>

        {preview && (
          <>
            <section className="glass-card">
              <h3>Members ({selections.memberIds.length} selected)</h3>
              <div className="table-scroll">
                <table className="data-table">
                  <thead><tr><th>Select</th><th>ID</th><th>Name</th><th>Role</th><th>Active</th></tr></thead>
                  <tbody>
                    {preview.operators.map(o => (
                      <tr key={o.user_id}>
                        <td><input type="checkbox" checked disabled /></td>
                        <td className="mono">{o.user_id}</td>
                        <td>{o.display_name}</td>
                        <td>{o.role}</td>
                        <td>{o.active ? '✓' : ''}</td>
                      </tr>
                    ))}
                    {preview.active_members.map(m => (
                      <tr key={m.user_id}>
                        <td>
                          <input type="checkbox" checked={selections.memberIds.includes(m.user_id)}
                            onChange={() => toggleSelection(selections.memberIds, m.user_id, ids => setSelections(s => ({ ...s, memberIds: ids })))} />
                        </td>
                        <td className="mono">{m.user_id}</td>
                        <td>{m.display_name}</td>
                        <td>{m.role}</td>
                        <td>✓</td>
                      </tr>
                    ))}
                    {preview.inactive_members.map(m => (
                      <tr key={m.user_id} style={{ opacity: 0.6 }}>
                        <td>
                          <input type="checkbox" checked={selections.memberIds.includes(m.user_id)}
                            onChange={() => toggleSelection(selections.memberIds, m.user_id, ids => setSelections(s => ({ ...s, memberIds: ids })))} />
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
              <h3>Finance Accounts ({selections.accountIds.length} selected)</h3>
              <div className="table-scroll">
                <table className="data-table">
                  <thead><tr><th>Select</th><th>ID</th><th>Name</th><th>Current Balance</th><th>Opening Balance</th></tr></thead>
                  <tbody>
                    {preview.accounts.map(a => (
                      <tr key={a.account_id}>
                        <td>
                          <input type="checkbox" checked={selections.accountIds.includes(a.account_id)}
                            onChange={() => toggleSelection(selections.accountIds, a.account_id, ids => setSelections(s => ({ ...s, accountIds: ids })))} />
                        </td>
                        <td className="mono">{a.account_id}</td>
                        <td>{a.name}</td>
                        <td className="amount">HKD {a.current_balance.toFixed(2)}</td>
                        <td>
                          <input type="number" className="filter-date" style={{ width: '120px' }}
                            value={selections.accountBalances[a.account_id] ?? a.current_balance}
                            onChange={e => setSelections(s => ({
                              ...s,
                              accountBalances: { ...s.accountBalances, [a.account_id]: Number(e.target.value) }
                            }))} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="glass-card">
              <h3>Categories ({selections.categoryIds.length} selected) & Events ({selections.eventIds.length} selected)</h3>
              <div className="table-scroll">
                <table className="data-table">
                  <thead><tr><th>Select</th><th>Type</th><th>ID</th><th>Name</th></tr></thead>
                  <tbody>
                    {preview.categories.map(c => (
                      <tr key={c.category_id}>
                        <td>
                          <input type="checkbox" checked={selections.categoryIds.includes(c.category_id)}
                            onChange={() => toggleSelection(selections.categoryIds, c.category_id, ids => setSelections(s => ({ ...s, categoryIds: ids })))} />
                        </td>
                        <td>Category</td>
                        <td className="mono">{c.category_id}</td>
                        <td>{c.name}</td>
                      </tr>
                    ))}
                    {preview.events.map(e => (
                      <tr key={e.event_id}>
                        <td>
                          <input type="checkbox" checked={selections.eventIds.includes(e.event_id)}
                            onChange={() => toggleSelection(selections.eventIds, e.event_id, ids => setSelections(s => ({ ...s, eventIds: ids })))} />
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
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="primary-btn" onClick={handleConfirmSelections} disabled={!!actionLoading}>
                  {actionLoading === 'configuring' ? 'Saving...' : 'Confirm Selections'}
                </button>
                <button className="secondary-btn" onClick={() => {
                  if (preview) {
                    setSelections({
                      memberIds: [...preview.operators.map(o => o.user_id), ...preview.active_members.map(m => m.user_id)],
                      accountIds: preview.accounts.map(a => a.account_id),
                      categoryIds: preview.categories.filter(c => c.active).map(c => c.category_id),
                      eventIds: preview.events.map(e => e.event_id),
                      accountBalances: {},
                      balanceReasons: {}
                    });
                  }
                }}>
                  Select All
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    );
  }

  // Stage: REVIEW — execute and activate
  if (state.stage === 'REVIEW') {
    return (
      <div className="migration-wizard">
        <section className="glass-card">
          <h2>Review Migration — {state.year_label}</h2>
          <p className="muted-text">Target spreadsheet: <code>{state.target_spreadsheet_id}</code></p>
          <p>Selected: {selections.memberIds.length} members, {selections.accountIds.length} accounts, {selections.categoryIds.length} categories, {selections.eventIds.length} events</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="warning-btn" onClick={handleExecute} disabled={!!actionLoading}>
              {actionLoading === 'executing' ? 'Executing...' : 'Execute Migration'}
            </button>
            <button className="primary-btn" onClick={handleActivate} disabled={!!actionLoading}>
              {actionLoading === 'activating' ? 'Activating...' : 'Activate'}
            </button>
            <button className="danger-btn" onClick={handleCancel} disabled={!!actionLoading}>
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
        <p>The annual migration to <strong>{state.year_label}</strong> has been activated.</p>
        <p className="muted-text">The previous annual file is now archived and read-only.</p>
      </section>
    </div>
  );
}
