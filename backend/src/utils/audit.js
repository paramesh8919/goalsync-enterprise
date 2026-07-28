const prisma = require('../config/db');

/**
 * Record an audit trail entry. Never throws — a logging failure should
 * never block the action it's describing.
 */
async function logAudit({ userId = null, action, entity, entityId = null, metadata = null }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId, metadata },
    });
  } catch (err) {
    console.error('[AuditLog] failed to write entry:', err.message);
  }
}

module.exports = { logAudit };
