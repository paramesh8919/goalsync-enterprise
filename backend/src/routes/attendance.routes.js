const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const prisma = require('../config/db');

router.use(authenticate);

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// POST /api/attendance/check-in
router.post('/check-in', async (req, res, next) => {
  try {
    const date = startOfDay(new Date());
    const record = await prisma.attendance.upsert({
      where: { userId_date: { userId: req.user.id, date } },
      update: { checkIn: new Date(), status: 'PRESENT' },
      create: { userId: req.user.id, date, checkIn: new Date(), status: 'PRESENT' },
    });
    res.json({ success: true, attendance: record });
  } catch (err) {
    next(err);
  }
});

// POST /api/attendance/check-out
router.post('/check-out', async (req, res, next) => {
  try {
    const date = startOfDay(new Date());
    const record = await prisma.attendance.update({
      where: { userId_date: { userId: req.user.id, date } },
      data: { checkOut: new Date() },
    });
    res.json({ success: true, attendance: record });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance — own history, or team/org view for leaders/managers/admins
router.get('/', async (req, res, next) => {
  try {
    let where = { userId: req.user.id };
    if (req.user.role === 'TEAM_LEADER') where = { user: { teamId: req.user.teamId } };
    if (['MANAGER', 'ADMIN'].includes(req.user.role)) where = {};

    const records = await prisma.attendance.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
      take: 200,
    });
    res.json({ success: true, records });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
