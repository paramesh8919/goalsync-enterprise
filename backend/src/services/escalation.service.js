const cron = require('node-cron');
const prisma = require('../config/db');
const { notify, notifyMany } = require('./notification.service');
const { emitToRole } = require('../sockets/socket');
const { logAudit } = require('../utils/audit');

const THRESHOLD_DAYS = Number(process.env.ESCALATION_THRESHOLD_DAYS || 3);
const DUE_SOON_DAYS = Number(process.env.DUE_SOON_REMINDER_DAYS || 2);

/**
 * Escalation Engine — runs on a cron schedule and performs three jobs:
 * 1. Escalate projects stuck in PENDING_APPROVAL beyond the threshold to Admins.
 * 2. Send "due soon" reminders to assignees whose task deadline is approaching.
 * 3. Flag milestones that are now overdue as DELAYED.
 */
async function runEscalationSweep() {
  const now = new Date();
  const results = { escalatedProjects: 0, taskReminders: 0, delayedMilestones: 0 };

  // --- 1. Escalate stale pending-approval projects ---
  const staleCutoff = new Date(now.getTime() - THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  const stalePending = await prisma.project.findMany({
    where: { status: 'PENDING_APPROVAL', submittedAt: { lt: staleCutoff } },
  });
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
  for (const project of stalePending) {
    await notifyMany(admins.map((a) => a.id), {
      type: 'SYSTEM',
      message: `Project "${project.title}" has been pending approval for over ${THRESHOLD_DAYS} day(s).`,
      link: `/projects/${project.id}`,
    });
    results.escalatedProjects++;
  }

  // --- 2. Due-soon task reminders ---
  const reminderWindowEnd = new Date(now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);
  const dueSoonTasks = await prisma.task.findMany({
    where: { dueDate: { gte: now, lte: reminderWindowEnd }, status: { not: 'DONE' }, assigneeId: { not: null } },
  });
  for (const task of dueSoonTasks) {
    await notify({ userId: task.assigneeId, type: 'MILESTONE_DUE', message: `Task "${task.title}" is due within ${DUE_SOON_DAYS} day(s).` });
    results.taskReminders++;
  }

  // --- 3. Flag overdue milestones ---
  const overdueMilestones = await prisma.milestone.findMany({
    where: { dueDate: { lt: now }, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } },
  });
  for (const m of overdueMilestones) {
    await prisma.milestone.update({ where: { id: m.id }, data: { status: 'DELAYED' } });
    results.delayedMilestones++;
  }

  emitToRole('ADMIN', 'escalation:sweep-complete', { ...results, ranAt: now });
  await logAudit({ action: 'ESCALATION_SWEEP', entity: 'System', metadata: results });
  console.log('[Escalation Engine] Sweep complete:', results);
  return results;
}

function startEscalationEngine() {
  const schedule = process.env.ESCALATION_CRON || '0 * * * *'; // default: every hour
  cron.schedule(schedule, () => {
    runEscalationSweep().catch((err) => console.error('[Escalation Engine] Error:', err));
  });
  console.log(`[Escalation Engine] Scheduled with cron pattern "${schedule}"`);
}

module.exports = { startEscalationEngine, runEscalationSweep };
