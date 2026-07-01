import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { CrawlService } from '@crawler/api/crawl-service';
import { crawlJobConfigSchema } from '@crawler/config/schema';
import { z } from 'zod';

export const runtime = 'nodejs';

const startSchema = z.object({
  siteKey: z.string().min(2),
  config: crawlJobConfigSchema,
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
});

export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, 'market:filings:read');
  if (!authz.ok) return authz.response;

  const service = CrawlService.create();
  const health = await service.providerHealth();
  const history = await service.history();

  return NextResponse.json({ ok: true, health, history });
}

export async function POST(request: NextRequest) {
  const authz = await requirePermission(request, 'market:filings:write');
  if (!authz.ok) return authz.response;

  const body = await request.json();
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const service = CrawlService.create();
  const job = await service.startCrawl(parsed.data);
  return NextResponse.json({ ok: true, job });
}
