import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

function LeaveContent() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ type: 'VACATION', startDate: '', endDate: '', reason: '' });

  const load = () => api.get('/leave').then((r) => setRequests(r.data.leaveRequests));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leave', form);
      setForm({ type: 'VACATION', startDate: '', endDate: '', reason: '' });
      toast.success('Leave request submitted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit request');
    }
  };

  const decide = async (id, decision) => {
    try {
      await api.post(`/leave/${id}/decision`, { decision });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const canDecide = ['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(user.role);

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="bg-card rounded-xl2 border border-black/5 shadow-card p-5 grid sm:grid-cols-2 gap-3">
        <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none">
          {['SICK', 'VACATION', 'PERSONAL', 'UNPAID', 'OTHER'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input placeholder="Reason (optional)" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className="border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
        <input required type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
        <input required type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
        <button type="submit" className="bg-primary hover:bg-primary-600 text-white text-sm font-semibold rounded-lg px-4 py-2 sm:col-span-2">Request leave</button>
      </form>

      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="bg-card rounded-xl2 border border-black/5 shadow-card p-4 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm">
              <p className="font-medium text-ink">{r.user?.name} · {r.type}</p>
              <p className="text-slate-650 text-xs">{new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}</p>
            </div>
            {canDecide && r.status === 'PENDING' ? (
              <div className="flex gap-2">
                <button onClick={() => decide(r.id, 'APPROVED')} className="bg-accent text-white text-xs font-semibold rounded-lg px-3 py-1.5">Approve</button>
                <button onClick={() => decide(r.id, 'REJECTED')} className="bg-danger text-white text-xs font-semibold rounded-lg px-3 py-1.5">Reject</button>
              </div>
            ) : (
              <span className="text-xs font-semibold text-slate-650">{r.status}</span>
            )}
          </div>
        ))}
        {requests.length === 0 && <p className="text-sm text-slate-650">No leave requests.</p>}
      </div>
    </div>
  );
}

export default function Leave() {
  return (
    <ProtectedRoute>
      <Layout title="Leave">
        <LeaveContent />
      </Layout>
    </ProtectedRoute>
  );
}
