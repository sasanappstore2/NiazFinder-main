import type { IntentSchema, IntentType } from '@/contracts/need-intake';
import { getIntakeFieldsForCategory } from '@/config/category-filters/registry';

export function buildSocialIntakeSchema(
  intentType: IntentType,
  categorySlug = 'social'
): IntentSchema {
  return {
    intentType,
    label: 'اجتماعی',
    fields: getIntakeFieldsForCategory(categorySlug),
  };
}
