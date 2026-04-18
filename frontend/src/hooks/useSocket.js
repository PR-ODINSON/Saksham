import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getCookieToken() {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Singleton socket hook.
 * Creates one socket connection per browser session (stored on window.__sakshamSocket).
 * Authenticates with the JWT from the HttpOnly cookie (visible via document.cookie).
 */
export default function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    // Reuse existing connection if already initialised
    if (window.__sakshamSocket && window.__sakshamSocket.connected) {
      socketRef.current = window.__sakshamSocket;
      return;
    }

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
    socketRef.current = socket;

    return () => {
      // Do not disconnect on unmount — keep singleton alive
    };
  }, []);

  return socketRef.current;
}
