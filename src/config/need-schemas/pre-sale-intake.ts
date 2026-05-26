import type { IntentSchema, IntentType } from '@/contracts/need-intake';
import { getIntakeFieldsForCategory } from '@/config/category-filters/registry';

export function buildPreSaleIntakeSchema(intentType: IntentType): IntentSchema {
  return {
    intentType,
    label: 'پیش‌فروش',
    fields: getIntakeFieldsForCategory('pre-sale-services'),
  };
}
