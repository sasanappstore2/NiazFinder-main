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

const LEADING_DEAL_RE =
  /^(اجاره(?:\s+روزانه)?|رهن(?:\s+و\s+اجاره)?|رهن\s+کامل|خرید|فروش|جستجوی\s+ملک)\s+/u;
const TRAILING_DEAL_PURPOSE_RE =
  /\s+برای\s+(اجاره(?:\s+روزانه)?|رهن(?:\s+و\s+اجاره)?|خرید|فروش)\s*$/u;

/** Drop duplicate deal wording (e.g. «اجاره … برای اجاره»). */
const PROPERTY_STRUCTURED_TITLE =
  /^(?:اجاره(?:\s+روزانه)?|رهن(?:\s+کامل|\s+و\s+اجاره)?|خرید|فروش|جستجوی\s+ملک)\s+(?:آپارتمان|خانه|زمین|ویلا|ملک|دفتر|مغازه|خانه\s+ویلایی)/u;

/** Titles assembled from deal + subject + location — not lazy copies. */
export function isStructuredListingTitle(title: string): boolean {
  const t = title.trim();
  if (PROPERTY_STRUCTURED_TITLE.test(t)) return true;
  if (/^(?:خرید|فروش)\s+\S+/u.test(t) && /\s(?:—|-)\s/u.test(t)) return true;
  return false;
}

export function dedupeRedundantDealPhrases(title: string): string {
  let t = title.trim();
  if (!t) return t;

  const leading = t.match(LEADING_DEAL_RE)?.[1]?.replace(/\s+/g, ' ') ?? '';
  const trailingMatch = t.match(TRAILING_DEAL_PURPOSE_RE);
  if (!leading || !trailingMatch) return t;

  const trailing = trailingMatch[1]!.replace(/\s+/g, ' ');
  const sameRent =
    leading.includes('اجاره') && trailing.includes('اجاره');
  const sameBuy = leading === 'خرید' && trailing === 'خرید';
  const sameSell = leading === 'فروش' && trailing === 'فروش';
  const sameRahn =
    leading.includes('رهن') && trailing.includes('رهن');

  if (sameRent || sameBuy || sameSell || sameRahn) {
    t = t.replace(TRAILING_DEAL_PURPOSE_RE, '').trim();
  }

  return t;
}

export function normalizeListingTitle(raw: string): string {
  let t = raw
    .trim()
    .replace(/^["'«»]+|["'«»]+$/g, '')
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/\n[\s\S]*/, '');

  t = dedupeRedundantDealPhrases(t);
  return truncateListingTitle(t);
}

/** Always run before persisting or displaying a listing title. */
export function finalizeListingTitle(raw: string, _ctx?: TitleQualityContext): string {
  return normalizeListingTitle(raw);
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
      !isStructuredListingTitle(t) &&
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

/** Reject AI titles that flip rent/رهn deals into sale/buy without user saying so. */
export function aiTitleConflictsDeterministicDeal(
  deterministic: string,
  aiTitle: string,
  sourceText?: string
): boolean {
  const det = deterministic.trim();
  const ai = aiTitle.trim();
  const rentDeal = /^(?:رهن(?:\s+و\s+اجاره)?|رهن\s+کامل|اجاره)/u.test(det);
  const saleDeal = /^(?:فروش|خرید)/u.test(ai);
  if (!rentDeal || !saleDeal) return false;
  const source = sourceText ?? '';
  return /رهن|ودیعه|اجاره/u.test(source) && !/(?:فروش|خرید)/u.test(source);
}
