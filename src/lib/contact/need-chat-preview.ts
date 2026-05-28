const STORAGE_PREFIX = 'need-chat-preview:';

export interface NeedChatPreview {
  id: string;
  title: string;
  categoryName?: string;
  city?: string;
}

function storageKey(requestId: string): string {
  return `${STORAGE_PREFIX}${requestId}`;
}

export function saveNeedChatPreview(preview: NeedChatPreview): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(storageKey(preview.id), JSON.stringify(preview));
  } catch {
    // quota / private mode
  }
}

export function readNeedChatPreview(requestId: string): NeedChatPreview | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(storageKey(requestId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NeedChatPreview;
    if (!parsed?.id || !parsed?.title) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ensureNeedChatPreview(
  requestId: string,
  preview?: Omit<NeedChatPreview, 'id'> | null
): void {
  if (readNeedChatPreview(requestId)) return;
  if (!preview?.title) return;
  saveNeedChatPreview({ id: requestId, ...preview });
}
