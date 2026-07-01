import { NextRequest, NextResponse } from 'next/server';
import { assertIranCalendarQuery, getIranCalendarMonth } from '@/lib/calendar/iran-holidays-fetch';

export const runtime = 'nodejs';

/** GET ?year=1404&month=4 — official holidays & events (sourced from time.ir). */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));

    const err = assertIranCalendarQuery(year, month);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const payload = await getIranCalendarMonth(year, month);
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('GET /api/calendar/iran-holidays/month error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
