import { createHash, randomUUID } from 'node:crypto';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function newId(prefix = 'crawl'): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function patternsToRegex(patterns: string[]): RegExp[] {
  return patterns
    .filter(Boolean)
    .map((p) => {
      try {
        return new RegExp(p, 'i');
      } catch {
        const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped, 'i');
      }
    });
}
