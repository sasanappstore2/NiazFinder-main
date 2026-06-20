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

function isPrivateIpv4(host: string): boolean {
  if (!isIP(host)) return false;
  if (host === '127.0.0.1' || host === '0.0.0.0') return true;
  if (host.startsWith('10.')) return true;
  if (host.startsWith('192.168.')) return true;
  if (host.startsWith('169.254.')) return true;
  const m = /^172\.(\d+)\./.exec(host);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase();
  return h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80');
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

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { ok: false, error: 'این آدرس مجاز نیست' };
  }

  if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
    return { ok: false, error: 'آدرس شبکه داخلی مجاز نیست' };
  }

  if (!isIP(hostname)) {
    try {
      const records = await lookup(hostname, { verbatim: true });
      const addrs = Array.isArray(records) ? records.map((r) => r.address) : [records.address];
      for (const addr of addrs) {
        if (isPrivateIpv4(addr) || isPrivateIpv6(addr)) {
          return { ok: false, error: 'دامنه به آدرس داخلی اشاره می‌کند' };
        }
      }
    } catch {
      return { ok: false, error: 'دامنه یافت نشد' };
    }
  }

  return { ok: true, url: normalized };
}
