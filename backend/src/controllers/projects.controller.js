const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');
const { notify, notifyMany } = require('../services/notification.service');

const INCLUDE = {
  team: { include: { leader: { select: { id: true, name: true } }, members: { select: { id: true, name: true } } } },
  createdBy: { select: { id: true, name: true, email: true } },
  milestones: true,
  _count: { select: { tasks: true, documents: true, risks: true } },
};

// Build the role-scoped WHERE clause used by list() and getOne()'s access check.
async function scopeFor(user) {
  if (['ADMIN', 'MANAGER'].includes(user.role)) return {}; // full visibility
  if (user.role === 'TEAM_LEADER') {
    const team = await prisma.team.findUnique({ where: { leaderId: user.id } });
    return { teamId: team ? team.id : '__none__' };
  }
  // EMPLOYEE — projects belonging to their team
  return { teamId: user.teamId || '__none__' };
}

// POST /api/projects
// Team Leader: drafts a project for their own team (still goes through submit -> dual approval).
// Manager/Admin: can create a project for any team and it goes ACTIVE immediately — they
// already hold the approval authority themselves, so there's nothing left to wait on.
async function create(req, res, next) {
  try {
    const isOversight = ['ADMIN', 'MANAGER'].includes(req.user.role);
    if (!isOversight && req.user.role !== 'TEAM_LEADER') {
      return res.status(403).json({ success: false, message: 'Only a Team Leader, Manager, or Admin can create a project' });
    }

    const { title, description, priority, startDate, dueDate } = req.body;
    if (!title || !description) return res.status(400).json({ success: false, message: 'Title and description are required' });

    let teamId;
    if (isOversight) {
      teamId = req.body.teamId;
      if (!teamId) return res.status(400).json({ success: false, message: 'teamId is required' });
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    } else {
      const team = await prisma.team.findUnique({ where: { leaderId: req.user.id } });
      if (!team) return res.status(400).json({ success: false, message: 'Create your team before creating a project' });
      teamId = team.id;
    }

    const project = await prisma.project.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        teamId,
        createdById: req.user.id,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        // Manager/Admin-created projects skip the DRAFT/approval queue entirely.
        ...(isOversight && {
          status: 'ACTIVE',
          submittedAt: new Date(),
          managerDecision: 'APPROVED',
          managerDecisionById: req.user.id,
          managerDecisionAt: new Date(),
          adminDecision: 'APPROVED',
          adminDecisionById: req.user.id,
          adminDecisionAt: new Date(),
        }),
      },
      include: INCLUDE,
    });

    if (isOversight) {
      const teamMemberIds = await prisma.user.findMany({ where: { teamId }, select: { id: true } });
      await notifyMany(teamMemberIds.map((m) => m.id), {
        type: 'PROJECT_ACTIVATED',
        message: `Project "${project.title}" was created and activated by ${req.user.name || req.user.role}.`,
        link: `/projects/${project.id}`,
      });
    }

    await logAudit({ userId: req.user.id, action: 'PROJECT_CREATED', entity: 'Project', entityId: project.id });
    res.status(201).json({ success: true, project });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const where = await scopeFor(req.user);
    const { status } = req.query;
    const projects = await prisma.project.findMany({
      where: { ...where, ...(status && { status }) },
      include: INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, count: projects.length, projects });
  } catch (err) {
    next(err);
  }
}

// GET /api/projects/pending-approval — reviewer queue for Manager/Admin
async function listPendingApproval(req, res, next) {
  try {
    if (!['MANAGER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const decisionField = req.user.role === 'MANAGER' ? 'managerDecision' : 'adminDecision';
    const projects = await prisma.project.findMany({
      where: { status: 'PENDING_APPROVAL', [decisionField]: 'PENDING' },
      include: INCLUDE,
      orderBy: { submittedAt: 'asc' },
    });
    res.json({ success: true, count: projects.length, projects });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: INCLUDE });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const scope = await scopeFor(req.user);
    const inScope = Object.keys(scope).length === 0 || project.teamId === scope.teamId;
    if (!inScope) return res.status(403).json({ success: false, message: 'Not authorized to view this project' });

    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/projects/:id — Team Leader may edit only while still DRAFT
async function update(req, res, next) {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.createdById !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (project.status !== 'DRAFT') return res.status(409).json({ success: false, message: 'Only draft projects can be edited' });

    const { title, description, priority, startDate, dueDate } = req.body;
    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(priority && { priority }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
      include: INCLUDE,
    });
    res.json({ success: true, project: updated });
  } catch (err) {
    next(err);
  }
}

