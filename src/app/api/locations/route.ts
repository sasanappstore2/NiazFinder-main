import { NextResponse } from 'next/server';
import {
  getLocationStats,
  getPublicLocationData,
  readManagedLocationData,
} from '@/lib/admin-locations';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = getPublicLocationData(await readManagedLocationData());

    return NextResponse.json({
      ...data,
      stats: getLocationStats(data),
    });
  } catch (error) {
    console.error('Locations GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
