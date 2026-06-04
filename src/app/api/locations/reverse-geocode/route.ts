import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocodeNominatim } from '@/lib/location/nominatim';
import { matchGeoFromCoordinates, matchGeoToCatalog } from '@/lib/location/match-geo-to-catalog';

export const runtime = 'nodejs';

function nominatimEnabled(): boolean {
  return process.env.NOMINATIM_ENABLED === 'true';
}

export async function GET(request: NextRequest) {
  try {
    const latRaw = request.nextUrl.searchParams.get('lat');
    const lngRaw = request.nextUrl.searchParams.get('lng');
    const lat = latRaw != null ? Number(latRaw) : NaN;
    const lng = lngRaw != null ? Number(lngRaw) : NaN;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'lat و lng معتبر نیست' }, { status: 400 });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'مختصات خارج از محدوده' }, { status: 400 });
    }

    /** User-initiated intake «مکان من» — allow OSM neighborhood match once per request. */
    const matchNeighborhood =
      request.nextUrl.searchParams.get('matchNeighborhood') === '1';
    const useNominatim = nominatimEnabled() || matchNeighborhood;

    if (!useNominatim) {
      const matched = await matchGeoFromCoordinates(lat, lng);
      if (!matched) {
        return NextResponse.json({ error: 'شهر در سیستم یافت نشد' }, { status: 404 });
      }

      return NextResponse.json({
        lat,
        lng,
        cityName: matched.city.name,
        cityId: matched.city.id,
        citySlug: matched.citySlug,
        neighborhood: matched.neighborhood,
        neighborhoodMatchScore: matched.neighborhoodMatchScore,
        displayName: matched.city.name,
        source: 'catalog',
      });
    }

    const nominatim = await reverseGeocodeNominatim(lat, lng);
    if (!nominatim) {
      const fallback = await matchGeoFromCoordinates(lat, lng);
      if (!fallback) {
        return NextResponse.json({ error: 'آدرس از موقعیت یافت نشد' }, { status: 404 });
      }
      return NextResponse.json({
        lat,
        lng,
        cityName: fallback.city.name,
        cityId: fallback.city.id,
        citySlug: fallback.citySlug,
        neighborhood: fallback.neighborhood,
        neighborhoodMatchScore: fallback.neighborhoodMatchScore,
        displayName: fallback.city.name,
        source: 'catalog-fallback',
      });
    }

    const matched = await matchGeoToCatalog(lat, lng, nominatim);
    if (!matched) {
      const fallback = await matchGeoFromCoordinates(lat, lng);
      if (!fallback) {
        return NextResponse.json({ error: 'شهر در سیستم یافت نشد' }, { status: 404 });
      }
      return NextResponse.json({
        lat,
        lng,
        cityName: fallback.city.name,
        cityId: fallback.city.id,
        citySlug: fallback.citySlug,
        neighborhood: fallback.neighborhood,
        neighborhoodMatchScore: fallback.neighborhoodMatchScore,
        displayName: fallback.city.name,
        source: 'catalog-fallback',
      });
    }

    return NextResponse.json({
      lat,
      lng,
      cityName: matched.city.name,
      cityId: matched.city.id,
      citySlug: matched.citySlug,
      neighborhood: matched.neighborhood,
      neighborhoodMatchScore: matched.neighborhoodMatchScore,
      displayName: nominatim.displayName,
      source: 'nominatim',
    });
  } catch (error) {
    console.error('reverse-geocode GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
