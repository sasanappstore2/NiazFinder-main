import type {
  Business,
  ProfileSectionId,
  ProfileTabId,
  ResolvedProfileLayout,
} from '@/contracts/business-profile';
import {
  getBlueprintForBusiness,
  getTabIdsForBusiness,
  isValidTabForBusiness,
} from '@/config/business-profile-blueprints';

export function resolveDefaultProfileTab(business: Business): ProfileTabId {
  const configured = business.layoutConfig?.defaultTab;
  if (configured && isValidTabForBusiness(business, configured)) return configured;

  const blueprint = getBlueprintForBusiness(business);
  return blueprint.defaultTab;
}

export function parseProfileTabParam(
  business: Business,
  value: string | null
): ProfileTabId | null {
  if (!value) return null;
  return isValidTabForBusiness(business, value) ? (value as ProfileTabId) : null;
}

export function getTabSpecsForBusiness(business: Business) {
  return getBlueprintForBusiness(business).tabs;
}

/** LTR display order: reverse tab order for RTL page chrome */
export function getTabDisplayOrder(business: Business): ProfileTabId[] {
  return [...getTabSpecsForBusiness(business)].reverse().map((t) => t.id);
}

export function getSectionsForTab(
  tab: ProfileTabId,
  business: Business,
  layout: ResolvedProfileLayout
): ProfileSectionId[] {
  const blueprint = getBlueprintForBusiness(business);
  const tabSpec = blueprint.tabs.find((t) => t.id === tab);
  if (!tabSpec) return [];

  const visible = new Set(layout.sections.filter((s) => s.visible).map((s) => s.id));
  return tabSpec.sections.filter((id) => visible.has(id));
}

export function tabHasContent(
  tab: ProfileTabId,
  business: Business,
  layout: ResolvedProfileLayout
): boolean {
  if (tab === 'portfolio' || tab === 'gallery') return business.portfolio.length > 0;
  if (tab === 'products' || tab === 'services') return business.offers.length > 0;
  if (tab === 'reviews') return business.reviews.length > 0 || business.trust.reviewCount > 0;
  if (tab === 'listings') return (business.extensions?.realEstate?.listings?.length ?? 0) > 0;
  if (tab === 'menu') return (business.extensions?.restaurant?.menu?.length ?? 0) > 0;
  if (tab === 'company') {
    const c = business.extensions?.company;
    return Boolean(c?.legalName || c?.registrationNumber || c?.industry);
  }
  if (tab === 'needs') return true;
  return (
    getSectionsForTab(tab, business, layout).length > 0 ||
    Boolean(business.identity.description?.trim())
  );
}

export function getValidTabIds(business: Business): ProfileTabId[] {
  return getTabIdsForBusiness(business);
}
