/**
 * Normalize website and Iranian social channel inputs for business profiles.
 */

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** e.g. tizkharid.com → https://tizkharid.com, www.tizkharid.com → https://www.tizkharid.com */
export function normalizeWebsiteUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return stripTrailingSlash(t);
  const withoutLeadingSlashes = t.replace(/^\/+/, '');
  return stripTrailingSlash(`https://${withoutLeadingSlashes}`);
}

function extractPathSegment(raw: string, patterns: RegExp[]): string {
  let s = raw.trim();
  if (!s) return '';
  if (s.startsWith('http')) {
    try {
      const u = new URL(s.startsWith('http') ? s : `https://${s}`);
      s = u.pathname.replace(/^\/+/, '');
    } catch {
      /* keep s */
    }
  }
  for (const p of patterns) {
    s = s.replace(p, '');
  }
  return s.replace(/^@+/, '').replace(/\/+$/, '').trim();
}

export function normalizeInstagramUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return stripTrailingSlash(t);
  const handle = extractPathSegment(t, [
    /^https?:\/\/(www\.)?instagram\.com\/?/i,
    /^instagram\.com\/?/i,
    /^www\.instagram\.com\/?/i,
  ]);
  if (!handle) return '';
  return `https://instagram.com/${handle}`;
}

export function normalizeTelegramUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return stripTrailingSlash(t);
  const handle = extractPathSegment(t, [
    /^https?:\/\/(www\.)?t\.me\/?/i,
    /^t\.me\/?/i,
    /^telegram\.me\/?/i,
    /^https?:\/\/(www\.)?telegram\.me\/?/i,
  ]);
  if (!handle) return '';
  return `https://t.me/${handle}`;
}

export function normalizeBaleUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return stripTrailingSlash(t);
  const id = extractPathSegment(t, [/^https?:\/\/(www\.)?ble\.ir\/?/i, /^ble\.ir\/?/i]);
  if (!id) return '';
  return `https://ble.ir/${id}`;
}

export function normalizeRubikaUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return stripTrailingSlash(t);
  const path = extractPathSegment(t, [
    /^https?:\/\/(www\.)?rubika\.ir\/?/i,
    /^rubika\.ir\/?/i,
    /^m\.rubika\.ir\/?/i,
  ]);
  if (!path) return '';
  return `https://rubika.ir/${path}`;
}

export function normalizeEitaaUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return stripTrailingSlash(t);
  const path = extractPathSegment(t, [
    /^https?:\/\/(www\.)?eitaa\.com\/?/i,
    /^eitaa\.com\/?/i,
  ]);
  if (!path) return '';
  return `https://eitaa.com/${path}`;
}

export type WebPresenceFields = {
  website: string;
  instagram: string;
  telegram: string;
  bale: string;
  rubika: string;
  eitaa: string;
};

export function normalizeWebPresence(input: WebPresenceFields): WebPresenceFields {
  return {
    website: normalizeWebsiteUrl(input.website),
    instagram: normalizeInstagramUrl(input.instagram),
    telegram: normalizeTelegramUrl(input.telegram),
    bale: normalizeBaleUrl(input.bale),
    rubika: normalizeRubikaUrl(input.rubika),
    eitaa: normalizeEitaaUrl(input.eitaa),
  };
}

/** Relative /uploads paths or absolute https URLs allowed for stored media. */
export function isAllowedBusinessMediaUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return true;
  if (t.startsWith('/uploads/business/')) return true;
  try {
    const u = new URL(t);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}
