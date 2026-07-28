const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const prisma = require('../config/db');
const { notify } = require('../services/notification.service');
const { logAudit } = require('../utils/audit');

router.use(authenticate);

// GET /api/leave — own requests, or (Team Leader/Manager/Admin) requests they can decide on
router.get('/', async (req, res, next) => {
  try {
    let where = { userId: req.user.id };
    if (req.user.role === 'TEAM_LEADER') {
      where = { user: { teamId: req.user.teamId } };
    } else if (['MANAGER', 'ADMIN'].includes(req.user.role)) {
      where = {};
    }
    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, leaveRequests });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    if (!type || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'type, startDate and endDate are required' });
    }
    const leave = await prisma.leaveRequest.create({
      data: { userId: req.user.id, type, startDate: new Date(startDate), endDate: new Date(endDate), reason },
    });

    const approverWhere = req.user.teamId
      ? { role: 'TEAM_LEADER', ledTeam: { id: req.user.teamId } }
      : { role: { in: ['MANAGER', 'ADMIN'] } };
    const approvers = await prisma.user.findMany({ where: approverWhere, select: { id: true } });
    await Promise.all(approvers.map((a) => notify({ userId: a.id, type: 'LEAVE_REQUESTED', message: `${req.user.name} requested ${type} leave.` })));

    res.status(201).json({ success: true, leaveRequest: leave });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/decision', async (req, res, next) => {
  try {
    const { decision, comment } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'decision must be APPROVED or REJECTED' });
    }
    const leave = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: { status: decision, decidedById: req.user.id, decidedAt: new Date(), comment },
    });
    await notify({ userId: leave.userId, type: 'LEAVE_DECIDED', message: `Your leave request was ${decision.toLowerCase()}.` });
    await logAudit({ userId: req.user.id, action: `LEAVE_${decision}`, entity: 'LeaveRequest', entityId: leave.id });
    res.json({ success: true, leaveRequest: leave });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
