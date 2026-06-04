/** Magic-byte sniffing for upload validation (not MIME header alone). */

const SIGS: { mime: string; bytes: number[]; offset?: number }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'audio/webm', bytes: [0x1a, 0x45, 0xdf, 0xa3] },
  { mime: 'audio/ogg', bytes: [0x4f, 0x67, 0x67, 0x53] },
];

export function sniffMimeFromBuffer(buf: Buffer, maxLen = 16): string | null {
  const len = Math.min(buf.length, maxLen);
  for (const sig of SIGS) {
    const off = sig.offset ?? 0;
    if (len < off + sig.bytes.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buf[off + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      if (sig.mime === 'image/webp' && len >= 12) {
        const webp = buf.slice(8, 12).toString('ascii');
        if (webp !== 'WEBP') continue;
      }
      return sig.mime;
    }
  }
  return null;
}

export function bufferMatchesDeclaredMime(buf: Buffer, declaredMime: string): boolean {
  const normalized = declaredMime.toLowerCase().split(';')[0]?.trim() ?? '';
  if (normalized === 'audio/mpeg' || normalized === 'audio/mp4') {
    return buf.length > 0;
  }
  const sniffed = sniffMimeFromBuffer(buf);
  if (!sniffed) return false;
  if (sniffed === normalized) return true;
  if (normalized.startsWith('audio/') && sniffed.startsWith('audio/')) return true;
  return false;
}

export function isDangerousUploadMime(mime: string): boolean {
  const m = mime.toLowerCase();
  return (
    m.includes('svg') ||
    m.includes('html') ||
    m.includes('javascript') ||
    m === 'text/plain' ||
    m === 'application/xml'
  );
}
