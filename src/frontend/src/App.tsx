import { useEffect, useState } from 'react';
import './App.css';
import { apiService } from './services/api';
import type {
  SessionResponse, SessionInfo, SessionDenied,
  WorkspaceView, MyClaimsResponse, Claim
} from './types';

const VIEW_LABELS: Record<WorkspaceView, string> = {
  'claims': 'Claims',
  'budget-requests': 'Budget Requests',
  'income': 'Income',
  'payouts': 'Payouts',
  'reports': 'Reports'
};

function SessionLoading() {
  return (
    <div className="session-loading">
      <div className="loader" />
      <p>Verifying access...</p>
    </div>
  );
}

function AccessDenied({ reason, role }: { reason: string; role?: string }) {
  const messages: Record<string, { title: string; description: string }> = {
    no_session: { title: 'Not Signed In', description: 'Please sign in with your Google account to access the Finance Workspace.' },
    unknown_user: { title: 'Access Denied', description: 'Your Google account is not recognized. Contact a Treasurer to be added.' },
    unauthorized_role: { title: 'Insufficient Permissions', description: `Your role (${role || 'unknown'}) does not have access to this workspace. Only Committee and Treasurer accounts are allowed.` },
    inactive_user: { title: 'Account Inactive', description: 'Your account is currently inactive. Contact a Treasurer to reactivate.' }
  };
  const msg = messages[reason] || { title: 'Access Denied', description: 'You do not have permission to access this workspace.' };

  return (
    <div className="access-denied">
      <div className="access-denied-card">
        <div className="access-denied-icon">!</div>
        <h1>{msg.title}</h1>
        <p>{msg.description}</p>
      </div>
    </div>
  );
}

