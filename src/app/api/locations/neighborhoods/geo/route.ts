import { NextRequest, NextResponse } from 'next/server';
import {
  buildNeighborhoodBoundariesFeatureCollection,
} from '@/lib/map/iran/neighborhood-boundaries';
import { loadNeighborhoodGeoFeatures } from '@/lib/neighborhoods/geo';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const cityId = request.nextUrl.searchParams.get('cityId')?.trim();
    if (!cityId) {
      return NextResponse.json({ error: 'cityId الزامی است' }, { status: 400 });
    }

    const idsParam = request.nextUrl.searchParams.get('ids')?.trim();
    const neighborhoodIds = idsParam
      ? idsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const features = await loadNeighborhoodGeoFeatures(cityId, neighborhoodIds);
    const collection = buildNeighborhoodBoundariesFeatureCollection({
      features,
      neighborhoodSlugs: neighborhoodIds ?? [],
    });

    return NextResponse.json(collection, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    console.error('Neighborhood geo GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
