import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('employee@goalsync.com');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 bg-ink text-white flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#2952E3" />
            <path d="M9 17.5l4.5 4.5L23 11" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-display font-bold text-xl">GoalSync</span>
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight mb-4">
            Projects move faster<br />when approvals are transparent.
          </h1>
          <p className="text-white/60 max-w-md">
            Four-level role hierarchy, dual-approval workflows, and real-time dashboards —
            everything an enterprise team needs to plan, track, and ship with accountability.
          </p>
        </div>
        <p className="text-xs text-white/40">GoalSync Enterprise Platform</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#2952E3" />
              <path d="M9 17.5l4.5 4.5L23 11" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-display font-bold text-xl text-ink">GoalSync</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-ink mb-1">Welcome back</h2>
          <p className="text-sm text-slate-650 mb-6">Sign in to continue to your dashboard.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-650 mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-650 mb-1.5">Password</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary-600 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-slate-650 mt-6 bg-primary-50 rounded-lg p-3">
            Demo accounts (password <code className="font-mono">Password123!</code>): <br />
            admin@goalsync.com · manager@goalsync.com · lead@goalsync.com · employee@goalsync.com
          </p>

          <p className="text-sm text-slate-650 mt-6 text-center">
            No account? <Link href="/register" className="text-primary font-medium hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
