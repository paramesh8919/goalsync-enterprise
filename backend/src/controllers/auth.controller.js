const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { signToken } = require('../utils/jwt');
const { logAudit } = require('../utils/audit');
const { notify } = require('../services/notification.service');

// All four roles can self-register now.
// EMPLOYEE / TEAM_LEADER still go through the dual-approval queue (Manager + Admin).
// MANAGER / ADMIN are activated immediately — no approval needed from anyone.
const SELF_REGISTER_ROLES = ['EMPLOYEE', 'TEAM_LEADER', 'MANAGER', 'ADMIN'];
const NO_APPROVAL_ROLES = ['MANAGER', 'ADMIN'];

async function register(req, res, next) {
  try {
    const { name, email, password, role, departmentId, jobTitle, managerId, skills } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const requestedRole = SELF_REGISTER_ROLES.includes(role) ? role : 'EMPLOYEE';
    const skipApproval = NO_APPROVAL_ROLES.includes(requestedRole);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: requestedRole,
        departmentId: departmentId || null,
        jobTitle,
        // Managers/Admins don't report to another manager by default.
        managerId: !skipApproval ? managerId || null : null,
        skills: Array.isArray(skills) ? skills : [],
        // Employees/Team Leaders start inactive and pending until BOTH a Manager
        // and the Admin approve them. Managers/Admins are active immediately.
        approvalStatus: skipApproval ? 'APPROVED' : 'PENDING',
        isActive: skipApproval ? true : false,
      },
    });

    if (skipApproval) {
      await logAudit({ action: 'USER_REGISTERED', entity: 'User', entityId: user.id, metadata: { role: requestedRole, autoApproved: true } });

      const token = signToken({ id: user.id, role: user.role });
      const { password: _pw, ...safeUser } = user;
      return res.status(201).json({
        success: true,
        message: `Account created as ${requestedRole === 'ADMIN' ? 'Admin' : 'Manager'}. You're signed in — no approval needed.`,
        token,
        user: safeUser,
      });
    }

    // Notify every active Manager and Admin that a new account needs review.
    const reviewers = await prisma.user.findMany({
      where: { role: { in: ['MANAGER', 'ADMIN'] }, isActive: true },
      select: { id: true },
    });
    await Promise.all(
      reviewers.map((r) =>
        notify({
          userId: r.id,
          type: 'SYSTEM',
          message: `${name} registered as ${requestedRole} and is awaiting your approval.`,
          link: '/approvals',
        })
      )
    );

    await logAudit({ action: 'USER_REGISTERED', entity: 'User', entityId: user.id, metadata: { role: requestedRole } });

    const { password: _pw, ...safeUser } = user;
    res.status(201).json({
      success: true,
      message: 'Registration received. Your account will be usable once a Manager and Admin approve it.',
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      if (user.approvalStatus === 'REJECTED') {
        return res.status(403).json({
          success: false,
          message: `Your registration was rejected.${user.rejectionReason ? ` Reason: ${user.rejectionReason}` : ''}`,
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Your account is awaiting approval from a Manager and Admin.',
      });
    }

    const token = signToken({ id: user.id, role: user.role });
    const { password: _pw, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  const { password: _pw, ...safeUser } = req.user;
  res.json({ success: true, user: safeUser });
}

module.exports = { register, login, me };
