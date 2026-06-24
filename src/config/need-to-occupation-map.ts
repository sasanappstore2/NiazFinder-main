/**
 * Maps need/listing category slugs → business occupation slugs for lead matching.
 * Need taxonomy: src/config/categories.ts
 * Occupation taxonomy: src/config/business-occupations.ts
 * Online store taxonomy: src/config/online-stores.ts
 */

import {
  CANONICAL_CATEGORIES,
  getCategoryPath,
  isCategorySlug,
  legacyValueToSlug,
} from '@/config/categories';
import { isOccupationSlug, resolveOccupationSlug } from '@/config/business-occupations';
import { isOnlineStoreSlug } from '@/config/online-stores';

function addMappedSlug(out: Set<string>, slug: string): void {
  if (isOnlineStoreSlug(slug)) {
    out.add(slug);
    return;
  }
  const resolved = resolveOccupationSlug(slug);
  if (isOccupationSlug(resolved)) out.add(resolved);
}

/** Direct need slug → occupation slugs (many-to-many). */
export const NEED_SLUG_TO_OCCUPATIONS: Readonly<Record<string, readonly string[]>> = {
  // Real estate
  'real-estate': [
    'real-estate-agent',
    'real-estate-office',
    'property-manager',
    'interior-designer',
    'architect',
  ],
  'residential-sale': ['real-estate-agent', 'real-estate-office'],
  'apartment-sale': ['real-estate-agent', 'real-estate-office'],
  'villa-sale': ['real-estate-agent', 'real-estate-office'],
  'land-sale': ['real-estate-agent', 'real-estate-office', 'land-surveyor'],
  'residential-rent': ['real-estate-agent', 'real-estate-office', 'property-manager'],
  'apartment-rent': ['real-estate-agent', 'real-estate-office', 'property-manager'],
  'villa-rent': ['real-estate-agent', 'real-estate-office', 'property-manager'],
  'land-rent': ['real-estate-agent', 'real-estate-office'],
  'commercial-sale': ['real-estate-agent', 'real-estate-office'],
  'office-sale': ['real-estate-agent', 'real-estate-office'],
  'shop-sale': ['real-estate-agent', 'real-estate-office'],
  'commercial-rent': ['real-estate-agent', 'real-estate-office', 'property-manager'],
  'office-rent': ['real-estate-agent', 'real-estate-office', 'property-manager'],
  'shop-rent': ['real-estate-agent', 'real-estate-office'],
  'short-term-rent': [
    'real-estate-agent',
    'real-estate-office',
    'property-manager',
    'hotel-guesthouse',
  ],
  'real-estate-services': [
    'real-estate-agent',
    'real-estate-office',
    'general-contractor',
    'facility-maintenance',
  ],
  'agency-services': ['real-estate-agent', 'real-estate-office'],
  'construction-partnership': ['general-contractor', 'architect'],
  'pre-sale-services': ['real-estate-agent', 'real-estate-office', 'general-contractor'],

  // Vehicles
  vehicles: [
    'car-dealership',
    'auto-mechanic',
    'auto-body-paint',
    'auto-parts-store',
    'car-rental-agency',
  ],
  car: ['car-dealership', 'auto-mechanic', 'auto-body-paint', 'car-wash-detailing', 'car-rental-agency'],
  'car-ride': ['car-dealership', 'auto-mechanic'],
  'car-heavy': ['car-dealership', 'diesel-mechanic', 'crane-heavy-machinery'],
  'car-classic': ['car-dealership', 'auto-body-paint'],
  'car-rental': ['car-rental-agency'],
  motorcycle: ['motorcycle-dealership', 'motorcycle-mechanic'],
  'spare-parts': [
    'auto-parts-store',
    'auto-mechanic',
    'tire-wheel-service',
    'online-auto-parts',
    'online-tires',
  ],
  boat: ['auto-mechanic'],
  'car-repair': ['auto-mechanic', 'auto-body-paint'],

  // Electronics / appliances
  electronics: [
    'mobile-repair',
    'computer-repair',
    'it-support',
    'appliance-repair',
    'online-mobile-tablet',
    'online-laptop-computer',
    'online-digital-accessories',
  ],
  'mobile-tablet': ['mobile-repair', 'mobile-phone-store', 'online-mobile-tablet'],
  'mobile-phone': ['mobile-repair', 'mobile-phone-store', 'online-mobile-tablet'],
  'mobile-accessories': [
    'mobile-phone-store',
    'auto-accessories-shop',
    'online-digital-accessories',
  ],
  tablet: ['mobile-repair', 'mobile-phone-store', 'online-mobile-tablet'],
  computer: ['computer-repair', 'computer-store', 'it-support', 'online-laptop-computer'],
  'desktop-computer': ['computer-repair', 'computer-store', 'online-laptop-computer'],
  laptop: ['computer-repair', 'computer-store', 'online-laptop-computer'],
  'computer-parts': ['computer-store', 'computer-repair', 'online-computer-parts'],
  'game-console': ['computer-repair', 'mobile-repair', 'online-gaming-console'],
  'audio-video': ['computer-repair', 'appliance-repair', 'online-audio-video'],
  camera: ['photographer', 'videographer-editor', 'online-camera-photography'],
  'home-appliances': ['appliance-store', 'appliance-repair', 'online-home-appliances'],
  'building-industrial': [
    'building-materials-supplier',
    'hardware-tools-store',
    'general-contractor',
    'electrician',
    'plumber',
    'industrial-equipment-repair',
    'generator-electrical-panel',
  ],
  'furniture-decor': [
    'furniture-store',
    'interior-designer',
    'curtain-blinds',
    'lighting-store',
    'online-furniture',
    'online-home-decor',
  ],
  'sofa-chair': ['furniture-store', 'upholstery-furniture', 'online-furniture'],
  'table-closet': ['furniture-store', 'carpenter', 'online-furniture'],
  lighting: ['lighting-store', 'electrician', 'online-lighting'],
  'decorative-art': ['furniture-store', 'interior-designer', 'online-home-decor'],
  rugs: ['carpet-rug-store', 'carpet-cleaning', 'online-carpet-rug'],
  'kitchen-appliances': ['appliance-store', 'appliance-repair', 'online-home-appliances'],
  refrigerator: ['appliance-store', 'appliance-repair', 'online-home-appliances'],
  'washing-machine': ['appliance-store', 'appliance-repair', 'online-home-appliances'],
  'stove-microwave': ['appliance-store', 'appliance-repair', 'online-small-kitchen-appliances'],
  'cooking-utensils': ['appliance-store', 'online-cookware-tableware'],

  // Services (core)
  services: ['management-consultant', 'cleaner', 'plumber'],
  cleaning: ['cleaner', 'carpet-cleaning'],
  repairs: ['appliance-repair', 'general-contractor', 'locksmith'],
  'watch-jewelry-repair': ['watch-repair', 'jeweler', 'appliance-repair'],
  'ac-repair': ['hvac-technician', 'appliance-repair'],
  'refrigerator-repair': ['appliance-repair'],
  'laundry-dishwasher-repair': ['appliance-repair'],
  'cooking-appliance-repair': ['appliance-repair'],
  'water-heater-boiler-repair': ['hvac-technician', 'plumber'],
  'small-appliance-repair': ['appliance-repair'],
  'tv-audio-repair': ['appliance-repair', 'it-support'],
  'computer-laptop-repair': ['it-support', 'computer-repair'],
  'mobile-tablet-repair': ['mobile-phone-repair', 'it-support'],
  'camera-cctv-repair': ['cctv-security-systems', 'it-support'],
  'printer-office-repair': ['it-support'],
  'vehicle-repair': ['auto-repair', 'mechanic'],
  'motorcycle-repair': ['motorcycle-repair', 'mechanic'],
  'bicycle-repair': ['bicycle-repair'],
  'door-window-glass-repair': ['glazier', 'carpenter', 'locksmith'],
  'furniture-wood-repair': ['carpenter', 'upholstery-furniture'],
  'carpet-rug-repair': ['carpet-rug-store', 'carpet-cleaning'],
  'roofing-waterproofing-repair': ['roofer', 'general-contractor'],
  'elevator-repair': ['elevator-service'],
  'water-pump-repair': ['plumber', 'electrician'],
  'generator-ups-repair': ['generator-electrical-panel', 'electrician'],
  'locksmith-repair': ['locksmith'],
  'sewing-machine-repair': ['tailor-alterations'],
  'musical-instrument-repair': ['musical-instrument-store'],
  'medical-equipment-repair': ['medical-equipment-supplier'],
  'industrial-machinery-repair': ['industrial-equipment-supplier'],
  'fitness-equipment-repair': ['fitness-equipment-store'],
  'general-handyman-repair': ['general-contractor', 'appliance-repair', 'handyman'],
  plumbing: ['plumber'],
  moving: ['moving-company', 'freight-trucking'],
  electrical: ['electrician', 'generator-electrical-panel'],
  painting: ['painter-decorator'],
  'medical-health': [
    'general-practitioner',
    'dentist',
    'physiotherapist',
    'pharmacy',
    'medical-lab',
  ],
  'legal-services': ['lawyer', 'notary-legal-docs'],
  'it-services': ['web-developer', 'it-support', 'ui-ux-designer', 'cctv-security-systems'],
  transportation: ['courier-delivery', 'freight-trucking', 'driver-taxi', 'towing-roadside'],
  'beauty-health': [
    'hairdresser',
    'barber',
    'beauty-salon',
    'massage-therapy',
    'nail-technician',
    'online-cosmetics-skincare',
    'online-perfume-fragrance',
  ],
  'events-catering': [
    'event-planner',
    'catering',
    'wedding-services',
    'event-decoration',
    'dj-sound',
  ],
  education: ['private-tutor', 'language-teacher', 'career-coach', 'kindergarten'],

  // Personal / retail
  'personal-items': [
    'clothing-store',
    'jewelry-store',
    'cosmetics-store',
    'tailor',
    'online-clothing-apparel',
    'online-costume-jewelry',
    'online-cosmetics-skincare',
  ],
  clothing: ['clothing-store', 'tailor', 'online-clothing-apparel', 'online-footwear'],
  'jewelry-watches': [
    'jewelry-store',
    'watch-store',
    'goldsmith',
    'jewelry-repair',
    'online-costume-jewelry',
    'online-gold-silver-jewelry',
    'online-watches',
  ],
  'cosmetics-health': [
    'cosmetics-store',
    'beauty-salon',
    'pharmacy',
    'online-cosmetics-skincare',
    'online-herbal-traditional',
  ],
  'kids-baby': ['toy-kids-store', 'online-toys', 'online-baby-gear', 'online-kids-clothing'],

  // Entertainment
  entertainment: ['photographer', 'videographer-editor', 'dj-sound'],
  'sports-fitness': ['sports-coach', 'online-sporting-goods'],
  pets: ['veterinarian', 'pet-grooming', 'pet-boarding', 'online-pet-supplies'],
  'musical-instruments': ['music-teacher', 'music-band-events', 'online-music-instruments'],

  // Social / events
  social: ['event-planner'],
  'social-events': ['event-planner', 'catering'],
  'cultural-artistic': ['event-planner', 'photographer', 'florist'],
  conference: ['event-planner', 'event-lighting-audio'],
  sporting: ['event-planner', 'sports-coach'],

  // Jobs (hiring)
  jobs: ['management-consultant', 'recruitment-hr', 'career-coach'],
  it: ['web-developer', 'it-support', 'computer-instructor'],
  'finance-legal': ['accountant', 'lawyer', 'tax-advisor', 'financial-advisor'],
  'marketing-sales': ['seo-digital-marketing', 'graphic-designer', 'social-media-manager'],
  engineering: ['general-contractor', 'architect', 'web-developer', 'industrial-equipment-repair'],
  'art-media': ['graphic-designer', 'photographer', 'videographer-editor', 'sign-maker'],
};