function ClaimsView() {
  const [data, setData] = useState<MyClaimsResponse | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editClaimId, setEditClaimId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [budgetLineId, setBudgetLineId] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');

  const loadData = () => {
    apiService.getMyClaims()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => { loadData(); }, []);

  const handleEditClick = (c: Claim) => {
    setEditClaimId(c.claim_id);
    setAmount(c.total_amount.toString());
    setNotes(c.notes);
    setReceiptFile(null);
    setFileError('');
    setShowForm(true);
  };

  const handleNewClick = () => {
    setEditClaimId(null);
    setAmount('');
    setNotes('');
    setBudgetLineId(data?.budgetLines?.[0]?.line_id || '');
    setReceiptFile(null);
    setFileError('');
    setShowForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError('');
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFileError('File size exceeds 5MB limit.');
        setReceiptFile(null);
      } else {
        setReceiptFile(file);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClaimId && !budgetLineId) { alert('Please select a budget line.'); return; }
    if (!editClaimId && !receiptFile) { alert('Please upload a receipt.'); return; }

    setIsSubmitting(true);
    try {
      if (editClaimId) {
        await apiService.editClaim({ claimId: editClaimId, amount: Number(amount), notes });
      } else {
        const base64Data = await fileToBase64(receiptFile!);
        const receiptDate = new Date().toISOString().split('T')[0];
        const { receiptId } = await apiService.uploadReceipt(
          receiptFile!.name, receiptFile!.type, base64Data, 'Unknown Vendor', receiptDate, Number(amount)
        );
        await apiService.submitClaim({
          uuid: crypto.randomUUID(), amount: Number(amount), notes,
          receiptDate: new Date().toISOString(), budgetLineId, receiptId
        });
      }
      setShowForm(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="view-container">
      {error && <div className="alert error">Failed to load: {error}</div>}

      {showForm && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card">
            <h2>{editClaimId ? 'Edit Claim' : 'Submit New Claim'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Amount (HKD)</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Notes / Description</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} required />
              </div>
              {!editClaimId && (
                <>
                  <div className="form-group">
                    <label>Budget Line</label>
                    <select value={budgetLineId} onChange={(e) => setBudgetLineId(e.target.value)} required>
                      <option value="" disabled>Select a budget line...</option>
                      {data?.budgetLines?.map(bl => (
                        <option key={bl.line_id} value={bl.line_id}>
                          {bl.description} - HK${bl.remaining.toFixed(2)} remaining
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Receipt Upload</label>
                    <input type="file" accept="image/*,.pdf" onChange={handleFileChange} required />
                    {fileError && <small className="error-text">{fileError}</small>}
                    <small className="help-text">Max 5MB. Images and PDFs allowed.</small>
                  </div>
                </>
              )}
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowForm(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={isSubmitting || !!fileError}>{isSubmitting ? 'Saving...' : 'Save Claim'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="glass-card">
        <div className="card-header">
          <h2>Expense Claims</h2>
          <button className="primary-btn" onClick={handleNewClick}>+ New Claim</button>
        </div>
        {!data ? (
          <div className="loader-container"><div className="loader" /><p>Loading claims...</p></div>
        ) : data.claims.length === 0 ? (
          <div className="empty-state">No claims found.</div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Notes</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.claims.map(c => (
                  <tr key={c.claim_id}>
                    <td className="mono">{c.claim_id}</td>
                    <td>{c.notes}</td>
                    <td className="amount">${Number(c.total_amount).toFixed(2)}</td>
                    <td><span className={`badge status-${c.status.toLowerCase()}`}>{c.status}</span></td>
                    <td>
                      {c.status === 'SUBMITTED' ? (
                        <button className="secondary-btn edit-btn" onClick={() => handleEditClick(c)}>Edit</button>
                      ) : (
                        <span className="muted-text">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="glass-card">
        <div className="card-header">
          <h2>Budget Requests</h2>
        </div>
        {!data ? (
          <div className="loader-container"><div className="loader" /><p>Loading...</p></div>
        ) : data.requests.length === 0 ? (
          <div className="empty-state">No requests found.</div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.requests.map(r => (
                  <tr key={r.request_id}>
                    <td className="mono">{r.request_id}</td>
                    <td>{r.title}</td>
                    <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : 'N/A'}</td>
                    <td><span className={`badge status-${r.status.toLowerCase()}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PlaceholderView({ view }: { view: WorkspaceView }) {
  return (
    <div className="view-container">
      <section className="glass-card placeholder-card">
        <h2>{VIEW_LABELS[view]}</h2>
        <p className="placeholder-text">This view is coming soon.</p>
      </section>
    </div>
  );
}

function WorkspaceShell({ session }: { session: SessionInfo }) {
  const [activeView, setActiveView] = useState<WorkspaceView>(session.views[0]);

  const renderView = () => {
    switch (activeView) {
      case 'claims': return <ClaimsView />;
      default: return <PlaceholderView view={activeView} />;
    }
  };

  return (
    <div className="workspace">
      <header className="workspace-header">
        <div className="workspace-header-left">
          <h1 className="workspace-title">Finance Workspace</h1>
        </div>
        <div className="workspace-header-right">
          <span className="workspace-user">
            <span className="workspace-user-name">{session.display_name}</span>
            <span className={`workspace-role role-${session.role.toLowerCase()}`}>{session.role}</span>
          </span>
        </div>
      </header>

      <div className="workspace-body">
        <nav className="workspace-sidebar">
          {session.views.map(v => (
            <button
              key={v}
              className={`sidebar-item ${activeView === v ? 'active' : ''}`}
              onClick={() => setActiveView(v)}
            >
              <span className="sidebar-icon">{getViewIcon(v)}</span>
              <span className="sidebar-label">{VIEW_LABELS[v]}</span>
            </button>
          ))}
        </nav>

        <main className="workspace-content">
          {renderView()}
        </main>
      </div>

      <nav className="workspace-bottom-nav">
        {session.views.map(v => (
          <button
            key={v}
            className={`bottom-nav-item ${activeView === v ? 'active' : ''}`}
            onClick={() => setActiveView(v)}
          >
            <span className="bottom-nav-icon">{getViewIcon(v)}</span>
            <span className="bottom-nav-label">{VIEW_LABELS[v]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function getViewIcon(view: WorkspaceView): string {
  switch (view) {
    case 'claims': return '\u{1F4B0}';
    case 'budget-requests': return '\u{1F4CB}';
    case 'income': return '\u{1F4B5}';
    case 'payouts': return '\u{1F4B8}';
    case 'reports': return '\u{1F4CA}';
  }
}

export default function App() {
  const [session, setSession] = useState<SessionResponse | null>(null);

  useEffect(() => {
    apiService.resolveSession().then(setSession);
  }, []);

  if (!session) return <SessionLoading />;
  if (!session.allowed) return <AccessDenied reason={session.reason} role={(session as SessionDenied).role} />;
  return <WorkspaceShell session={session} />;
}