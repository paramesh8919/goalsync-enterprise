import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { StatusBadge, PriorityBadge } from '../components/Badge';
import api from '../lib/api';
import toast from 'react-hot-toast';

function TasksContent() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get('/tasks/my');
      setTasks(res.data.tasks);
    } catch (e) {
      toast.error('Could not load tasks');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (taskId, status) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update task');
    }
  };

  if (loading) return <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />;

  return (
    <div className="space-y-3">
      {tasks.map((t) => (
        <div key={t.id} className="bg-card rounded-xl2 border border-black/5 shadow-card p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-medium text-ink text-sm">{t.title}</p>
            <p className="text-xs text-slate-650">
              {t.project?.title} {t.dueDate && `· Due ${new Date(t.dueDate).toLocaleDateString()}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={t.priority} />
            <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)} className="border border-black/10 rounded-lg px-2 py-1 text-xs focus:border-primary outline-none">
              {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
      ))}
      {tasks.length === 0 && (
        <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-8 text-center text-sm text-slate-650">
          No tasks assigned to you yet.
        </div>
      )}
    </div>
  );
}

export default function Tasks() {
  return (
    <ProtectedRoute allowedRoles={['EMPLOYEE', 'TEAM_LEADER']}>
      <Layout title="My Tasks">
        <TasksContent />
      </Layout>
    </ProtectedRoute>
  );
}
