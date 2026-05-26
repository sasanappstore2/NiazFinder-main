import type { IntentSchema, IntentType } from '@/contracts/need-intake';
import { getIntakeFieldsForCategory } from '@/config/category-filters/registry';

/** Real-estate intake — fields from category-filters registry. */
export function buildPropertyIntakeSchema(
  intentType: IntentType,
  categorySlug = 'real-estate'
): IntentSchema {
  return {
    intentType,
    label: 'املاک',
    fields: getIntakeFieldsForCategory(categorySlug),
  };
}
