import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { CrawlService } from '@crawler/api/crawl-service';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ jobId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const authz = await requirePermission(request, 'market:filings:read');
  if (!authz.ok) return authz.response;

  const { jobId } = await params;
  const service = CrawlService.create();
  const status = await service.status(jobId);
  return NextResponse.json({ ok: true, ...status });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authz = await requirePermission(request, 'market:filings:write');
  if (!authz.ok) return authz.response;

  const { jobId } = await params;
  const body = (await request.json()) as { action?: 'pause' | 'resume' | 'cancel' };
  const service = CrawlService.create();

  switch (body.action) {
    case 'pause':
      return NextResponse.json({ ok: await service.pause(jobId) });
    case 'resume':
      return NextResponse.json({ ok: await service.resume(jobId) });
    case 'cancel':
      return NextResponse.json({ ok: await service.cancel(jobId) });
    default:
      return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 });
  }
}
