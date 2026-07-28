import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';

function TeamDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [team, setTeam] = useState(null);
  const [assignable, setAssignable] = useState([]);
  const [skillFilter, setSkillFilter] = useState('');

  const load = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/teams/${id}`);
      setTeam(res.data.team);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load team');
    }
  };

  const loadAssignable = async () => {
    try {
      const res = await api.get('/users', { params: { assignable: true } });
      setAssignable(res.data.users);
    } catch (e) {
      /* team leader only endpoint */
    }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (team && team.leaderId === user.id) loadAssignable(); }, [team]);

  if (!team) return <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />;

  const isLeader = team.leaderId === user.id;
  const filtered = skillFilter
    ? assignable.filter((e) => e.skills?.some((s) => s.toLowerCase().includes(skillFilter.toLowerCase())))
    : assignable;

  const addMember = async (userId) => {
    try {
      await api.post(`/teams/${id}/members`, { userId });
      toast.success('Member added');
      load();
      loadAssignable();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add member');
    }
  };

  const removeMember = async (userId) => {
    try {
      await api.delete(`/teams/${id}/members/${userId}`);
      toast.success('Member removed');
      load();
      loadAssignable();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove member');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-5">
        <p className="font-display text-lg font-bold text-ink">{team.name}</p>
        <p className="text-sm text-slate-650 mt-1">{team.description || 'No description.'}</p>
        <p className="text-sm text-slate-650 mt-2">Led by {team.leader?.name}</p>
      </div>

      <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-5">
        <p className="font-display font-semibold text-sm mb-4">Members ({team.members?.length || 0})</p>
        <div className="space-y-2">
          {team.members?.map((m) => (
            <div key={m.id} className="flex items-center justify-between bg-surface rounded-lg px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-ink">{m.name}</span>
                {m.skills?.length > 0 && <span className="text-slate-650"> · {m.skills.join(', ')}</span>}
              </div>
              {isLeader && (
                <button onClick={() => removeMember(m.id)} className="text-danger text-xs font-semibold hover:underline">Remove</button>
              )}
            </div>
          ))}
          {(!team.members || team.members.length === 0) && <p className="text-sm text-slate-650">No members yet.</p>}
        </div>
      </div>

      {isLeader && (
        <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-5">
          <p className="font-display font-semibold text-sm mb-3">Add members — skill-based team formation</p>
          <input
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            placeholder="Filter unassigned employees by skill (e.g. React, SQL)"
            className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-sm focus:border-primary outline-none mb-3"
          />
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {filtered.map((e) => (
              <div key={e.id} className="flex items-center justify-between bg-surface rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-ink">{e.name}</span>
                  {e.skills?.length > 0 && <span className="text-slate-650"> · {e.skills.join(', ')}</span>}
                </div>
                <button onClick={() => addMember(e.id)} className="text-primary text-xs font-semibold hover:underline">Add</button>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-slate-650">No unassigned employees match.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamDetail() {
  return (
    <ProtectedRoute>
      <Layout title="Team">
        <TeamDetailContent />
      </Layout>
    </ProtectedRoute>
  );
}
