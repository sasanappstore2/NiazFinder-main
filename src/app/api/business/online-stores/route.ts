import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { readManagedOnlineStores, setOnlineStoresCache } from '@/lib/business/online-stores-registry';
import { compareOnlineStoresByDisplayOrder } from '@/config/online-stores';

export const runtime = 'nodejs';

const getOnlineStoresPayload = unstable_cache(
  async () => {
    const categories = await readManagedOnlineStores();
    setOnlineStoresCache(categories);

    const active = categories.filter((c) => c.isActive !== false);
    const sectors = active.filter((c) => c.depth === 0).sort(compareOnlineStoresByDisplayOrder);
    const leaves = active.filter((c) => c.depth === 1).sort(compareOnlineStoresByDisplayOrder);

    return { sectors, leaves, categories: active };
  },
  ['business-online-stores-public'],
  { revalidate: 300, tags: ['business-online-stores'] }
);

/** Public read-only online store registry for client pickers. */
export async function GET() {
  try {
    const payload = await getOnlineStoresPayload();
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Online stores GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
