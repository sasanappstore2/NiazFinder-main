import type { SpecializationTag } from './types';

/**
 * Phase 4 — Property specialization tags. Improves matching + display.
 */

export const SPECIALIZATION_TAGS: SpecializationTag[] = [
  'luxury',
  'commercial',
  'office',
  'industrial',
  'land',
  'villa',
  'apartment',
  'investment',
];

export const SPECIALIZATION_LABELS: Record<SpecializationTag, string> = {
  luxury: 'لوکس',
  commercial: 'تجاری',
  office: 'اداری',
  industrial: 'صنعتی',
  land: 'زمین',
  villa: 'ویلا',
  apartment: 'آپارتمان',
  investment: 'سرمایه‌گذاری',
};
