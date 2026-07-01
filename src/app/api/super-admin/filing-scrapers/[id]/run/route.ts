import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { runFilingScraper } from '@/lib/filing-scrapers/runner';

export const runtime = 'nodejs';

/** POST — run scraper bot immediately (manual trigger). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:filings:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const result = await runFilingScraper(id, { trigger: 'manual' });

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'اجرا ناموفق' }, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      imported: result.imported,
      enrichStarted: result.enrichStarted ?? false,
    });
  } catch (error) {
    console.error('filing-scraper run error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
