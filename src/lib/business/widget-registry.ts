import React, { type ComponentType } from 'react';

/**
 * Dynamic Real Estate Widget Registry
 *
 * SINGLE SOURCE OF TRUTH for subtype → widgets.
 *
 * Registry keys are the **canonical business-occupation slugs** (kebab-case)
 * exactly as defined in `src/config/business-occupations-defaults.ts`. A profile
 * resolves to a subtype iff one of its `identity.category` slugs is a registry
 * key — there is no second mapping table or alternate format.
 *
 * Only widgets with a REAL data source are registered. Subtypes without
 * dedicated real widgets still render the shared ecosystem widgets. See
 * ECOSYSTEM_LIMITATIONS.md for the vehicle-readiness / migration path.
 */

/** Canonical occupation slugs under the `real-estate-facility` + construction taxonomy. */
export type RealEstateSubtype =
  | 'real-estate-agent'
  | 'real-estate-office'
  | 'interior-designer'
  | 'architect'
  | 'property-manager'
  | 'facility-maintenance'
  | 'elevator-technician'
  | 'land-surveyor'
  | 'official-appraiser'
  | 'gate-automation'
  | 'general-contractor';

export type WidgetId =
  // Real estate agent — listings (source: extensions.realEstate.listings)
  | 'active_listings'
  | 'sold_properties'
  | 'rental_properties'
  // Architect (source: portfolio / tags / offers)
  | 'architectural_portfolio'
  | 'design_styles'
  | 'project_types'
  // Interior designer (source: portfolio / offers)
  | 'portfolio_gallery'
  | 'before_after_gallery'
  | 'service_packages'
  // ─── Ecosystem widgets (shared across all real-estate subtypes) ───
  | 'reputation_score'
  | 'verification_badges'
  | 'specialization_tags'
  | 'service_coverage'
  | 'business_network'
  | 'knowledge_hub'
  | 'matching_insights'
  | 'property_request_hub';

export interface WidgetDefinition {
  id: WidgetId;
  title: string;
  description?: string;
  /** Lazy loaded component (React.lazy compatible) */
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  /** Default visibility for this subtype */
  defaultEnabled: boolean;
  /** Order within the subtype */
  defaultOrder: number;
  /** Shown only to profile owner (hub tools), hidden on public profile */
  ownerOnly?: boolean;
}

export interface WidgetConfig {
  id: WidgetId;
  enabled: boolean;
  order: number;
}

export type WidgetRegistry = Record<RealEstateSubtype, WidgetDefinition[]>;

const lazy = (path: string): React.LazyExoticComponent<React.ComponentType<any>> =>
  React.lazy(() => import(`@/components/business-profile/widgets/${path}`));

type SubtypeWidget = Omit<WidgetDefinition, 'defaultOrder'>;

/**
 * Ecosystem widgets — appended to every subtype so the maturity layer
 * (reputation, verification, specialization, coverage, network, knowledge,
 * matching insights, request hub) is available everywhere and toggleable via
 * the same widget-config mechanism.
 */
const ECOSYSTEM_WIDGETS: SubtypeWidget[] = [
  { id: 'reputation_score', title: 'امتیاز اعتبار', component: lazy('ReputationScore'), defaultEnabled: true },
  { id: 'verification_badges', title: 'احراز هویت و نشان‌ها', component: lazy('VerificationBadges'), defaultEnabled: true },
  { id: 'specialization_tags', title: 'تخصص‌ها', component: lazy('SpecializationTags'), defaultEnabled: true },
  { id: 'service_coverage', title: 'محدوده خدمات', component: lazy('ServiceCoverage'), defaultEnabled: true },
  { id: 'business_network', title: 'شبکه کسب‌وکار', component: lazy('BusinessNetwork'), defaultEnabled: false },
  { id: 'knowledge_hub', title: 'مرکز دانش', component: lazy('KnowledgeHub'), defaultEnabled: false },
  { id: 'matching_insights', title: 'تحلیل تطابق', component: lazy('MatchingInsights'), defaultEnabled: false, ownerOnly: true },
  { id: 'property_request_hub', title: 'مرکز درخواست‌ها', component: lazy('PropertyRequestHub'), defaultEnabled: false, ownerOnly: true },
];

/**
 * Build a subtype's full widget list (subtype-specific + ecosystem), ordered.
 * `enabledOverrides` lets a subtype flip an ecosystem widget's default (e.g. the
 * agent enables the request hub for "Recent Matching Needs").
 */
