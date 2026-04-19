import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getCookieToken() {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Lazily initialise (or reuse) the singleton socket BEFORE returning it so the
 * caller receives a valid instance on the very first render. Survives React
 * StrictMode double-mounts and route changes via the window-level cache.
 */
function getOrCreateSocket() {
  if (typeof window === 'undefined') return null;
  if (window.__sakshamSocket) return window.__sakshamSocket;

  const socket = io(API_BASE, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  socket.on('connect', () => {
    const token = getCookieToken();
    if (token) {
      socket.emit('authenticate', { token });
    }
  });

  window.__sakshamSocket = socket;
  return socket;
}

/**
 * Singleton socket hook.
 * Creates one socket connection per browser session (cached on window.__sakshamSocket).
 * Authenticates with the JWT from the HttpOnly cookie (readable via document.cookie).
 * Never disconnects on unmount — the connection is shared across pages.
 */
export default function useSocket() {
  const socketRef = useRef(getOrCreateSocket());

  useEffect(() => {
    // If the connection was already open before this component mounted, the
    // 'connect' handler above has already fired — re-emit authenticate just in
    // case the cookie was set after the initial handshake.
    const socket = socketRef.current;
    if (socket && socket.connected) {
      const token = getCookieToken();
      if (token) socket.emit('authenticate', { token });
    }
    // No teardown — singleton persists for the lifetime of the browser tab.
  }, []);

  return socketRef.current;
}
