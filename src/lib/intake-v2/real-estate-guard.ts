import type { IntentType, ParsedIntent } from '@/contracts/need-intake';
import { getCategoryPath } from '@/config/categories';

const REAL_ESTATE_INTENTS = new Set<IntentType>([
  'property_search',
  'property_listing',
  'real_estate_service',
]);

const CLEARLY_NON_REAL_ESTATE = new Set<IntentType>([
  'vehicle_search',
  'vehicle_listing',
  'vehicle_service',
  'product_search',
  'product_listing',
  'job_search',
]);

export function isRealEstateCategorySlug(categorySlug: string): boolean {
  if (!categorySlug || categorySlug === 'general') return false;
  const root = getCategoryPath(categorySlug)[0]?.slug;
  return root === 'real-estate';
}

/** Whether parsed intent looks like real-estate intake (v2 scope). */
export function isRealEstateIntent(parsed: ParsedIntent): boolean {
  if (REAL_ESTATE_INTENTS.has(parsed.intentType)) return true;
  if (isRealEstateCategorySlug(parsed.categorySlug)) return true;
  return false;
}

/** Off-topic when clearly another vertical with decent confidence. */
export function isOffTopicNonRealEstate(parsed: ParsedIntent): boolean {
  if (isRealEstateIntent(parsed)) return false;
  if (parsed.intentType === 'general' || parsed.intentType === 'help_request') {
    return parsed.confidence >= 0.75 && !isRealEstateCategorySlug(parsed.categorySlug);
  }
  if (CLEARLY_NON_REAL_ESTATE.has(parsed.intentType)) {
    return parsed.confidence >= 0.55;
  }
  return (
    parsed.confidence >= 0.7 &&
    !isRealEstateCategorySlug(parsed.categorySlug) &&
    !REAL_ESTATE_INTENTS.has(parsed.intentType)
  );
}
