import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { readManagedOccupations, setOccupationsCache } from '@/lib/business/occupations-registry';
import { compareOccupationsByDisplayOrder } from '@/config/business-occupations';

export const runtime = 'nodejs';

const getOccupationsPayload = unstable_cache(
  async () => {
    const occupations = await readManagedOccupations();
    setOccupationsCache(occupations);

    const active = occupations.filter((o) => o.isActive !== false);
    const sectors = active.filter((o) => o.depth === 0).sort(compareOccupationsByDisplayOrder);
    const jobs = active.filter((o) => o.depth === 1).sort(compareOccupationsByDisplayOrder);

    return { sectors, jobs, occupations: active };
  },
  ['business-occupations-public'],
  { revalidate: 300, tags: ['business-occupations'] }
);

/** Public read-only occupation registry for client pickers. */
export async function GET() {
  try {
    const payload = await getOccupationsPayload();
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Business occupations GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
