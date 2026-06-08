import provincesMeta from '@/data/geo/iran-provinces-meta.json';
import type { BusinessMapBbox } from '@/lib/business/map-pins-types';
import { provinceSlugToId } from '@/lib/search/province-slugs';

type ProvinceMetaRow = {
  id: string;
  bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number };
};

const PROVINCES = (provincesMeta.provinces ?? []) as ProvinceMetaRow[];
const BY_ID = new Map(PROVINCES.map((p) => [p.id, p]));

function metaToBbox(row: ProvinceMetaRow): BusinessMapBbox {
  return {
    west: row.bbox.minLon,
    south: row.bbox.minLat,
    east: row.bbox.maxLon,
    north: row.bbox.maxLat,
  };
}

export function resolveBusinessMapProvinceBounds(provinceSlugs: string[]): BusinessMapBbox | null {
  if (provinceSlugs.length === 0) return null;

  const boxes: BusinessMapBbox[] = [];
  for (const slug of provinceSlugs) {
    const id = provinceSlugToId(slug);
    const row = BY_ID.get(id);
    if (row) boxes.push(metaToBbox(row));
  }

  if (boxes.length === 0) return null;
  if (boxes.length === 1) return boxes[0]!;

  return {
    south: Math.min(...boxes.map((b) => b.south)),
    north: Math.max(...boxes.map((b) => b.north)),
    west: Math.min(...boxes.map((b) => b.west)),
    east: Math.max(...boxes.map((b) => b.east)),
  };
}

export function resolveBusinessMapProvinceCenter(provinceSlugs: string[]): {
  lat: number;
  lng: number;
  zoom: number;
} {
  const bounds = resolveBusinessMapProvinceBounds(provinceSlugs);
  if (!bounds) return { lat: 32.4279, lng: 53.688, zoom: 5.5 };

  const lat = (bounds.south + bounds.north) / 2;
  const lng = (bounds.west + bounds.east) / 2;
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;
  const span = Math.max(latSpan, lngSpan);

  let zoom = 7;
  if (span > 8) zoom = 5.5;
  else if (span > 5) zoom = 6;
  else if (span > 3) zoom = 6.5;
  else if (span > 1.5) zoom = 7;
  else zoom = 8;

  return { lat, lng, zoom };
}