// POST /api/projects/:id/submit — Team Leader submits DRAFT for dual approval
async function submit(req, res, next) {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.createdById !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (project.status !== 'DRAFT') return res.status(409).json({ success: false, message: 'Only draft projects can be submitted' });

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: { status: 'PENDING_APPROVAL', submittedAt: new Date(), managerDecision: 'PENDING', adminDecision: 'PENDING' },
      include: INCLUDE,
    });

    const reviewers = await prisma.user.findMany({ where: { role: { in: ['MANAGER', 'ADMIN'] }, isActive: true }, select: { id: true } });
    await notifyMany(reviewers.map((r) => r.id), {
      type: 'PROJECT_SUBMITTED',
      message: `Project "${updated.title}" was submitted for approval.`,
      link: `/projects/${updated.id}`,
    });

    await logAudit({ userId: req.user.id, action: 'PROJECT_SUBMITTED', entity: 'Project', entityId: updated.id });
    res.json({ success: true, project: updated });
  } catch (err) {
    next(err);
  }
}

// POST /api/projects/:id/decision  { decision: 'APPROVED' | 'REJECTED', comment }
// Called by a Manager OR an Admin. Activation requires BOTH to approve.
// A single rejection from either side is terminal — the project cannot be resubmitted.
async function decide(req, res, next) {
  try {
    if (!['MANAGER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only a Manager or Admin can decide on a project' });
    }
    const { decision, comment } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'decision must be APPROVED or REJECTED' });
    }

    const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: { team: true } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.status !== 'PENDING_APPROVAL') {
      return res.status(409).json({ success: false, message: `Project is ${project.status.toLowerCase()}, not awaiting approval` });
    }

    const isManager = req.user.role === 'MANAGER';
    const sideData = isManager
      ? { managerDecision: decision, managerDecisionById: req.user.id, managerDecisionAt: new Date(), managerComment: comment || null }
      : { adminDecision: decision, adminDecisionById: req.user.id, adminDecisionAt: new Date(), adminComment: comment || null };

    let updated = await prisma.project.update({ where: { id: project.id }, data: sideData, include: INCLUDE });

    if (decision === 'REJECTED') {
      updated = await prisma.project.update({ where: { id: project.id }, data: { status: 'REJECTED' }, include: INCLUDE });
      await notify({
        userId: project.createdById,
        type: 'PROJECT_REJECTED',
        message: `Project "${project.title}" was rejected by the ${req.user.role}: ${comment || 'no reason given'}.`,
        link: `/projects/${project.id}`,
      });
    } else if (updated.managerDecision === 'APPROVED' && updated.adminDecision === 'APPROVED') {
      updated = await prisma.project.update({ where: { id: project.id }, data: { status: 'ACTIVE' }, include: INCLUDE });
      const teamMemberIds = project.team ? await prisma.user.findMany({ where: { teamId: project.team.id }, select: { id: true } }) : [];
      await notifyMany([project.createdById, ...teamMemberIds.map((m) => m.id)], {
        type: 'PROJECT_ACTIVATED',
        message: `Project "${project.title}" is now active — both Manager and Admin approved it.`,
        link: `/projects/${project.id}`,
      });
    } else {
      await notify({
        userId: project.createdById,
        type: 'PROJECT_APPROVED',
        message: `${req.user.role} approved "${project.title}". Awaiting the other approval before it goes active.`,
        link: `/projects/${project.id}`,
      });
    }

    await logAudit({ userId: req.user.id, action: `PROJECT_${decision}`, entity: 'Project', entityId: project.id, metadata: { comment, by: req.user.role } });
    res.json({ success: true, project: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, listPendingApproval, getOne, update, submit, decide };
