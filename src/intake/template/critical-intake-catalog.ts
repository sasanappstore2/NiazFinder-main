/**
 * AUTO-GENERATED ? do not edit by hand.
 * Run: npx tsx scripts/generate/build-critical-intake-catalog.ts
 */
import { getCategoryPath } from '@/config/categories';
import { getMergedFieldsForCategory } from '@/config/category-filters/registry';
import { resolveSectionKeyForField } from '@/intake/template/sectionGroups';

export interface CriticalIntakeProfile {
  fields: string[];
  sectionKeys?: string[];
}

export const CRITICAL_BY_ROOT: Record<string, readonly string[]> = {
  "real-estate": [
    "rooms",
    "areaMin",
    "deposit",
    "monthlyRent",
    "amenities",
    "budget"
  ],
  "vehicles": [
    "brand",
    "yearMin",
    "mileageMax",
    "condition",
    "budget"
  ],
  "services": [
    "when",
    "budget",
    "serviceType",
    "urgency"
  ],
  "electronics": [
    "brand",
    "condition",
    "budget",
    "storage"
  ],
  "home-appliances": [
    "brand",
    "condition",
    "budget"
  ],
  "personal-items": [
    "brand",
    "condition",
    "budget"
  ],
  "entertainment": [
    "brand",
    "condition",
    "budget"
  ],
  "jobs": [
    "employmentType",
    "experience",
    "salaryMin",
    "roleType"
  ],
  "social": [
    "socialType",
    "when",
    "budget"
  ],
  "general": [
    "budget",
    "condition",
    "dealType"
  ]
} as const;

export const CRITICAL_BY_SLUG: Record<string, CriticalIntakeProfile> = {
  "ac-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "admin-management": {
    "fields": [
      "employmentType",
      "experience",
      "salaryMin",
      "roleType",
      "budget"
    ]
  },
  "agency-services": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "apartment-rent": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities"
    ]
  },
  "apartment-sale": {
    "fields": [
      "rooms",
      "areaMin",
      "budget",
      "amenities",
      "buildingAge"
    ]
  },
  "art-media": {
    "fields": [
      "employmentType",
      "experience",
      "salaryMin",
      "roleType",
      "budget"
    ]
  },
  "audio-video": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
    ]
  },
  "beauty-health": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "bicycle-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "boat": {
    "fields": [
      "brand",
      "yearMin",
      "mileageMax",
      "condition",
      "budget"
    ]
  },
  "books": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "building-industrial": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "camera-cctv-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "camera": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
    ]
  },
  "car-classic": {
    "fields": [
      "brand",
      "yearMin",
      "mileageMax",
      "condition",
      "budget"
    ]
  },
  "car-heavy": {
    "fields": [
      "brand",
      "yearMin",
      "mileageMax",
      "condition",
      "budget"
    ]
  },
  "car-rental": {
    "fields": [
      "brand",
      "yearMin",
      "mileageMax",
      "condition",
      "budget"
    ]
  },
  "car-ride": {
    "fields": [
      "brand",
      "yearMin",
      "mileageMax",
      "condition",
      "budget"
    ]
  },
  "car": {
    "fields": [
      "brand",
      "yearMin",
      "mileageMax",
      "condition",
      "budget"
    ]
  },
  "carpet-rug-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "cleaning": {
    "fields": [
      "when",
      "budget",
      "serviceType"
    ]
  },
  "clothing": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "commercial-rent": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "commercial-sale": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "computer-laptop-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "computer-parts": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
    ]
  },
  "computer": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
    ]
  },
  "conference": {
    "fields": [
      "socialType",
      "when",
      "budget"
    ]
  },
  "construction-partnership": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "cooking-appliance-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "cooking-utensils": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "cosmetics-health": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "cultural-artistic": {
    "fields": [
      "socialType",
      "when",
      "budget"
    ]
  },
  "decorative-art": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "desktop-computer": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
    ]
  },
  "door-window-glass-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "education": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "electrical": {
    "fields": [
      "when",
      "budget",
      "serviceType"
    ]
  },
  "elevator-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "engineering": {
    "fields": [
      "employmentType",
      "experience",
      "salaryMin",
      "roleType",
      "budget"
    ]
  },
  "events-catering": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "finance-legal": {
    "fields": [
      "employmentType",
      "experience",
      "salaryMin",
      "roleType",
      "budget"
    ]
  },
  "fitness-equipment-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "furniture-decor": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "furniture-wood-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "game-console": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
    ]
  },
  "general-handyman-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "generator-ups-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "health-beauty": {
    "fields": [
      "employmentType",
      "experience",
      "salaryMin",
      "roleType",
      "budget"
    ]
  },
  "industrial-machinery-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "industrial-rent": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "industrial-sale": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "it-services": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "it": {
    "fields": [
      "employmentType",
      "experience",
      "salaryMin",
      "roleType"
    ]
  },
  "jewelry-watches": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "kids-baby": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "kitchen-appliances": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "land-rent": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "land-sale": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "laptop": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
    ]
  },
  "laundry-dishwasher-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "legal-services": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "lighting": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "locksmith-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "lost-found": {
    "fields": [
      "when",
      "socialType"
    ]
  },
  "marketing-sales": {
    "fields": [
      "employmentType",
      "experience",
      "salaryMin",
      "roleType",
      "budget"
    ]
  },
  "medical-equipment-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "medical-health": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "mobile-accessories": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
    ]
  },
  "mobile-phone": {
    "fields": [
      "brand",
      "condition",
      "storage",
      "budget"
    ]
  },
  "mobile-tablet-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "mobile-tablet": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
    ]
  },
  "motorcycle-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "motorcycle": {
    "fields": [
      "brand",
      "yearMin",
      "mileageMax",
      "condition"
    ]
  },
  "moving": {
    "fields": [
      "when",
      "budget",
      "serviceType"
    ]
  },
  "musical-instrument-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "musical-instruments": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "office-rent": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "office-sale": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "painting": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "pets": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "plumbing": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "pre-sale-services": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "printer-office-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "real-estate-services": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "refrigerator-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "refrigerator": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "repairs": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "residential-rent": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "residential-sale": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "roofing-waterproofing-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "rugs": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "sewing-machine-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "shop-rent": {
    "fields": [
      "areaMin",
      "deposit",
      "monthlyRent",
      "budget"
    ]
  },
  "shop-sale": {
    "fields": [
      "areaMin",
      "budget",
      "deedType"
    ]
  },
  "short-term-rent": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "small-appliance-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "social-events": {
    "fields": [
      "socialType",
      "when",
      "budget"
    ]
  },
  "sofa-chair": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "spare-parts": {
    "fields": [
      "brand",
      "yearMin",
      "mileageMax",
      "condition",
      "budget"
    ]
  },
  "sporting": {
    "fields": [
      "socialType",
      "when",
      "budget"
    ]
  },
  "sports-fitness": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "stove-microwave": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "suite-apartment-rent": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "table-closet": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "tablet": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
    ]
  },
  "tickets": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "tours": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "transportation": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "tv-audio-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "vehicle-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "villa-rent": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities"
    ]
  },
  "villa-sale": {
    "fields": [
      "rooms",
      "areaMin",
      "budget",
      "plotWidth"
    ]
  },
  "villa-short-rent": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  },
  "volunteering": {
    "fields": [
      "socialType",
      "when",
      "budget"
    ]
  },
  "washing-machine": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "watch-jewelry-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "water-heater-boiler-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "water-pump-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "workspace-short-rent": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
      "budget"
    ]
  }
} as const;

