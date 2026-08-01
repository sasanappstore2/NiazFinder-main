/**
 * Launch intake policy — rules-first helpers for /post analyze (client-safe).
 * Central place for cross-cutting launch rules; server paths re-use the same module.
 */
import type { IntakeEntities } from '@/intake/types';
import { normalizeCategoryPair } from '@/config/categories';

export { pickStreetOrHoodDisplay } from '@/lib/need-intake/location-fragment';

/** «130 متری» must not be interpreted as deposit/rent money. */
export function isAreaLikeRentConflict(text: string): boolean {
  return /\d+\s*m\b|\d+\s*متر|\d+\s*متری/i.test(text.trim());
}

/** User text signals land purchase (not rent / not construction partnership). */
export function isLandPurchaseSignal(text: string): boolean {
  const t = text.trim();
  // Partnership seeker ads mention زمین but are not land-sale (#592).
  if (/مشارکت\s*(?:در\s*)?ساخت/u.test(t)) return false;
  return /زمین|کلنگی|پروانه\s*ساخت|منطقه\s*سجاد|سجاد\s*شهر/u.test(t) && !/رهن|ودیعه|اجاره|مستاجر|رنت/i.test(t);
}

/** Generic street names that require explicit city before auto-confirm. */
export const GENERIC_STREET_TOKENS = [
  'امام خمینی',
  'امام',
  'آزادی',
  'ولیعصر',
  'فردوسی',
  'انقلاب',
  'شریعتی',
  'مطهری',
  'جمهوری',
  'کارگر',
] as const;

/** Apply hard launch rules on extracted entities before draft/publish. */
export function applyLaunchIntakeEntityPolicy(
  rawText: string,
  entities: IntakeEntities
): IntakeEntities {
  const next = { ...entities };
  const text = rawText.trim();
  if (!text) return next;

  if (isLandPurchaseSignal(text)) {
    next.transactionType = 'BUY';
    next.category = 'land';
    const pair = normalizeCategoryPair('land-sale');
    next.categorySlug = pair.categorySlug;
    next.subcategorySlug = pair.subcategorySlug ?? null;
    if (!next.vertical) next.vertical = 'real-estate';
  }

  if (isAreaLikeRentConflict(text) && next.budgetMax != null && next.budgetMax < 500_000_000) {
    const areaVal = next.area;
    const budgetLooksLikeArea =
      areaVal != null &&
      next.budgetMax <= areaVal * 2_000_000 &&
      !/میلیون|میلیارد|تومان|ریال|رهن|ودیعه|اجاره/u.test(text);
    if (budgetLooksLikeArea) {
      next.budgetMin = null;
      next.budgetMax = null;
    }
  }

  return next;
}
