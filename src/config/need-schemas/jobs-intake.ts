import type { IntentSchema, IntentType } from '@/contracts/need-intake';
import { getIntakeFieldsForCategory } from '@/config/category-filters/registry';

export function buildJobsIntakeSchema(
  intentType: IntentType,
  categorySlug = 'jobs'
): IntentSchema {
  return {
    intentType,
    label: 'استخدام',
    fields: getIntakeFieldsForCategory(categorySlug),
  };
}
