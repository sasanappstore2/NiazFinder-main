import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import {
  getLocationStats,
  getPublicLocationData,
  readManagedLocationData,
} from '@/lib/admin-locations';
import { readManifest } from '@/lib/neighborhoods/catalog';

export const runtime = 'nodejs';

const getPublicLocationsPayload = unstable_cache(
  async () => {
    const raw = await readManagedLocationData();
    const manifest = await readManifest();
    const data = getPublicLocationData(raw, manifest.counts);
    const stats = await getLocationStats(raw);
    return { ...data, stats };
  },
  ['public-locations-payload'],
  { revalidate: 300, tags: ['locations'] }
);

export async function GET() {
  try {
    const payload = await getPublicLocationsPayload();
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Locations GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
