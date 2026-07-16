import { useEffect, useState } from 'react';
import './App.css';
import { apiService } from './services/api';
import type { MyClaimsResponse, Claim, Request, BudgetLine, ClaimPayload, EditClaimPayload } from './types';

function App() {
  const [data, setData] = useState<MyClaimsResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [editClaimId, setEditClaimId] = useState<string | null>(null);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [budgetLineId, setBudgetLineId] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>('');

  const loadData = () => {
    apiService.getMyClaims()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditClick = (c: Claim) => {
    setEditClaimId(c.claim_id);
    setAmount(c.total_amount.toString());
    setNotes(c.notes);
    setBudgetLineId(''); // Editing doesn't currently change budget line
    setReceiptFile(null);
    setFileError('');
    setShowClaimForm(true);
  };

  const handleNewClick = () => {
    setEditClaimId(null);
    setAmount('');
    setNotes('');
    setBudgetLineId(data?.budgetLines?.[0]?.line_id || '');
    setReceiptFile(null);
    setFileError('');
    setShowClaimForm(true);
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
        // Strip the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClaimId && !budgetLineId) {
      alert('Please select a budget line.');
      return;
    }
    if (!editClaimId && !receiptFile) {
      alert('Please upload a receipt.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editClaimId) {
        const editPayload: EditClaimPayload = {
          claimId: editClaimId,
          amount: Number(amount),
          notes: notes
        };
        await apiService.editClaim(editPayload);
      } else {
        const base64Data = await fileToBase64(receiptFile!);
        const receiptDate = new Date().toISOString().split('T')[0]; // Simple YYYY-MM-DD
        
        const { receiptId } = await apiService.uploadReceipt(
          receiptFile!.name,
          receiptFile!.type,
          base64Data,
          'Unknown Vendor', // Optional field in the future
          receiptDate,
          Number(amount)
        );

        const newPayload: ClaimPayload = {
          uuid: crypto.randomUUID(),
          amount: Number(amount),
          notes: notes,
          receiptDate: new Date().toISOString(),
          budgetLineId: budgetLineId,
          receiptId: receiptId
        };
        await apiService.submitClaim(newPayload);
      }

      setShowClaimForm(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>My Finance Dashboard</h1>
        <p className="subtitle">Track your budget requests and expense claims</p>
      </header>

      {error && <div className="alert error">Failed to load: {error}</div>}
      
      {!data && !error && (
        <div className="loader-container">
          <div className="loader"></div>
          <p>Securely fetching your data...</p>
        </div>
      )}

      {showClaimForm && (
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
                    <label>Receipt Upload (Drive)</label>
                    <input type="file" accept="image/*,.pdf" onChange={handleFileChange} required />
                    {fileError && <small className="error-text">{fileError}</small>}
                    <small className="help-text">Max 5MB. Images and PDFs allowed.</small>
                  </div>
                </>
              )}
              
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowClaimForm(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={isSubmitting || !!fileError}>{isSubmitting ? 'Saving...' : 'Save Claim'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {data && !showClaimForm && (
        <div className="content-grid">
          <section className="glass-card">
            <div className="card-header">
              <h2>Expense Claims</h2>
              <button className="primary-btn" onClick={handleNewClick}>+ New Claim</button>
            </div>
            
            {data.claims.length === 0 ? (
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
              <button className="secondary-btn">+ New Request</button>
            </div>
            
            {data.requests.length === 0 ? (
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
      )}
    </div>
  );
}

export default App;
