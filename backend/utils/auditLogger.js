import { AuditLog } from '../models/index.js';

/**
 * Fire-and-forget audit log writer.
 * Call AFTER the primary DB write succeeds.
 */
export function writeAuditLog(req, action, targetCollection, targetId, metadata = {}) {
  const actorId   = req.user?._id || req.user?.id;
  const actorRole = req.user?.role;
  const ip        = req.ip;
  const userAgent = req.headers?.['user-agent'];

  AuditLog.create({ actorId, actorRole, action, targetCollection, targetId, metadata, ip, userAgent })
    .then(async (log) => {
      try {
        // Lazy import to avoid circular dependency with socket/index.js
        const { getIO } = await import('../socket/index.js');
        const io = getIO();
        if (io) {
          io.to('admin').emit('audit:event', { log });
        }
      } catch (_err) {
        // Socket not yet initialised — silently skip
      }
    })
    .catch((err) => {
      console.error('[AuditLog error]', err.message);
    });
}
