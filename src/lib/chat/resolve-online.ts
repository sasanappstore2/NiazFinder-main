/** Treat recent activity as reachable when live socket presence is unavailable. */
const RECENT_ACTIVE_MS = 15 * 60 * 1000;

export function isRecentlyActive(
  lastSeenAt: string | Date | null | undefined
): boolean {
  if (!lastSeenAt) return false;
  const ts =
    typeof lastSeenAt === 'string' ? Date.parse(lastSeenAt) : lastSeenAt.getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < RECENT_ACTIVE_MS;
}

/**
 * Resolve whether a user should appear online / reachable.
 * - Live socket map is authoritative when present.
 * - When chat-service is unreachable, fall back to DB + recent lastSeenAt.
 */
export function resolveUserOnline(
  userId: string,
  livePresence: Record<string, boolean>,
  fallback: { online?: boolean; lastSeenAt?: string | null }
): boolean {
  const live = livePresence[userId];
  if (live === true) return true;
  if (live === false) return false;
  if (fallback.online === true) return true;
  return isRecentlyActive(fallback.lastSeenAt);
}
