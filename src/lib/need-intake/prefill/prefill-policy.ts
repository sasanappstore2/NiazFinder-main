import type { DatasetLabels } from '@/lib/need-intake/dataset/schema';
import type { ParsedIntent } from '@/contracts/need-intake';
import { cityToSlug } from '@/lib/need-intake/dataset/shared/normalize-city';
import { isGenericListingTitle } from '@/lib/need-intake/vertical-title';

/** Slots we expect rules to prefill — only those supported by text/teacher labels. */
export function requiredPrefillSlotKeys(
  parsed: ParsedIntent,
  teacher?: DatasetLabels
): string[] {
  const keys: string[] = [];
  const deal = String(
    teacher?.entities?.dealType ?? parsed.entities?.dealType ?? ''
  );

  if (deal === 'partnership') {
    keys.push('dealType');
    if (parsed.city || teacher?.city) keys.push('location');
    return [...new Set(keys)];
  }

  if (deal || parsed.intentType.startsWith('property')) {
    keys.push('dealType');
  }
  if (
    teacher?.entities?.propertyKind ||
    parsed.entities?.propertyKind ||
    parsed.intentType.startsWith('property')
  ) {
    keys.push('propertyKind');
  }
  if (parsed.city || teacher?.city) {
    keys.push('location');
  }

  if (teacher?.entities?.areaMin || parsed.entities?.areaMin || parsed.entities?.area) {
    keys.push('areaMin');
  } else {
    const m = parsed.rawText.match(/(\d{2,4})\s*مت/i);
    if (m) keys.push('areaMin');
  }
  if (teacher?.entities?.rooms || parsed.entities?.rooms) {
    keys.push('rooms');
  }

  if (teacher?.budgetMax || parsed.budgetMax) {
    keys.push('budget');
  } else if (/بودجه|تومان|میلی(?:ون|ارد)/u.test(parsed.rawText)) {
    keys.push('budget');
  }

  if (deal === 'rent_rahn_full' || deal === 'rent_rahn_ejare') {
    keys.push('rahnAmount');
  }
  if (deal === 'rent_rahn_ejare' || deal === 'rent' || deal === 'rent_monthly') {
    if (teacher?.entities?.monthlyRent) keys.push('monthlyRent');
  }

  return [...new Set(keys)];
}

export function slotFilled(
  answers: Record<string, unknown>,
  key: string
): boolean {
  const v = answers[key];
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return Number.isFinite(v) && v > 0;
  return true;
}

export function prefillCoverageScore(
  answers: Record<string, unknown>,
  required: string[]
): number {
  if (!required.length) return 1;
  const filled = required.filter((k) => slotFilled(answers, k)).length;
  return filled / required.length;
}

export function normalizeCitySlug(city?: string | null): string | null {
  if (!city?.trim()) return null;
  return cityToSlug(city.trim()) ?? city.trim().toLowerCase();
}

export function listingTitleAcceptable(title: string): boolean {
  const t = title.trim();
  if (t.length < 6) return false;
  if (isGenericListingTitle(t)) return false;
  return true;
}

export function listingDescriptionAcceptable(description: string): boolean {
  return description.trim().length >= 12;
}
