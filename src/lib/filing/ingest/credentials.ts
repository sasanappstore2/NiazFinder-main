import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

function secretKey(): Buffer {
  const raw =
    process.env.FILING_SCRAPER_SECRET?.trim() ||
    process.env.ESTATE_SCRAPE_SECRET?.trim() ||
    process.env.INTERNAL_API_SECRET?.trim() ||
    'dev-filing-scraper-secret-change-me';
  return createHash('sha256').update(raw).digest();
}

export function encryptScraperPassword(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, secretKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptScraperPassword(blob: string | null | undefined): string {
  if (!blob?.trim()) return '';
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, secretKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return `${'*'.repeat(Math.min(8, value.length - 2))}${value.slice(-2)}`;
}