const MIN_CRITICAL_FIELDS_DEFAULT = 2;

/** Registry-valid critical field keys for a category slug. */
export function getCriticalIntakeFields(slug: string | null | undefined): string[] {
  if (!slug) return [];
  const profile = CRITICAL_BY_SLUG[slug];
  const raw = profile?.fields ?? CRITICAL_BY_ROOT[getCategoryPath(slug)[0]?.slug ?? 'general'] ?? CRITICAL_BY_ROOT.general;
  const registryKeys = new Set(
    getMergedFieldsForCategory(slug, 'need')
      .filter((f) => f.intake !== false)
      .map((f) => f.key)
  );
  const minRequired =
    registryKeys.size >= 3
      ? MIN_CRITICAL_FIELDS_DEFAULT
      : Math.max(1, Math.min(MIN_CRITICAL_FIELDS_DEFAULT, registryKeys.size));

  const filtered = raw.filter((k) => registryKeys.has(k));
  if (filtered.length >= minRequired) return filtered.slice(0, 6);

  const generic = ['budget', 'dealType', 'condition', 'brand', 'when', 'serviceType', 'rooms', 'areaMin', 'socialType', 'serviceKind'];
  const padded = [...new Set([...filtered, ...generic.filter((k) => registryKeys.has(k)), ...registryKeys])];
  return padded.slice(0, Math.max(minRequired, Math.min(6, padded.length)));
}

export function getCriticalSectionKeys(slug: string, criticalFields: string[]): Set<string> {
  const profile = CRITICAL_BY_SLUG[slug];
  if (profile?.sectionKeys?.length) return new Set(profile.sectionKeys);

  const root = getCategoryPath(slug)[0]?.slug ?? 'general';
  const keys = new Set<string>();
  for (const field of criticalFields) {
    const sectionKey = resolveSectionKeyForField(field, root, slug);
    if (sectionKey && sectionKey !== 'specs') keys.add(sectionKey);
  }
  return keys;
}
