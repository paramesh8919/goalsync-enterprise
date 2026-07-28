import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { API_BASE_URL } from '../lib/api';
import api from '../lib/api';
import toast from 'react-hot-toast';

function AdminContent() {
  const [departments, setDepartments] = useState([]);
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'MANAGER', jobTitle: '' });
  const [report, setReport] = useState(null);
  const [logs, setLogs] = useState([]);

  const loadDepartments = () => api.get('/departments').then((r) => setDepartments(r.data.departments));
  const loadReport = () => api.get('/dashboard/org-report').then((r) => setReport(r.data));
  const loadLogs = () => api.get('/audit-logs').then((r) => setLogs(r.data.logs));

  useEffect(() => { loadDepartments(); loadReport(); loadLogs(); }, []);

  const createDept = async (e) => {
    e.preventDefault();
    try {
      await api.post('/departments', deptForm);
      setDeptForm({ name: '', description: '' });
      loadDepartments();
      toast.success('Department created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create department');
    }
  };

  const provisionUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', userForm);
      setUserForm({ name: '', email: '', password: '', role: 'MANAGER', jobTitle: '' });
      toast.success(`${userForm.role} account created`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create account');
    }
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('goalsync_token') : '';

  return (
    <div className="space-y-8">
      <section className="bg-card rounded-xl2 border border-black/5 shadow-card p-5">
        <p className="font-display font-semibold text-sm mb-3">Provision a Manager or Admin account</p>
        <p className="text-xs text-slate-650 mb-4">These roles are never self-registered — only the organization (you) creates them.</p>
        <form onSubmit={provisionUser} className="grid sm:grid-cols-2 gap-3">
          <input required placeholder="Full name" value={userForm.name} onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))} className="border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
          <input required type="email" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} className="border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
          <input required type="password" minLength={8} placeholder="Temporary password" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} className="border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
          <select value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))} className="border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none">
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
          <input placeholder="Job title" value={userForm.jobTitle} onChange={(e) => setUserForm((f) => ({ ...f, jobTitle: e.target.value }))} className="border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none sm:col-span-2" />
          <button type="submit" className="bg-primary hover:bg-primary-600 text-white text-sm font-semibold rounded-lg px-4 py-2 sm:col-span-2">Create account</button>
        </form>
      </section>

      <section className="bg-card rounded-xl2 border border-black/5 shadow-card p-5">
        <p className="font-display font-semibold text-sm mb-3">Departments</p>
        <form onSubmit={createDept} className="flex gap-2 flex-wrap mb-4">
          <input required placeholder="Department name" value={deptForm.name} onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))} className="border border-black/10 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none flex-1 min-w-[160px]" />
          <input placeholder="Description" value={deptForm.description} onChange={(e) => setDeptForm((f) => ({ ...f, description: e.target.value }))} className="border border-black/10 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none flex-1 min-w-[160px]" />
          <button type="submit" className="bg-primary text-white text-sm font-semibold rounded-lg px-4 py-2">Add</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {departments.map((d) => (
            <span key={d.id} className="bg-surface rounded-lg px-3 py-1.5 text-sm text-ink">{d.name} <span className="text-slate-650">({d._count?.users || 0})</span></span>
          ))}
        </div>
      </section>

      <section className="bg-card rounded-xl2 border border-black/5 shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-semibold text-sm">Reports</p>
          <div className="flex gap-2">
            <a href={`${API_BASE_URL}/api/reports/projects.pdf`} target="_blank" rel="noreferrer" onClick={(e) => downloadWithAuth(e, `${API_BASE_URL}/api/reports/projects.pdf`, token, 'projects-report.pdf')} className="text-primary text-sm font-medium hover:underline">Export PDF</a>
            <a href={`${API_BASE_URL}/api/reports/projects.xlsx`} target="_blank" rel="noreferrer" onClick={(e) => downloadWithAuth(e, `${API_BASE_URL}/api/reports/projects.xlsx`, token, 'projects-report.xlsx')} className="text-primary text-sm font-medium hover:underline">Export Excel</a>
          </div>
        </div>
        {report && (
          <div className="flex flex-wrap gap-3 text-sm">
            {report.projectsByStatus?.map((s) => (
              <span key={s.status} className="bg-surface rounded-lg px-3 py-1.5">{s.status.replace(/_/g, ' ')}: {s._count}</span>
            ))}
          </div>
        )}
      </section>

      <section className="bg-card rounded-xl2 border border-black/5 shadow-card p-5">
        <p className="font-display font-semibold text-sm mb-3">Recent audit log</p>
        <div className="space-y-2 max-h-72 overflow-y-auto text-sm">
          {logs.slice(0, 30).map((l) => (
            <div key={l.id} className="flex justify-between border-b border-black/5 pb-2">
              <span>{l.action} · {l.entity}{l.user ? ` · ${l.user.name}` : ''}</span>
              <span className="text-xs text-slate-650">{new Date(l.createdAt).toLocaleString()}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="text-slate-650">No activity logged yet.</p>}
        </div>
      </section>
    </div>
  );
}

// The export links need the Bearer token, which a plain <a href> can't send —
// fetch with the header and trigger a client-side download instead.
async function downloadWithAuth(e, url, token, filename) {
  e.preventDefault();
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  } catch (err) {
    toast.error('Export failed');
  }
}

export default function Admin() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <Layout title="Admin">
        <AdminContent />
      </Layout>
    </ProtectedRoute>
  );
}
