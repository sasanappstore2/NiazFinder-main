import { NextRequest, NextResponse } from 'next/server';
import { normalizeMapBbox } from '@/lib/business/map-bbox';
import { listNeedMapPins } from '@/lib/need/map-pins-query';
import { citySlugToPersianName } from '@/lib/search/city-slugs';
import { apiErrorFromUnknown } from '@/lib/db-health';

export const runtime = 'nodejs';

function parseBbox(searchParams: URLSearchParams) {
  const west = Number(searchParams.get('west'));
  const south = Number(searchParams.get('south'));
  const east = Number(searchParams.get('east'));
  const north = Number(searchParams.get('north'));
  return normalizeMapBbox({ west, south, east, north });
}

/** GET /api/requests/map-pins — lightweight need pins for browse map. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bbox = parseBbox(searchParams);
    if (!bbox) {
      return NextResponse.json(
        { error: 'Invalid bbox. Use west,south,east,north query params.' },
        { status: 400 }
      );
    }

    const legacyCitySlug = searchParams.get('city');
    const legacyCity =
      legacyCitySlug && !searchParams.get('cities')
        ? citySlugToPersianName(legacyCitySlug) ?? legacyCitySlug
        : undefined;

    const result = await listNeedMapPins(bbox, {
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || searchParams.get('q') || undefined,
      citiesParam: searchParams.get('cities') ?? undefined,
      provincesParam: searchParams.get('provinces') ?? undefined,
      legacyCity,
      legacyProvince: searchParams.get('province') ?? undefined,
      neighborhoodsParam: searchParams.get('neighborhoods') ?? undefined,
      neighborhoodCityId: searchParams.get('neighborhoodCity') ?? undefined,
      budgetMin: searchParams.get('budgetMin') ?? undefined,
      budgetMax: searchParams.get('budgetMax') ?? undefined,
      priority: searchParams.get('priority') ?? undefined,
      hasPhoto:
        searchParams.get('hasPhoto') === 'true' || searchParams.get('has-photo') === 'true',
      recent: searchParams.get('recent') ?? undefined,
      searchParams,
    });

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=15' },
    });
  } catch (err) {
    console.error('[GET /api/requests/map-pins]', err);
    const { error, status } = apiErrorFromUnknown(err);
    return NextResponse.json({ error }, { status });
  }
}