export type MigrationConfidence = 'high' | 'low' | 'none';

export function occupationsForNeedSlug(needSlug: string): string[] {
  const canonical = legacyValueToSlug(needSlug) ?? needSlug;
  const out = new Set<string>();

  const direct = NEED_SLUG_TO_OCCUPATIONS[canonical];
  if (direct) {
    for (const o of direct) {
      addMappedSlug(out, o);
    }
  }

  const path = getCategoryPath(canonical);
  for (const cat of path) {
    const mapped = NEED_SLUG_TO_OCCUPATIONS[cat.slug];
    if (mapped) {
      for (const o of mapped) {
        addMappedSlug(out, o);
      }
    }
  }

  return [...out];
}

/** Expand need slug for matching against business profile occupation slugs. */
export function expandOccupationsForNeedMatch(needSlug: string): string[] {
  return occupationsForNeedSlug(needSlug);
}

/**
 * Migrate a stored profile slug (occupation or legacy need slug) to occupation slug(s).
 */
export function migrateSlugToOccupation(storedSlug: string): {
  occupations: string[];
  confidence: MigrationConfidence;
} {
  const trimmed = resolveOccupationSlug(storedSlug.trim());
  if (!trimmed) return { occupations: [], confidence: 'none' };

  if (isOccupationSlug(trimmed)) {
    return { occupations: [trimmed], confidence: 'high' };
  }

  if (isOnlineStoreSlug(trimmed)) {
    return { occupations: [trimmed], confidence: 'high' };
  }

  if (!isCategorySlug(trimmed)) {
    return { occupations: [], confidence: 'none' };
  }

  const mapped = occupationsForNeedSlug(trimmed);
  if (mapped.length === 0) {
    return { occupations: [], confidence: 'none' };
  }

  const path = getCategoryPath(legacyValueToSlug(trimmed) ?? trimmed);
  const leaf = path[path.length - 1]?.slug;
  const direct = leaf ? NEED_SLUG_TO_OCCUPATIONS[leaf] : undefined;
  const confidence: MigrationConfidence =
    direct && direct.length > 0 && direct.map(resolveOccupationSlug).includes(mapped[0])
      ? 'high'
      : 'low';

  return { occupations: mapped, confidence };
}

/** High-traffic need leaves that must map to at least one occupation (self-test). */
export const NEED_LEAVES_FOR_COVERAGE_TEST = CANONICAL_CATEGORIES.filter(
  (c) => c.depth >= 1 && c.slug !== 'jobs'
).map((c) => c.slug);
