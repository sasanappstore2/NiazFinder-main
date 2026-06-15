export function getChatServiceInternalUrl(): string {
  const raw =
    process.env.CHAT_SERVICE_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_CHAT_SOCKET_URL?.trim();
  if (!raw || raw === 'off') return 'http://127.0.0.1:3004';
  return raw.replace(/\/$/, '');
}

/** Live socket presence from chat-service (authoritative). */
export async function fetchLivePresence(
  userIds: string[]
): Promise<Record<string, boolean>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return {};

  const url = `${getChatServiceInternalUrl()}/presence?userIds=${encodeURIComponent(unique.join(','))}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    });
    if (!res.ok) return {};
    const json = (await res.json()) as { presence?: Record<string, boolean> };
    return json.presence ?? {};
  } catch {
    return {};
  }
}

export async function withLivePresence<T extends { id: string; online?: boolean }>(
  users: T[]
): Promise<(T & { online: boolean })[]> {
  const presence = await fetchLivePresence(users.map((u) => u.id));
  return users.map((user) => ({
    ...user,
    online: presence[user.id] ?? false,
  }));
}
