const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');
const { notify } = require('../services/notification.service');

const INCLUDE = { assignee: { select: { id: true, name: true, email: true } }, milestone: true };

async function canManage(user, project) {
  return ['ADMIN', 'MANAGER'].includes(user.role) || project.createdById === user.id;
}

// POST /api/projects/:projectId/tasks — Team Leader allocates a task
async function create(req, res, next) {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!(await canManage(req.user, project))) return res.status(403).json({ success: false, message: 'Not authorized' });

    const { title, description, priority, assigneeId, milestoneId, dueDate } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        projectId: project.id,
        assigneeId: assigneeId || null,
        milestoneId: milestoneId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: INCLUDE,
    });

    if (assigneeId) {
      await notify({ userId: assigneeId, type: 'TASK_ASSIGNED', message: `You were assigned the task "${title}".`, link: `/projects/${project.id}` });
    }
    await logAudit({ userId: req.user.id, action: 'TASK_CREATED', entity: 'Task', entityId: task.id });
    res.status(201).json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

// GET /api/projects/:projectId/tasks
async function list(req, res, next) {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.projectId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
}

// GET /api/tasks/my — an Employee's own task list, across all projects
async function myTasks(req, res, next) {
  try {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: req.user.id },
      include: { project: { select: { id: true, title: true, status: true } }, milestone: true },
      orderBy: { dueDate: 'asc' },
    });
    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/tasks/:id — Team Leader/Admin/Manager can edit anything;
// the assignee may only update status/progress on their own task.
async function update(req, res, next) {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: { project: true } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const isManagerLike = await canManage(req.user, task.project);
    const isAssignee = task.assigneeId === req.user.id;
    if (!isManagerLike && !isAssignee) return res.status(403).json({ success: false, message: 'Not authorized' });

    const body = req.body;
    const data = isManagerLike
      ? {
          ...(body.title && { title: body.title }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.priority && { priority: body.priority }),
          ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
          ...(body.milestoneId !== undefined && { milestoneId: body.milestoneId }),
          ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
          ...(body.status && { status: body.status }),
          ...(body.progress !== undefined && { progress: body.progress }),
        }
      : {
          ...(body.status && { status: body.status }),
          ...(body.progress !== undefined && { progress: body.progress }),
        };

    const updated = await prisma.task.update({ where: { id: req.params.id }, data, include: INCLUDE });
    res.json({ success: true, task: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, myTasks, update };
