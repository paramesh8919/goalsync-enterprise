export default function StatCard({ label, value, accent, sub }) {
  return (
    <div className="bg-card rounded-xl2 border border-black/5 shadow-card p-5">
      <p className="text-xs font-medium text-slate-650 uppercase tracking-wide">{label}</p>
      <p className={`font-display text-3xl font-bold mt-2 ${accent || 'text-ink'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-650 mt-1">{sub}</p>}
    </div>
  );
}
