import { toPersianDigits } from '@/lib/format/digits';

export function formatTimeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    // Persian digits to match the rest of the product (was Latin: "5 \u062F\u0642\u06CC\u0642\u0647 \u067E\u06CC\u0634").
    if (mins < 1) return '\u0627\u0644\u0627\u0646';
    if (mins < 60) return `${toPersianDigits(mins)} \u062F\u0642\u06CC\u0642\u0647 \u067E\u06CC\u0634`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${toPersianDigits(hours)} \u0633\u0627\u0639\u062A \u067E\u06CC\u0634`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${toPersianDigits(days)} \u0631\u0648\u0632 \u067E\u06CC\u0634`;
    return d.toLocaleDateString('fa-IR');
  } catch {
    return '';
  }
}

export function peerPresenceLabel(peer?: {
  online?: boolean;
  lastSeenAt?: string | null;
}): string {
  if (peer?.online) return '\u0622\u0646\u0644\u0627\u06CC\u0646';
  if (peer?.lastSeenAt) {
    return `\u0622\u062E\u0631\u06CC\u0646 \u0628\u0627\u0632\u062F\u06CC\u062F ${formatTimeAgo(peer.lastSeenAt)}`;
  }
  return '\u0622\u0641\u0644\u0627\u06CC\u0646';
}
