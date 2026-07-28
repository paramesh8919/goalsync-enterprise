const prisma = require('../config/db');
const { emitToUser } = require('../sockets/socket');

/**
 * Create a notification in the DB and push it instantly over the socket
 * to the target user, so their UI updates without a page refresh.
 */
async function notify({ userId, type = 'SYSTEM', message, link = null }) {
  const notification = await prisma.notification.create({
    data: { userId, type, message, link },
  });

  emitToUser(userId, 'notification:new', notification);
  return notification;
}

async function notifyMany(userIds, { type = 'SYSTEM', message, link = null }) {
  return Promise.all(userIds.map((userId) => notify({ userId, type, message, link })));
}

module.exports = { notify, notifyMany };
