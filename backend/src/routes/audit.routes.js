const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const prisma = require('../config/db');

router.use(authenticate, requireRole('ADMIN'));

router.get('/', async (req, res, next) => {
  try {
    const { entity, userId } = req.query;
    const logs = await prisma.auditLog.findMany({
      where: { ...(entity && { entity }), ...(userId && { userId }) },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
