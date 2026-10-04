import type { IntakeFieldMeta } from '@/intake/template/types';
import type { IntakeEntities } from '@/intake/types';
import { hasEntityValue } from '@/intake/entities/entityRegistry';
import { resolveFieldValue } from '@/intake/state/resolveFieldValue';

export interface FieldFilledContext {
  entities: IntakeEntities | null;
  answers: Record<string, string | number | boolean | string[]>;
  selectedCategory?: string;
  selectedSubcategory?: string;
  selectedCity?: string;
  selectedNeighborhood?: string;
  sourceText?: string;
  parsedBrand?: string;
}

export function isFieldFilled(
  field: IntakeFieldMeta,
  ctx: FieldFilledContext
): boolean {
  const { entities, answers, selectedCategory, selectedSubcategory, selectedCity, selectedNeighborhood } =
    ctx;

  if (field.type === 'category') {
    return Boolean(selectedCategory) || Boolean(entities?.categorySlug);
  }
  if (field.type === 'city') {
    return Boolean(selectedCity?.trim()) || Boolean(entities?.city?.trim());
  }
  if (field.type === 'neighborhood') {
    return (
      Boolean(selectedNeighborhood?.trim()) ||
      Boolean(entities?.neighborhood?.trim()) ||
      Boolean(entities?.neighborhoodSlug?.trim())
    );
  }
  if (field.type === 'mapPin') {
    return entities ? hasEntityValue(entities, 'mapPin') : false;
  }

  if (field.storage === 'entity' && entities) {
    if (field.key === 'budget') return hasEntityValue(entities, 'budget');
    if (field.key === 'transactionType') return hasEntityValue(entities, 'transactionType');
    if (field.key === 'area' || field.key === 'areaMin') return hasEntityValue(entities, 'area');
    if (field.key === 'rooms') return hasEntityValue(entities, 'rooms');
    if (field.key === 'subcategory') {
      return Boolean(selectedSubcategory) || Boolean(entities?.subcategorySlug);
    }
  }

  const value = resolveFieldValue(
    field,
    answers,
    entities,
    ctx.sourceText,
    ctx.parsedBrand
  );
  if (Array.isArray(value)) return value.length > 0;
  return value != null && value !== '';
}
