const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const prisma = require('../config/db');

router.use(authenticate);

// GET /api/dashboard/summary — stats scoped to the requesting user's role
router.get('/summary', async (req, res, next) => {
  try {
    const user = req.user;
    let projectWhere = {};

    if (user.role === 'TEAM_LEADER') {
      const team = await prisma.team.findUnique({ where: { leaderId: user.id } });
      projectWhere = { teamId: team ? team.id : '__none__' };
    } else if (user.role === 'EMPLOYEE') {
      projectWhere = { teamId: user.teamId || '__none__' };
    }
    // MANAGER / ADMIN: org-wide, no filter

    const [totalProjects, byStatus, tasksTotal, tasksDone, overdueTasks] = await Promise.all([
      prisma.project.count({ where: projectWhere }),
      prisma.project.groupBy({ by: ['status'], where: projectWhere, _count: true }),
      prisma.task.count({ where: { project: projectWhere } }),
      prisma.task.count({ where: { project: projectWhere, status: 'DONE' } }),
      prisma.task.count({ where: { project: projectWhere, status: { not: 'DONE' }, dueDate: { lt: new Date() } } }),
    ]);

    let myTasks = null;
    if (user.role === 'EMPLOYEE') {
      myTasks = {
        total: await prisma.task.count({ where: { assigneeId: user.id } }),
        done: await prisma.task.count({ where: { assigneeId: user.id, status: 'DONE' } }),
        overdue: await prisma.task.count({ where: { assigneeId: user.id, status: { not: 'DONE' }, dueDate: { lt: new Date() } } }),
      };
    }

    res.json({
      success: true,
      summary: {
        totalProjects,
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
        tasksTotal,
        tasksDone,
        overdueTasks,
        completionRate: tasksTotal ? Math.round((tasksDone / tasksTotal) * 100) : 0,
        myTasks,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/workload — tasks per assignee, for Manager/Admin (org) or Team Leader (own team)
router.get('/workload', async (req, res, next) => {
  try {
    let assigneeWhere = {};
    if (req.user.role === 'TEAM_LEADER') {
      assigneeWhere = { teamId: req.user.teamId };
    } else if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', ...assigneeWhere },
      select: {
        id: true,
        name: true,
        _count: { select: { tasksAssigned: true } },
      },
    });

    const workload = await Promise.all(
      employees.map(async (e) => ({
        employee: { id: e.id, name: e.name },
        totalTasks: e._count.tasksAssigned,
        openTasks: await prisma.task.count({ where: { assigneeId: e.id, status: { not: 'DONE' } } }),
        overdueTasks: await prisma.task.count({ where: { assigneeId: e.id, status: { not: 'DONE' }, dueDate: { lt: new Date() } } }),
      }))
    );

    res.json({ success: true, workload });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/leadership — Manager/Admin only: evaluate Team Leaders by team output
router.get('/leadership', requireRole('MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        leader: { select: { id: true, name: true } },
        projects: { select: { id: true, status: true } },
        members: { select: { id: true } },
      },
    });

    const leadership = teams.map((t) => {
      const active = t.projects.filter((p) => p.status === 'ACTIVE').length;
      const rejected = t.projects.filter((p) => p.status === 'REJECTED').length;
      return {
        team: t.name,
        leader: t.leader,
        memberCount: t.members.length,
        totalProjects: t.projects.length,
        activeProjects: active,
        rejectedProjects: rejected,
        approvalRate: t.projects.length ? Math.round((active / t.projects.length) * 100) : 0,
      };
    });

    res.json({ success: true, leadership });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/org-report — Admin-only org-wide report (also used by the Excel/PDF export)
router.get('/org-report', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({ include: { _count: { select: { users: true } } } });
    const projectsByStatus = await prisma.project.groupBy({ by: ['status'], _count: true });
    const tasksByStatus = await prisma.task.groupBy({ by: ['status'], _count: true });

    res.json({ success: true, departments, projectsByStatus, tasksByStatus });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
