import type { IntentSchema, IntentType } from '@/contracts/need-intake';
import { getSchemaForIntake } from './resolve-schema';

/** Legacy: intent-only schema (prefer getSchemaForIntake with categorySlug). */
export function getSchemaForIntent(intentType: IntentType): IntentSchema {
  return getSchemaForIntake(intentType, 'services');
}

export { getSchemaForIntake, getRootCategorySlug } from './resolve-schema';
export { buildPropertyIntakeSchema } from './property-intake';
export { buildVehicleIntakeSchema } from './vehicle-intake';
export { buildProductIntakeSchema } from './product-intake';
export { buildServicesIntakeSchema } from './services-intake';
export { buildJobsIntakeSchema } from './jobs-intake';
