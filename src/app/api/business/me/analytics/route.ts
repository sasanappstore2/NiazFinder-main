import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';
import { listBusinessAnalyticsSeries } from '@/lib/business/analytics-daily';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await ensureBusinessProfile(user);
    const days = Math.min(90, Math.max(7, Number(new URL(request.url).searchParams.get('days') ?? 30)));
    const series = await listBusinessAnalyticsSeries(profile.id, days);

    return NextResponse.json({
      totals: {
        views: profile.viewCount,
        clicks: profile.clickCount,
        conversions: profile.conversionCount,
        saves: profile.saveCount,
      },
      series: series.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        views: r.views,
        clicks: r.clicks,
        conversions: r.conversions,
        saves: r.saves,
      })),
    });
  } catch (error) {
    console.error('Business analytics GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
