export const MESSAGE_DELETED_TOMBSTONE = 'این پیام حذف شد';
export const DELETE_FOR_EVERYONE_MS = 48 * 60 * 60 * 1000;

export function parseDeletedFor(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

export function serializeDeletedFor(ids: string[]): string {
  return JSON.stringify([...new Set(ids)]);
}

export function isHiddenForUser(deletedFor: string | null | undefined, userId: string): boolean {
  return parseDeletedFor(deletedFor).includes(userId);
}

export function canDeleteForEveryone(
  senderId: string,
  requesterId: string,
  createdAt: Date,
  now = Date.now()
): boolean {
  if (senderId !== requesterId) return false;
  return now - createdAt.getTime() <= DELETE_FOR_EVERYONE_MS;
}
