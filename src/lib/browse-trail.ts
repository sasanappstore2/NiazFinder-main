/** Browse journey trail for breadcrumbs (`?from=` + cookie). */
export const BROWSE_TRAIL_COOKIE = 'browseTrail';

export function encodeBrowseTrail(pathname: string): string {
  return encodeURIComponent(pathname);
}

export function decodeBrowseTrail(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const decoded = decodeURIComponent(raw.trim());
    if (decoded.startsWith('/n/') || decoded.startsWith('/b/')) return decoded;
    return null;
  } catch {
    return null;
  }
}

export function browseTrailFromSearchParams(
  searchParams: URLSearchParams | Readonly<Record<string, string | string[] | undefined>>
): string | null {
  const raw =
    searchParams instanceof URLSearchParams
      ? searchParams.get('from')
      : typeof searchParams.from === 'string'
        ? searchParams.from
        : null;
  return decodeBrowseTrail(raw);
}

export function appendFromParam(href: string, fromPathname: string): string {
  const [path, query = ''] = href.split('?');
  const qs = new URLSearchParams(query);
  qs.set('from', fromPathname);
  return `${path}?${qs.toString()}`;
}
