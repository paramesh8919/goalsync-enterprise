const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');

router.use(authenticate);

const SAFE_SELECT = {
  id: true, name: true, email: true, role: true, jobTitle: true, skills: true,
  departmentId: true, managerId: true, teamId: true, isActive: true, approvalStatus: true,
  avatarUrl: true, phone: true, createdAt: true,
};

// GET /api/users — directory, scoped by role per the reporting hierarchy.
// ADMIN/MANAGER: full org visibility. TEAM_LEADER: their team members only.
// EMPLOYEE: read-only info about their own Team Leader / Manager / Admin chain.
router.get('/', async (req, res, next) => {
  try {
    const { role } = req.query;
    let where = { approvalStatus: 'APPROVED' };
    if (role) where.role = role;

    if (req.user.role === 'TEAM_LEADER') {
      where = { ...where, teamId: req.user.teamId, OR: undefined };
      // A leader also needs to browse unassigned employees to build their team.
      if (req.query.assignable === 'true') {
        where = { approvalStatus: 'APPROVED', role: 'EMPLOYEE', teamId: null };
      }
    } else if (req.user.role === 'EMPLOYEE') {
      where = { id: { in: [req.user.id, req.user.managerId, req.user.teamId].filter(Boolean) } };
    }

    const users = await prisma.user.findMany({ where, select: SAFE_SELECT, orderBy: { name: 'asc' } });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/hierarchy — for an Employee/Team Leader: their reporting chain
router.get('/hierarchy', async (req, res, next) => {
  try {
    const teamLeader = req.user.teamId
      ? await prisma.team.findUnique({ where: { id: req.user.teamId }, include: { leader: { select: SAFE_SELECT } } })
      : null;
    const manager = req.user.managerId ? await prisma.user.findUnique({ where: { id: req.user.managerId }, select: SAFE_SELECT }) : null;
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true }, select: SAFE_SELECT });

    res.json({ success: true, hierarchy: { teamLeader: teamLeader?.leader || null, manager, admin } });
  } catch (err) {
    next(err);
  }
});

// POST /api/users — Admin provisions Manager or Admin accounts directly (no approval needed)
router.post('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { name, email, password, role, departmentId, jobTitle } = req.body;
    if (!name || !email || !password || !['MANAGER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ success: false, message: 'name, email, password and role (MANAGER or ADMIN) are required' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role, departmentId, jobTitle, isActive: true, approvalStatus: 'APPROVED' },
      select: SAFE_SELECT,
    });
    await logAudit({ userId: req.user.id, action: 'USER_PROVISIONED', entity: 'User', entityId: user.id, metadata: { role } });
    res.status(201).json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id — admin updates a user's role/manager/status
router.patch('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { role, managerId, isActive, departmentId, jobTitle, skills } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(role && { role }),
        ...(managerId !== undefined && { managerId }),
        ...(isActive !== undefined && { isActive }),
        ...(departmentId !== undefined && { departmentId }),
        ...(jobTitle && { jobTitle }),
        ...(skills !== undefined && { skills }),
      },
      select: SAFE_SELECT,
    });
    await logAudit({ userId: req.user.id, action: 'USER_UPDATED', entity: 'User', entityId: user.id });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
