import { LISTING_TITLE_MAX_LENGTH } from '@/lib/need-intake/listing-title';

const GENERIC_ONLY_CITY =
  /^(خرید|فروش|اجاره|رهن|نیاز)\s*[—\-–]\s*\S+\s*$/u;

/** Default titles from intent-parser — not usable as listing headlines. */
export const GENERIC_PARSER_TITLES = new Set([
  'جستجوی خودرو',
  'جستجوی ملک',
  'جستجوی کالا',
  'درخواست خدمات',
  'آگهی استخدام',
  'ثبت نیاز',
]);

const CORRUPTED_TITLE_FRAGMENTS = [/نوحد/u, /حد\s*مش/u];

export interface TitleQualityContext {
  sourceText?: string;
}

export function normalizeListingTitle(raw: string): string {
  let t = raw
    .trim()
    .replace(/^["'«»]+|["'«»]+$/g, '')
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/\n[\s\S]*/, '');

  return truncateListingTitle(t);
}

export function truncateListingTitle(title: string, max = LISTING_TITLE_MAX_LENGTH): string {
  const t = title.trim();
  if (t.length <= max) return t;

  const slice = t.slice(0, max);
  const breakAt = Math.max(
    slice.lastIndexOf(' — '),
    slice.lastIndexOf(' - '),
    slice.lastIndexOf('،'),
    slice.lastIndexOf(' ')
  );

  if (breakAt >= Math.floor(max * 0.5)) {
    return slice.slice(0, breakAt).trim();
  }
  return slice.trim();
}

/** Returns rejection reason or null if title passes quality gate. */
export function rejectListingTitleReason(
  title: string,
  ctx?: TitleQualityContext
): string | null {
  const t = title.trim();
  if (t === 'ثبت نیاز' || t === 'خرید کالا') return 'generic';
  if (GENERIC_PARSER_TITLES.has(t)) return 'generic_parser_title';
  if (t.length < 10) return 'too_short';
  if (GENERIC_ONLY_CITY.test(t)) return 'generic_deal_city_only';
  if (CORRUPTED_TITLE_FRAGMENTS.some((re) => re.test(t))) return 'corrupted_fragment';

  const seed = ctx?.sourceText?.trim();
  if (seed && seed.length >= 20) {
    const normSeed = normalizeForOverlap(seed);
    const normTitle = normalizeForOverlap(t);
    const structuredParts = t.split(/\s*[—\-–]\s*/u).filter((p) => p.trim().length > 0);
    const isStructuredSummary = structuredParts.length >= 3;
    if (
      normTitle.length >= 15 &&
      !isStructuredSummary &&
      normTitle.length > normSeed.length * 0.55 &&
      overlapRatio(normSeed, normTitle) > 0.85
    ) {
      return 'verbatim_copy';
    }
  }

  return null;
}

export function isAcceptableListingTitle(title: string, ctx?: TitleQualityContext): boolean {
  return rejectListingTitleReason(title, ctx) === null;
}

function normalizeForOverlap(s: string): string {
  return s
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase();
}

function overlapRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  let matched = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i]!)) matched++;
  }
  return matched / shorter.length;
}

export function parseTitleFromModelOutput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { title?: string };
      if (typeof parsed.title === 'string') return normalizeListingTitle(parsed.title);
    } catch {
      // fall through
    }
  }

  const firstLine = trimmed.split('\n')[0]?.trim() ?? trimmed;
  return normalizeListingTitle(firstLine);
}
