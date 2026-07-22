import { useEffect, useState } from 'react';
import { apiService } from './services/api';
import type { Member, Claim, BudgetLine } from './types';

interface ClaimsViewProps {
  members?: Member[];
  budgetLines?: BudgetLine[];
}

type Step = 'member' | 'details' | 'payment' | 'review';

export default function ClaimsView({ members = [], budgetLines = [] }: ClaimsViewProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<Step>('member');

  const [claimantId, setClaimantId] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [semester, setSemester] = useState('26A');
  const [eventId, setEventId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [budgetLineId, setBudgetLineId] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'FPS' | 'PAYME' | 'BANK' | 'CASH' | 'OTHER'>('FPS');
  const [payoutHandle, setPayoutHandle] = useState('');
  const [skipReceipt, setSkipReceipt] = useState(false);
  const [receiptId, setReceiptId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadClaims = () => {
    setLoading(true);
    apiService.getMyClaims()
      .then((res) => setClaims(res.claims))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadClaims(); }, []);

  const resetForm = () => {
    setStep('member');
    setClaimantId('');
    setExpenseDate('');
    setSemester('26A');
    setEventId('');
    setAmount('');
    setNotes('');
    setBudgetLineId(budgetLines[0]?.line_id || '');
    setPayoutMethod('FPS');
    setPayoutHandle('');
    setSkipReceipt(false);
    setReceiptId('');
  };

  const openNewClaim = () => {
    resetForm();
    setShowForm(true);
  };

  const canProceed = () => {
    if (step === 'member') return !!claimantId;
    if (step === 'details') return !!expenseDate && !!amount && !!notes;
    if (step === 'payment') return true;
    return true;
  };

  const handleSave = async (submit: boolean) => {
    if (!Number(amount)) { alert('Amount must be greater than 0.'); return; }
    setSubmitting(true);
    try {
      const draft = await apiService.saveClaimDraft({
        uuid: crypto.randomUUID(),
        claimantId,
        amount: Number(amount),
        notes,
        budgetLineId,
        receiptId: skipReceipt ? undefined : receiptId,
        expenseDate,
        semester,
        eventId,
        payoutMethod,
        payoutHandle
      });
      if (submit) {
        await apiService.submitDraftClaim(draft.claim_id);
      }
      setShowForm(false);
      resetForm();
      loadClaims();
    } catch (err: any) {
      alert(err.message || 'Failed to save claim');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'member':
        return (
          <div className="form-group">
            <label>Select Member (Claimant)</label>
            <select value={claimantId} onChange={e => setClaimantId(e.target.value)} required>
              <option value="" disabled>Choose a member...</option>
              {members.filter(m => m.active).map(m => (
                <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
              ))}
            </select>
          </div>
        );
      case 'details':
        return (
          <>
            <div className="form-group">
              <label>Expense Date</label>
              <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Semester</label>
              <input type="text" value={semester} onChange={e => setSemester(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Amount (HKD)</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Note (required)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} required />
            </div>
            <div className="form-group">
              <label>Budget Line (optional)</label>
              <select value={budgetLineId} onChange={e => setBudgetLineId(e.target.value)}>
                <option value="">None / pay from general fund</option>
                {budgetLines.map(bl => (
                  <option key={bl.line_id} value={bl.line_id}>{bl.description} - HK${bl.remaining.toFixed(2)} remaining</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={skipReceipt} onChange={e => setSkipReceipt(e.target.checked)} />
                No receipt (missing receipt warning)
              </label>
              {skipReceipt && <small className="warning-text">This claim will be flagged as missing a receipt.</small>}
            </div>
            {!skipReceipt && (
              <div className="form-group">
                <label>Receipt ID (optional, for uploaded receipt)</label>
                <input value={receiptId} onChange={e => setReceiptId(e.target.value)} placeholder="RECEIPT-XXXX" />
              </div>
            )}
          </>
        );
      case 'payment':
        return (
          <>
            <div className="form-group">
              <label>Payout Method</label>
              <select value={payoutMethod} onChange={e => setPayoutMethod(e.target.value as any)}>
                <option value="FPS">FPS</option>
                <option value="PAYME">PayMe</option>
                <option value="BANK">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Payout Handle / Reference</label>
              <input value={payoutHandle} onChange={e => setPayoutHandle(e.target.value)} placeholder={payoutMethod === 'FPS' ? 'Phone number' : 'Account / handle'} />
            </div>
          </>
        );
      case 'review':
        return (
          <div className="review-summary">
            <p><strong>Member:</strong> {members.find(m => m.user_id === claimantId)?.display_name || claimantId}</p>
            <p><strong>Amount:</strong> HK${Number(amount).toFixed(2)}</p>
            <p><strong>Expense Date:</strong> {expenseDate}</p>
            <p><strong>Note:</strong> {notes}</p>
            <p><strong>Payment:</strong> {payoutMethod} {payoutHandle && `(${payoutHandle})`}</p>
            {skipReceipt && <div className="alert warning">Missing Receipt: this claim will be flagged.</div>}
          </div>
        );
    }
  };

  return (
    <div className="view-container">
      {error && <div className="alert error">{error}</div>}

      <section className="glass-card">
        <div className="card-header">
          <h2>Expense Claims</h2>
          <button className="primary-btn" onClick={openNewClaim}>+ New Claim</button>
        </div>

        {showForm && (
          <div className="modal-backdrop">
            <div className="modal-content glass-card wide-modal">
              <h2>New Claim — {step}</h2>
              <div className="stepper">
                {(['member', 'details', 'payment', 'review'] as Step[]).map((s, i) => (
                  <span key={s} className={`stepper-dot ${step === s ? 'active' : ''}`}>{i + 1}</span>
                ))}
              </div>
              {renderStep()}
              <div className="modal-actions">
                {step !== 'member' && <button type="button" className="secondary-btn" onClick={() => setStep((['member', 'details', 'payment', 'review'] as Step[])[(['member', 'details', 'payment', 'review'] as Step[]).indexOf(step) - 1])}>Back</button>}
                {step !== 'review' ? (
                  <button type="button" className="primary-btn" onClick={() => setStep((['member', 'details', 'payment', 'review'] as Step[])[(['member', 'details', 'payment', 'review'] as Step[]).indexOf(step) + 1])} disabled={!canProceed()}>Next</button>
                ) : (
                  <>
                    <button type="button" className="secondary-btn" onClick={() => handleSave(false)} disabled={submitting}>Save Draft</button>
                    <button type="button" className="primary-btn" onClick={() => handleSave(true)} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Claim'}</button>
                  </>
                )}
                <button type="button" className="danger-btn" onClick={() => { setShowForm(false); resetForm(); }} disabled={submitting}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loader-container"><div className="loader" /><p>Loading...</p></div>
        ) : claims.length === 0 ? (
          <div className="empty-state">No claims found.</div>
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
                </tr>
              </thead>
              <tbody>
                {claims.map(c => (
                  <tr key={c.claim_id}>
                    <td className="mono">{c.claim_id}</td>
                    <td>{members.find(m => m.user_id === c.claimant_id)?.display_name || c.claimant_id}</td>
                    <td className="amount">${Number(c.total_amount).toFixed(2)}</td>
                    <td><span className={`badge status-${c.status.toLowerCase()}`}>{c.status}</span></td>
                    <td>{c.submitted_at ? new Date(c.submitted_at).toLocaleDateString() : '-'}</td>
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
