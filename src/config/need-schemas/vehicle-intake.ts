import type { IntentSchema, IntentType } from '@/contracts/need-intake';
import { getIntakeFieldsForCategory } from '@/config/category-filters/registry';

export function buildVehicleIntakeSchema(
  intentType: IntentType,
  categorySlug = 'vehicles'
): IntentSchema {
  return {
    intentType,
    label: 'وسایل نقلیه',
    fields: getIntakeFieldsForCategory(categorySlug),
  };
}
