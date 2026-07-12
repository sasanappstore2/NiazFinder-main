/**
 * Deterministic intent re-rank for semantic category candidates.
 *
 * The embedding is dominated by the SUBJECT ("خونه ویلایی", "یخچال") so it
 * confuses intent-siblings: sale↔rent and product↔repair. We detect the user's
 * intent from explicit keywords (very reliable in Persian + finglish) and
 * re-weight candidates whose deal-kind disagrees. This fixes the largest error
 * class without any LLM call.
 */
import { getCategoryPath } from '@/config/categories';

export type DealKind = 'sale' | 'rent' | 'repair' | 'service' | 'job' | 'product' | 'other';

const kindCache = new Map<string, DealKind>();

export function categoryDealKind(slug: string): DealKind {
  const cached = kindCache.get(slug);
  if (cached) return cached;
  const path = getCategoryPath(slug);
  const vertical = path[0]?.slug ?? '';
  const parentTitle = path.length >= 2 ? path[path.length - 2]!.title : '';
  let kind: DealKind = 'other';
  if (vertical === 'services') kind = parentTitle.includes('تعمیر') ? 'repair' : 'service';
  else if (vertical === 'jobs') kind = 'job';
  else if (vertical === 'real-estate') {
    if (parentTitle.includes('فروش')) kind = 'sale';
    else if (parentTitle.includes('اجاره') || parentTitle.includes('کوتاه')) kind = 'rent';
    else kind = 'other';
  } else if (vertical === 'vehicles') {
    kind = slug.includes('rental') ? 'rent' : 'sale';
  } else if (
    vertical === 'electronics' ||
    vertical === 'home-appliances' ||
    vertical === 'personal-items' ||
    vertical === 'entertainment'
  ) {
    kind = 'product';
  }
  kindCache.set(slug, kind);
  return kind;
}

export interface QueryIntent {
  rent: boolean;
  sale: boolean;
  repair: boolean;
}

const RENT_RE =
  /اجاره|رهن|کرایه|اجاره‌ای|اجارهای|\bejare|\bejare?h|\brahn\b|\bkeraye|\bkraye|\brent/i;
const SALE_RE =
  /خرید|فروش|بخر|می‌فروش|میفروش|فروشی|\bkharid|\bforush|\bforoush|\bbekhar|\bmifrush|\bsell\b|\bbuy\b/i;
const REPAIR_RE =
  /تعمیر|خراب|سرویس کار|سرویس‌کار|نمی‌کن|نمیکن|روشن نمی|کار نمی|نشت|گرفتگی|\btamir|\bta'?mir|\bkharab|\brepair|\bfix\b|\bservice\b/i;

export function detectQueryIntent(text: string): QueryIntent {
  return {
    rent: RENT_RE.test(text),
    sale: SALE_RE.test(text),
    repair: REPAIR_RE.test(text),
  };
}

/** Multiplier applied to a candidate's score given the detected query intent. */
export function intentMultiplier(slug: string, intent: QueryIntent): number {
  const kind = categoryDealKind(slug);
  let m = 1;

  // repair vs product
  if (intent.repair) {
    if (kind === 'repair') m *= 1.18;
    if (kind === 'product') m *= 0.45;
  } else if (intent.sale && (kind === 'repair' || kind === 'service')) {
    // "خرید یخچال" must not become refrigerator-repair
    m *= 0.6;
  }

  // sale vs rent (only when the signal is unambiguous)
  if (intent.rent && !intent.sale) {
    if (kind === 'rent') m *= 1.12;
    if (kind === 'sale') m *= 0.5;
  } else if (intent.sale && !intent.rent) {
    if (kind === 'sale') m *= 1.12;
    if (kind === 'rent') m *= 0.5;
  }

  return m;
}

export interface RankedCandidate {
  slug: string;
  score: number;
}

/** Re-rank candidates in place-safe manner using detected intent. */
export function rerankByIntent<T extends RankedCandidate>(candidates: T[], text: string): T[] {
  const intent = detectQueryIntent(text);
  if (!intent.rent && !intent.sale && !intent.repair) return candidates;
  return candidates
    .map((c) => ({ ...c, score: c.score * intentMultiplier(c.slug, intent) }))
    .sort((a, b) => b.score - a.score);
}
