/**
 * Socket.io chat service URL (Nest backend, default port 4000).
 *
 * Set in `.env.local`:
 *   NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:4000
 *
 * Disable realtime (no console spam):
 *   NEXT_PUBLIC_CHAT_SOCKET_URL=off
 */

const SOCKET_PATH = '/';

export function getChatSocketConfig(): {
  url: string;
  path: string;
  enabled: boolean;
} {
  const raw = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL?.trim();

  if (raw === 'off' || raw === 'false' || raw === '0') {
    return { url: '', path: SOCKET_PATH, enabled: false };
  }

  if (raw) {
    return { url: raw.replace(/\/$/, ''), path: SOCKET_PATH, enabled: true };
  }

  if (process.env.NODE_ENV === 'development') {
    return { url: 'http://localhost:4000', path: SOCKET_PATH, enabled: true };
  }

  if (typeof window !== 'undefined') {
    return { url: window.location.origin, path: SOCKET_PATH, enabled: true };
  }

  return { url: 'http://localhost:4000', path: SOCKET_PATH, enabled: true };
}
