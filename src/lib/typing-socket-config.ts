/**
 * Socket.io intake-typing service (Nest backend, default port 4000).
 *
 * `.env.local`:
 *   NEXT_PUBLIC_TYPING_WS_URL=http://localhost:4000
 *   NEXT_PUBLIC_TYPING_WS_URL=off   — disable WS, REST fallback only
 */

const SOCKET_PATH = '/socket.io';

export function getTypingSocketConfig(): {
  url: string;
  path: string;
  enabled: boolean;
} {
  const raw = process.env.NEXT_PUBLIC_TYPING_WS_URL?.trim();

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
