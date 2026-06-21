/** Merge peer presence — keep socket/live online until an explicit offline update. */
export function mergePeerOnline(
  incomingOnline: boolean | undefined,
  existingOnline: boolean | undefined
): boolean {
  if (incomingOnline === true || existingOnline === true) return true;
  return incomingOnline ?? existingOnline ?? false;
}

export function mergeOtherUserPresence<
  T extends { online?: boolean; lastSeenAt?: string | null },
>(incoming: T, existing?: T | null): T {
  if (!existing) return incoming;
  const online = mergePeerOnline(incoming.online, existing.online);
  return {
    ...existing,
    ...incoming,
    online,
    lastSeenAt: online
      ? (incoming.lastSeenAt ?? existing.lastSeenAt)
      : (incoming.lastSeenAt ?? existing.lastSeenAt),
  };
}
