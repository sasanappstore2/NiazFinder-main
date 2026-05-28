import type { IntakeEntities } from '@/intake/types';

export type EntityFieldType = 'string' | 'number' | 'enum';

export interface EntityFieldDefinition {
  key: keyof IntakeEntities;
  type: EntityFieldType;
  required: boolean;
  searchable: boolean;
  matchRelevant: boolean;
}

export const ENTITY_FIELD_REGISTRY: Record<keyof IntakeEntities, EntityFieldDefinition> = {
  vertical: { key: 'vertical', type: 'string', required: false, searchable: false, matchRelevant: false },
  category: { key: 'category', type: 'string', required: false, searchable: true, matchRelevant: true },
  categorySlug: { key: 'categorySlug', type: 'string', required: false, searchable: true, matchRelevant: true },
  subcategorySlug: { key: 'subcategorySlug', type: 'string', required: false, searchable: true, matchRelevant: true },
  city: { key: 'city', type: 'string', required: false, searchable: true, matchRelevant: true },
  citySlug: { key: 'citySlug', type: 'string', required: false, searchable: true, matchRelevant: true },
  province: { key: 'province', type: 'string', required: false, searchable: false, matchRelevant: false },
  neighborhood: { key: 'neighborhood', type: 'string', required: false, searchable: true, matchRelevant: true },
  neighborhoodSlug: { key: 'neighborhoodSlug', type: 'string', required: false, searchable: true, matchRelevant: true },
  area: { key: 'area', type: 'number', required: false, searchable: true, matchRelevant: true },
  budgetMin: { key: 'budgetMin', type: 'number', required: false, searchable: true, matchRelevant: true },
  budgetMax: { key: 'budgetMax', type: 'number', required: false, searchable: true, matchRelevant: true },
  rooms: { key: 'rooms', type: 'number', required: false, searchable: true, matchRelevant: true },
  transactionType: { key: 'transactionType', type: 'enum', required: false, searchable: true, matchRelevant: true },
};

export function hasEntityValue(entities: IntakeEntities, field: string): boolean {
  switch (field) {
    case 'category':
      return Boolean(entities.categorySlug);
    case 'city':
      return Boolean(entities.city);
    case 'neighborhood':
      return Boolean(entities.neighborhood);
    case 'transactionType':
      return Boolean(entities.transactionType);
    case 'area':
      return entities.area != null;
    case 'budget':
      return entities.budgetMin != null || entities.budgetMax != null;
    case 'rooms':
      return entities.rooms != null;
    case 'description':
    case 'urgency':
      return false;
    default:
      return false;
  }
}
