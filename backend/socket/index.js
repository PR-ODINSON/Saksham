import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, School } from '../models/index.js';

let io = null;

/**
 * Initialise Socket.IO on the HTTP server.
 * Call once after mongoose.connect resolves.
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // Client must authenticate immediately after connect
    socket.on('authenticate', async ({ token } = {}) => {
      if (!token) {
        socket.emit('auth_error', { message: 'No token provided' });
        socket.disconnect(true);
        return;
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        socket.emit('auth_error', { message: 'Invalid token' });
        socket.disconnect(true);
        return;
      }

      const { id, role } = decoded;

      try {
        // Join role-based rooms
        if (role === 'peon' || role === 'principal') {
          // Join school room — use schoolId from User document
          const user = await User.findById(id).lean();
          if (user?.schoolId) {
            socket.join(`school:${user.schoolId}`);
          }
        }

        if (role === 'deo') {
          const user = await User.findById(id).lean();
          const district = user?.district;
          if (district) {
            socket.join(`deo:${district}`);
          }
        }

        if (role === 'contractor') {
          socket.join(`contractor:${id}`);
        }

        if (role === 'admin') {
          socket.join('admin');
        }

        socket.emit('authenticated', { userId: id, role });
      } catch (err) {
        console.error('[Socket auth error]', err.message);
        socket.emit('auth_error', { message: 'Authentication failed' });
        socket.disconnect(true);
      }
    });
  });

  console.log('✓ Socket.IO initialised');
  return io;
}

/**
 * Returns the cached io instance.
 * Returns null (does not throw) when called before initSocket — callers must guard.
 */
export function getIO() {
  return io;
}
