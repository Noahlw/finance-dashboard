import { useEffect, useState } from 'react';
import { apiService } from './services/api';
import type { Member, AddMemberPayload } from './types';

export default function MembersView() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [studentId, setStudentId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<AddMemberPayload['payout_method']>('FPS');
  const [payoutHandle, setPayoutHandle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadMembers = () => {
    setLoading(true);
    apiService.getMembers()
      .then(setMembers)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMembers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !displayName.trim()) {
      alert('Student ID and display name are required.');
      return;
    }
    setSubmitting(true);
    try {
      await apiService.addMember({ student_id: studentId, display_name: displayName, full_name: fullName, payout_method: payoutMethod, payout_handle: payoutHandle });
      setShowForm(false);
      setStudentId('');
      setDisplayName('');
      setFullName('');
      setPayoutMethod('FPS');
      setPayoutHandle('');
      loadMembers();
    } catch (err: any) {
      alert(err.message || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (m: Member) => {
    if (!confirm('Reactivate ' + m.display_name + '?')) return;
    try {
      await apiService.reactivateMember(m.user_id);
      loadMembers();
    } catch (err: any) {
      alert(err.message || 'Failed to reactivate');
    }
  };

  return (
    <div className="view-container">
      {error && <div className="alert error">{error}</div>}

      <section className="glass-card">
        <div className="card-header">
          <h2>Member Directory</h2>
          <button className="primary-btn" onClick={() => setShowForm(true)}>+ Add Member</button>
        </div>

        {showForm && (
          <div className="modal-backdrop">
            <div className="modal-content glass-card">
              <h2>Add Member</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Student ID</label>
                  <input value={studentId} onChange={e => setStudentId(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Display Name / Nickname</label>
                  <input value={displayName} onChange={e => setDisplayName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Full Name (optional)</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Default Payout Method</label>
                  <select value={payoutMethod} onChange={e => setPayoutMethod(e.target.value as AddMemberPayload['payout_method'])}>
                    <option value="FPS">FPS</option>
                    <option value="PAYME">PayMe</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Default Payout Handle (optional)</label>
                  <input value={payoutHandle} onChange={e => setPayoutHandle(e.target.value)} placeholder="e.g. phone number for FPS" />
                </div>
                <div className="modal-actions">
                  <button type="button" className="secondary-btn" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="primary-btn" disabled={submitting}>{submitting ? 'Saving...' : 'Add Member'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loader-container"><div className="loader" /><p>Loading...</p></div>
        ) : members.length === 0 ? (
          <div className="empty-state">No members found.</div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.user_id}>
                    <td className="mono">{m.user_id}</td>
                    <td>{m.display_name}</td>
                    <td><span className={`badge ${m.active ? 'status-approved' : 'status-draft'}`}>{m.active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      {!m.active && (
                        <button className="primary-btn" onClick={() => handleReactivate(m)}>Reactivate</button>
                      )}
                    </td>
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
