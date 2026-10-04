import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { getEstateScrapeBaseUrl } from '@/lib/business/site-import/estate-scrape-client';
import { formatApiError } from '@/lib/api/format-api-error';

export const runtime = 'nodejs';

function estateHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = process.env.ESTATE_SCRAPE_SECRET?.trim();
  if (secret) headers['x-estate-scrape-secret'] = secret;
  return headers;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const authz = await requirePermission(_request, 'market:filings:write');
  if (!authz.ok) return authz.response;

  const { jobId } = await params;
  const base = getEstateScrapeBaseUrl();

  try {
    const res = await fetch(`${base}/v1/filing-feed/site-map/${jobId}/status`, {
      cache: 'no-store',
      headers: estateHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: formatApiError(data, 'status failed') }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
