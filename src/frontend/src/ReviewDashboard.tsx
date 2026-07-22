import { useEffect, useState } from 'react';
import { apiService } from './services/api';
import type { ClaimQueueItem, ClaimQueueFilters, SessionRole, Member } from './types';

interface ReviewDashboardProps {
  role: SessionRole;
  members?: Member[];
}

export default function ReviewDashboard({ role, members = [] }: ReviewDashboardProps) {
  const [queue, setQueue] = useState<ClaimQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterCreator, setFilterCreator] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterBudgetLine, setFilterBudgetLine] = useState('');
  const [filterSid, setFilterSid] = useState('');

  const [selectedClaim, setSelectedClaim] = useState<ClaimQueueItem | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isTreasurer = role === 'TREASURER';

  const loadQueue = () => {
    setLoading(true);
    const filters: ClaimQueueFilters = {};
    if (filterStatus) filters.status = filterStatus;
    if (filterCreator) filters.creator = filterCreator;
    if (filterEvent) filters.eventId = filterEvent;
    if (filterBudgetLine) filters.budgetLine = filterBudgetLine;
    if (filterSid) filters.sid = filterSid;
    apiService.getClaimsQueue(filters)
      .then(setQueue)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadQueue(); }, []);

  const statuses = ['', 'SUBMITTED', 'NEEDS_INFO', 'VERIFIED'];

  const handleAction = async (action: 'verify' | 'reject' | 'request-info' | 'approve-payout') => {
    if (!selectedClaim) return;
    setActionLoading(true);
    try {
      switch (action) {
        case 'verify':
          await apiService.verifyClaim(selectedClaim.claim_id, { decision_note: decisionNote });
          break;
        case 'reject':
          if (!decisionNote.trim()) { alert('Rejection reason is required'); setActionLoading(false); return; }
          await apiService.rejectClaim(selectedClaim.claim_id, decisionNote);
          break;
        case 'request-info':
          if (!decisionNote.trim()) { alert('Request note is required'); setActionLoading(false); return; }
          await apiService.requestInfo(selectedClaim.claim_id, decisionNote);
          break;
        case 'approve-payout':
          await apiService.approvePayout(selectedClaim.claim_id);
          break;
      }
      setSelectedClaim(null);
      setDecisionNote('');
      loadQueue();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getCreatorName = (creatorId: string) => {
    return members.find(m => m.user_id === creatorId)?.display_name || creatorId;
  };

  const getClaimantName = (claimantId: string) => {
    return members.find(m => m.user_id === claimantId)?.display_name || claimantId;
  };

  return (
    <div className="view-container">
      {error && <div className="alert error">{error}</div>}

      <section className="glass-card">
        <div className="card-header">
          <h2>Claims Review Queue</h2>
          <button className="secondary-btn" onClick={loadQueue} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
            <label>Status</label>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setTimeout(loadQueue, 0); }}>
              {statuses.map(s => (
                <option key={s} value={s}>{s || 'All Statuses'}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
            <label>Creator</label>
            <input
              type="text"
              value={filterCreator}
              onChange={e => setFilterCreator(e.target.value)}
              placeholder="User ID"
              style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontFamily: 'inherit' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
            <label>Event</label>
            <input
              type="text"
              value={filterEvent}
              onChange={e => setFilterEvent(e.target.value)}
              placeholder="Event ID"
              style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontFamily: 'inherit' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
            <label>Budget Line</label>
            <input
              type="text"
              value={filterBudgetLine}
              onChange={e => setFilterBudgetLine(e.target.value)}
              placeholder="Budget Line ID"
              style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontFamily: 'inherit' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
            <label>SID</label>
            <input
              type="text"
              value={filterSid}
              onChange={e => setFilterSid(e.target.value)}
              placeholder="Student ID"
              style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', fontFamily: 'inherit' }}
            />
          </div>
          <button className="primary-btn" onClick={loadQueue} style={{ alignSelf: 'flex-end' }}>Filter</button>
        </div>

        {loading ? (
          <div className="loader-container"><div className="loader" /><p>Loading queue...</p></div>
        ) : queue.length === 0 ? (
          <div className="empty-state">No claims in the review queue.</div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Claimant</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Creator</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.map(c => (
                  <tr key={c.claim_id}>
                    <td className="mono">{c.claim_id}</td>
                    <td>{getClaimantName(c.claimant_id)}</td>
                    <td className="amount">${Number(c.total_amount).toFixed(2)}</td>
                    <td><span className={`badge status-${c.status.toLowerCase()}`}>{c.status}</span></td>
                    <td>{c.submitted_at ? new Date(c.submitted_at).toLocaleDateString() : '-'}</td>
                    <td>{getCreatorName(c.created_by)}</td>
                    <td>
                      <button className="primary-btn" onClick={() => { setSelectedClaim(c); setDecisionNote(''); }}>
                        {c.status === 'SUBMITTED' ? 'Review' : c.status === 'NEEDS_INFO' ? 'View' : 'Review'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedClaim && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card wide-modal">
            <h2>Review: {selectedClaim.claim_id}</h2>
            <div className="detail-grid">
              <div><strong>Claimant:</strong> {getClaimantName(selectedClaim.claimant_id)}</div>
              <div><strong>Amount:</strong> HK${Number(selectedClaim.total_amount).toFixed(2)}</div>
              <div><strong>Status:</strong> <span className={`badge status-${selectedClaim.status.toLowerCase()}`}>{selectedClaim.status}</span></div>
              <div><strong>Submitted:</strong> {selectedClaim.submitted_at ? new Date(selectedClaim.submitted_at).toLocaleDateString() : '-'}</div>
              {selectedClaim.verified_at && <div><strong>Verified:</strong> {new Date(selectedClaim.verified_at).toLocaleDateString()}</div>}
              {selectedClaim.event_id && <div><strong>Event:</strong> {selectedClaim.event_id}</div>}
              <div><strong>Created by:</strong> {getCreatorName(selectedClaim.created_by)}</div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                {selectedClaim.notes || 'No notes'}
              </div>
            </div>
            <div className="form-group">
              <label>Decision Note {selectedClaim.status === 'SUBMITTED' ? '(required for reject/request-info)' : ''}</label>
              <textarea
                value={decisionNote}
                onChange={e => setDecisionNote(e.target.value)}
                rows={3}
                placeholder={selectedClaim.status === 'SUBMITTED' ? 'Reason for decision...' : 'Note for the record...'}
              />
            </div>
            <div className="modal-actions decision-actions" style={{ justifyContent: 'space-between' }}>
              <div>
                <button type="button" className="secondary-btn" onClick={() => { setSelectedClaim(null); setDecisionNote(''); }}>Close</button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(selectedClaim.status === 'SUBMITTED') && (
                  <>
                    <button type="button" className="primary-btn" onClick={() => handleAction('verify')} disabled={actionLoading}>
                      {actionLoading ? 'Processing...' : 'Verify'}
                    </button>
                    <button type="button" className="warning-btn" onClick={() => handleAction('request-info')} disabled={actionLoading}>
                      Request Info
                    </button>
                    <button type="button" className="danger-btn" onClick={() => handleAction('reject')} disabled={actionLoading}>
                      Reject
                    </button>
                  </>
                )}
                {(selectedClaim.status === 'NEEDS_INFO') && (
                  <span className="muted-text" style={{ padding: '0.5rem' }}>Awaiting resubmission by creator</span>
                )}
                {(selectedClaim.status === 'VERIFIED') && (
                  <>
                    {isTreasurer && (
                      <button type="button" className="primary-btn" onClick={() => handleAction('approve-payout')} disabled={actionLoading}>
                        {actionLoading ? 'Processing...' : 'Approve for Payout'}
                      </button>
                    )}
                    <button type="button" className="danger-btn" onClick={() => handleAction('reject')} disabled={actionLoading}>
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
