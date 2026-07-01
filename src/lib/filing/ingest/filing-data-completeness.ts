import type { NormalizedScrapedRow } from '@/lib/filing/ingest/normalize-listing';

const COMPLETENESS_WEIGHTS: Array<{ key: keyof NormalizedScrapedRow | 'image' | 'images'; weight: number }> = [
  { key: 'title', weight: 5 },
  { key: 'fileCode', weight: 5 },
  { key: 'dealType', weight: 5 },
  { key: 'propertyKind', weight: 5 },
  { key: 'city', weight: 3 },
  { key: 'neighborhood', weight: 4 },
  { key: 'location', weight: 3 },
  { key: 'area', weight: 5 },
  { key: 'price', weight: 4 },
  { key: 'deposit', weight: 4 },
  { key: 'monthlyRent', weight: 4 },
  { key: 'pricePerMeter', weight: 3 },
  { key: 'postedAt', weight: 3 },
  { key: 'floor', weight: 4 },
  { key: 'totalFloors', weight: 3 },
  { key: 'rooms', weight: 4 },
  { key: 'buildingAge', weight: 3 },
  { key: 'documentType', weight: 3 },
  { key: 'unitsCount', weight: 2 },
  { key: 'cabinet', weight: 2 },
  { key: 'flooring', weight: 2 },
  { key: 'wallCover', weight: 2 },
  { key: 'facade', weight: 2 },
  { key: 'orientation', weight: 2 },
  { key: 'heating', weight: 2 },
  { key: 'cooling', weight: 2 },
  { key: 'description', weight: 5 },
  { key: 'hasParking', weight: 2 },
  { key: 'hasStorage', weight: 2 },
  { key: 'hasElevator', weight: 2 },
  { key: 'hasSecurityDoor', weight: 2 },
  { key: 'hasTerrace', weight: 1 },
  { key: 'hasBuiltInWardrobe', weight: 1 },
  { key: 'exchangeable', weight: 1 },
  { key: 'image', weight: 4 },
  { key: 'images', weight: 2 },
  { key: 'detailUrl', weight: 1 },
];

function isPresent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  return true;
}

export function computeFilingDataCompleteness(
  row: NormalizedScrapedRow & { image?: string | null; images?: string[] | null }
): number {
  let earned = 0;
  let total = 0;

  for (const { key, weight } of COMPLETENESS_WEIGHTS) {
    total += weight;
    if (key === 'image') {
      if (isPresent(row.image)) earned += weight;
      continue;
    }
    if (key === 'images') {
      if (isPresent(row.images)) earned += weight;
      continue;
    }
    if (isPresent(row[key])) earned += weight;
  }

  if (total === 0) return 0;
  return Math.round((earned / total) * 100);
}
