import { NextRequest, NextResponse } from 'next/server';
import { listBusinesses } from '@/lib/business/load-profile';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const city = searchParams.get('city') || undefined;
    const category = searchParams.get('category') || undefined;
    const minRating = searchParams.get('minRating')
      ? Number(searchParams.get('minRating'))
      : undefined;
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '12');

    const result = await listBusinesses({ city, category, minRating, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Business list GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
