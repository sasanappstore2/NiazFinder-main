import type { Business } from '@/contracts/business-profile';
import { getServiceAreaState } from '@/lib/business/ecosystem';

/**
 * Profile completeness score — pure, derived entirely from the public Business
 * object (no query). Reuses the ecosystem service-area accessor. Owner-facing
 * guidance: which high-impact fields are still missing.
 */
export interface CompletenessItem {
  key: 'logo' | 'cover' | 'description' | 'serviceArea' | 'portfolio' | 'contact';
  label: string;
  done: boolean;
}

export interface CompletenessResult {
  /** 0–100 */
  score: number;
  items: CompletenessItem[];
  missing: CompletenessItem[];
}

const MIN_DESCRIPTION_LENGTH = 40;

export function computeProfileCompleteness(business: Business): CompletenessResult {
  const items: CompletenessItem[] = [
    { key: 'logo', label: 'لوگو', done: Boolean(business.identity.logo) },
    { key: 'cover', label: 'تصویر کاور', done: Boolean(business.identity.coverImage) },
    {
      key: 'description',
      label: 'توضیحات',
      done: (business.identity.description?.trim().length ?? 0) >= MIN_DESCRIPTION_LENGTH,
    },
    {
      key: 'serviceArea',
      label: 'محدوده خدمات',
      done: getServiceAreaState(business).areas.length > 0,
    },
    { key: 'portfolio', label: 'نمونه‌کار', done: (business.portfolio?.length ?? 0) > 0 },
    {
      key: 'contact',
      label: 'اطلاعات تماس',
      done: Boolean(business.contact.phone || business.contact.whatsapp || business.contact.email),
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const score = Math.round((doneCount / items.length) * 100);

  return { score, items, missing: items.filter((i) => !i.done) };
}
