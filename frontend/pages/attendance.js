import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import api from '../lib/api';
import toast from 'react-hot-toast';

function AttendanceContent() {
  const [records, setRecords] = useState([]);

  const load = () => api.get('/attendance').then((r) => setRecords(r.data.records));
  useEffect(() => { load(); }, []);

  const checkIn = async () => {
    try { await api.post('/attendance/check-in'); toast.success('Checked in'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not check in'); }
  };
  const checkOut = async () => {
    try { await api.post('/attendance/check-out'); toast.success('Checked out'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not check out'); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-5 flex gap-3">
        <button onClick={checkIn} className="bg-accent text-white text-sm font-semibold rounded-lg px-4 py-2">Check in</button>
        <button onClick={checkOut} className="bg-primary text-white text-sm font-semibold rounded-lg px-4 py-2">Check out</button>
      </div>
      <div className="space-y-2">
        {records.map((r) => (
          <div key={r.id} className="bg-card rounded-xl2 border border-black/5 shadow-card p-4 flex items-center justify-between text-sm">
            <span>{r.user?.name} · {new Date(r.date).toLocaleDateString()}</span>
            <span className="text-slate-650">{r.status}{r.checkIn ? ` · in ${new Date(r.checkIn).toLocaleTimeString()}` : ''}{r.checkOut ? ` · out ${new Date(r.checkOut).toLocaleTimeString()}` : ''}</span>
          </div>
        ))}
        {records.length === 0 && <p className="text-sm text-slate-650">No attendance records yet.</p>}
      </div>
    </div>
  );
}

export default function Attendance() {
  return (
    <ProtectedRoute>
      <Layout title="Attendance">
        <AttendanceContent />
      </Layout>
    </ProtectedRoute>
  );
}
