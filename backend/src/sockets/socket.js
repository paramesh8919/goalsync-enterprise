const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  // Authenticate socket connections using the same JWT used for REST calls
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = verifyToken(token);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    // Each user joins a private room keyed by their own id -> lets us push
    // targeted notifications, and a role room for broadcast-style updates.
    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.userRole}`);

    socket.on('disconnect', () => {
      // no-op, room membership is cleaned up automatically
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

/** Emit an event to one specific user */
function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

/** Emit an event to everyone with a given role (e.g. all ADMIN or MANAGER users) */
function emitToRole(role, event, payload) {
  if (!io) return;
  io.to(`role:${role}`).emit(event, payload);
}

/** Emit to all connected clients */
function emitToAll(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

module.exports = { initSocket, getIO, emitToUser, emitToRole, emitToAll };
