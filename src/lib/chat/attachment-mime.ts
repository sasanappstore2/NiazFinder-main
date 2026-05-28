/** Strip `;codecs=…` and normalize for chat attachment validation. */
export function normalizeChatMime(mime: string): string {
  return (mime || '').split(';')[0].trim().toLowerCase();
}

export function isAllowedChatAttachment(mime: string, fallbackName: string): boolean {
  const m = normalizeChatMime(mime);
  if (m === 'application/pdf') return true;
  if (!m && /\.pdf$/i.test(fallbackName)) return true;
  if (
    m === 'audio/webm' ||
    m === 'audio/ogg' ||
    m === 'audio/mp4' ||
    m === 'audio/mpeg' ||
    m === 'audio/aac' ||
    m === 'audio/wav' ||
    m === 'audio/x-m4a'
  ) {
    return true;
  }
  return (
    m === 'image/jpeg' ||
    m === 'image/png' ||
    m === 'image/webp' ||
    m === 'image/gif'
  );
}

export function extFromChatMime(mime: string): string {
  const table: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'audio/mpeg': '.mp3',
    'audio/aac': '.aac',
    'audio/wav': '.wav',
    'audio/x-m4a': '.m4a',
  };
  return table[normalizeChatMime(mime)] ?? '';
}

/** File type sent to upload (avoids `audio/webm;codecs=opus` rejection). */
export function fileTypeForVoiceUpload(blob: Blob): string {
  return normalizeChatMime(blob.type) || 'audio/webm';
}
