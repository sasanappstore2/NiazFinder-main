import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/authz';
import { getEstateScrapeBaseUrl } from '@/lib/business/site-import/estate-scrape-client';

export const runtime = 'nodejs';

/** Pre-flight health for filing wizard (ScrapeGraph engine). */
export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, 'market:filings:write');
  if (!authz.ok) return authz.response;

  const base = getEstateScrapeBaseUrl();
  try {
    const res = await fetch(`${base}/health`, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `سرویس estate-scrape در ${base} پاسخ نداد (${res.status}). ابتدا npm run dev:estate-scrape را اجرا کنید.`,
        },
        { status: 503 }
      );
    }
    const data = (await res.json()) as { engine?: string; mlxOk?: boolean };
    if (data.engine && data.engine !== 'scrapegraph') {
      return NextResponse.json(
        {
          ok: false,
          error:
            'نسخه قدیمی estate-scrape در حال اجراست. سرویس را ری‌استارت کنید: npm run dev:estate-scrape',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, base, engine: data.engine ?? 'scrapegraph', mlxOk: data.mlxOk });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: `سرویس estate-scrape در ${base} در دسترس نیست: ${msg}. ابتدا npm run dev:estate-scrape را اجرا کنید.`,
      },
      { status: 503 }
    );
  }
}
