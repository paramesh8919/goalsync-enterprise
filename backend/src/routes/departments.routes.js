const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');

// Listing is intentionally public (no PII) so the registration form can populate it.
router.get('/', async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { users: true, teams: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, departments });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const department = await prisma.department.create({ data: { name, description } });
    await logAudit({ userId: req.user.id, action: 'DEPARTMENT_CREATED', entity: 'Department', entityId: department.id });
    res.status(201).json({ success: true, department });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const department = await prisma.department.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(description !== undefined && { description }) },
    });
    res.json({ success: true, department });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
