const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');

async function canManage(user, project) {
  return ['ADMIN', 'MANAGER'].includes(user.role) || project.createdById === user.id;
}

// POST /api/projects/:projectId/milestones
async function create(req, res, next) {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!(await canManage(req.user, project))) return res.status(403).json({ success: false, message: 'Not authorized' });

    const { title, description, dueDate } = req.body;
    if (!title || !dueDate) return res.status(400).json({ success: false, message: 'Title and dueDate are required' });

    const milestone = await prisma.milestone.create({
      data: { projectId: project.id, title, description, dueDate: new Date(dueDate) },
    });
    await logAudit({ userId: req.user.id, action: 'MILESTONE_CREATED', entity: 'Milestone', entityId: milestone.id });
    res.status(201).json({ success: true, milestone });
  } catch (err) {
    next(err);
  }
}

// GET /api/projects/:projectId/milestones
async function list(req, res, next) {
  try {
    const milestones = await prisma.milestone.findMany({
      where: { projectId: req.params.projectId },
      include: { tasks: true },
      orderBy: { dueDate: 'asc' },
    });
    res.json({ success: true, milestones });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/milestones/:id
async function update(req, res, next) {
  try {
    const milestone = await prisma.milestone.findUnique({ where: { id: req.params.id }, include: { project: true } });
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    if (!(await canManage(req.user, milestone.project))) return res.status(403).json({ success: false, message: 'Not authorized' });

    const { title, description, dueDate, status } = req.body;
    const updated = await prisma.milestone.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(status && { status }),
      },
    });
    res.json({ success: true, milestone: updated });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const milestone = await prisma.milestone.findUnique({ where: { id: req.params.id }, include: { project: true } });
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    if (!(await canManage(req.user, milestone.project))) return res.status(403).json({ success: false, message: 'Not authorized' });

    await prisma.milestone.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Milestone deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, update, remove };
