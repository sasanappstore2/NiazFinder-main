import type { Business, ProfileTemplate } from '@/contracts/business-profile';
import { getCategoryBySlug, getCategoryPath, isAncestorCategory } from '@/config/categories';
import { BLUEPRINT_SPECS } from './specs';
import type { BusinessProfileBlueprint, ProfileTabId, ProfileTabSpec } from './types';

export const DEFAULT_BLUEPRINT = BLUEPRINT_SPECS.find((b) => b.id === 'company')!;

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
    const path = getCategoryPath(cat);
    const root = path[0]?.slug ?? cat;
    const parent = path.length >= 2 ? path[path.length - 2]?.slug : null;

    if (match.rootSlugs?.some((r) => root === r || isAncestorCategory(r, cat))) return true;
    if (match.parentSlugs?.some((p) => cat === p || parent === p || isAncestorCategory(p, cat)))
      return true;
    if (match.leafSlugs?.some((l) => cat === l)) return true;
  }

  return false;
}

/** Resolve blueprint from explicit template or category slugs. */
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

export function getBlueprintForCategorySlug(slug: string): BusinessProfileBlueprint {
  const cat = getCategoryBySlug(slug);
  if (!cat) return DEFAULT_BLUEPRINT;

  const path = getCategoryPath(slug);
  const mockBusiness: Business = {
    id: '',
    userId: '',
    name: '',
    slug: '',
    identity: { description: '', category: [slug, ...path.map((p) => p.slug)], tags: [], location: { city: '' }, status: 'active' },
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

export function getTabsForBusiness(business: Business): ProfileTabSpec[] {
  return getBlueprintForBusiness(business).tabs;
}

export function getTabIdsForBusiness(business: Business): ProfileTabId[] {
  return getTabsForBusiness(business).map((t) => t.id);
}

export function isValidTabForBusiness(business: Business, tabId: string): tabId is ProfileTabId {
  return getTabIdsForBusiness(business).includes(tabId as ProfileTabId);
}

export function getPrimaryCategorySlug(categories: string[]): string | null {
  if (categories.length === 0) return null;
  const sorted = [...categories].sort((a, b) => {
    const da = getCategoryBySlug(a)?.depth ?? 0;
    const db = getCategoryBySlug(b)?.depth ?? 0;
    return db - da;
  });
  return sorted[0] ?? categories[0];
}

export { BLUEPRINT_SPECS };
