import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

function DashboardContent() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [leadership, setLeadership] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.get('/dashboard/summary');
        setSummary(s.data.summary);
        if (['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(user.role)) {
          const w = await api.get('/dashboard/workload');
          setWorkload(w.data.workload);
        }
        if (['MANAGER', 'ADMIN'].includes(user.role)) {
          const l = await api.get('/dashboard/leadership');
          setLeadership(l.data.leadership);
        }
      } catch (e) {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, [user.role]);

  if (loading || !summary) {
    return <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-lg font-bold text-ink mb-1">
          Welcome back, {user.name.split(' ')[0]}
        </h2>
        <p className="text-sm text-slate-650">
          {user.role === 'ADMIN' && 'Organization-wide overview.'}
          {user.role === 'MANAGER' && 'Overview across all teams and projects.'}
          {user.role === 'TEAM_LEADER' && 'Overview of your team\'s projects.'}
          {user.role === 'EMPLOYEE' && 'Your tasks and project progress.'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Projects" value={summary.totalProjects} />
        <StatCard label="Tasks" value={summary.tasksTotal} />
        <StatCard label="Completion rate" value={`${summary.completionRate}%`} accent="text-accent" />
        <StatCard label="Overdue tasks" value={summary.overdueTasks} accent={summary.overdueTasks > 0 ? 'text-danger' : undefined} />
      </div>

      {summary.myTasks && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="My tasks" value={summary.myTasks.total} />
          <StatCard label="Completed" value={summary.myTasks.done} accent="text-accent" />
          <StatCard label="Overdue" value={summary.myTasks.overdue} accent={summary.myTasks.overdue > 0 ? 'text-danger' : undefined} />
        </div>
      )}

      <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-5">
        <p className="font-display font-semibold text-sm mb-4">Projects by status</p>
        <div className="flex flex-wrap gap-3">
          {summary.byStatus.map((s) => (
            <div key={s.status} className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2 text-sm">
              <span className="font-semibold text-ink">{s.count}</span>
              <span className="text-slate-650">{s.status.replace(/_/g, ' ').toLowerCase()}</span>
            </div>
          ))}
        </div>
      </div>

      {workload && workload.length > 0 && (
        <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-5">
          <p className="font-display font-semibold text-sm mb-4">Workload analysis</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-650 uppercase tracking-wide">
                  <th className="py-2">Employee</th><th>Total</th><th>Open</th><th>Overdue</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((w) => (
                  <tr key={w.employee.id} className="border-t border-black/5">
                    <td className="py-2">{w.employee.name}</td>
                    <td>{w.totalTasks}</td>
                    <td>{w.openTasks}</td>
                    <td className={w.overdueTasks > 0 ? 'text-danger font-semibold' : ''}>{w.overdueTasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {leadership && leadership.length > 0 && (
        <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-5">
          <p className="font-display font-semibold text-sm mb-4">Leadership evaluation</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-650 uppercase tracking-wide">
                  <th className="py-2">Team</th><th>Leader</th><th>Members</th><th>Projects</th><th>Active</th><th>Approval rate</th>
                </tr>
              </thead>
              <tbody>
                {leadership.map((l) => (
                  <tr key={l.team} className="border-t border-black/5">
                    <td className="py-2">{l.team}</td>
                    <td>{l.leader?.name}</td>
                    <td>{l.memberCount}</td>
                    <td>{l.totalProjects}</td>
                    <td>{l.activeProjects}</td>
                    <td>{l.approvalRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <Layout title="Dashboard">
        <DashboardContent />
      </Layout>
    </ProtectedRoute>
  );
}
