import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

const NO_APPROVAL_ROLES = ['MANAGER', 'ADMIN'];

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE', departmentId: '', jobTitle: '', managerId: '' });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get('/departments').then((r) => setDepartments(r.data.departments)).catch(() => {});
  }, []);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const skipsApproval = NO_APPROVAL_ROLES.includes(form.role);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register({ ...form, departmentId: form.departmentId || undefined, managerId: form.managerId || undefined });
      if (data.token) {
        toast.success(data.message || 'Account created');
        router.push('/dashboard');
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-card rounded-xl2 shadow-card border border-black/5 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold text-ink mb-2">Registration received</h2>
          <p className="text-sm text-slate-650 mb-6">
            Your account will be usable once <strong>both a Manager and the Admin</strong> approve it. You'll get a
            notification (and can sign in) as soon as that happens.
          </p>
          <Link href="/login" className="text-primary font-medium hover:underline text-sm">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#2952E3" />
            <path d="M9 17.5l4.5 4.5L23 11" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-display font-bold text-xl text-ink">GoalSync</span>
        </div>

        <h2 className="font-display text-2xl font-bold text-ink mb-1">Create your account</h2>
        <p className="text-sm text-slate-650 mb-6">
          {skipsApproval
            ? 'Manager and Admin accounts are activated immediately — no approval needed.'
            : 'Employee and Team Leader accounts stay inactive until a Manager and the Admin both approve them.'}
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-650 mb-1.5">Full name</label>
            <input required value={form.name} onChange={update('name')} className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-650 mb-1.5">Email</label>
            <input type="email" required value={form.email} onChange={update('email')} className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-650 mb-1.5">Password</label>
            <input type="password" required minLength={8} value={form.password} onChange={update('password')} className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-650 mb-1.5">Register as</label>
            <select value={form.role} onChange={update('role')} className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none">
              <option value="EMPLOYEE">Employee</option>
              <option value="TEAM_LEADER">Team Leader</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
            {skipsApproval && (
              <p className="text-xs text-accent mt-1.5">No approval required — you'll be signed in right away.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-650 mb-1.5">Job title</label>
            <input value={form.jobTitle} onChange={update('jobTitle')} className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none" />
          </div>
          {departments.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-650 mb-1.5">Department</label>
              <select value={form.departmentId} onChange={update('departmentId')} className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none">
                <option value="">Select department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-600 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 transition-colors">
            {loading ? 'Submitting…' : skipsApproval ? 'Create account' : 'Submit for approval'}
          </button>
        </form>

        <p className="text-sm text-slate-650 mt-6 text-center">
          Already approved? <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
