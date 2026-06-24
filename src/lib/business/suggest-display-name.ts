/**
 * Display name + SEO helpers for individual trades and small businesses.
 */
import {
  getBusinessCategorySeoSegment,
  getBusinessCategoryTitle,
} from '@/lib/business/business-category';

const GENERIC_NAMES = new Set(['کسب‌وکار', 'کسب و کار', 'business', 'my business']);

export function isGenericBusinessName(name: string | null | undefined): boolean {
  const t = (name ?? '').trim();
  if (t.length < 2) return true;
  if (GENERIC_NAMES.has(t.toLowerCase())) return true;
  return false;
}

export type SuggestDisplayNameInput = {
  primaryOccupationSlug: string;
  personName?: string | null;
  city?: string | null;
};

/**
 * SEO-friendly public profile title.
 * Examples: «لوله‌کش در مشهد — احمد رضایی» | «فروشگاه اینترنتی بدلیجات در تهران»
 */
export function suggestBusinessDisplayName(input: SuggestDisplayNameInput): string {
  const occupation = getBusinessCategorySeoSegment(input.primaryOccupationSlug);
  const person = input.personName?.trim();
  const city = input.city?.trim();

  if (input.primaryOccupationSlug === 'real-estate-office') {
    if (city) return `${occupation} در ${city}`.slice(0, 120);
    return occupation.slice(0, 120);
  }

  if (person && city) {
    return `${occupation} در ${city} — ${person}`.slice(0, 120);
  }
  if (city) {
    return `${occupation} در ${city}`.slice(0, 120);
  }
  if (person) {
    return `${person} — ${occupation}`.slice(0, 120);
  }
  return occupation.slice(0, 120);
}

export function getDisplayNamePlaceholder(primaryOccupationSlug?: string): string {
  if (!primaryOccupationSlug) {
    return 'مثلاً لوله‌کشی احمد — مشهد (یا نام خودتان)';
  }
  if (primaryOccupationSlug === 'real-estate-agent') {
    return 'مثلاً علی رضایی — مشاور املاک در تهران';
  }
  if (primaryOccupationSlug === 'real-estate-office') {
    return 'مثلاً املاک آریا — تهران';
  }
  const occ = getBusinessCategoryTitle(primaryOccupationSlug);
  return `مثلاً ${occ} در مشهد — علی`;
}

export type BuildSeoMetaInput = {
  name: string;
  primaryOccupationSlug: string;
  description?: string | null;
  city?: string | null;
};

/** Page title for search results (≤120 chars). */
export function buildBusinessSeoTitle(input: BuildSeoMetaInput): string {
  const occupation = getBusinessCategorySeoSegment(input.primaryOccupationSlug);
  const name = input.name.trim();
  const city = input.city?.trim();

  const parts: string[] = [];
  if (occupation) parts.push(occupation);
  if (city) parts.push(city);
  let title = parts.join(' در ');
  if (name && !title.includes(name)) {
    title = title ? `${title} | ${name}` : name;
  } else if (!title) {
    title = name;
  }
  return title.slice(0, 120);
}

/** Meta description when user left intro empty (≤160 chars). */
export function buildBusinessSeoDescription(input: BuildSeoMetaInput): string {
  const userDesc = input.description?.trim();
  if (userDesc) return userDesc.slice(0, 160);

  const occupation = getBusinessCategorySeoSegment(input.primaryOccupationSlug);
  const name = input.name.trim();
  const city = input.city?.trim();

  let text = `خدمات ${occupation}`;
  if (city) text += ` در ${city}`;
  text += '.';
  if (name) text += ` ${name} — تماس و دریافت پیشنهاد.`;
  else text += ' تماس برای مشاوره و هماهنگی.';

  return text.slice(0, 160);
}

/** Resolve final display name: user input or auto-suggest if generic. */
export function resolveBusinessDisplayName(
  name: string,
  suggestInput: SuggestDisplayNameInput
): string {
  const trimmed = name.trim();
  if (!isGenericBusinessName(trimmed)) return trimmed.slice(0, 120);
  if (!suggestInput.primaryOccupationSlug) return trimmed || 'کسب‌وکار';
  return suggestBusinessDisplayName(suggestInput);
}
