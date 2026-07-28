import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

function AnnouncementsContent() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title: '', body: '' });

  const load = () => api.get('/announcements').then((r) => setAnnouncements(r.data.announcements));
  useEffect(() => { load(); }, []);

  const post = async (e) => {
    e.preventDefault();
    try {
      await api.post('/announcements', form);
      setForm({ title: '', body: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post announcement');
    }
  };

  return (
    <div className="space-y-6">
      {['MANAGER', 'ADMIN'].includes(user.role) && (
        <form onSubmit={post} className="bg-card rounded-xl2 border border-black/5 shadow-card p-5 space-y-3">
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
          <textarea required placeholder="Message" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={3} className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
          <button type="submit" className="bg-primary text-white text-sm font-semibold rounded-lg px-4 py-2">Post to company</button>
        </form>
      )}
      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="bg-card rounded-xl2 border border-black/5 shadow-card p-5">
            <p className="font-display font-semibold text-ink">{a.title}</p>
            <p className="text-sm text-slate-650 mt-1">{a.body}</p>
            <p className="text-xs text-slate-650 mt-2">{a.postedBy?.name} · {new Date(a.createdAt).toLocaleString()}</p>
          </div>
        ))}
        {announcements.length === 0 && <p className="text-sm text-slate-650">No announcements yet.</p>}
      </div>
    </div>
  );
}

export default function Announcements() {
  return (
    <ProtectedRoute>
      <Layout title="Announcements">
        <AnnouncementsContent />
      </Layout>
    </ProtectedRoute>
  );
}
