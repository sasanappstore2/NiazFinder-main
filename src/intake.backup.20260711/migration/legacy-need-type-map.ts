/**
 * One-time migration mapping: legacy needType string → canonical templateId.
 * @deprecated Runtime forbidden — DB backfill, analytics historical dashboards only.
 */
export const LEGACY_NEED_TYPE_TO_TEMPLATE_ID: Readonly<Record<string, string>> = {
  'apartment-rent-seeking': 'residential-rent',
  'apartment-buy-seeking': 'residential-sale',
  'real-estate-seeking': 'residential-rent',
  'car-seeking': 'vehicles',
  'plumbing-service-seeking': 'services',
  'general-seeking': 'general',
};

/** Read path for historical records that still store legacy needType. */
export function resolveTemplateIdFromLegacyNeedType(legacyNeedType: string): string {
  return LEGACY_NEED_TYPE_TO_TEMPLATE_ID[legacyNeedType] ?? 'general';
}
