const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');
const { notify } = require('../services/notification.service');

const SAFE_SELECT = {
  id: true, name: true, email: true, role: true, jobTitle: true, skills: true,
  departmentId: true, managerId: true, approvalStatus: true, isActive: true,
  managerApprovedAt: true, adminApprovedAt: true, rejectionReason: true, createdAt: true,
};

// GET /api/approvals/users — pending registrations awaiting this reviewer's decision
async function listPending(req, res, next) {
  try {
    const where = { approvalStatus: 'PENDING' };
    if (req.user.role === 'MANAGER') where.managerApprovedAt = null;
    if (req.user.role === 'ADMIN') where.adminApprovedAt = null;

    const users = await prisma.user.findMany({
      where,
      select: SAFE_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
}

// POST /api/approvals/users/:id/decision  { decision: 'APPROVED' | 'REJECTED', comment? }
// Only MANAGER or ADMIN may call this; each records their own half of the
// dual-approval. The account activates only once BOTH sides approve.
async function decide(req, res, next) {
  try {
    const { decision, comment } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'decision must be APPROVED or REJECTED' });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    if (target.approvalStatus !== 'PENDING') {
      return res.status(409).json({ success: false, message: `This account is already ${target.approvalStatus.toLowerCase()}` });
    }

    const isManagerReviewer = req.user.role === 'MANAGER';
    const isAdminReviewer = req.user.role === 'ADMIN';
    if (!isManagerReviewer && !isAdminReviewer) {
      return res.status(403).json({ success: false, message: 'Only a Manager or Admin can review registrations' });
    }

    if (decision === 'REJECTED') {
      const updated = await prisma.user.update({
        where: { id: target.id },
        data: {
          approvalStatus: 'REJECTED',
          isActive: false,
          rejectionReason: comment || `Rejected by ${req.user.role}`,
          ...(isManagerReviewer && { managerApprovedBy: req.user.id }),
          ...(isAdminReviewer && { adminApprovedBy: req.user.id }),
        },
        select: SAFE_SELECT,
      });
      await notify({ userId: target.id, type: 'ACCOUNT_REJECTED', message: `Your registration was rejected: ${updated.rejectionReason}` });
      await logAudit({ userId: req.user.id, action: 'USER_REJECTED', entity: 'User', entityId: target.id, metadata: { comment } });
      return res.json({ success: true, user: updated });
    }

    // APPROVED — record this reviewer's half of the decision.
    const data = isManagerReviewer
      ? { managerApprovedBy: req.user.id, managerApprovedAt: new Date() }
      : { adminApprovedBy: req.user.id, adminApprovedAt: new Date() };

    let updated = await prisma.user.update({ where: { id: target.id }, data, select: SAFE_SELECT });

    // Fully approved once both sides are in.
    if (updated.managerApprovedAt && updated.adminApprovedAt) {
      updated = await prisma.user.update({
        where: { id: target.id },
        data: { approvalStatus: 'APPROVED', isActive: true },
        select: SAFE_SELECT,
      });
      await notify({ userId: target.id, type: 'ACCOUNT_APPROVED', message: 'Your account has been fully approved. You can now log in.' });
    }

    await logAudit({ userId: req.user.id, action: 'USER_APPROVAL_RECORDED', entity: 'User', entityId: target.id, metadata: { by: req.user.role } });
    res.json({ success: true, user: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { listPending, decide };
