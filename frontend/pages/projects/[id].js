import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, PriorityBadge } from '../../components/Badge';
import api, { API_BASE_URL } from '../../lib/api';
import toast from 'react-hot-toast';

const TABS = ['Overview', 'Milestones', 'Tasks', 'Documents', 'Risks', 'Chat'];

function ProjectDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState('Overview');

  const load = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data.project);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load project');
    }
  };

  useEffect(() => { load(); }, [id]);

  if (!project) return <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />;

  const isOwner = project.createdById === user.id;
  const isReviewer = ['MANAGER', 'ADMIN'].includes(user.role);
  const myDecision = user.role === 'MANAGER' ? project.managerDecision : user.role === 'ADMIN' ? project.adminDecision : null;

  const submit = async () => {
    try {
      await api.post(`/projects/${id}/submit`);
      toast.success('Submitted for approval');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit');
    }
  };

  const decide = async (decision) => {
    const comment = decision === 'REJECTED' ? window.prompt('Reason for rejection (required):') : window.prompt('Optional comment:') || '';
    if (decision === 'REJECTED' && !comment) return toast.error('A reason is required to reject');
    try {
      await api.post(`/projects/${id}/decision`, { decision, comment });
      toast.success(decision === 'APPROVED' ? 'Approval recorded' : 'Project rejected');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="font-display text-lg font-bold text-ink">{project.title}</p>
            <p className="text-sm text-slate-650 mt-1">{project.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={project.priority} />
            <StatusBadge status={project.status} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate-650">
          <span>Team: {project.team?.name}</span>
          <span>Created by: {project.createdBy?.name}</span>
          {project.dueDate && <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>}
        </div>

        {project.status === 'PENDING_APPROVAL' && (
          <div className="flex gap-4 mt-4 text-sm">
            <span>Manager: {project.managerDecision === 'PENDING' ? '⏳ pending' : project.managerDecision === 'APPROVED' ? '✅ approved' : '❌ rejected'}</span>
            <span>Admin: {project.adminDecision === 'PENDING' ? '⏳ pending' : project.adminDecision === 'APPROVED' ? '✅ approved' : '❌ rejected'}</span>
          </div>
        )}
        {project.status === 'REJECTED' && (project.managerComment || project.adminComment) && (
          <div className="mt-4 bg-danger/10 text-danger text-sm rounded-lg p-3">
            {project.managerComment && <p>Manager: {project.managerComment}</p>}
            {project.adminComment && <p>Admin: {project.adminComment}</p>}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          {isOwner && project.status === 'DRAFT' && (
            <button onClick={submit} className="bg-primary hover:bg-primary-600 text-white text-sm font-semibold rounded-lg px-4 py-2">
              Submit for dual approval
            </button>
          )}
          {isReviewer && project.status === 'PENDING_APPROVAL' && myDecision === 'PENDING' && (
            <>
              <button onClick={() => decide('APPROVED')} className="bg-accent hover:opacity-90 text-white text-sm font-semibold rounded-lg px-4 py-2">
                Approve
              </button>
              <button onClick={() => decide('REJECTED')} className="bg-danger hover:opacity-90 text-white text-sm font-semibold rounded-lg px-4 py-2">
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-black/5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-slate-650 hover:text-ink'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab project={project} />}
      {tab === 'Milestones' && <MilestonesTab projectId={id} canManage={isOwner || isReviewer} />}
      {tab === 'Tasks' && <TasksTab projectId={id} teamId={project.team?.id} canManage={isOwner || isReviewer} />}
      {tab === 'Documents' && <DocumentsTab projectId={id} />}
      {tab === 'Risks' && <RisksTab projectId={id} />}
      {tab === 'Chat' && <ChatTab projectId={id} />}
    </div>
  );
}

function OverviewTab({ project }) {
  return (
    <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-5 text-sm text-slate-650">
      <p>{project.milestones?.length || 0} milestones · {project._count?.tasks || 0} tasks · {project._count?.documents || 0} documents · {project._count?.risks || 0} risks</p>
      <p className="mt-2">Team members: {project.team?.members?.map((m) => m.name).join(', ') || '—'}</p>
    </div>
  );
}

function MilestonesTab({ projectId, canManage }) {
  const [milestones, setMilestones] = useState([]);
  const [form, setForm] = useState({ title: '', dueDate: '' });

  const load = async () => {
    const res = await api.get(`/projects/${projectId}/milestones`);
    setMilestones(res.data.milestones);
  };
  useEffect(() => { if (projectId) load(); }, [projectId]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${projectId}/milestones`, form);
      setForm({ title: '', dueDate: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create milestone');
    }
  };

  return (
    <div className="space-y-3">
      {canManage && (
        <form onSubmit={create} className="bg-card rounded-xl2 border border-black/5 shadow-card p-4 flex gap-2 flex-wrap">
          <input required placeholder="Milestone title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none min-w-[160px]" />
          <input required type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            className="border border-black/10 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
          <button type="submit" className="bg-primary text-white text-sm font-semibold rounded-lg px-4 py-2">Add</button>
        </form>
      )}
      {milestones.map((m) => (
        <div key={m.id} className="bg-card rounded-xl2 border border-black/5 shadow-card p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-ink text-sm">{m.title}</p>
            <p className="text-xs text-slate-650">Due {new Date(m.dueDate).toLocaleDateString()}</p>
          </div>
          <StatusBadge status={m.status} />
        </div>
      ))}
      {milestones.length === 0 && <p className="text-sm text-slate-650">No milestones yet.</p>}
    </div>
  );
}

function TasksTab({ projectId, canManage }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ title: '', assigneeId: '', priority: 'MEDIUM' });

  const load = async () => {
    const res = await api.get(`/projects/${projectId}/tasks`);
    setTasks(res.data.tasks);
  };
  useEffect(() => { if (projectId) load(); }, [projectId]);
  useEffect(() => {
    api.get('/users', { params: { role: 'EMPLOYEE' } }).then((r) => setMembers(r.data.users)).catch(() => {});
  }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${projectId}/tasks`, { ...form, assigneeId: form.assigneeId || undefined });
      setForm({ title: '', assigneeId: '', priority: 'MEDIUM' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create task');
    }
  };

  const updateStatus = async (taskId, status) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update task');
    }
  };

  return (
    <div className="space-y-3">
      {canManage && (
        <form onSubmit={create} className="bg-card rounded-xl2 border border-black/5 shadow-card p-4 flex gap-2 flex-wrap">
          <input required placeholder="Task title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none min-w-[160px]" />
          <select value={form.assigneeId} onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
            className="border border-black/10 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none">
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            className="border border-black/10 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none">
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button type="submit" className="bg-primary text-white text-sm font-semibold rounded-lg px-4 py-2">Allocate</button>
        </form>
      )}
      {tasks.map((t) => (
        <div key={t.id} className="bg-card rounded-xl2 border border-black/5 shadow-card p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-medium text-ink text-sm">{t.title}</p>
            <p className="text-xs text-slate-650">{t.assignee?.name || 'Unassigned'}</p>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={t.priority} />
            <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)} className="border border-black/10 rounded-lg px-2 py-1 text-xs focus:border-primary outline-none">
              {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
      ))}
      {tasks.length === 0 && <p className="text-sm text-slate-650">No tasks yet.</p>}
    </div>
  );
}

function DocumentsTab({ projectId }) {
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);

  const load = async () => {
    const res = await api.get(`/projects/${projectId}/documents`);
    setDocuments(res.data.documents);
  };
  useEffect(() => { if (projectId) load(); }, [projectId]);

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    try {
      await api.post(`/projects/${projectId}/documents`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFile(null);
      load();
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={upload} className="bg-card rounded-xl2 border border-black/5 shadow-card p-4 flex gap-2 flex-wrap items-center">
        <input type="file" onChange={(e) => setFile(e.target.files[0])} className="text-sm" />
        <button type="submit" className="bg-primary text-white text-sm font-semibold rounded-lg px-4 py-2">Upload</button>
      </form>
      {documents.map((d) => (
        <a key={d.id} href={`${API_BASE_URL}${d.fileUrl}`} target="_blank" rel="noreferrer"
          className="bg-card rounded-xl2 border border-black/5 shadow-card p-4 flex items-center justify-between block hover:border-primary/40">
          <div>
            <p className="font-medium text-ink text-sm">{d.fileName}</p>
            <p className="text-xs text-slate-650">Uploaded by {d.uploadedBy?.name}</p>
          </div>
        </a>
      ))}
      {documents.length === 0 && <p className="text-sm text-slate-650">No documents yet.</p>}
    </div>
  );
}

function RisksTab({ projectId }) {
  const [risks, setRisks] = useState([]);
  const [form, setForm] = useState({ title: '', severity: 'MEDIUM' });

  const load = async () => {
    const res = await api.get(`/projects/${projectId}/risks`);
    setRisks(res.data.risks);
  };
  useEffect(() => { if (projectId) load(); }, [projectId]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${projectId}/risks`, form);
      setForm({ title: '', severity: 'MEDIUM' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not raise risk');
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={create} className="bg-card rounded-xl2 border border-black/5 shadow-card p-4 flex gap-2 flex-wrap">
        <input required placeholder="Risk description" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none min-w-[160px]" />
        <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
          className="border border-black/10 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none">
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="bg-primary text-white text-sm font-semibold rounded-lg px-4 py-2">Raise risk</button>
      </form>
      {risks.map((r) => (
        <div key={r.id} className="bg-card rounded-xl2 border border-black/5 shadow-card p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-ink text-sm">{r.title}</p>
            <p className="text-xs text-slate-650">Raised by {r.raisedBy?.name}</p>
          </div>
          <StatusBadge status={r.status} />
        </div>
      ))}
      {risks.length === 0 && <p className="text-sm text-slate-650">No risks logged.</p>}
    </div>
  );
}

function ChatTab({ projectId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  const load = async () => {
    const res = await api.get('/chat', { params: { projectId } });
    setMessages(res.data.messages);
  };
  useEffect(() => { if (projectId) load(); }, [projectId]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api.post('/chat', { projectId, message: text });
      setText('');
      load();
    } catch (err) {
      toast.error('Could not send message');
    }
  };

  return (
    <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-4 flex flex-col h-96">
      <div className="flex-1 overflow-y-auto space-y-2 mb-3">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-semibold text-ink">{m.sender?.name}: </span>
            <span className="text-slate-650">{m.message}</span>
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-slate-650">No messages yet — say hello.</p>}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message the project team…"
          className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
        <button type="submit" className="bg-primary text-white text-sm font-semibold rounded-lg px-4 py-2">Send</button>
      </form>
    </div>
  );
}

export default function ProjectDetail() {
  return (
    <ProtectedRoute>
      <Layout title="Project">
        <ProjectDetailContent />
      </Layout>
    </ProtectedRoute>
  );
}
