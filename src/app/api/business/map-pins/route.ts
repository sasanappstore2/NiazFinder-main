import { NextRequest, NextResponse } from 'next/server';
import { listBusinessMapPins } from '@/lib/business/map-pins-query';
import { cityNamesFromParam } from '@/lib/business/browse-geo-filters';
import { normalizeMapBbox } from '@/lib/business/map-bbox';
import { citySlugToPersianName } from '@/lib/search/city-slugs';

export const runtime = 'nodejs';

function parseBbox(searchParams: URLSearchParams) {
  const west = Number(searchParams.get('west'));
  const south = Number(searchParams.get('south'));
  const east = Number(searchParams.get('east'));
  const north = Number(searchParams.get('north'));
  return normalizeMapBbox({ west, south, east, north });
}

/** GET /api/business/map-pins — lightweight pins for business browse map. */
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

    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || searchParams.get('q') || undefined;
    const verified = searchParams.get('verified') === 'true';
    const citiesParam = searchParams.get('cities') ?? undefined;
    const provincesParam = searchParams.get('provinces') ?? undefined;
    const legacyCitySlug = searchParams.get('city');
    const legacyCity =
      legacyCitySlug && !citiesParam
        ? citySlugToPersianName(legacyCitySlug) ?? legacyCitySlug
        : undefined;

    if (citiesParam) {
      const names = cityNamesFromParam(citiesParam);
      if (names.length === 0 && !provincesParam) {
        return NextResponse.json({ error: 'Invalid city slugs' }, { status: 400 });
      }
    }

    const result = await listBusinessMapPins({
      bbox,
      citiesParam,
      provincesParam,
      legacyCity,
      category,
      search,
      verified,
    });

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=15' },
    });
  } catch (err) {
    console.error('[GET /api/business/map-pins]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
