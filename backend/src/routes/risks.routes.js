const express = require('express');
const router = express.Router({ mergeParams: true });
const authenticate = require('../middleware/auth');
const prisma = require('../config/db');
const { notify } = require('../services/notification.service');
const { logAudit } = require('../utils/audit');

router.use(authenticate);

// Nested under /api/projects/:projectId/risks
router.get('/', async (req, res, next) => {
  try {
    const risks = await prisma.risk.findMany({
      where: { projectId: req.params.projectId },
      include: { raisedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, risks });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description, severity, mitigationPlan } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const risk = await prisma.risk.create({
      data: { projectId: project.id, title, description, severity: severity || 'MEDIUM', mitigationPlan, raisedById: req.user.id },
    });

    const reviewers = await prisma.user.findMany({ where: { role: { in: ['MANAGER', 'ADMIN'] } }, select: { id: true } });
    await Promise.all(reviewers.map((r) => notify({ userId: r.id, type: 'RISK_RAISED', message: `Risk raised on "${project.title}": ${title}` })));

    await logAudit({ userId: req.user.id, action: 'RISK_RAISED', entity: 'Risk', entityId: risk.id });
    res.status(201).json({ success: true, risk });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

const standalone = express.Router();
standalone.use(authenticate);
standalone.patch('/:id', async (req, res, next) => {
  try {
    const { status, mitigationPlan, severity } = req.body;
    const risk = await prisma.risk.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(mitigationPlan !== undefined && { mitigationPlan }),
        ...(severity && { severity }),
      },
    });
    res.json({ success: true, risk });
  } catch (err) {
    next(err);
  }
});
module.exports.standalone = standalone;
