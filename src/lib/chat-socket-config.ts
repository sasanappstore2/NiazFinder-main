/**
 * Communication Gateway (chat-service, default port 3004).
 *
 * Set in `.env.local`:
 *   NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:3004
 *
 * Nest legacy namespace (only if CHAT_SOCKET_GATEWAY_ENABLED=true on Nest):
 *   NEXT_PUBLIC_CHAT_SOCKET_USE_NEST_NAMESPACE=true
 *
 * Disable realtime:
 *   NEXT_PUBLIC_CHAT_SOCKET_URL=off
 *
 * Dev defaults to disabled unless NEXT_PUBLIC_CHAT_SOCKET_URL is set explicitly.
 */

const SOCKET_PATH = '/socket.io';

export function getChatSocketConfig(): {
  url: string;
  path: string;
  enabled: boolean;
  useNestNamespace: boolean;
} {
  const raw = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL?.trim();
  const useNestNamespace =
    process.env.NEXT_PUBLIC_CHAT_SOCKET_USE_NEST_NAMESPACE === 'true';

  if (raw === 'off' || raw === 'false' || raw === '0') {
    return { url: '', path: SOCKET_PATH, enabled: false, useNestNamespace: false };
  }

  if (raw) {
    return {
      url: raw.replace(/\/$/, ''),
      path: SOCKET_PATH,
      enabled: true,
      useNestNamespace,
    };
  }

  // Dev: opt-in only — avoids auth/connect spam when chat-service is not running.
  if (process.env.NODE_ENV === 'development') {
    return { url: '', path: SOCKET_PATH, enabled: false, useNestNamespace: false };
  }

  if (typeof window !== 'undefined') {
    return {
      url: window.location.origin,
      path: SOCKET_PATH,
      enabled: true,
      useNestNamespace: false,
    };
  }

  return {
    url: 'http://localhost:3004',
    path: SOCKET_PATH,
    enabled: true,
    useNestNamespace: false,
  };
}
