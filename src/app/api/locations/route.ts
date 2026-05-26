import { NextResponse } from 'next/server';
import {
  getLocationStats,
  getPublicLocationData,
  readManagedLocationData,
} from '@/lib/admin-locations';
import { readManifest } from '@/lib/neighborhoods/catalog';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const raw = await readManagedLocationData();
    const manifest = await readManifest();
    const data = getPublicLocationData(raw, manifest.counts);

    return NextResponse.json({
      ...data,
      stats: await getLocationStats(raw),
    });
  } catch (error) {
    console.error('Locations GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
