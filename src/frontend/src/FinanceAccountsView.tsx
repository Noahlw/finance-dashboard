import { useEffect, useState, useCallback } from 'react';
import { apiService } from './services/api';
import type { FinanceAccount, IncomeItem, AccountTransfer, AccountAdjustment, SessionRole, IncomeTab } from './types';

interface FinanceAccountsViewProps {
  role: SessionRole;
}

export default function FinanceAccountsView({ role }: FinanceAccountsViewProps) {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isTreasurer = role === 'TREASURER';

  const loadAccounts = useCallback(() => {
    setLoading(true);
    apiService.getAccounts()
      .then(setAccounts)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const activeAccounts = accounts.filter(a => a.status === 'ACTIVE');
  const inactiveAccounts = accounts.filter(a => a.status === 'INACTIVE');

  return (
    <div className="view-container">
      {error && <div className="alert error">{error}</div>}
      <section className="glass-card">
        <div className="card-header">
          <h2>Finance Accounts</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isTreasurer && <AddAccountModal onAdded={loadAccounts} />}
            <button className="secondary-btn" onClick={loadAccounts} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loader-container"><div className="loader" /><p>Loading accounts...</p></div>
        ) : accounts.length === 0 ? (
          <div className="empty-state">No finance accounts yet. {isTreasurer ? 'Use the button above to create one.' : ''}</div>
        ) : (
          <>
            {activeAccounts.map(account => (
              <AccountCard key={account.account_id} account={account} isTreasurer={isTreasurer} onUpdated={loadAccounts} />
            ))}
            {inactiveAccounts.length > 0 && (
              <>
                <h3 style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '1rem' }}>Inactive Accounts</h3>
                {inactiveAccounts.map(account => (
                  <AccountCard key={account.account_id} account={account} isTreasurer={isTreasurer} onUpdated={loadAccounts} />
                ))}
              </>
            )}
          </>
        )}
      </section>

      <section className="glass-card">
        <IncomeSection role={role} accounts={activeAccounts} onChanged={loadAccounts} />
      </section>

      {isTreasurer && (
        <>
          <section className="glass-card">
            <AccountActionsSection accounts={activeAccounts} onDone={loadAccounts} />
          </section>
          <section className="glass-card">
            <h2>Transfer History</h2>
            <TransferHistory />
          </section>
          <section className="glass-card">
            <h2>Adjustment History</h2>
            <AdjustmentHistory />
          </section>
        </>
      )}
    </div>
  );
}

