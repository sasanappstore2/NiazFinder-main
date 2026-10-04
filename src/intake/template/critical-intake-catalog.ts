/**
 * AUTO-GENERATED — do not edit by hand.
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
  "elevator-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
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
  "car-ride": {
    "fields": [
      "brand",
      "yearMin",
      "mileageMax",
      "condition",
      "budget"
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
  "mobile-phone": {
    "fields": [
      "brand",
      "condition",
      "storage",
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
  "furniture-wood-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
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
  "cosmetics-health": {
    "fields": [
      "brand",
      "condition",
      "budget"
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
  "mobile-tablet-repair": {
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
  "workspace-short-rent": {
    "fields": [
      "rooms",
      "areaMin",
      "deposit",
      "monthlyRent",
      "amenities",
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
  "legal-services": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
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
  "scooter": {
    "fields": [
      "brand",
      "condition",
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
  "roofing-waterproofing-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "tours": {
    "fields": [
      "brand",
      "condition",
      "budget"
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
  "motorcycle-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "jewelry-watches": {
    "fields": [
      "brand",
      "condition",
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
  "it-services": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
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
  "furniture-decor": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "moving": {
    "fields": [
      "when",
      "budget",
      "serviceType"
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
  "musical-instruments": {
    "fields": [
      "brand",
      "condition",
      "budget"
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
  "spare-parts": {
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
  "kitchen-appliances": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "cooking-utensils": {
    "fields": [
      "brand",
      "condition",
      "budget"
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
  "tablet": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
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
  "ac-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
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
  "bicycle": {
    "fields": [
      "brand",
      "condition",
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
  "admin-management": {
    "fields": [
      "employmentType",
      "experience",
      "salaryMin",
      "roleType",
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
  "sofa-chair": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "social-events": {
    "fields": [
      "socialType",
      "when",
      "budget"
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
  "computer-parts": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
    ]
  },
  "cultural-artistic": {
    "fields": [
      "socialType",
      "when",
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
  "boat": {
    "fields": [
      "brand",
      "yearMin",
      "mileageMax",
      "condition",
      "budget"
    ]
  },
  "rugs": {
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
  "audio-video": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
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
  "tv-audio-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
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
  "repairs": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
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
  "sporting": {
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
  "fitness-equipment": {
    "fields": [
      "brand",
      "condition",
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
  "transportation": {
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
  "camping-outdoor": {
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
  "kids-baby": {
    "fields": [
      "brand",
      "condition",
      "budget"
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
  "lighting": {
    "fields": [
      "brand",
      "condition",
      "budget"
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
  "laptop": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
    ]
  },
  "sports-fitness": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "electrical": {
    "fields": [
      "when",
      "budget",
      "serviceType"
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
  "musical-instrument-repair": {
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
  "painting": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "shop-sale": {
    "fields": [
      "areaMin",
      "budget",
      "deedType"
    ]
  },
  "pets": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "tickets": {
    "fields": [
      "brand",
      "condition",
      "budget"
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
  "small-appliance-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
    ]
  },
  "stove-microwave": {
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
  "art-media": {
    "fields": [
      "employmentType",
      "experience",
      "salaryMin",
      "roleType",
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
  "generator-ups-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
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
  "lost-found": {
    "fields": [
      "when",
      "socialType"
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
  "computer": {
    "fields": [
      "brand",
      "condition",
      "budget",
      "storage"
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
  "it": {
    "fields": [
      "employmentType",
      "experience",
      "salaryMin",
      "roleType"
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
  "water-pump-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
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
  "conference": {
    "fields": [
      "socialType",
      "when",
      "budget"
    ]
  },
  "refrigerator": {
    "fields": [
      "brand",
      "condition",
      "budget"
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
  "villa-sale": {
    "fields": [
      "rooms",
      "areaMin",
      "budget",
      "plotWidth"
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
  "washing-machine": {
    "fields": [
      "brand",
      "condition",
      "budget"
    ]
  },
  "clothing": {
    "fields": [
      "brand",
      "condition",
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
  "carpet-rug-repair": {
    "fields": [
      "when",
      "budget",
      "serviceType",
      "urgency"
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
  "computer-laptop-repair": {
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
  "education": {
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
  "villa-short-rent": {
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
