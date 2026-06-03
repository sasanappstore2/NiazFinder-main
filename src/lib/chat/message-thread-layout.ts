import type { Message } from '@/lib/types';

/** پیام‌های پیاپی از یک فرستنده در این بازه یک گروه محسوب می‌شوند */
export const MESSAGE_GROUP_GAP_MS = 5 * 60 * 1000;

export type MessageGroupPosition = {
  isFirst: boolean;
  isLast: boolean;
  isSingle: boolean;
};

function sameGroup(a: Message, b: Message): boolean {
  if (a.senderId !== b.senderId) return false;
  const t0 = new Date(a.createdAt).getTime();
  const t1 = new Date(b.createdAt).getTime();
  if (Number.isNaN(t0) || Number.isNaN(t1)) return false;
  return Math.abs(t1 - t0) <= MESSAGE_GROUP_GAP_MS;
}

/** آواتار فقط اولین پیام رشتهٔ طرف مقابل (بعد از پیام خودتان یا ابتدای گفتگو) */
export function shouldShowPeerAvatar(
  messages: Message[],
  index: number,
  currentUserId: string | undefined
): boolean {
  const msg = messages[index];
  if (!currentUserId || msg.senderId === currentUserId) return false;
  const prev = index > 0 ? messages[index - 1] : null;
  return !prev || prev.senderId === currentUserId;
}

export function getMessageGroupPosition(
  messages: Message[],
  index: number
): MessageGroupPosition {
  const msg = messages[index];
  const prev = index > 0 ? messages[index - 1] : null;
  const next = index < messages.length - 1 ? messages[index + 1] : null;

  const isFirst = !prev || !sameGroup(prev, msg);
  const isLast = !next || !sameGroup(msg, next);

  return {
    isFirst,
    isLast,
    isSingle: isFirst && isLast,
  };
}
