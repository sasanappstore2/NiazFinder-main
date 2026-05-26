import type { IntentSchema, IntentType } from '@/contracts/need-intake';
import { getIntakeFieldsForCategory } from '@/config/category-filters/registry';

export function buildServicesIntakeSchema(
  intentType: IntentType,
  categorySlug = 'services'
): IntentSchema {
  return {
    intentType,
    label: 'خدمات',
    fields: getIntakeFieldsForCategory(categorySlug),
  };
}
