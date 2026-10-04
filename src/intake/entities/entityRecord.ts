import type { IntakeEntities } from '@/intake/types';
import { resolveCategoryLevels } from '@/config/categories';

export function entitiesToRecord(entities: IntakeEntities): Record<string, unknown> {
  return {
    ...(entities as unknown as Record<string, unknown>),
    vertical: entities.vertical,
    category: entities.category,
    categorySlug: entities.categorySlug,
    subcategorySlug: entities.subcategorySlug,
    city: entities.city,
    citySlug: entities.citySlug,
    province: entities.province,
    neighborhood: entities.neighborhood,
    neighborhoodSlug: entities.neighborhoodSlug,
    area: entities.area,
    budgetMin: entities.budgetMin,
    budgetMax: entities.budgetMax,
    rooms: entities.rooms,
    transactionType: entities.transactionType,
    lat: entities.lat,
    lng: entities.lng,
  };
}

export function recordToEntities(record: Record<string, unknown>): IntakeEntities {
  const numberValue = (...keys: string[]): number | null => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.replace(/,/g, '').trim());
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return null;
  };

  const canonicalKeys = new Set([
    'vertical', 'category', 'categorySlug', 'subcategorySlug', 'city', 'citySlug',
    'province', 'neighborhood', 'neighborhoodSlug', 'area', 'areaMin', 'budget',
    'budgetMin', 'budgetMax', 'rooms', 'transactionType', 'lat', 'lng',
  ]);
  const rawCategorySlug = typeof record.categorySlug === 'string' ? record.categorySlug : null;
  const rawSubcategorySlug =
    typeof record.subcategorySlug === 'string' ? record.subcategorySlug : null;
  const categoryLevels = rawCategorySlug || rawSubcategorySlug
    ? resolveCategoryLevels(rawCategorySlug || rawSubcategorySlug || '', rawSubcategorySlug)
    : null;
  const categorySlug = categoryLevels?.categorySlug ?? rawCategorySlug;
  const subcategorySlug = categoryLevels?.subcategorySlug ?? rawSubcategorySlug;
  return {
    ...Object.fromEntries(
      Object.entries(record).filter(([key, value]) => !canonicalKeys.has(key) && value != null)
    ),
    vertical: typeof record.vertical === 'string' ? record.vertical : null,
    category: typeof record.category === 'string' ? record.category : null,
    // A root hint can arrive beside a concrete leaf from the analyzer. Resolve
    // that pair here so every consumer sees one canonical category identity.
    categorySlug,
    subcategorySlug,
    city: typeof record.city === 'string' ? record.city : null,
    citySlug: typeof record.citySlug === 'string' ? record.citySlug : null,
    province: typeof record.province === 'string' ? record.province : null,
    neighborhood: typeof record.neighborhood === 'string' ? record.neighborhood : null,
    neighborhoodSlug: typeof record.neighborhoodSlug === 'string' ? record.neighborhoodSlug : null,
    // `areaMin` and `budget` are legacy field names. Normalize them at the
    // entity boundary so every builder, validator and UI reader sees the same
    // canonical values.
    area: numberValue('area', 'areaMin'),
    budgetMin: numberValue('budgetMin'),
    budgetMax: numberValue('budgetMax', 'budget'),
    rooms: typeof record.rooms === 'number' ? record.rooms : null,
    propertyKind: typeof record.propertyKind === 'string' ? record.propertyKind : null,
    deedType: typeof record.deedType === 'string' ? record.deedType : null,
    rahnAmount: numberValue('rahnAmount'),
    monthlyRent: numberValue('monthlyRent'),
    deposit: numberValue('deposit'),
    transactionType:
      typeof record.transactionType === 'string'
        ? (record.transactionType as IntakeEntities['transactionType'])
        : null,
    lat: typeof record.lat === 'number' && Number.isFinite(record.lat) ? record.lat : null,
    lng: typeof record.lng === 'number' && Number.isFinite(record.lng) ? record.lng : null,
  };
}
