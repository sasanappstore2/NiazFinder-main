import type { IntentType } from '@/contracts/need-intake';
import { getCategoryPath } from '@/config/categories';

export interface IntentDefinition {
  type: IntentType;
  label: string;
  labelFa: string;
}

/** All registered intents. */
export const INTENT_REGISTRY: Record<IntentType, IntentDefinition> = {
  service_request: { type: 'service_request', label: 'Service request', labelFa: 'درخواست خدمات' },
  booking: { type: 'booking', label: 'Booking', labelFa: 'رزرو' },
  consultation: { type: 'consultation', label: 'Consultation', labelFa: 'مشاوره' },
  product_search: { type: 'product_search', label: 'Product search', labelFa: 'جستجوی کالا' },
  product_listing: { type: 'product_listing', label: 'Sell product', labelFa: 'فروش کالا' },
  vehicle_search: { type: 'vehicle_search', label: 'Buy vehicle', labelFa: 'خرید خودرو' },
  vehicle_listing: { type: 'vehicle_listing', label: 'Sell vehicle', labelFa: 'فروش خودرو' },
  vehicle_service: { type: 'vehicle_service', label: 'Vehicle service', labelFa: 'خدمات خودرو' },
  property_search: { type: 'property_search', label: 'Rent/buy property', labelFa: 'جستجوی ملک' },
  property_listing: { type: 'property_listing', label: 'List property', labelFa: 'ثبت ملک' },
  real_estate_service: { type: 'real_estate_service', label: 'Real estate service', labelFa: 'خدمات املاک' },
  job_search: { type: 'job_search', label: 'Job', labelFa: 'استخدام' },
  help_request: { type: 'help_request', label: 'Help', labelFa: 'درخواست کمک' },
  general: { type: 'general', label: 'General', labelFa: 'عمومی' },
};

/** Category slug → allowed intents (canonical slugs). */
const CATEGORY_INTENT_MAP: Record<string, IntentType[]> = {
  'real-estate': ['property_search', 'property_listing', 'real_estate_service'],
  'residential-sale': ['property_search', 'property_listing'],
  'apartment-sale': ['property_search', 'property_listing'],
  'villa-sale': ['property_search', 'property_listing'],
  'land-sale': ['property_search', 'property_listing'],
  'residential-rent': ['property_search', 'property_listing'],
  'apartment-rent': ['property_search', 'property_listing'],
  'villa-rent': ['property_search', 'property_listing'],
  'land-rent': ['property_search', 'property_listing'],
  'short-term-rent': ['property_search', 'property_listing'],
  'suite-apartment-rent': ['property_search', 'property_listing'],
  'villa-short-rent': ['property_search', 'property_listing'],
  'workspace-short-rent': ['property_search', 'property_listing'],
  'commercial-sale': ['property_search', 'property_listing'],
  'commercial-rent': ['property_search', 'property_listing'],
  'real-estate-services': ['real_estate_service', 'consultation'],
  'construction-partnership': ['real_estate_service', 'consultation'],
  'agency-services': ['real_estate_service', 'consultation'],

  vehicles: ['vehicle_search', 'vehicle_listing', 'vehicle_service'],
  car: ['vehicle_search', 'vehicle_listing', 'vehicle_service'],
  motorcycle: ['vehicle_search', 'vehicle_listing'],
  'spare-parts': ['product_search', 'product_listing'],

  electronics: ['product_search', 'product_listing'],
  'mobile-phone': ['product_search', 'product_listing'],
  laptop: ['product_search', 'product_listing'],
  'game-console': ['product_search', 'product_listing'],

  'home-appliances': ['product_search', 'product_listing', 'service_request'],
  services: ['service_request', 'booking', 'consultation', 'help_request'],
  repairs: ['service_request'],
  cleaning: ['service_request'],
  plumbing: ['service_request'],
  moving: ['service_request'],
  electrical: ['service_request'],
  painting: ['service_request'],
  'medical-health': ['service_request', 'consultation'],
  'legal-services': ['consultation', 'service_request'],
  'it-services': ['service_request', 'consultation'],

  jobs: ['job_search'],
  it: ['job_search'],

  entertainment: ['product_search', 'product_listing'],
  'personal-items': ['product_search', 'product_listing'],
  social: ['help_request', 'general'],
};

export function getIntentsForCategory(categorySlug: string): IntentType[] {
  if (CATEGORY_INTENT_MAP[categorySlug]) {
    return CATEGORY_INTENT_MAP[categorySlug];
  }
  const path = getCategoryPath(categorySlug);
  for (let i = path.length - 1; i >= 0; i--) {
    const mapped = CATEGORY_INTENT_MAP[path[i].slug];
    if (mapped) return mapped;
  }
  return ['service_request', 'general'];
}

export function getIntentDefinition(intent: IntentType): IntentDefinition {
  return INTENT_REGISTRY[intent];
}

export function isIntentType(value: string): value is IntentType {
  return value in INTENT_REGISTRY;
}

/** Default intent when category is unknown. */
export const DEFAULT_INTENT: IntentType = 'service_request';
