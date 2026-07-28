const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const prisma = require('../config/db');
const { emitToAll } = require('../sockets/socket');

router.use(authenticate);

// GET /api/chat?projectId=... or ?teamId=...
router.get('/', async (req, res, next) => {
  try {
    const { projectId, teamId } = req.query;
    if (!projectId && !teamId) return res.status(400).json({ success: false, message: 'projectId or teamId is required' });

    const messages = await prisma.chatMessage.findMany({
      where: projectId ? { projectId } : { teamId },
      include: { sender: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    res.json({ success: true, messages });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat — send a message; broadcast it live over socket.io on "chat:message"
router.post('/', async (req, res, next) => {
  try {
    const { projectId, teamId, message } = req.body;
    if (!message || (!projectId && !teamId)) {
      return res.status(400).json({ success: false, message: 'message and (projectId or teamId) are required' });
    }
    const chatMessage = await prisma.chatMessage.create({
      data: { projectId: projectId || null, teamId: teamId || null, senderId: req.user.id, message },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });
    emitToAll('chat:message', chatMessage); // clients filter by projectId/teamId
    res.status(201).json({ success: true, chatMessage });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
