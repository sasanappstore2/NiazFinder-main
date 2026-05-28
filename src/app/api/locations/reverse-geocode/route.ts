import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocodeNominatim } from '@/lib/location/nominatim';
import { matchGeoToCatalog } from '@/lib/location/match-geo-to-catalog';

export const runtime = 'nodejs';

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

    const nominatim = await reverseGeocodeNominatim(lat, lng);
    if (!nominatim) {
      return NextResponse.json(
        { error: 'آدرس از موقعیت یافت نشد' },
        { status: 404 }
      );
    }

    const matched = await matchGeoToCatalog(lat, lng, nominatim);
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
      displayName: nominatim.displayName,
    });
  } catch (error) {
    console.error('reverse-geocode GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
