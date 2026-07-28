const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');
const { notify } = require('../services/notification.service');

const MEMBER_SELECT = { id: true, name: true, email: true, role: true, jobTitle: true, skills: true };

// POST /api/teams — Team Leaders create their own team. Admin/Manager can create
// a group for any Team Leader (pass leaderId), or lead it themselves if none is given.
async function create(req, res, next) {
  try {
    const { name, description, departmentId, memberIds, leaderId } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Team name is required' });

    const isOversight = ['ADMIN', 'MANAGER'].includes(req.user.role);
    if (!isOversight && req.user.role !== 'TEAM_LEADER') {
      return res.status(403).json({ success: false, message: 'Only a Team Leader, Manager, or Admin can create a team' });
    }

    let resolvedLeaderId = req.user.id;
    if (isOversight && leaderId) {
      const candidate = await prisma.user.findUnique({ where: { id: leaderId } });
      if (!candidate || !['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(candidate.role)) {
        return res.status(400).json({ success: false, message: 'leaderId must belong to a Team Leader, Manager, or Admin' });
      }
      resolvedLeaderId = candidate.id;
    }

    const existing = await prisma.team.findUnique({ where: { leaderId: resolvedLeaderId } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: resolvedLeaderId === req.user.id
          ? 'You already lead a team. Use that team instead of creating another.'
          : 'That person already leads a team.',
      });
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
        departmentId: departmentId || null,
        leaderId: resolvedLeaderId,
        members: Array.isArray(memberIds) && memberIds.length ? { connect: memberIds.map((id) => ({ id })) } : undefined,
      },
      include: { members: { select: MEMBER_SELECT }, leader: { select: MEMBER_SELECT } },
    });

    await logAudit({ userId: req.user.id, action: 'TEAM_CREATED', entity: 'Team', entityId: team.id });
    res.status(201).json({ success: true, team });
  } catch (err) {
    next(err);
  }
}

// GET /api/teams — Admin/Manager: all teams. Team Leader: own team. Employee: their team.
async function list(req, res, next) {
  try {
    let where = {};
    if (req.user.role === 'TEAM_LEADER') where = { leaderId: req.user.id };
    if (req.user.role === 'EMPLOYEE') where = { id: req.user.teamId || '__none__' };

    const teams = await prisma.team.findMany({
      where,
      include: {
        leader: { select: MEMBER_SELECT },
        members: { select: MEMBER_SELECT },
        department: true,
        _count: { select: { projects: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, count: teams.length, teams });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { leader: { select: MEMBER_SELECT }, members: { select: MEMBER_SELECT }, department: true, projects: true },
    });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const canView =
      ['ADMIN', 'MANAGER'].includes(req.user.role) ||
      team.leaderId === req.user.id ||
      team.members.some((m) => m.id === req.user.id);
    if (!canView) return res.status(403).json({ success: false, message: 'Not authorized to view this team' });

    res.json({ success: true, team });
  } catch (err) {
    next(err);
  }
}

function assertLeaderOrOversight(req, team) {
  return ['ADMIN', 'MANAGER'].includes(req.user.role) || team.leaderId === req.user.id;
}

async function update(req, res, next) {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.id } });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    if (!assertLeaderOrOversight(req, team)) return res.status(403).json({ success: false, message: 'Not authorized' });

    const { name, description, departmentId } = req.body;
    const updated = await prisma.team.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(departmentId !== undefined && { departmentId }),
      },
      include: { leader: { select: MEMBER_SELECT }, members: { select: MEMBER_SELECT } },
    });
    res.json({ success: true, team: updated });
  } catch (err) {
    next(err);
  }
}

// POST /api/teams/:id/members  { userId } — skill-based team formation happens client-side
// by filtering the employee directory on `skills`, then adding chosen employees here.
async function addMember(req, res, next) {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.id } });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    if (!assertLeaderOrOversight(req, team)) return res.status(403).json({ success: false, message: 'Not authorized' });

    const { userId } = req.body;
    const employee = await prisma.user.findUnique({ where: { id: userId } });
    if (!employee || employee.role !== 'EMPLOYEE') {
      return res.status(400).json({ success: false, message: 'Only approved Employees can be added to a team' });
    }

    await prisma.user.update({ where: { id: userId }, data: { teamId: team.id } });
    await notify({ userId, type: 'TEAM_ASSIGNED', message: `You have been added to the team "${team.name}".` });
    await logAudit({ userId: req.user.id, action: 'TEAM_MEMBER_ADDED', entity: 'Team', entityId: team.id, metadata: { memberId: userId } });

    res.json({ success: true, message: 'Member added' });
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.id } });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    if (!assertLeaderOrOversight(req, team)) return res.status(403).json({ success: false, message: 'Not authorized' });

    await prisma.user.updateMany({
      where: { id: req.params.userId, teamId: team.id },
      data: { teamId: null },
    });
    await logAudit({ userId: req.user.id, action: 'TEAM_MEMBER_REMOVED', entity: 'Team', entityId: team.id, metadata: { memberId: req.params.userId } });
    res.json({ success: true, message: 'Member removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, update, addMember, removeMember };
