import type { Business, ProfileTemplate } from '@/contracts/business-profile';
import {
  getOccupationBySlug,
  getOccupationPath,
  isAncestorOccupation,
} from '@/config/business-occupations';
import {
  getOnlineStoreBySlug,
  getOnlineStorePath,
  isAncestorOnlineStore,
} from '@/config/online-stores';
import { isPickableProfileCategorySlug } from '@/lib/business/business-category';
import { BLUEPRINT_SPECS } from './specs';
import type { BusinessProfileBlueprint, ProfileTabId, ProfileTabSpec } from './types';

export const DEFAULT_BLUEPRINT = BLUEPRINT_SPECS.find((b) => b.id === 'company')!;

function slugMatchesProfileRules(
  slug: string,
  match: BusinessProfileBlueprint['match']
): boolean {
  const occPath = getOccupationPath(slug);
  const occSector = occPath[0]?.slug ?? slug;
  const occupation = getOccupationBySlug(slug);

  if (match.occupationSlugs?.includes(slug)) return true;
  if (match.occupationSectors?.some((s) => occSector === s || isAncestorOccupation(s, slug))) {
    return true;
  }
  if (occupation?.depth === 1 && match.occupationSectors?.includes(occupation.parentSlug ?? '')) {
    return true;
  }

  const storePath = getOnlineStorePath(slug);
  const storeSector = storePath[0]?.slug ?? slug;
  const onlineStore = getOnlineStoreBySlug(slug);

  if (match.onlineStoreSlugs?.includes(slug)) return true;
  if (match.onlineStoreSectors?.some((s) => storeSector === s || isAncestorOnlineStore(s, slug))) {
    return true;
  }
  if (
    onlineStore?.depth === 1 &&
    match.onlineStoreSectors?.includes(onlineStore.parentSlug ?? '')
  ) {
    return true;
  }

  return false;
}

function categoriesMatch(business: Business, blueprint: BusinessProfileBlueprint): boolean {
  const categories = business.identity.category;
  if (categories.length === 0) return false;

  const { match } = blueprint;

  if (match.extensionHint) {
    const ext = business.extensions?.[match.extensionHint as keyof typeof business.extensions];
    if (ext && typeof ext === 'object' && Object.keys(ext as object).length > 0) {
      if (match.extensionHint === 'restaurant' && business.extensions?.restaurant?.menu?.length) {
        return true;
      }
      if (match.extensionHint === 'realEstate' && business.extensions?.realEstate?.listings?.length) {
        return true;
      }
      if (match.extensionHint === 'doctor' && business.extensions?.doctor) return true;
      if (match.extensionHint === 'mechanic' && business.extensions?.mechanic) return true;
      if (match.extensionHint === 'company' && business.extensions?.company) return true;
      if (match.extensionHint === 'coach' && business.extensions?.coach) return true;
    }
  }

  for (const cat of categories) {
    if (slugMatchesProfileRules(cat, match)) return true;
  }

  return false;
}

/** Resolve blueprint from explicit template or profile category slugs. */
export function getBlueprintForBusiness(business: Business): BusinessProfileBlueprint {
  const explicit = business.layoutConfig?.template;
  if (explicit) {
    const found = BLUEPRINT_SPECS.find((b) => b.id === explicit);
    if (found) return found;
  }

  for (const blueprint of BLUEPRINT_SPECS) {
    if (blueprint.id === 'company') continue;
    if (categoriesMatch(business, blueprint)) return blueprint;
  }

  return DEFAULT_BLUEPRINT;
}

export function getBlueprintByTemplate(template: ProfileTemplate): BusinessProfileBlueprint {
  return BLUEPRINT_SPECS.find((b) => b.id === template) ?? DEFAULT_BLUEPRINT;
}

export function getBlueprintForOccupationSlug(slug: string): BusinessProfileBlueprint {
  const occPath = getOccupationPath(slug);
  const storePath = getOnlineStorePath(slug);
  const pathSlugs =
    occPath.length > 0
      ? [slug, ...occPath.map((p) => p.slug)]
      : storePath.length > 0
        ? [slug, ...storePath.map((p) => p.slug)]
        : [slug];

  if (occPath.length === 0 && storePath.length === 0) {
    return DEFAULT_BLUEPRINT;
  }

  const mockBusiness: Business = {
    id: '',
    userId: '',
    name: '',
    slug: '',
    identity: {
      description: '',
      category: [...new Set(pathSlugs)],
      tags: [],
      location: { city: '' },
      status: 'active',
    },
    trust: { rating: 0, reviewCount: 0, verified: false, badges: [], responseRate: 0, yearsActive: 0 },
    offers: [],
    portfolio: [],
    reviews: [],
    aiAssistantConfig: { systemPrompt: '', dynamicQuestions: [] },
    contact: { chatEnabled: true },
    seo: { title: '', description: '', keywords: [] },
    analytics: { views: 0, clicks: 0, conversions: 0, saves: 0 },
  };

  return getBlueprintForBusiness(mockBusiness);
}

/** @deprecated Use getBlueprintForOccupationSlug — profile slugs include occupations and online stores. */
export const getBlueprintForCategorySlug = getBlueprintForOccupationSlug;

export function getTabsForBusiness(business: Business): ProfileTabSpec[] {
  return getBlueprintForBusiness(business).tabs;
}

export function getTabIdsForBusiness(business: Business): ProfileTabId[] {
  return getTabsForBusiness(business).map((t) => t.id);
}

export function isValidTabForBusiness(business: Business, tabId: string): tabId is ProfileTabId {
  return getTabIdsForBusiness(business).includes(tabId as ProfileTabId);
}

export function getPrimaryOccupationSlug(categories: string[]): string | null {
  if (categories.length === 0) return null;
  const first = categories[0]?.trim();
  if (first && isPickableProfileCategorySlug(first)) return first;
  for (const s of categories) {
    if (isPickableProfileCategorySlug(s)) return s;
  }
  return categories[0] ?? null;
}

/** @deprecated Alias — returns primary profile category slug. */
export const getPrimaryCategorySlug = getPrimaryOccupationSlug;

export { BLUEPRINT_SPECS };
