import type { IntentType } from '@/contracts/need-intake';
import type { ClassifierVertical } from '@/lib/need-intake/vertical-classifier';

export interface IntentSliceResult {
  vertical: ClassifierVertical;
  intentType: IntentType;
  keywords: string[];
  confidence: number;
  source: 'ai' | 'skipped';
}

export const INTENT_SLICE_VERTICALS: readonly ClassifierVertical[] = [
  'real-estate',
  'vehicles',
  'products',
  'services',
  'jobs',
  'social',
];

export const INTENT_SLICE_INTENT_TYPES: readonly IntentType[] = [
  'service_request',
  'property_search',
  'property_listing',
  'vehicle_search',
  'vehicle_listing',
  'vehicle_service',
  'product_search',
  'product_listing',
  'job_search',
  'help_request',
  'booking',
  'consultation',
  'real_estate_service',
  'general',
];
