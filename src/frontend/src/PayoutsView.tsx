import { useEffect, useState } from 'react';
import { apiService } from './services/api';
import type { PayoutQueueItem, FinanceAccount, SessionRole } from './types';

interface PayoutsViewProps {
  role: SessionRole;
}

export default function PayoutsView({ role }: PayoutsViewProps) {
  const [payouts, setPayouts] = useState<PayoutQueueItem[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isTreasurer = role === 'TREASURER';

  const loadPayouts = () => {
    setLoading(true);
    Promise.all([
      apiService.getQueuedPayouts(),
      apiService.getAccounts()
    ])
      .then(([p, a]) => {
        setPayouts(p);
        setAccounts(a);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPayouts(); }, []);

  const queued = payouts.filter(p => p.status === 'QUEUED');
  const failed = payouts.filter(p => p.status === 'FAILED');
  const sent = payouts.filter(p => p.status === 'SENT');

  const getAccountName = (accountId?: string) => {
    if (!accountId) return '-';
    return accounts.find(a => a.account_id === accountId)?.name || accountId;
  };

  return (
    <div className="view-container">
      {error && <div className="alert error">{error}</div>}

      <section className="glass-card">
        <div className="card-header">
          <h2>Payout Queue</h2>
          <button className="secondary-btn" onClick={loadPayouts} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="loader-container"><div className="loader" /><p>Loading payouts...</p></div>
        ) : payouts.length === 0 ? (
          <div className="empty-state">No payouts yet</div>
        ) : (
          <>
            {queued.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--status-pending)', marginBottom: '0.75rem', fontSize: '1rem' }}>Queued ({queued.length})</h3>
                {queued.map(p => (
                  <PayoutCard key={p.payout_id} payout={p} accountName={getAccountName(p.account_id)} isTreasurer={isTreasurer} onChanged={loadPayouts} />
                ))}
              </div>
            )}

            {failed.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--status-rejected)', marginBottom: '0.75rem', fontSize: '1rem' }}>Failed ({failed.length})</h3>
                {failed.map(p => (
                  <PayoutCard key={p.payout_id} payout={p} accountName={getAccountName(p.account_id)} isTreasurer={isTreasurer} onChanged={loadPayouts} />
                ))}
              </div>
            )}

            {sent.length > 0 && (
              <div>
                <h3 style={{ color: 'var(--status-approved)', marginBottom: '0.75rem', fontSize: '1rem' }}>Sent ({sent.length})</h3>
                {sent.map(p => (
                  <PayoutCard key={p.payout_id} payout={p} accountName={getAccountName(p.account_id)} isTreasurer={isTreasurer} onChanged={loadPayouts} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function PayoutCard({ payout, accountName, isTreasurer, onChanged }: { payout: PayoutQueueItem; accountName: string; isTreasurer: boolean; onChanged: () => void }) {
  const [showSentModal, setShowSentModal] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '1rem', marginBottom: '0.75rem',
      border: '1px solid var(--card-border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="mono">{payout.payout_id}</span>
            <span className={`badge status-${payout.status.toLowerCase()}`}>{payout.status}</span>
          </div>
          <span className="muted-text" style={{ fontSize: '0.85rem' }}>
            Claim: {payout.claim_id} | Method: {payout.method} | Account: {accountName}
          </span>
          {payout.parent_payout_id && (
            <span className="muted-text" style={{ fontSize: '0.8rem', display: 'block' }}>
              Partial payment of: {payout.parent_payout_id}
            </span>
          )}
          {payout.failure_reason && (
            <span style={{ color: 'var(--status-rejected)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
              Reason: {payout.failure_reason}
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="amount" style={{ fontSize: '1.1rem' }}>${Number(payout.amount).toFixed(2)}</div>
          {payout.status === 'QUEUED' && isTreasurer && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="primary-btn" onClick={() => setShowSentModal(true)}>Mark Sent</button>
              <button className="danger-btn" onClick={() => setShowFailModal(true)}>Failed</button>
            </div>
          )}
          {payout.status === 'FAILED' && isTreasurer && (
            <button className="warning-btn" style={{ marginTop: '0.5rem' }} onClick={async () => {
              try {
                await apiService.retryPayout(payout.payout_id);
                onChanged();
              } catch (err: any) {
                alert(err.message || 'Retry failed');
              }
            }}>Retry</button>
          )}
        </div>
      </div>

      {showSentModal && (
        <MarkSentModal
          payout={payout}
          onClose={() => setShowSentModal(false)}
          onDone={() => { setShowSentModal(false); onChanged(); }}
        />
      )}
      {showFailModal && (
        <FailModal
          payout={payout}
          onClose={() => setShowFailModal(false)}
          onDone={() => { setShowFailModal(false); onChanged(); }}
        />
      )}
    </div>
  );
}

function MarkSentModal({ payout, onClose, onDone }: { payout: PayoutQueueItem; onClose: () => void; onDone: () => void }) {
  const [txnReference, setTxnReference] = useState(payout.txn_reference || '');
  const [amount, setAmount] = useState(Number(payout.amount).toString());
  const [saving, setSaving] = useState(false);
  const [isPartial, setIsPartial] = useState(false);

  const needsTxnRef = payout.method === 'FPS' || payout.method === 'PAYME';

  const handleSubmit = async () => {
    if (needsTxnRef && !txnReference.trim()) { alert('Transaction reference is required for FPS/PAYME'); return; }
    setSaving(true);
    try {
      await apiService.markPayoutSent(payout.payout_id, {
        txnReference: txnReference.trim(),
        amount: isPartial ? parseFloat(amount) : undefined
      });
      alert(isPartial ? 'Partial payout recorded. Remainder re-queued.' : 'Payout marked as sent');
      onDone();
    } catch (err: any) {
      alert(err.message || 'Failed to mark sent');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
        <h2>Mark Payout Sent</h2>
        <p className="muted-text" style={{ marginBottom: '1rem' }}>
          {payout.payout_id} — ${Number(payout.amount).toFixed(2)} via {payout.method}
        </p>
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" id="partial" checked={isPartial} onChange={e => setIsPartial(e.target.checked)} style={{ width: 'auto' }} />
          <label htmlFor="partial" style={{ marginBottom: 0 }}>Partial payment (remainder will be re-queued)</label>
        </div>
        {isPartial && (
          <div className="form-group">
            <label>Actual Amount Sent ($)</label>
            <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        )}
        <div className="form-group">
          <label>Transaction Reference {needsTxnRef ? '(required for FPS/PAYME)' : '(optional)'}</label>
          <input type="text" value={txnReference} onChange={e => setTxnReference(e.target.value)} placeholder={needsTxnRef ? 'FPS reference...' : 'Optional reference...'} />
        </div>
        <div className="modal-actions">
          <button className="secondary-btn" onClick={onClose}>Cancel</button>
          <button className="primary-btn" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Confirm Sent'}</button>
        </div>
      </div>
    </div>
  );
}

function FailModal({ payout, onClose, onDone }: { payout: PayoutQueueItem; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { alert('Failure reason is required'); return; }
    setSaving(true);
    try {
      await apiService.recordPayoutFailed(payout.payout_id, reason.trim());
      alert('Payout marked as failed');
      onDone();
    } catch (err: any) {
      alert(err.message || 'Failed to record failure');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
        <h2>Record Payout Failure</h2>
        <p className="muted-text" style={{ marginBottom: '1rem' }}>
          {payout.payout_id} — ${Number(payout.amount).toFixed(2)}
        </p>
        <div className="form-group">
          <label>Failure Reason</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Describe the failure reason..." autoFocus />
        </div>
        <div className="modal-actions">
          <button className="secondary-btn" onClick={onClose}>Cancel</button>
          <button className="danger-btn" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Confirm Failure'}</button>
        </div>
      </div>
    </div>
  );
}
