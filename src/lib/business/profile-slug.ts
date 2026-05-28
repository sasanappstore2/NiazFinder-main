/**
 * Public profile username (/b/{slug}) — ASCII-only, URL-safe.
 */
import { randomBytes } from 'crypto';
import type { WebPresenceExtension } from '@/contracts/business-profile';

const SLUG_MIN = 3;
const SLUG_MAX = 40;

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Reserved route segments — cannot be used as profile slug. */
export const RESERVED_BUSINESS_PROFILE_SLUGS = new Set([
  'admin',
  'api',
  'b',
  'pro',
  'edit',
  'new',
  'login',
  'register',
  'search',
  'social-feed',
  'my-business',
  'dashboard',
  'settings',
  'iran',
  'business',
  'undefined',
  'null',
]);

/** Strip to lowercase a-z, 0-9, hyphen, underscore; collapse repeats. */
export function sanitizeBusinessProfileSlug(raw: string): string {
  let s = raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/[-_]{2,}/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');

  if (s.length > SLUG_MAX) s = s.slice(0, SLUG_MAX);
  return s;
}

export function validateBusinessProfileSlug(
  slug: string
): { ok: true; slug: string } | { ok: false; message: string } {
  const s = sanitizeBusinessProfileSlug(slug);
  if (s.length < SLUG_MIN) {
    return {
      ok: false,
      message: `نام کاربری باید حداقل ${SLUG_MIN} کاراکتر (حروف انگلیسی و عدد) باشد`,
    };
  }
  if (s.length > SLUG_MAX) {
    return { ok: false, message: `حداکثر ${SLUG_MAX} کاراکتر` };
  }
  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(s) && !/^[a-z0-9]{3}$/.test(s)) {
    return {
      ok: false,
      message: 'فقط حروف کوچک انگلیسی، عدد، خط تیره و زیرخط — بدون فاصله یا علامت فارسی',
    };
  }
  if (RESERVED_BUSINESS_PROFILE_SLUGS.has(s)) {
    return { ok: false, message: 'این نام کاربری قابل استفاده نیست' };
  }
  return { ok: true, slug: s };
}

export function generateRandomBusinessSlug(length = 9): string {
  const size = Math.min(Math.max(length, SLUG_MIN), SLUG_MAX);
  const bytes = randomBytes(size);
  let out = '';
  for (let i = 0; i < size; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export async function uniqueRandomBusinessSlug(
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const slug = generateRandomBusinessSlug(attempt > 12 ? 11 : 9);
    if (RESERVED_BUSINESS_PROFILE_SLUGS.has(slug)) continue;
    if (!(await exists(slug))) return slug;
  }
  return `${generateRandomBusinessSlug(12)}${Date.now().toString(36).slice(-4)}`.slice(0, SLUG_MAX);
}

function lastPathSegment(value: string): string {
  const t = value.trim().toLowerCase();
  if (!t) return '';
  if (t.includes('/')) {
    const parts = t.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? '';
  }
  return t;
}

function handleFromChannelValue(value: string | undefined): string {
  if (!value?.trim()) return '';
  let s = value.trim();
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      s = u.pathname.replace(/^\/+/, '').split('/')[0] ?? u.hostname;
    } catch {
      s = lastPathSegment(s);
    }
  } else {
    s = lastPathSegment(s);
  }
  return sanitizeBusinessProfileSlug(s);
}

function handleFromWebsite(website: string | undefined): string {
  if (!website?.trim()) return '';
  try {
    const host = new URL(website.startsWith('http') ? website : `https://${website}`).hostname;
    const stem = host.replace(/^www\./i, '').split('.')[0] ?? '';
    return sanitizeBusinessProfileSlug(stem);
  } catch {
    return '';
  }
}

/** Prefer social @handles for username suggestion (instagram → telegram → …). */
export function suggestProfileSlugFromWebPresence(
  web: WebPresenceExtension | undefined
): string | null {
  if (!web) return null;

  const candidates = [
    handleFromChannelValue(web.instagram),
    handleFromChannelValue(web.telegram),
    handleFromChannelValue(web.rubika),
    handleFromChannelValue(web.bale),
    handleFromChannelValue(web.eitaa),
    handleFromWebsite(web.website),
  ].filter((s) => s.length >= SLUG_MIN);

  for (const c of candidates) {
    const v = validateBusinessProfileSlug(c);
    if (v.ok) return v.slug;
  }
  return null;
}
