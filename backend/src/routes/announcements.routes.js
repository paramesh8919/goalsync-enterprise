const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const prisma = require('../config/db');
const { notify } = require('../services/notification.service');
const { logAudit } = require('../utils/audit');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      include: { postedBy: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, announcements });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('MANAGER', 'ADMIN'), async (req, res, next) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ success: false, message: 'Title and body are required' });

    const announcement = await prisma.announcement.create({
      data: { title, body, postedById: req.user.id },
      include: { postedBy: { select: { id: true, name: true, role: true } } },
    });

    const everyone = await prisma.user.findMany({ where: { isActive: true, id: { not: req.user.id } }, select: { id: true } });
    await Promise.all(everyone.map((u) => notify({ userId: u.id, type: 'ANNOUNCEMENT', message: `New announcement: ${title}` })));

    await logAudit({ userId: req.user.id, action: 'ANNOUNCEMENT_POSTED', entity: 'Announcement', entityId: announcement.id });
    res.status(201).json({ success: true, announcement });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
