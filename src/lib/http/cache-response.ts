import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export type PublicCacheOptions = {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  scope?: 'public' | 'private';
};

function buildCacheControl(opts: PublicCacheOptions): string {
  const scope = opts.scope ?? 'public';
  const parts: string[] = [scope];
  if (opts.maxAge != null) parts.push(`max-age=${opts.maxAge}`);
  if (opts.sMaxAge != null) parts.push(`s-maxage=${opts.sMaxAge}`);
  if (opts.staleWhileRevalidate != null) {
    parts.push(`stale-while-revalidate=${opts.staleWhileRevalidate}`);
  }
  return parts.join(', ');
}

function weakEtag(body: string): string {
  const hash = createHash('sha1').update(body).digest('hex');
  return `W/"${hash}"`;
}

export function cachedJsonResponse(
  request: NextRequest,
  data: unknown,
  cache: PublicCacheOptions
): NextResponse {
  const body = JSON.stringify(data);
  const etag = weakEtag(body);
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': buildCacheControl(cache),
      },
    });
  }
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ETag: etag,
      'Cache-Control': buildCacheControl(cache),
    },
  });
}
