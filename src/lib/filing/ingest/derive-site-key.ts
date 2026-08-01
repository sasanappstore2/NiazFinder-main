/** Internal slug for a filing portal — derived from URL when the operator has no preset key. */

const SITE_KEY_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export function sanitizeSiteKey(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  if (!slug) return 'portal';
  if (SITE_KEY_RE.test(slug)) return slug;
  return slug.replace(/^-+|-+$/g, '').slice(0, 40) || 'portal';
}

/** Second-level domain label, e.g. panel.showmelk.com → showmelk */
export function deriveSiteKeyFromLoginUrl(loginUrl: string): string {
  const trimmed = loginUrl.trim();
  if (!trimmed) return 'portal';
  try {
    const host = new URL(trimmed).hostname.toLowerCase().replace(/^www\./, '');
    const labels = host.split('.').filter(Boolean);
    if (labels.length === 0) return 'portal';
    if (labels.length === 1) return sanitizeSiteKey(labels[0]!);
    const tld = labels[labels.length - 1]!;
    const sld = labels[labels.length - 2]!;
    if (tld.length === 2 && labels.length >= 3) {
      return sanitizeSiteKey(labels[labels.length - 3]!);
    }
    return sanitizeSiteKey(sld);
  } catch {
    return sanitizeSiteKey(trimmed);
  }
}

export function deriveDisplayNameFromLoginUrl(loginUrl: string): string {
  const trimmed = loginUrl.trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed).hostname.replace(/^www\./i, '');
  } catch {
    return trimmed;
  }
}

export function resolveFilingSiteKey(input: {
  loginUrl: string;
  catalogSiteKey?: string | null;
  explicitSiteKey?: string | null;
}): string {
  const explicit = input.explicitSiteKey?.trim();
  if (explicit) return sanitizeSiteKey(explicit);

  const catalog = input.catalogSiteKey?.trim();
  if (catalog && catalog !== 'custom') return sanitizeSiteKey(catalog);

  return deriveSiteKeyFromLoginUrl(input.loginUrl);
}
