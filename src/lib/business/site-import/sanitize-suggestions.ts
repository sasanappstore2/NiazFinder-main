import type {
  SiteImportApplyType,
  SiteImportSuggestion,
  SiteImportSuggestionGroup,
} from './types';

const ALLOWED_GROUPS = new Set<SiteImportSuggestionGroup>([
  'brand',
  'storefront_categories',
  'products',
  'seo',
  'social',
]);

const ALLOWED_APPLY_TYPES = new Set<SiteImportApplyType>([
  'patch_profile',
  'patch_web_presence',
  'add_categories',
  'add_offers',
]);

const PROFILE_KEYS = new Set([
  'name',
  'description',
  'logo',
  'coverImage',
  'phone',
  'email',
  'seoTitle',
  'seoDescription',
]);

const WEB_KEYS = new Set(['website', 'instagram', 'telegram', 'bale', 'rubika', 'eitaa']);

const MAX_STRING = 2000;
const MAX_SHORT = 320;
const MAX_OFFERS = 5;
const MAX_CATEGORIES = 8;

function trimStr(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function sanitizeProfilePayload(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of PROFILE_KEYS) {
    const max = key === 'seoTitle' ? 120 : key === 'seoDescription' ? MAX_SHORT : MAX_STRING;
    const v = trimStr(raw[key], max);
    if (v) out[key] = v;
  }
  return out;
}

function sanitizeWebPayload(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of WEB_KEYS) {
    const v = trimStr(raw[key], 500);
    if (v) out[key] = v;
  }
  return out;
}

function sanitizeOffers(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_OFFERS).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const o = item as Record<string, unknown>;
    const title = trimStr(o.title, 200);
    if (!title) return [];
    return [
      {
        title,
        description: trimStr(o.description, MAX_STRING) ?? title,
        priceRange: trimStr(o.priceRange, 120),
        imageUrl: trimStr(o.imageUrl, 2000),
        categoryTitle: trimStr(o.categoryTitle, 120),
        ctaType: trimStr(o.ctaType, 20) ?? 'chat',
      },
    ];
  });
}

function sanitizeCategories(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const titles: string[] = [];
  for (const item of raw.slice(0, MAX_CATEGORIES)) {
    const t = trimStr(typeof item === 'string' ? item : String(item ?? ''), 120);
    if (t && !titles.includes(t)) titles.push(t);
  }
  return titles;
}

/** Strip unknown fields and enforce size limits before apply. */
export function sanitizeSiteImportSuggestion(
  raw: SiteImportSuggestion
): SiteImportSuggestion | null {
  if (!ALLOWED_GROUPS.has(raw.group) || !ALLOWED_APPLY_TYPES.has(raw.apply.type)) {
    return null;
  }

  const id = trimStr(raw.id, 80);
  const labelFa = trimStr(raw.labelFa, 200);
  if (!id || !labelFa) return null;

  let payload: Record<string, unknown> = {};

  switch (raw.apply.type) {
    case 'patch_profile':
      payload = sanitizeProfilePayload(raw.apply.payload);
      if (Object.keys(payload).length === 0) return null;
      break;
    case 'patch_web_presence':
      payload = sanitizeWebPayload(raw.apply.payload);
      if (Object.keys(payload).length === 0) return null;
      break;
    case 'add_categories': {
      const titles = sanitizeCategories(raw.apply.payload.titles);
      if (titles.length === 0) return null;
      payload = { titles };
      break;
    }
    case 'add_offers': {
      const offers = sanitizeOffers(raw.apply.payload.offers);
      if (offers.length === 0) return null;
      payload = { offers };
      break;
    }
    default:
      return null;
  }

  const sourceUrl = trimStr(raw.sourceUrl, 2000) ?? undefined;

  return {
    id,
    group: raw.group,
    labelFa,
    preview: raw.preview,
    apply: { type: raw.apply.type, payload },
    sourceUrl,
  };
}

export function sanitizeSuggestionList(
  suggestions: SiteImportSuggestion[]
): SiteImportSuggestion[] {
  return suggestions.flatMap((s) => {
    const clean = sanitizeSiteImportSuggestion(s);
    return clean ? [clean] : [];
  });
}
