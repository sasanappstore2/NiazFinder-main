import 'server-only';

import { loadCityNeighborhoods } from '@/lib/neighborhoods/catalog';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';

export type { ManagedNeighborhood };

export async function getNeighborhoodsForCity(
  cityId: string
): Promise<ManagedNeighborhood[]> {
  return loadCityNeighborhoods(cityId);
}

export async function resolveNeighborhoodSlugs(
  cityId: string,
  slugs: string[]
): Promise<ManagedNeighborhood[]> {
  if (!slugs.length) return [];
  const all = await getNeighborhoodsForCity(cityId);
  const set = new Set(slugs.map((s) => s.toLowerCase()));
  return all.filter((n) => set.has(n.id.toLowerCase()));
}
