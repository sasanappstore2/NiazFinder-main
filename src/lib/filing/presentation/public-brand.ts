/** Public UI copy — never expose third-party portal brands in the product surface. */

export const FILING_PUBLIC_BRAND = 'فایلینگ نیازفایندر';

export function publicFilingSourceLabel(_site: string | null | undefined): string | null {
  return null;
}

export function publicFilingSourceProvider(_site: string | null | undefined): string {
  return 'فایلینگ منطقه';
}

export function publicFilingDetailUrl(detailUrl: string | null | undefined): string | null {
  const url = detailUrl?.trim();
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('maskanyaban')) return null;
  } catch {
    return url;
  }
  return url;
}
