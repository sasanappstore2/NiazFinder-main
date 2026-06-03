import type { Message } from '@/lib/types';
import { MESSAGE_GROUP_GAP_MS, MESSAGE_DATE_SEPARATOR_MS } from '@/lib/chat/ui/tokens';

export type { MessageGroupPosition } from '@/lib/chat/message-thread-layout';
export { getMessageGroupPosition } from '@/lib/chat/message-thread-layout';

export type MessageClusterMeta = {
  clusterId: string;
  showDateSeparator: boolean;
  dateLabel?: string;
};

function sameGroup(a: Message, b: Message): boolean {
  if (a.senderId !== b.senderId) return false;
  const t0 = new Date(a.createdAt).getTime();
  const t1 = new Date(b.createdAt).getTime();
  if (Number.isNaN(t0) || Number.isNaN(t1)) return false;
  return Math.abs(t1 - t0) <= MESSAGE_GROUP_GAP_MS;
}

export function formatDateSeparatorLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) {
      return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('fa-IR', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return '';
  }
}

export function getMessageClusterMeta(
  messages: Message[],
  index: number
): MessageClusterMeta {
  const msg = messages[index];
  const prev = index > 0 ? messages[index - 1] : null;

  let showDateSeparator = true;
  if (prev) {
    const t0 = new Date(prev.createdAt).getTime();
    const t1 = new Date(msg.createdAt).getTime();
    if (!Number.isNaN(t0) && !Number.isNaN(t1) && t1 - t0 < MESSAGE_DATE_SEPARATOR_MS) {
      showDateSeparator = false;
    }
  }

  const clusterStart = (() => {
    let i = index;
    while (i > 0 && sameGroup(messages[i - 1], messages[i])) i--;
    return i;
  })();

  return {
    clusterId: `${msg.senderId}-${clusterStart}`,
    showDateSeparator,
    dateLabel: showDateSeparator ? formatDateSeparatorLabel(msg.createdAt) : undefined,
  };
}
