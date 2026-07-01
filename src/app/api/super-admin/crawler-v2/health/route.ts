import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { CrawlService } from '@crawler/api/crawl-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, 'market:filings:read');
  if (!authz.ok) return authz.response;

  const service = CrawlService.create();
  const health = await service.providerHealth();
  return NextResponse.json({ ok: health.healthy, health });
}
