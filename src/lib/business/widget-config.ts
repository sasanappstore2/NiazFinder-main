import type { Business } from '@/contracts/business-profile';
import type { RealEstateSubtype, WidgetConfig } from './widget-registry';
import { getDefaultWidgetConfig, isRealEstateSubtype } from './widget-registry';

/**
 * Widget configuration stored inside business.extensions.widgets
 * Falls back to registry defaults when not customized.
 */

export interface WidgetConfigMap {
  [subtype: string]: WidgetConfig[];
}

export function getWidgetConfigForBusiness(
  business: Business | null | undefined,
  primarySubtype: RealEstateSubtype
): WidgetConfig[] {
  if (!business) return getDefaultWidgetConfig(primarySubtype);

  const widgets = (business.extensions as any)?.widgets as WidgetConfigMap | undefined;
  const custom = widgets?.[primarySubtype];

  if (custom && Array.isArray(custom) && custom.length > 0) {
    return [...custom].sort((a, b) => a.order - b.order);
  }

  return getDefaultWidgetConfig(primarySubtype);
}

export function setWidgetConfigForBusiness(
  business: Business,
  subtype: RealEstateSubtype,
  config: WidgetConfig[]
): Business {
  const current = (business.extensions as any) || {};
  return {
    ...business,
    extensions: {
      ...current,
      widgets: {
        ...(current.widgets || {}),
        [subtype]: config,
      },
    },
  };
}

/**
 * Resolve the primary real-estate subtype from the business's canonical category
 * slugs (`business.identity.category`, already a `string[]` in the Business
 * contract). Matches against the widget registry keys (single source of truth)
 * via a type-safe guard — no second slug list, no JSON.parse.
 */
export function getPrimaryRealEstateSubtype(
  business: Business | null | undefined
): RealEstateSubtype | null {
  const categories = business?.identity?.category;
  if (!Array.isArray(categories)) return null;
  for (const slug of categories) {
    if (typeof slug === 'string' && isRealEstateSubtype(slug)) {
      return slug;
    }
  }
  return null;
}
