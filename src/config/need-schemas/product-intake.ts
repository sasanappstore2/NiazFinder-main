import type { IntentSchema, IntentType } from '@/contracts/need-intake';
import { getIntakeFieldsForCategory } from '@/config/category-filters/registry';

export function buildProductIntakeSchema(
  intentType: IntentType,
  categorySlug = 'electronics'
): IntentSchema {
  return {
    intentType,
    label: 'کالا',
    fields: getIntakeFieldsForCategory(categorySlug),
  };
}
