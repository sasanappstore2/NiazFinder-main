import { NextRequest, NextResponse } from 'next/server';
import { loadCityNeighborhoods } from '@/lib/neighborhoods/catalog';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const cityId = request.nextUrl.searchParams.get('cityId')?.trim();
    if (!cityId) {
      return NextResponse.json({ error: 'cityId الزامی است' }, { status: 400 });
    }

    const neighborhoods = await loadCityNeighborhoods(cityId);
    return NextResponse.json({ cityId, neighborhoods });
  } catch (error) {
    console.error('Neighborhoods GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
