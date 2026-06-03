/** JSON payload stored in Message.content when type === CALL */
export type CallLogSnapshot = {
  callId: string;
  status: 'ENDED' | 'REJECTED' | 'MISSED';
  durationSec: number | null;
  callerId: string;
  calleeId: string;
};

export function buildCallLogContent(snapshot: CallLogSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseCallLogSnapshot(content: string): CallLogSnapshot | null {
  try {
    const raw = JSON.parse(content) as CallLogSnapshot;
    if (!raw?.callId || !raw?.callerId || !raw?.calleeId || !raw?.status) return null;
    if (!['ENDED', 'REJECTED', 'MISSED'].includes(raw.status)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function formatCallDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} ثانیه`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatCallLogLabel(
  status: CallLogSnapshot['status'],
  isOutgoing: boolean,
  durationSec: number | null | undefined
): string {
  if (status === 'MISSED') {
    return isOutgoing ? 'تماس بی‌پاسخ' : 'تماس از دست‌رفته';
  }
  if (status === 'REJECTED') {
    return isOutgoing ? 'تماس رد شد' : 'تماس رد شده';
  }
  const duration = formatCallDuration(durationSec);
  if (duration) {
    return `تماس صوتی · ${duration}`;
  }
  return isOutgoing ? 'تماس لغو شد' : 'تماس لغو شد';
}

export function callLogListPreview(content: string): string {
  const snap = parseCallLogSnapshot(content);
  if (!snap) return 'تماس صوتی';
  if (snap.status === 'MISSED') return 'تماس از دست‌رفته';
  if (snap.status === 'REJECTED') return 'تماس رد شده';
  const duration = formatCallDuration(snap.durationSec);
  return duration ? `تماس ${duration}` : 'تماس صوتی';
}
