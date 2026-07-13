import { normalizeWebsiteUrl } from '@/lib/business/normalize-web-presence';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
]);

function ipv4ToMapped(host: string): string | null {
  const lower = host.toLowerCase();
  const mappedPrefix = '::ffff:';
  if (lower.startsWith(mappedPrefix)) {
    const v4 = lower.slice(mappedPrefix.length);
    if (isIP(v4) === 4) return v4;
  }
  return null;
}

function isBlockedIpv4(host: string): boolean {
  if (isIP(host) !== 4) return false;
  const parts = host.split('.').map(Number);
  const [a, b] = parts;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isBlockedIpv6(host: string): boolean {
  const mapped = ipv4ToMapped(host);
  if (mapped) return isBlockedIpv4(mapped);

  const h = host.toLowerCase();
  if (h === '::1') return true;

  const firstHextet = /^([0-9a-f]{1,4})/i.exec(h)?.[1];
  if (firstHextet) {
    const n = parseInt(firstHextet, 16);
    if (n >= 0xfc00 && n <= 0xfdff) return true;
    if (n >= 0xfe80 && n <= 0xfebf) return true;
  }

  return false;
}

function isPrivateOrBlockedHost(host: string): boolean {
  const mapped = ipv4ToMapped(host);
  if (mapped) return isBlockedIpv4(mapped);
  if (isIP(host) === 4) return isBlockedIpv4(host);
  if (isIP(host) === 6) return isBlockedIpv6(host);
  return false;
}

export type ValidateImportUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Normalize and block SSRF targets for site import. */
export async function validateImportUrl(raw: string): Promise<ValidateImportUrlResult> {
  const normalized = normalizeWebsiteUrl(raw);
  if (!normalized) {
    return { ok: false, error: 'آدرس وب‌سایت معتبر نیست' };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, error: 'آدرس نامعتبر است' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'فقط http و https مجاز است' };
  }

  const hostname = parsed.hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { ok: false, error: 'این آدرس مجاز نیست' };
  }

  if (isPrivateOrBlockedHost(hostname)) {
    return { ok: false, error: 'آدرس شبکه داخلی مجاز نیست' };
  }

  if (!isIP(hostname)) {
    try {
      const records = await lookup(hostname, { verbatim: true, all: true });
      const list = Array.isArray(records) ? records : [records];
      for (const record of list) {
        if (isPrivateOrBlockedHost(record.address)) {
          return { ok: false, error: 'دامنه به آدرس داخلی اشاره می‌کند' };
        }
      }
    } catch {
      return { ok: false, error: 'دامنه یافت نشد' };
    }
  }

  return { ok: true, url: normalized };
}
