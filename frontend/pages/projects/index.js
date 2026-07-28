import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, PriorityBadge } from '../../components/Badge';
import api from '../../lib/api';
import toast from 'react-hot-toast';

function ProjectsContent() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [teamsForPicker, setTeamsForPicker] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', dueDate: '', teamId: '' });

  const isOversight = ['ADMIN', 'MANAGER'].includes(user.role);
  const canCreate = isOversight || user.role === 'TEAM_LEADER';

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects);
      if (isOversight) {
        const t = await api.get('/teams');
        setTeamsForPicker(t.data.teams);
      }
    } catch (e) {
      toast.error('Could not load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createProject = async (e) => {
    e.preventDefault();
    if (isOversight && !form.teamId) {
      toast.error('Pick a team for this project');
      return;
    }
    try {
      await api.post('/projects', form);
      toast.success(isOversight ? 'Project created and activated' : 'Project drafted');
      setShowForm(false);
      setForm({ title: '', description: '', priority: 'MEDIUM', dueDate: '', teamId: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create project');
    }
  };

  if (loading) return <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />;

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <button onClick={() => setShowForm((s) => !s)} className="bg-primary hover:bg-primary-600 text-white text-sm font-semibold rounded-lg px-4 py-2">
            {showForm ? 'Cancel' : '+ New project'}
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={createProject} className="bg-card rounded-xl2 border border-black/5 shadow-card p-5 space-y-3">
          <input required placeholder="Project title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
          <textarea required placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" rows={3} />
          {isOversight && (
            <select required value={form.teamId} onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value }))}
              className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none">
              <option value="">Select team…</option>
              {teamsForPicker.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <div className="flex gap-3">
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              className="border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
          </div>
          <button type="submit" className="bg-primary hover:bg-primary-600 text-white text-sm font-semibold rounded-lg px-4 py-2">
            {isOversight ? 'Create & activate' : 'Save as draft'}
          </button>
        </form>
      )}

      {projects.length === 0 && (
        <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-8 text-center text-sm text-slate-650">No projects yet.</div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="bg-card rounded-xl2 border border-black/5 shadow-card p-5 hover:border-primary/40 transition-colors block">
            <div className="flex items-start justify-between gap-2">
              <p className="font-display font-semibold text-ink">{p.title}</p>
              <StatusBadge status={p.status} />
            </div>
            <p className="text-sm text-slate-650 mt-1 line-clamp-2">{p.description}</p>
            <div className="flex items-center gap-3 mt-3">
              <PriorityBadge priority={p.priority} />
              <span className="text-xs text-slate-650">{p.team?.name}</span>
              <span className="text-xs text-slate-650">{p._count?.tasks || 0} tasks</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Projects() {
  return (
    <ProtectedRoute>
      <Layout title="Projects">
        <ProjectsContent />
      </Layout>
    </ProtectedRoute>
  );
}
