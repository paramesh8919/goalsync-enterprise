import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';

function TeamsContent() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', leaderId: '' });

  const isOversight = ['ADMIN', 'MANAGER'].includes(user.role);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/teams');
      setTeams(res.data.teams);
      if (isOversight) {
        const l = await api.get('/users', { params: { role: 'TEAM_LEADER' } });
        setLeaders(l.data.users);
      }
    } catch (e) {
      toast.error('Could not load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createTeam = async (e) => {
    e.preventDefault();
    try {
      await api.post('/teams', { ...form, leaderId: form.leaderId || undefined });
      toast.success('Group created');
      setShowForm(false);
      setForm({ name: '', description: '', leaderId: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create team');
    }
  };

  // Team Leaders create their own single team. Admin/Manager can create a group
  // for any Team Leader, or lead one themselves — no cap on how many they start.
  const canCreate = isOversight || (user.role === 'TEAM_LEADER' && teams.every((t) => t.leaderId !== user.id));

  if (loading) return <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />;

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <button onClick={() => setShowForm((s) => !s)} className="bg-primary hover:bg-primary-600 text-white text-sm font-semibold rounded-lg px-4 py-2">
            {showForm ? 'Cancel' : isOversight ? '+ Create a group' : '+ Create your team'}
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={createTeam} className="bg-card rounded-xl2 border border-black/5 shadow-card p-5 space-y-3">
          <input required placeholder="Group / team name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
          <textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" rows={2} />
          {isOversight && (
            <select value={form.leaderId} onChange={(e) => setForm((f) => ({ ...f, leaderId: e.target.value }))}
              className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none">
              <option value="">Lead it myself ({user.name})</option>
              {leaders.map((l) => (
                <option key={l.id} value={l.id}>Assign leader: {l.name}</option>
              ))}
            </select>
          )}
          <button type="submit" className="bg-primary hover:bg-primary-600 text-white text-sm font-semibold rounded-lg px-4 py-2">Create</button>
        </form>
      )}

      {teams.length === 0 && (
        <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-8 text-center text-sm text-slate-650">
          {user.role === 'EMPLOYEE' ? "You haven't been added to a team yet." : 'No teams yet.'}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {teams.map((t) => (
          <Link key={t.id} href={`/teams/${t.id}`} className="bg-card rounded-xl2 border border-black/5 shadow-card p-5 hover:border-primary/40 transition-colors">
            <p className="font-display font-semibold text-ink">{t.name}</p>
            <p className="text-sm text-slate-650 mt-1">Led by {t.leader?.name}</p>
            <div className="flex gap-3 mt-3 text-xs text-slate-650">
              <span>{t.members?.length || 0} members</span>
              <span>{t._count?.projects || 0} projects</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Teams() {
  return (
    <ProtectedRoute>
      <Layout title="Teams">
        <TeamsContent />
      </Layout>
    </ProtectedRoute>
  );
}