function AccountCard({ account, isTreasurer, onUpdated }: { account: FinanceAccount; isTreasurer: boolean; onUpdated: () => void }) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(account.name);
  const [saving, setSaving] = useState(false);

  const handleRename = async () => {
    if (!newName.trim() || newName === account.name) { setRenaming(false); return; }
    setSaving(true);
    try {
      await apiService.renameAccount(account.account_id, newName.trim());
      setRenaming(false);
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Rename failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm(`Deactivate account "${account.name}"? This cannot be undone.`)) return;
    try {
      await apiService.deactivateAccount(account.account_id);
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Deactivate failed');
    }
  };

  const effectiveBalance = account.current_balance + account.pending_income - account.reserved_payouts;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '1rem', marginBottom: '1rem',
      border: '1px solid var(--card-border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          {renaming ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text" value={newName} onChange={e => setNewName(e.target.value)}
                style={{ width: 200, padding: '0.5rem', borderRadius: 6, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontFamily: 'inherit' }}
                autoFocus onKeyDown={e => e.key === 'Enter' && handleRename()}
              />
              <button className="small-btn primary-btn" onClick={handleRename} disabled={saving}>Save</button>
              <button className="small-btn secondary-btn" onClick={() => setRenaming(false)}>Cancel</button>
            </div>
          ) : (
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {account.name}
              <span className={`badge status-${account.status.toLowerCase()}`}>{account.status}</span>
            </h3>
          )}
          <span className="muted-text" style={{ fontSize: '0.8rem' }}>{account.account_id}</span>
        </div>
        {isTreasurer && account.status === 'ACTIVE' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="small-btn secondary-btn" onClick={() => { setNewName(account.name); setRenaming(true); }}>Rename</button>
            <button className="small-btn danger-btn" onClick={handleDeactivate}>Deactivate</button>
          </div>
        )}
      </div>
      <div className="detail-grid" style={{ marginTop: '0.75rem' }}>
        <div><strong>Opening Balance:</strong> ${Number(account.opening_balance).toFixed(2)}</div>
        <div><strong>Current Balance:</strong> ${Number(account.current_balance).toFixed(2)}</div>
        <div><strong>Pending Income:</strong> ${Number(account.pending_income).toFixed(2)}</div>
        <div><strong>Reserved Payouts:</strong> ${Number(account.reserved_payouts).toFixed(2)}</div>
        <div style={{ gridColumn: '1 / -1' }}>
          <strong>Effective Available:</strong>{' '}
          <span style={{ color: effectiveBalance >= 0 ? 'var(--status-approved)' : 'var(--status-rejected)', fontWeight: 700 }}>
            ${effectiveBalance.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

function AddAccountModal({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { alert('Account name is required'); return; }
    setSaving(true);
    try {
      await apiService.addAccount({ name: name.trim(), opening_balance: openingBalance ? parseFloat(openingBalance) : undefined });
      setName('');
      setOpeningBalance('');
      setOpen(false);
      onAdded();
    } catch (err: any) {
      alert(err.message || 'Failed to add account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="primary-btn" onClick={() => setOpen(true)}>+ Add Account</button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <h2>Add Finance Account</h2>
            <div className="form-group">
              <label>Account Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Savings Account" autoFocus />
            </div>
            <div className="form-group">
              <label>Opening Balance (optional)</label>
              <input type="number" step="0.01" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="0.00" />
              <span className="help-text">Leave blank or set to 0 for a zero starting balance.</span>
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Add Account'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function IncomeSection({ role, accounts, onChanged }: { role: SessionRole; accounts: FinanceAccount[]; onChanged: () => void }) {
  const [tab, setTab] = useState<IncomeTab>('record');
  const isTreasurer = role === 'TREASURER';

  return (
    <>
      <div className="card-header">
        <h2>Income</h2>
      </div>
      <div className="tabs">
        {isTreasurer && <button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>Pending Approval</button>}
        <button className={`tab ${tab === 'record' ? 'active' : ''}`} onClick={() => setTab('record')}>Record Income</button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>History</button>
      </div>
      {tab === 'pending' && isTreasurer && <PendingIncomeSection accounts={accounts} onChanged={onChanged} />}
      {tab === 'record' && <RecordIncomeForm accounts={accounts} role={role} onRecorded={onChanged} />}
      {tab === 'history' && <IncomeHistory />}
    </>
  );
}

function RecordIncomeForm({ accounts, onRecorded }: { accounts: FinanceAccount[]; role: SessionRole; onRecorded: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [eventId, setEventId] = useState('');
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState(accounts.length > 0 ? accounts[0].account_id : '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!categoryId.trim() || !amount || parseFloat(amount) <= 0) { alert('Category and positive amount are required'); return; }
    setSaving(true);
    try {
      await apiService.recordIncome({
        date,
        categoryId: categoryId.trim(),
        amount: parseFloat(amount),
        sourceRef: sourceRef.trim() || undefined,
        eventId: eventId.trim() || undefined,
        notes: notes.trim() || undefined,
        accountId: accountId || undefined
      });
      setAmount('');
      setSourceRef('');
      setEventId('');
      setNotes('');
      alert('Income recorded successfully');
      onRecorded();
    } catch (err: any) {
      alert(err.message || 'Failed to record income');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <div className="detail-grid">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Category</label>
          <input type="text" value={categoryId} onChange={e => setCategoryId(e.target.value)} placeholder="e.g. CAT-001" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Amount ($)</label>
          <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Source Reference</label>
          <input type="text" value={sourceRef} onChange={e => setSourceRef(e.target.value)} placeholder="e.g. Ticket sales" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Event ID (optional)</label>
          <input type="text" value={eventId} onChange={e => setEventId(e.target.value)} placeholder="e.g. EVT-001" />
        </div>
        {accounts.length > 0 && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Proposed Account</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)}>
              {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.name}</option>)}
            </select>
            <span className="help-text">Treasurer can change when confirming</span>
          </div>
        )}
      </div>
      <div className="form-group">
        <label>Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes..." />
      </div>
      <button className="primary-btn" onClick={handleSubmit} disabled={saving}>{saving ? 'Recording...' : 'Record Income'}</button>
    </div>
  );
}

function PendingIncomeSection({ accounts, onChanged }: { accounts: FinanceAccount[]; onChanged: () => void }) {
  const [items, setItems] = useState<IncomeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IncomeItem | null>(null);
  const [confirmAccountId, setConfirmAccountId] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    apiService.getPendingIncome()
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleConfirm = async () => {
    if (!selected) return;
    if (!confirmAccountId && accounts.length > 0) { alert('Select an account to post to'); return; }
    setActionLoading(true);
    try {
      await apiService.confirmIncome(selected.income_id, {
        accountId: confirmAccountId || accounts[0]?.account_id,
        note: decisionNote || undefined
      });
      setSelected(null);
      setDecisionNote('');
      load();
      onChanged();
    } catch (err: any) {
      alert(err.message || 'Confirm failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await apiService.rejectIncome(selected.income_id, decisionNote || undefined);
      setSelected(null);
      setDecisionNote('');
      load();
      onChanged();
    } catch (err: any) {
      alert(err.message || 'Reject failed');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (selected) setConfirmAccountId(selected.account_id || (accounts.length > 0 ? accounts[0].account_id : ''));
  }, [selected, accounts]);

  return (
    <div style={{ marginTop: '1rem' }}>
      {loading ? (
        <div className="loader-container"><div className="loader" /><p>Loading pending income...</p></div>
      ) : items.length === 0 ? (
        <div className="empty-state">No pending income</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Source</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.income_id}>
                    <td className="mono">{item.income_id}</td>
                    <td>{new Date(item.date).toLocaleDateString()}</td>
                    <td>{item.category_id}</td>
                    <td className="amount" style={{ color: 'var(--status-approved)' }}>+${Number(item.amount).toFixed(2)}</td>
                    <td>{item.source_ref || '-'}</td>
                    <td>
                      <button className="primary-btn" onClick={() => { setSelected(item); setDecisionNote(''); }}>
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <div className="modal-backdrop">
              <div className="modal-content glass-card">
                <h2>Review Income: {selected.income_id}</h2>
                <div className="detail-grid">
                  <div><strong>Date:</strong> {new Date(selected.date).toLocaleDateString()}</div>
                  <div><strong>Amount:</strong> <span className="amount" style={{ color: 'var(--status-approved)' }}>+${Number(selected.amount).toFixed(2)}</span></div>
                  <div><strong>Category:</strong> {selected.category_id}</div>
                  <div><strong>Source:</strong> {selected.source_ref || '-'}</div>
                  <div><strong>Event:</strong> {selected.event_id || '-'}</div>
                  <div><strong>Received by:</strong> {selected.received_by}</div>
                  {selected.notes && <div style={{ gridColumn: '1 / -1' }}><strong>Notes:</strong> {selected.notes}</div>}
                </div>
                <div className="form-group">
                  <label>Post to Account</label>
                  <select value={confirmAccountId} onChange={e => setConfirmAccountId(e.target.value)}>
                    {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Decision Note</label>
                  <textarea value={decisionNote} onChange={e => setDecisionNote(e.target.value)} rows={2} placeholder="Optional note..." />
                </div>
                <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                  <button className="secondary-btn" onClick={() => setSelected(null)}>Cancel</button>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="danger-btn" onClick={handleReject} disabled={actionLoading}>
                      {actionLoading ? 'Processing...' : 'Reject'}
                    </button>
                    <button className="primary-btn" onClick={handleConfirm} disabled={actionLoading}>
                      {actionLoading ? 'Processing...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function IncomeHistory() {
  return (
    <div className="empty-state" style={{ marginTop: '1rem' }}>
      Income history view coming soon
    </div>
  );
}

function AccountActionsSection({ accounts, onDone }: { accounts: FinanceAccount[]; onDone: () => void }) {
  const [mode, setMode] = useState<'adjustment' | 'transfer' | null>(null);

  return (
    <>
      <div className="card-header">
        <h2>Account Actions</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="primary-btn" onClick={() => setMode(mode === 'adjustment' ? null : 'adjustment')}>
            {mode === 'adjustment' ? 'Cancel' : 'Adjustment'}
          </button>
          <button className="primary-btn" onClick={() => setMode(mode === 'transfer' ? null : 'transfer')}>
            {mode === 'transfer' ? 'Cancel' : 'Transfer'}
          </button>
        </div>
      </div>
      {mode === 'adjustment' && <AdjustmentForm accounts={accounts} onDone={onDone} />}
      {mode === 'transfer' && <TransferForm accounts={accounts} onDone={onDone} />}
    </>
  );
}

function AdjustmentForm({ accounts, onDone }: { accounts: FinanceAccount[]; onDone: () => void }) {
  const [accountId, setAccountId] = useState(accounts.length > 0 ? accounts[0].account_id : '');
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!accountId || !amount || parseFloat(amount) <= 0 || !reason.trim()) { alert('All fields required'); return; }
    setSaving(true);
    try {
      await apiService.recordAdjustment({ accountId, amount: parseFloat(amount), direction, reason: reason.trim() });
      setAmount('');
      setReason('');
      alert('Adjustment recorded');
      onDone();
    } catch (err: any) {
      alert(err.message || 'Adjustment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <div className="detail-grid">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Account</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)}>
            {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Direction</label>
          <select value={direction} onChange={e => setDirection(e.target.value as 'CREDIT' | 'DEBIT')}>
            <option value="CREDIT">Credit (add funds)</option>
            <option value="DEBIT">Debit (remove funds)</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Amount ($)</label>
          <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Reason</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for adjustment" />
        </div>
      </div>
      <button className="primary-btn" onClick={handleSubmit} disabled={saving}>{saving ? 'Recording...' : 'Record Adjustment'}</button>
    </div>
  );
}

function TransferForm({ accounts, onDone }: { accounts: FinanceAccount[]; onDone: () => void }) {
  const [fromAccountId, setFromAccountId] = useState(accounts.length > 0 ? accounts[0].account_id : '');
  const [toAccountId, setToAccountId] = useState(accounts.length > 1 ? accounts[1].account_id : '');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) { alert('Select two different accounts'); return; }
    if (!amount || parseFloat(amount) <= 0 || !reason.trim()) { alert('Amount and reason required'); return; }
    setSaving(true);
    try {
      await apiService.recordTransfer({ fromAccountId, toAccountId, amount: parseFloat(amount), reason: reason.trim() });
      setAmount('');
      setReason('');
      alert('Transfer recorded');
      onDone();
    } catch (err: any) {
      alert(err.message || 'Transfer failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <div className="detail-grid">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>From Account</label>
          <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)}>
            {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>To Account</label>
          <select value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
            {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Amount ($)</label>
          <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Reason</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for transfer" />
        </div>
      </div>
      <button className="primary-btn" onClick={handleSubmit} disabled={saving}>{saving ? 'Recording...' : 'Record Transfer'}</button>
    </div>
  );
}

function TransferHistory() {
  const [transfers, setTransfers] = useState<AccountTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getTransfers()
      .then(setTransfers)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader-container"><div className="loader" /></div>;
  if (transfers.length === 0) return <div className="empty-state">No transfers yet</div>;

  return (
    <div className="table-responsive" style={{ marginTop: '1rem' }}>
      <table className="modern-table">
        <thead>
          <tr>
            <th>From</th>
            <th>To</th>
            <th>Amount</th>
            <th>Reason</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map(t => (
            <tr key={t.transfer_id}>
              <td className="mono">{t.from_account_id}</td>
              <td className="mono">{t.to_account_id}</td>
              <td className="amount">${Number(t.amount).toFixed(2)}</td>
              <td>{t.reason}</td>
              <td>{new Date(t.transferred_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdjustmentHistory() {
  const [adjustments, setAdjustments] = useState<AccountAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getAdjustments()
      .then(setAdjustments)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader-container"><div className="loader" /></div>;
  if (adjustments.length === 0) return <div className="empty-state">No adjustments yet</div>;

  return (
    <div className="table-responsive" style={{ marginTop: '1rem' }}>
      <table className="modern-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Reason</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {adjustments.map(a => (
            <tr key={a.adjustment_id}>
              <td className="mono">{a.account_id}</td>
              <td>
                <span className={`badge ${a.direction === 'CREDIT' ? 'status-approved' : 'status-rejected'}`}>
                  {a.direction}
                </span>
              </td>
              <td className="amount">${Number(a.amount).toFixed(2)}</td>
              <td>{a.reason}</td>
              <td>{new Date(a.adjusted_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
