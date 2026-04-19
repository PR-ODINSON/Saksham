import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, School } from '../models/index.js';

let io = null;

/**
 * Parse the `token` cookie out of the raw `Cookie` header sent on the websocket
 * handshake. Returns null if missing.
 */
function tokenFromHandshake(socket) {
  const auth = socket.handshake?.auth?.token;
  if (auth) return auth;
  const raw = socket.handshake?.headers?.cookie;
  if (!raw) return null;
  const m = raw.match(/(?:^|;\s*)token=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Resolve identity → join role-scoped rooms → emit `authenticated`.
 * Returns true on success so callers can ignore the duplicate explicit
 * `authenticate` event when handshake auth already succeeded.
 */
async function authoriseSocket(socket, token) {
  if (!token) {
    socket.emit('auth_error', { message: 'No token provided' });
    return false;
  }
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    socket.emit('auth_error', { message: 'Invalid token' });
    return false;
  }
  const { id, role } = decoded;
  try {
    if (role === 'peon' || role === 'principal') {
      const user = await User.findById(id).lean();
      if (user?.schoolId) socket.join(`school:${user.schoolId}`);
    }
    if (role === 'deo') {
      const user = await User.findById(id).lean();
      if (user?.district) socket.join(`deo:${user.district}`);
    }
    if (role === 'contractor') {
      socket.join(`contractor:${id}`);
    }
    if (role === 'admin') {
      socket.join('admin');
    }
    socket.data.userId = id;
    socket.data.role = role;
    socket.emit('authenticated', { userId: id, role });
    return true;
  } catch (err) {
    console.error('[Socket auth error]', err.message);
    socket.emit('auth_error', { message: 'Authentication failed' });
    return false;
  }
}

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

  io.on('connection', async (socket) => {
    // Auto-authenticate from the httpOnly auth cookie carried on the handshake
    // (or from socket.handshake.auth.token), so the browser doesn't need to
    // read the cookie via JS to talk to us.
    const handshakeToken = tokenFromHandshake(socket);
    let authed = false;
    if (handshakeToken) {
      authed = await authoriseSocket(socket, handshakeToken);
    }

    // Backwards-compatible explicit handshake — still honoured for clients that
    // emit `authenticate` with a token after connect.
    socket.on('authenticate', async ({ token } = {}) => {
      if (authed) return;
      authed = await authoriseSocket(socket, token);
      if (!authed) socket.disconnect(true);
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
