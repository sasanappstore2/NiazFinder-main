import type { Business } from '@/contracts/business-profile';
import { getBlueprintForBusiness } from '@/config/business-profile-blueprints';
import type { WidgetId } from '@/lib/business/widget-registry';

/** Widget ids that duplicate the blueprint «آگهی‌ها» tab. */
export const LISTING_WIDGET_IDS: WidgetId[] = [
  'active_listings',
  'sold_properties',
  'rental_properties',
];

export function profileUsesListingsTab(business: Business): boolean {
  const blueprint = getBlueprintForBusiness(business);
  return blueprint.tabs.some((tab) => tab.sections.includes('listings'));
}

export function isListingWidgetId(id: string): boolean {
  return LISTING_WIDGET_IDS.includes(id as WidgetId);
}
