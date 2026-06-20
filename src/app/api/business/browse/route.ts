import { NextRequest, NextResponse } from 'next/server';
import { listBusinesses, type BusinessBrowseSort } from '@/lib/business/load-profile';
import { cityNamesFromParam } from '@/lib/business/browse-geo-filters';
import { citySlugToPersianName } from '@/lib/search/city-slugs';

const VALID_SORT = new Set<BusinessBrowseSort>(['rating', 'newest', 'name', 'popular']);

function parseSort(raw: string | null): BusinessBrowseSort {
  if (raw && VALID_SORT.has(raw as BusinessBrowseSort)) {
    return raw as BusinessBrowseSort;
  }
  return 'rating';
}

/** GET /api/business/browse — marketplace listing for `/b/` pages. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || searchParams.get('q') || undefined;
    const verified = searchParams.get('verified') === 'true';
    const sort = parseSort(searchParams.get('sort'));

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
        return NextResponse.json(
          { error: 'Invalid city slugs' },
          { status: 400 }
        );
      }
    }

    const neighborhoodsParam = searchParams.get('neighborhoods') ?? undefined;
    const neighborhoodCity =
      searchParams.get('neighborhoodCity') ?? searchParams.get('city') ?? undefined;

    const latRaw = searchParams.get('lat');
    const lngRaw = searchParams.get('lng');
    const radiusRaw = searchParams.get('radius_km') ?? searchParams.get('radiusKm');
    const lat = latRaw ? Number(latRaw) : undefined;
    const lng = lngRaw ? Number(lngRaw) : undefined;
    const radiusKm = radiusRaw ? Number(radiusRaw) : undefined;

    const result = await listBusinesses({
      citiesParam,
      provincesParam,
      neighborhoodsParam,
      neighborhoodCityId: neighborhoodCity,
      city: legacyCity,
      category,
      search,
      verified,
      sort,
      page,
      limit,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      radiusKm: Number.isFinite(radiusKm) ? radiusKm : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/business/browse]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
