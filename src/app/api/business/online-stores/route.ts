import { NextResponse } from 'next/server';
import { readManagedOnlineStores, setOnlineStoresCache } from '@/lib/business/online-stores-registry';
import { compareOnlineStoresByDisplayOrder } from '@/config/online-stores';

export const runtime = 'nodejs';

/** Public read-only online store registry for client pickers. */
export async function GET() {
  try {
    const categories = await readManagedOnlineStores();
    setOnlineStoresCache(categories);

    const active = categories.filter((c) => c.isActive !== false);
    const sectors = active.filter((c) => c.depth === 0).sort(compareOnlineStoresByDisplayOrder);
    const leaves = active.filter((c) => c.depth === 1).sort(compareOnlineStoresByDisplayOrder);

    return NextResponse.json({ sectors, leaves, categories: active });
  } catch (error) {
    console.error('Online stores GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
