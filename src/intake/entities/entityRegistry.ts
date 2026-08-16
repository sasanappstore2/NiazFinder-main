import type { IntakeEntities } from '@/intake/types';
import { isInIranLatLng } from '@/lib/map/coords';

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
  lat: { key: 'lat', type: 'number', required: false, searchable: false, matchRelevant: false },
  lng: { key: 'lng', type: 'number', required: false, searchable: false, matchRelevant: false },
};

export interface EntityValueContext {
  sourceText?: string | null;
  answers?: Record<string, unknown>;
  parsedUrgency?: string | null;
}

const MIN_DESCRIPTION_CHARS = 12;

export function hasEntityValue(
  entities: IntakeEntities,
  field: string,
  ctx?: EntityValueContext
): boolean {
  switch (field) {
    case 'category':
      return Boolean(entities.categorySlug);
    case 'city':
      return Boolean(entities.city?.trim());
    case 'neighborhood':
      return Boolean(entities.neighborhood?.trim() || entities.neighborhoodSlug?.trim());
    case 'transactionType':
      return Boolean(entities.transactionType);
    case 'area':
      return entities.area != null;
    case 'budget': {
      if (entities.budgetMin != null || entities.budgetMax != null) return true;
      const answers = ctx?.answers ?? {};
      const asNumber = (v: unknown): boolean => {
        if (typeof v === 'number') return Number.isFinite(v);
        if (typeof v === 'string' && v.trim()) return Number.isFinite(Number(v.replace(/,/g, '')));
        return false;
      };
      return asNumber(answers.rahnAmount) || asNumber(answers.monthlyRent) || asNumber(answers.budget);
    }
    case 'rooms':
      return entities.rooms != null;
    case 'description': {
      const fromAnswers = ctx?.answers?.details ?? ctx?.answers?.serviceType;
      if (fromAnswers != null && String(fromAnswers).trim().length >= MIN_DESCRIPTION_CHARS) {
        return true;
      }
      const text = ctx?.sourceText?.trim() ?? '';
      return text.length >= MIN_DESCRIPTION_CHARS;
    }
    case 'urgency': {
      const u = ctx?.parsedUrgency;
      if (u === 'URGENT' || u === 'HIGH') return true;
      const answers = ctx?.answers ?? {};
      if (answers.urgent === true || answers.urgent === 'true') return true;
      if (answers.when != null && String(answers.when).trim()) return true;
      if (answers.urgency != null && String(answers.urgency).trim()) return true;
      return false;
    }
    case 'mapPin':
      return (
        entities.lat != null &&
        entities.lng != null &&
        isInIranLatLng(entities.lat, entities.lng)
      );
    default:
      return false;
  }
}
