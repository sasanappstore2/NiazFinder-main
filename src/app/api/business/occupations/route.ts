import { NextResponse } from 'next/server';
import { readManagedOccupations, setOccupationsCache } from '@/lib/business/occupations-registry';
import { compareOccupationsByDisplayOrder } from '@/config/business-occupations';

export const runtime = 'nodejs';

/** Public read-only occupation registry for client pickers. */
export async function GET() {
  try {
    const occupations = await readManagedOccupations();
    setOccupationsCache(occupations);

    const active = occupations.filter((o) => o.isActive !== false);
    const sectors = active.filter((o) => o.depth === 0).sort(compareOccupationsByDisplayOrder);
    const jobs = active.filter((o) => o.depth === 1).sort(compareOccupationsByDisplayOrder);

    return NextResponse.json({ sectors, jobs, occupations: active });
  } catch (error) {
    console.error('Business occupations GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
