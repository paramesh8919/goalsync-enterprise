const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const prisma = require('../config/db');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const events = await prisma.calendarEvent.findMany({
      where: {
        ...(from && to ? { startAt: { gte: new Date(from) }, endAt: { lte: new Date(to) } } : {}),
      },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { startAt: 'asc' },
    });
    res.json({ success: true, events });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description, startAt, endAt, projectId } = req.body;
    if (!title || !startAt || !endAt) {
      return res.status(400).json({ success: false, message: 'title, startAt and endAt are required' });
    }
    const event = await prisma.calendarEvent.create({
      data: { title, description, startAt: new Date(startAt), endAt: new Date(endAt), projectId: projectId || null, createdById: req.user.id },
    });
    res.status(201).json({ success: true, event });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.calendarEvent.deleteMany({ where: { id: req.params.id, createdById: req.user.id } });
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