function withEcosystem(
  base: SubtypeWidget[],
  enabledOverrides?: Partial<Record<WidgetId, boolean>>
): WidgetDefinition[] {
  const eco = ECOSYSTEM_WIDGETS.map((w) =>
    enabledOverrides && w.id in enabledOverrides
      ? { ...w, defaultEnabled: enabledOverrides[w.id]! }
      : w
  );
  return [...base, ...eco].map((w, i) => ({ ...w, defaultOrder: i + 1 }));
}

/**
 * Central registry — keys are canonical occupation slugs. Only real widgets are
 * registered; placeholder widgets are intentionally absent.
 */
export const WIDGET_REGISTRY: WidgetRegistry = {
  // Service Areas → ecosystem `service_coverage`; Recent Matching Needs →
  // ecosystem `property_request_hub` (enabled below).
  'real-estate-agent': withEcosystem(
    [
      { id: 'active_listings', title: 'آگهی‌های فعال', component: lazy('ActiveListings'), defaultEnabled: true },
      { id: 'sold_properties', title: 'املاک فروخته‌شده', component: lazy('SoldProperties'), defaultEnabled: true },
      { id: 'rental_properties', title: 'املاک اجاره‌ای', component: lazy('RentalProperties'), defaultEnabled: true },
    ],
    { property_request_hub: true }
  ),

  'real-estate-office': withEcosystem(
    [
      { id: 'active_listings', title: 'آگهی‌های فعال', component: lazy('ActiveListings'), defaultEnabled: true },
      { id: 'sold_properties', title: 'املاک فروخته‌شده', component: lazy('SoldProperties'), defaultEnabled: true },
      { id: 'rental_properties', title: 'املاک اجاره‌ای', component: lazy('RentalProperties'), defaultEnabled: true },
    ],
    { property_request_hub: true }
  ),

  'interior-designer': withEcosystem([
    { id: 'portfolio_gallery', title: 'گالری نمونه‌کار', component: lazy('PortfolioGallery'), defaultEnabled: true },
    { id: 'before_after_gallery', title: 'قبل و بعد', component: lazy('BeforeAfterGallery'), defaultEnabled: true },
    { id: 'service_packages', title: 'پکیج‌های خدمات', component: lazy('ServicePackages'), defaultEnabled: true },
  ]),

  architect: withEcosystem([
    { id: 'architectural_portfolio', title: 'نمونه‌کارهای معماری', component: lazy('ArchitecturalPortfolio'), defaultEnabled: true },
    { id: 'design_styles', title: 'سبک‌های طراحی', component: lazy('DesignStyles'), defaultEnabled: true },
    { id: 'project_types', title: 'انواع پروژه', component: lazy('ProjectTypes'), defaultEnabled: true },
  ]),

  // Subtypes without dedicated real widgets yet — ecosystem widgets only.
  'property-manager': withEcosystem([]),
  'facility-maintenance': withEcosystem([]),
  'elevator-technician': withEcosystem([]),
  'land-surveyor': withEcosystem([]),
  'official-appraiser': withEcosystem([]),
  'gate-automation': withEcosystem([]),
  'general-contractor': withEcosystem([]),
};

/** Runtime list of valid subtype slugs — derived from the registry (single source of truth). */
export const REAL_ESTATE_SUBTYPES = Object.keys(WIDGET_REGISTRY) as RealEstateSubtype[];

/** Type-safe guard: is this taxonomy slug a registered real-estate subtype? */
export function isRealEstateSubtype(slug: string): slug is RealEstateSubtype {
  return Object.prototype.hasOwnProperty.call(WIDGET_REGISTRY, slug);
}

/** Get widgets for a given subtype, sorted by order */
export function getWidgetsForSubtype(subtype: RealEstateSubtype): WidgetDefinition[] {
  return [...(WIDGET_REGISTRY[subtype] ?? [])].sort((a, b) => a.defaultOrder - b.defaultOrder);
}

/** Get default widget config (enabled + order) for a subtype */
export function getDefaultWidgetConfig(subtype: RealEstateSubtype): WidgetConfig[] {
  return getWidgetsForSubtype(subtype).map((w) => ({
    id: w.id,
    enabled: w.defaultEnabled,
    order: w.defaultOrder,
  }));
}
