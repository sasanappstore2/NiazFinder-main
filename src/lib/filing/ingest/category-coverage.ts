import type { RegionalFiling } from '@prisma/client';
import {
  DEAL_REQUIRED_FINANCIAL,
  type FilingDealType,
  type FilingPropertyKind,
  isFilingDealType,
  isFilingPropertyKind,
} from '@/lib/filing/schema/attribute-schema';
import { FILING_CATEGORY_TEMPLATES } from '@/lib/filing/schema/category-templates';
import type { FilingSourceMeta } from '@/lib/filing/types';

const SOURCE_META_SPEC_KEYS = ['plotWidth', 'landUse', 'frontage', 'commercialUse'] as const;

export type FilingCoverageRow = Pick<
  RegionalFiling,
  | 'id'
  | 'dealType'
  | 'propertyKind'
  | 'fileCode'
  | 'postedAt'
  | 'dataCompleteness'
  | 'enrichedAt'
  | 'sourceMetaJson'
  | 'title'
  | 'description'
  | 'price'
  | 'deposit'
  | 'monthlyRent'
  | 'pricePerMeter'
  | 'area'
  | 'rooms'
  | 'floor'
  | 'totalFloors'
  | 'unitsCount'
  | 'buildingAge'
  | 'documentType'
  | 'cabinet'
  | 'flooring'
  | 'wallCover'
  | 'facade'
  | 'orientation'
  | 'heating'
  | 'cooling'
  | 'exchangeable'
  | 'hasParking'
  | 'hasStorage'
  | 'hasElevator'
  | 'hasSecurityDoor'
  | 'hasTerrace'
  | 'hasBuiltInWardrobe'
  | 'detailUrl'
  | 'image'
  | 'imagesJson'
  | 'city'
  | 'neighborhood'
  | 'location'
>;

export function parseFilingSourceMeta(json: string | null | undefined): FilingSourceMeta {
  if (!json?.trim()) return {};
  try {
    return JSON.parse(json) as FilingSourceMeta;
  } catch {
    return {};
  }
}

export function isFilingFieldPresent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  return true;
}

export function fieldValueOnFiling(
  row: FilingCoverageRow,
  key: string,
  meta: FilingSourceMeta
): unknown {
  if ((SOURCE_META_SPEC_KEYS as readonly string[]).includes(key)) {
    return meta[key as keyof FilingSourceMeta];
  }
  if (key === 'images') {
    try {
      const parsed = JSON.parse(row.imagesJson || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return (row as Record<string, unknown>)[key];
}

export function expectedCrawlFieldsForKind(propertyKind: FilingPropertyKind): {
  required: string[];
  optional: string[];
} {
  const template = FILING_CATEGORY_TEMPLATES[propertyKind];
  return {
    required: [...template.crawlDetailRequired],
    optional: [...template.crawlDetailOptional],
  };
}

export function expectedFinancialFields(dealType: FilingDealType | null): string[] {
  if (!dealType) return [];
  return [...DEAL_REQUIRED_FINANCIAL[dealType]];
}

export function missingFieldsOnFiling(
  row: FilingCoverageRow,
  opts?: { includeOptional?: boolean }
): string[] {
  const meta = parseFilingSourceMeta(row.sourceMetaJson);
  const deal = isFilingDealType(row.dealType) ? row.dealType : null;
  const kind = isFilingPropertyKind(row.propertyKind) ? row.propertyKind : null;

  const expected = new Set<string>(expectedFinancialFields(deal));
  if (kind) {
    const { required, optional } = expectedCrawlFieldsForKind(kind);
    for (const key of required) expected.add(key);
    if (opts?.includeOptional) {
      for (const key of optional) expected.add(key);
    }
    for (const key of FILING_CATEGORY_TEMPLATES[kind].specKeys) {
      if (opts?.includeOptional) expected.add(key);
    }
  }

  const missing: string[] = [];
  for (const key of expected) {
    if (!isFilingFieldPresent(fieldValueOnFiling(row, key, meta))) {
      missing.push(key);
    }
  }
  return missing;
}

export type CellCoverageStats = {
  cellKey: string;
  dealType: string | null;
  propertyKind: string | null;
  count: number;
  avgCompleteness: number;
  enrichedCount: number;
  fieldRates: Record<string, number>;
  topMissing: Array<{ field: string; missingCount: number }>;
};

export function buildCellCoverageStats(
  rows: FilingCoverageRow[],
  groupKey: (row: FilingCoverageRow) => string
): CellCoverageStats[] {
  const groups = new Map<string, FilingCoverageRow[]>();
  for (const row of rows) {
    const key = groupKey(row);
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  const stats: CellCoverageStats[] = [];
  for (const [cellKey, bucket] of groups) {
    const fieldCounts = new Map<string, number>();
    const missingCounts = new Map<string, number>();
    let completenessSum = 0;
    let enrichedCount = 0;

    for (const row of bucket) {
      const meta = parseFilingSourceMeta(row.sourceMetaJson);
      if (row.enrichedAt) enrichedCount += 1;
      completenessSum += row.dataCompleteness ?? 0;

      const deal = isFilingDealType(row.dealType) ? row.dealType : null;
      const kind = isFilingPropertyKind(row.propertyKind) ? row.propertyKind : null;
      const trackKeys = new Set<string>([
        ...expectedFinancialFields(deal),
        ...(kind ? expectedCrawlFieldsForKind(kind).required : []),
        ...(kind ? FILING_CATEGORY_TEMPLATES[kind].specKeys : []),
        ...SOURCE_META_SPEC_KEYS,
        'description',
        'image',
        'images',
      ]);

      for (const key of trackKeys) {
        const present = isFilingFieldPresent(fieldValueOnFiling(row, key, meta));
        if (present) {
          fieldCounts.set(key, (fieldCounts.get(key) ?? 0) + 1);
        } else {
          missingCounts.set(key, (missingCounts.get(key) ?? 0) + 1);
        }
      }
    }

    const count = bucket.length;
    const fieldRates: Record<string, number> = {};
    for (const [field, filled] of fieldCounts) {
      fieldRates[field] = Math.round((filled / count) * 1000) / 1000;
    }

    const topMissing = [...missingCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([field, missingCount]) => ({ field, missingCount }));

    stats.push({
      cellKey,
      dealType: bucket[0]?.dealType ?? null,
      propertyKind: bucket[0]?.propertyKind ?? null,
      count,
      avgCompleteness: count ? Math.round(completenessSum / count) : 0,
      enrichedCount,
      fieldRates,
      topMissing,
    });
  }

  return stats.sort((a, b) => a.cellKey.localeCompare(b.cellKey));
}
