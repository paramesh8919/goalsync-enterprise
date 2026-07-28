import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import api from '../lib/api';
import toast from 'react-hot-toast';

function ApprovalsContent() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentFor, setCommentFor] = useState(null);
  const [comment, setComment] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/approvals/users');
      setUsers(res.data.users);
    } catch (e) {
      toast.error('Could not load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const decide = async (id, decision, decisionComment) => {
    try {
      await api.post(`/approvals/users/${id}/decision`, { decision, comment: decisionComment });
      toast.success(decision === 'APPROVED' ? 'Approval recorded' : 'Registration rejected');
      setCommentFor(null);
      setComment('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  if (loading) return <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-650">
        Accounts activate only once <strong>both</strong> a Manager and the Admin approve. A rejection from either
        side is final.
      </p>

      {users.length === 0 && (
        <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-8 text-center text-sm text-slate-650">
          No pending registrations.
        </div>
      )}

      {users.map((u) => (
        <div key={u.id} className="bg-card rounded-xl2 border border-black/5 shadow-card p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-display font-semibold text-ink">{u.name}</p>
              <p className="text-sm text-slate-650">{u.email} · {u.role.replace('_', ' ')}{u.jobTitle ? ` · ${u.jobTitle}` : ''}</p>
              <div className="flex gap-3 mt-2 text-xs text-slate-650">
                <span>Manager: {u.managerApprovedAt ? '✅ approved' : '⏳ pending'}</span>
                <span>Admin: {u.adminApprovedAt ? '✅ approved' : '⏳ pending'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => decide(u.id, 'APPROVED')}
                className="bg-accent hover:opacity-90 text-white text-sm font-semibold rounded-lg px-4 py-2"
              >
                Approve
              </button>
              <button
                onClick={() => setCommentFor(commentFor === u.id ? null : u.id)}
                className="bg-danger hover:opacity-90 text-white text-sm font-semibold rounded-lg px-4 py-2"
              >
                Reject
              </button>
            </div>
          </div>

          {commentFor === u.id && (
            <div className="mt-4 flex gap-2">
              <input
                autoFocus
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Reason for rejection (shown to the applicant)"
                className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
              />
              <button
                onClick={() => decide(u.id, 'REJECTED', comment)}
                className="bg-danger text-white text-sm font-semibold rounded-lg px-4 py-2"
              >
                Confirm reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Approvals() {
  return (
    <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
      <Layout title="Approvals">
        <ApprovalsContent />
      </Layout>
    </ProtectedRoute>
  );
}
