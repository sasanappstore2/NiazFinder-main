import type { IntakeEntities } from '@/intake/types';

export function entitiesToRecord(entities: IntakeEntities): Record<string, unknown> {
  return {
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
  return {
    vertical: typeof record.vertical === 'string' ? record.vertical : null,
    category: typeof record.category === 'string' ? record.category : null,
    categorySlug: typeof record.categorySlug === 'string' ? record.categorySlug : null,
    subcategorySlug: typeof record.subcategorySlug === 'string' ? record.subcategorySlug : null,
    city: typeof record.city === 'string' ? record.city : null,
    citySlug: typeof record.citySlug === 'string' ? record.citySlug : null,
    province: typeof record.province === 'string' ? record.province : null,
    neighborhood: typeof record.neighborhood === 'string' ? record.neighborhood : null,
    neighborhoodSlug: typeof record.neighborhoodSlug === 'string' ? record.neighborhoodSlug : null,
    area: typeof record.area === 'number' ? record.area : null,
    budgetMin: typeof record.budgetMin === 'number' ? record.budgetMin : null,
    budgetMax: typeof record.budgetMax === 'number' ? record.budgetMax : null,
    rooms: typeof record.rooms === 'number' ? record.rooms : null,
    transactionType:
      typeof record.transactionType === 'string'
        ? (record.transactionType as IntakeEntities['transactionType'])
        : null,
    lat: typeof record.lat === 'number' && Number.isFinite(record.lat) ? record.lat : null,
    lng: typeof record.lng === 'number' && Number.isFinite(record.lng) ? record.lng : null,
  };
}
