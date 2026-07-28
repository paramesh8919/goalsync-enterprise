const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-650',
  PENDING_APPROVAL: 'bg-warn/15 text-warn',
  PENDING: 'bg-warn/15 text-warn',
  APPROVED: 'bg-accent/15 text-accent',
  ACTIVE: 'bg-accent/15 text-accent',
  REJECTED: 'bg-danger/15 text-danger',
  IN_PROGRESS: 'bg-primary-50 text-primary-600',
  IN_REVIEW: 'bg-primary-50 text-primary-600',
  TODO: 'bg-slate-100 text-slate-650',
  NOT_STARTED: 'bg-slate-100 text-slate-650',
  DONE: 'bg-accent/20 text-accent',
  COMPLETED: 'bg-accent/20 text-accent',
  BLOCKED: 'bg-danger/15 text-danger',
  DELAYED: 'bg-danger/15 text-danger',
  ON_HOLD: 'bg-warn/15 text-warn',
  OVERDUE: 'bg-danger/15 text-danger',
  OPEN: 'bg-warn/15 text-warn',
  MITIGATED: 'bg-accent/15 text-accent',
  ACCEPTED: 'bg-primary-50 text-primary-600',
  CLOSED: 'bg-slate-100 text-slate-650',
};

const PRIORITY_STYLES = {
  LOW: 'bg-slate-100 text-slate-650',
  MEDIUM: 'bg-primary-50 text-primary-600',
  HIGH: 'bg-warn/15 text-warn',
  CRITICAL: 'bg-danger/15 text-danger',
};

function label(str) {
  return str.replace(/_/g, ' ').replace(/\w\S*/g, (t) => t.charAt(0) + t.slice(1).toLowerCase());
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-650'}`}>
      {label(status)}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${PRIORITY_STYLES[priority] || 'bg-slate-100 text-slate-650'}`}>
      {label(priority)}
    </span>
  );
}
