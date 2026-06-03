import type { CityHexCell, HexCell, NationalHexLayout, ProvinceCityLayout } from '@/lib/geo/types';
import nationalLayout from '@/data/geo/iran-national-hex-layout.json';
import provincePaths from '@/data/geo/iran-provinces-paths.json';
import cityCentroids from '@/data/geo/iran-cities-centroids.json';
import { provinceLabel, cityLabel } from '@/lib/analytics/geo-location-index';

const layout = nationalLayout as NationalHexLayout;
const paths = provincePaths as { features: Array<{ id: string; name: string; path: string }> };

export function getNationalLayout(): NationalHexLayout {
  return layout;
}

export function getProvinceCell(id: string): HexCell | undefined {
  return layout.cells.find((c) => c.id === id);
}

export function getProvinceBoundaryPath(id: string): string | undefined {
  return paths.features.find((f) => f.id === id)?.path;
}

const cityLayoutCache = new Map<string, ProvinceCityLayout>();

export async function loadProvinceCityLayout(provinceId: string): Promise<ProvinceCityLayout | null> {
  if (cityLayoutCache.has(provinceId)) return cityLayoutCache.get(provinceId)!;
  try {
    const res = await fetch(`/api/super-admin/analytics/geo/layout?province=${encodeURIComponent(provinceId)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as ProvinceCityLayout;
    cityLayoutCache.set(provinceId, data);
    return data;
  } catch {
    return null;
  }
}

export function getCityCentroids(provinceId?: string) {
  const all = cityCentroids.cities as Array<{ cityId: string; provinceId: string; lat: number; lng: number; name: string }>;
  return provinceId ? all.filter((c) => c.provinceId === provinceId) : all;
}

export function labelForProvince(id: string): string {
  return provinceLabel(id);
}

export function labelForCity(id: string): string {
  return cityLabel(id);
}

export type { HexCell, CityHexCell, ProvinceCityLayout };
