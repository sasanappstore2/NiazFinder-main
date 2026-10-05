import { getCategoryBySlug, getCategoryPath, getDirectChildren, normalizeCategoryPair } from '@/config/categories';
import { ALL_LOCATION_CITIES } from '@/lib/search/city-slugs';
import { DEED_TYPE, PROPERTY_KIND } from '@/config/category-filters/options';
import type { PostNaturalField } from './post-natural-contract';
import { normalizePostNaturalText } from './post-natural-normalization';
import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';
import {
  extractPropertyMoneyFromText,
  findKeywordIndicesWithFuzzyRepair,
  moneyMentionsInText,
  parseBillionTomanFromPhrase,
  parseMillionTomanFromPhrase,
  parsePersianAmountPhrase,
  normalizeColloquialAmountWords,
} from '@/lib/need-intake/parse-persian-amount';
import {
  getBusinessCommercialPropertyCandidates,
  isBusinessCommercialPropertyIntent,
} from '@/lib/need-intake/business-commercial-property-intent';
import {
  legacyDealTypeFromTransactionType,
  transactionTypeFromSourceText,
} from '@/lib/need-intake/resolve-transaction-type';
import { enrichParsedIntentClient } from '@/lib/need-intake/enrich-parsed-intent.client';
import { extractLocationFragment } from '@/lib/need-intake/location-fragment';
import {
  parseIntentFromText,
  isConstructionPartnershipText,
  suggestNeedCategoriesFromText,
} from '@/lib/need-intake/intent-parser';

export interface DeterministicPostExtraction {
  normalizedText: string;
  entities: Record<string, unknown>;
  answers: Record<string, unknown>;
  fields: PostNaturalField[];
  categoryCandidates: Array<{ slug: string; label: string }>;
  cityCandidate?: string;
  neighborhoodPhrase?: string;
  includePropertyFields: boolean;
  gaps: string[];
  warnings: string[];
}

type CityMentionTrieNode = {
  children: Map<string, CityMentionTrieNode>;
  cityName?: string;
};

type TextToken = { value: string; start: number; end: number };

const CITY_WORD_RE = /[\p{L}\p{N}]+/gu;

function tokenizeCityText(value: string): TextToken[] {
  return Array.from(normalizePostNaturalText(value).toLocaleLowerCase().matchAll(CITY_WORD_RE), (match) => ({
    value: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
}

function buildCityMentionTrie(): CityMentionTrieNode {
  const root: CityMentionTrieNode = { children: new Map() };
  for (const city of ALL_LOCATION_CITIES) {
    const tokens = tokenizeCityText(city.name);
    if (!tokens.length) continue;
    let node = root;
    for (const token of tokens) {
      let child = node.children.get(token.value);
      if (!child) {
        child = { children: new Map() };
        node.children.set(token.value, child);
      }
      node = child;
    }
    node.cityName ??= city.name;
  }
  return root;
}

// Build once from the complete location registry. Trie lookup avoids compiling
// 1,200+ city-name regexes for every intake request and supports multiword names.
const CITY_MENTION_TRIE = buildCityMentionTrie();

function findExplicitCatalogCity(text: string): string | undefined {
  const tokens = tokenizeCityText(text);
  let best: { name: string; end: number; tokenCount: number } | undefined;

  for (let start = 0; start < tokens.length; start += 1) {
    let node = CITY_MENTION_TRIE;
    for (let end = start; end < tokens.length; end += 1) {
      const child = node.children.get(tokens[end]!.value);
      if (!child) break;
      node = child;
      if (!node.cityName) continue;

      const candidate = {
        name: node.cityName,
        end: tokens[end]!.end,
        tokenCount: end - start + 1,
      };
      if (
        !best || candidate.end > best.end ||
        (candidate.end === best.end && candidate.tokenCount > best.tokenCount)
      ) best = candidate;
    }
  }

  return best?.name;
}

function numberValue(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const n = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function addField(
  fields: PostNaturalField[],
  key: string,
  value: unknown,
  evidence: string,
  requiresConfirmation = false
) {
  fields.push({
    key,
    value,
    confidence: 1,
    source: 'deterministic-parser',
    requiresConfirmation,
    evidence,
  });
}

function hasAny(text: string, values: readonly string[]): boolean {
  return values.some((value) => text.includes(value));
}

const RAHN_KEYWORD = '\u0631\u0647\u0646'; // رهن
const VADIYEH_KEYWORD = '\u0648\u062F\u06CC\u0639\u0647'; // ودیعه

/** Property nouns that can mark either the requested premises or the place a
 *  service is needed at. Disambiguated by isServiceForLocationIntent. */
const PROPERTY_NOUN_RE =
  /(?:متری|متر|ملک|آپارتمان|اپارتمان|مغازه|زمین|ویلا|سوله|واحد|استودیو|پلاتو|اتاق\s*جلسه|فضای\s*کار)/u;

/** People providing a service at the customer's location. */
const SERVICE_PROVIDER_RE =
  /(?:نظافتچی|تعمیرکار|تعمیر\s*کار|لوله[\s\u200c]?کش|نگهبان|برقکار|برق\s*کار|باغبان|پرستار|عکاس|مترجم|آشپز|راننده|کارگر|باربر)/u;

function isServiceProviderText(text: string): boolean {
  return SERVICE_PROVIDER_RE.test(text) || /(?:وکیل|مراسم|خدمات)/u.test(text);
}

/**
 * «تعمیرکار کولر گازی برای مغازه لازم دارم» — the property noun after «برای»
 * names where the service is needed, not a premises the user wants to rent or
 * buy. Both a provider keyword and the «برای + ملک» order are required, so
 * «مغازه برای فروش» and «مغازه میخوام برای تعمیرکاری» stay property needs.
 */
function isServiceForLocationIntent(text: string): boolean {
  return (
    SERVICE_PROVIDER_RE.test(text) &&
    /برای\s+(?:یک\s+|یه\s+)?(?:مغازه|دفتر|آپارتمان|اپارتمان|سوئیت|خونه|خانه|ویلا|انبار|سوله|زمین|واحد|مجموعه|برج|محل|فضا)/u.test(
      text
    )
  );
}

/**
 * A neighborhood name can contain a property keyword (for example
 * «شاهین ویلا»). Exclude only the bounded phrase already extracted after a
 * spatial cue before classifying the property's kind; do not strip the same
 * word when the user actually says «ویلا» as the property noun.
 */
function withoutExtractedLocationMention(text: string): string {
  const city = findExplicitCatalogCity(text);
  // Prefer the complete phrase after a location cue. The city-aware fallback
  // can truncate compound names when the neighborhood itself starts with a
  // catalog city token, e.g. «تهران‌ویلا، تهران».
  const phrase = extractExplicitSpatialPhrase(text, city) ?? cleanNeighborhoodPhrase(
    extractNeighborhoodBeforeCity(text, city) ?? extractLocationFragment(text),
    city,
  );
  if (!phrase) return text;

  // A long capture is ambiguous prose, not a trustworthy locality. Bound
  // user-derived regex construction to protect the rules parser from costly
  // backtracking on verbose listing descriptions.
  if (phrase.length > 120 || phrase.trim().split(/\s+/u).length > 10) return text;

  const escapedPhrase = phrase
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
    .join('[\\s\\u200c\\-]+');
  if (!escapedPhrase) return text;

  const spatialCue = '(?:محدوده(?:ٔ)?|محله|منطقه|حوالی|اطراف|حاشیه|نزدیک|دور\\s*و\\s*بر|در|توی|تو|داخل)';
  const locationPattern = new RegExp(
    `(^|\\s)${spatialCue}\\s+(?:(?:میدان|خیابان|بلوار|کوچه)\\s+)?${escapedPhrase}(?=$|\\s|[،,؛.])`,
    'iu',
  );
  let cleaned = text.replace(locationPattern, '$1');
  // A hood extracted right before the catalog city («شاهین‌ویلا» in
  // «…آپارتمان ۲۱۴ متر شاهین‌ویلا کرج…») has no spatial cue before it. Strip
  // it only when the phrase is immediately followed by that city name, so a
  // property noun like «ویلا» said by the user is never removed.
  const cityTrim = city?.trim();
  if (cityTrim) {
    const escapedCity = cityTrim.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const noCuePattern = new RegExp(
      `(^|\\s)${escapedPhrase}(?=\\s+${escapedCity}(?=$|[\\s،,؛.]))`,
      'iu',
    );
    cleaned = cleaned.replace(noCuePattern, '$1');
    // «خونه تو مشهد وکیل آباد» — the hood can also FOLLOW the city mention
    // with no cue between. Same bounded-phrase guarantee: only the already
    // extracted locality phrase is removed, never the user's property noun.
    const afterCityPattern = new RegExp(
      `(^|\\s)${escapedCity}(?=$|[\\s،,؛.])\\s+${escapedPhrase}(?=$|[\\s،,؛.])`,
      'iu',
    );
    cleaned = cleaned.replace(afterCityPattern, '$1');
  }
  return cleaned.replace(/\s+/gu, ' ').trim();
}

function inferPropertyKind(text: string): string | undefined {
  text = withoutExtractedLocationMention(text);
  text = text.replace(/کلنگی\s*نمی[\s‌]?خ(?:وام|واهم|وامش)?/gu, ' ');
  if (/(?:مشاور\s*(?:املاک|ملک)|آژانس\s*املاک|بنگاه)/u.test(text)) {
    return undefined;
  }
  if (
    isServiceProviderText(text) &&
    (!PROPERTY_NOUN_RE.test(text) || isServiceForLocationIntent(text))
  ) {
    return undefined;
  }
  const commercialCandidates = getBusinessCommercialPropertyCandidates(text);
  if (commercialCandidates.length) {
    const kinds = [...new Set(commercialCandidates.map((slug) => slug.split('-')[0]))];
    if (kinds.length === 1) return kinds[0];
    // Generic «واحد» is not evidence of a residential apartment when its
    // stated purpose is commercial and the business subtype remains unclear.
    if (/(?:واحد|آپارتمان|اپارتمان)/u.test(text)) return undefined;
  }
  const candidates: Array<[string, readonly string[]]> = [
    ['land', ['زمین', 'کلنگی']],
    // Explicit compound property names outrank their generic head («خانه»).
    ['villa', [
      'خانه ویلایی', 'خانهٔ ویلایی', 'ویلا', 'ویلایی', 'باغ ویلا', 'باغ ویلایی',
      'خانه مستقل', 'خانهٔ مستقل', 'خونه مستقل', 'خونهٔ مستقل',
      'خانه حیاط دار', 'خانهٔ حیاط دار', 'خونه حیاط دار', 'خونهٔ حیاط دار',
    ]],
    ['apartment', ['آپارتمان', 'اپارتمان', 'واحد', 'واحد مسکونی', 'خونه', 'خانه', 'سوئیت']],
    ['office', ['دفتر', 'اداری', 'مطب', 'کلینیک', 'استودیو', 'پلاتو', 'اتاق جلسه', 'فضای کاری', 'فضای کار']],
    ['shop', ['مغازه', 'فروشگاه', 'غرفه', 'مزون', 'بوتیک', 'آرایشگاه']],
    ['industrial', ['سوله', 'انبار صنعتی', 'صنعتی']],
  ];
  const found = candidates.find(([, terms]) => hasAny(text, terms))?.[0];
  if (found) return found;
  // «سالن» must not match inside a place name like «سالندان».
  if (/(?:^|[\s،,؛(])سالن(?:ها(?:ی)?)?(?=$|[\s،,؛.)])/u.test(text)) return 'shop';
  if (
    hasAny(text, ['کارگاه']) ||
    /(?:^|[\s،,؛(])انبار(?:ها(?:ی)?)?(?=$|[\s،,؛).])/u.test(text)
  ) {
    return 'industrial';
  }
  return undefined;
}

function inferPropertyKindLabel(value: string): string {
  return PROPERTY_KIND.find((option) => option.value === value)?.label ?? value;
}

function inferDeedType(text: string): string | undefined {
  if (hasAny(text, ['وکالتی', 'وکالتنامه', 'سند وکالت', 'سند وکالتی'])) return 'power_of_attorney';
  if (hasAny(text, ['تک برگ', 'تک‌برگ', 'تکبرگ'])) return 'single_sheet';
  if (hasAny(text, ['مشاع', 'چند مالک'])) return 'multi_owner';
  return undefined;
}

function inferDeedLabel(value: string): string {
  return DEED_TYPE.find((option) => option.value === value)?.label ?? value;
}

function triStateFeature(text: string, feature: string): 'yes' | 'no' | 'unknown' {
  const index = text.indexOf(feature);
  if (index < 0) return 'unknown';
  const before = text.slice(Math.max(0, index - 28), index);
  const after = text.slice(index + feature.length, index + feature.length + 32);
  const negative = /(?:بدون|نداشته(?:\s+باشد)?|نداره|نمی(?:‌|\s*)خ(?:وام|واهم)|لازم\s+نیست)/u;
  if (negative.test(before) || negative.test(after)) return 'no';

  const positive = /(?:با|دارای|داشتن|داشته(?:\s+باشد)?|لازم\s+دارم|می(?:‌|\s*)خ(?:وام|واهم)|داره|داشته(?:\s+باشه)?)/u;
  if (positive.test(before) || positive.test(after) || /(?:^|\s)و\s*$/u.test(before)) return 'yes';
  return 'unknown';
}

function parseBudgetBounds(text: string): { budgetMin?: number; budgetMax?: number } {
  const normalized = normalizeColloquialAmountWords(text);
  const out: { budgetMin?: number; budgetMax?: number } = {};
  const re = /(حداقل|کمتر\s+از|از|حداکثر|تا)\s*(\d[\d,]*(?:\.\d+)?)\s*(میلیون|میلیارد)/gu;
  for (const match of normalized.matchAll(re)) {
    const matchStart = match.index ?? 0;
    const matchEnd = (match.index ?? 0) + match[0].length;
    const leadingContext = normalized.slice(Math.max(0, matchStart - 18), matchStart);
    const trailingContext = normalized.slice(matchEnd, matchEnd + 18);
    // In rent phrases, "تا ۸۰۰ میلیون رهن" and "تا ۵۰ میلیون اجاره"
    // describe the deposit/rent slots, not a generic purchase budget.
    if (/(?:رهن|ودیعه|اجاره)/u.test(trailingContext) || /(?:ماهی|ماهانه)/u.test(leadingContext)) continue;
    const raw = match[2]?.replace(/,/g, '');
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const tomans = amount * (match[3] === 'میلیارد' ? 1_000_000_000 : 1_000_000);
    if (match[1] === 'حداقل' || match[1] === 'از') out.budgetMin = tomans;
    else out.budgetMax = tomans;
  }
  return out;
}

interface ContextualMoney {
  rahnAmount?: number;
  monthlyRent?: number;
  nightlyRent?: number;
  budgetMin?: number;
  budgetMax?: number;
}

function parseContextualMoney(text: string): ContextualMoney {
  const normalized = normalizeColloquialAmountWords(text);
  const result: ContextualMoney = {};
  const amountToken = '(?:\\d[\\d,]*(?:\\.\\d+)?|[\\u0600-\\u06FF]+(?:\\s+و\\s+[\\u0600-\\u06FF]+){0,2})';
  const amountRe = new RegExp(
    `(${amountToken})\\s*(میلیون(?:ی|ه)?|میلیارد(?:ی|ه)?|تومان|تومن)`,
    'gu'
  );
  // Each cue occurrence anchors to exactly one money mention. In
  // «N1 میلیون رهن N2 میلیون اجاره» the رهن label sitting right after N1 is
  // equally close to N2; without consuming the anchor, the stable sort hands
  // رهن to N2 as well and overwrites the correct deposit with the rent amount.
  const consumedCueAnchors = new Set<string>();
  for (const match of normalized.matchAll(amountRe)) {
    const rawAmount = match[1]?.trim();
    const unit = match[2] ?? '';
    if (!rawAmount) continue;
    const phrase = rawAmount.replace(/[,،]/gu, '').trim();
    const amount = unit.startsWith('میلیارد')
      ? parseBillionTomanFromPhrase(phrase)
      : unit.startsWith('میلیون')
        ? parseMillionTomanFromPhrase(phrase)
        : unit === 'تومان' || unit === 'تومن'
          ? (() => {
              const n = parsePersianAmountPhrase(phrase);
              if (n == null) return undefined;
              // Colloquial need text reads a small bare «تومان/تومن» amount as
              // «میلیون تومان» (رهن ۵۰ تومان = ۵۰ میلیون). A writer who typed
              // the full literal (≥ ۱۰۰۰) keeps the raw toman reading.
              return n < 1_000 ? Math.round(n * 1_000_000) : Math.round(n);
            })()
          : (() => {
              const n = parsePersianAmountPhrase(phrase);
              return n == null ? undefined : n;
            })();
    if (amount == null || amount <= 0) continue;

    const start = match.index ?? 0;
    const beforeStart = Math.max(0, start - 36);
    const before = normalized.slice(beforeStart, start);
    const end = start + match[0].length;
    const after = normalized.slice(end, end + 36);
    const cues = [
      { kind: 'rahn', words: ['رهن', 'ودیعه'] },
      { kind: 'rent', words: ['اجاره', 'ماهی', 'ماهانه', 'کرایه'] },
      { kind: 'budget', words: ['بودجه', 'قیمت', 'خرید', 'فروش', 'حدود', 'تا', 'حداکثر', 'کمتر از'] },
    ] as const;
    const candidates = cues.flatMap((cue) =>
      cue.words.flatMap((word) => {
        const found: Array<{ kind: (typeof cue)['kind']; distance: number; anchor: string }> = [];
        const beforeIndex = before.lastIndexOf(word);
        if (beforeIndex >= 0) {
          found.push({
            kind: cue.kind,
            distance: before.length - (beforeIndex + word.length),
            // Anchor by the cue's absolute position so the same occurrence
            // found from a later mention's before-window is recognized.
            anchor: `${cue.kind}|${word}|${beforeStart + beforeIndex}`,
          });
        }
        const afterIndex = after.indexOf(word);
        if (afterIndex >= 0) {
          found.push({
            kind: cue.kind,
            distance: afterIndex,
            anchor: `${cue.kind}|${word}|${end + afterIndex}`,
          });
        }
        return found;
      })
    );
    const nearest = candidates
      .filter((candidate) => !consumedCueAnchors.has(candidate.anchor))
      .sort((a, b) => a.distance - b.distance)[0];
    const context = `${before} ${after}`;
    // «نه اجاره» / «بدون اجاره» deny the rent slot before the cue; the
    // ندارم family denies it after. Either way the mention must not land in
    // monthlyRent (rules: «نه اجاره» + deposit → FULL_DEPOSIT). The denying
    // word needs a word boundary: «رنه … اجاره» must never read as «نه اجاره».
    const isNegativeRent =
      /(?:^|[\s،,؛])(?:نه|بدون|فاقد)\s*اجاره|اجاره\s*(?:ندارم|نداره|نداریم|نمی(?:‌|\s*)خ(?:وام|واهم))/u.test(context);
    // «بدون رهن» / «رهن ندارم» deny the deposit slot the same way.
    const isNegativeRahn =
      /(?:^|[\s،,؛])(?:نه|بدون|فاقد)\s*(?:رهن|ودیعه)|(?:رهن|ودیعه)\s*(?:ندارم|نداره|نداریم)/u.test(context);
    const hasRahnCue = !isNegativeRahn && /رهن|ودیعه/u.test(context);
    const hasRentCue = !isNegativeRent && /اجاره|ماهی|ماهانه|کرایه/u.test(context);
    const isRahn = hasRahnCue && (!hasRentCue || nearest?.kind === 'rahn');
    const isRent = !isRahn && hasRentCue;
    const isMin = /حداقل|از\s*$/u.test(before);
    const isBudgetCue = nearest?.kind === 'budget';
    // «هر شب ۹۰۰ هزار تومان» / «۸۰۰ تومان هر شب» — a nightly price must land
    // in the documented nightly slot, never in monthlyRent, and never under
    // the monthly «bare toman = million» colloquial scale.
    const isNightly = /(?:هر\s*شب|شبانه(?![\u200c]?روزی))/u.test(context);

    if (isNightly) {
      const nightlyAmount = unit.startsWith('میلیارد')
        ? parseBillionTomanFromPhrase(phrase)
        : unit.startsWith('میلیون')
          ? parseMillionTomanFromPhrase(phrase)
          : (() => {
              const n = parsePersianAmountPhrase(phrase);
              if (n == null) return undefined;
              // Nightly colloquial scale: «۸۰۰ تومان هر شب» reads as ۸۰۰
              // هزار تومان (repo convention for nightly prices, cf.
              // parseThousandToman in extract-property-slots.ts).
              return n < 1_000 ? Math.round(n * 1_000) : Math.round(n);
            })();
      if (nightlyAmount != null && nightlyAmount > 0) {
        result.nightlyRent = nightlyAmount;
        if (nearest?.anchor) consumedCueAnchors.add(nearest.anchor);
      }
      continue;
    }

    if (isRahn) {
      result.rahnAmount = amount;
      if (nearest?.anchor) consumedCueAnchors.add(nearest.anchor);
    } else if (isRent && !isNegativeRent) {
      result.monthlyRent = amount;
      if (nearest?.anchor) consumedCueAnchors.add(nearest.anchor);
    } else if (isBudgetCue) {
      if (isMin) result.budgetMin = amount;
      else result.budgetMax = amount;
      if (nearest?.anchor) consumedCueAnchors.add(nearest.anchor);
    }
  }
  return result;
}

function categoryCandidatesForText(text: string): Array<{ slug: string; label: string }> {
  text = withoutExtractedLocationMention(text);
  const keepLeafCategories = (candidates: Array<{ slug: string; label: string }>) =>
    candidates.filter((candidate, index, all) => {
      const path = getCategoryPath(candidate.slug);
      const leaf = path[path.length - 1];
      return Boolean(leaf && leaf.depth > 0 && leaf.slug === candidate.slug &&
        getDirectChildren(leaf.slug).length === 0) &&
        all.findIndex((other) => other.slug === candidate.slug) === index;
    });

  // An explicit short-stay duration is more specific than the general
  // commercial-premises intent. Resolve its catalog leaf first, otherwise a
  // phrase such as «دفتر برای چند روز» is prematurely collapsed to office-rent.
  if (resolveCategoryTransactionType(text) === 'DAILY_RENT') {
    const shortStayCandidates = categoryCandidatesForProperty(text);
    if (shortStayCandidates.length) return keepLeafCategories(shortStayCandidates);
  }

  if (/(?:مشاور\s*(?:املاک|ملک)|آژانس\s*املاک|بنگاه)/u.test(text)) {
    const agency = getCategoryBySlug('agency-services');
    if (agency) return keepLeafCategories([{ slug: 'agency-services', label: agency.title }]);
  }

  // Commercial business phrases stay a shortlist (shop/office) so Si or the
  // user can choose; a salon must not be silently collapsed to one leaf.
  // A service provider whose property noun sits in «برای X» position needs the
  // service, not the premises — the commercial shortlist must not pre-empt it.
  if (isBusinessCommercialPropertyIntent(text) && !isServiceForLocationIntent(text)) {
    let commercial = getBusinessCommercialPropertyCandidates(text);
    const transaction = resolveCategoryTransactionType(text);
    if (transaction && RENT_FAMILY_TRANSACTION_TYPES.has(transaction)) {
      commercial = commercial.filter((slug) => slug.endsWith('-rent'));
    } else if (transaction === 'BUY' || transaction === 'SELL') {
      commercial = commercial.filter((slug) => slug.endsWith('-sale'));
    }
    if (commercial.length) {
      return keepLeafCategories(
        commercial.map((slug) => ({ slug, label: getCategoryBySlug(slug)?.title ?? slug }))
      );
    }
  }

  const propertyCandidates = categoryCandidatesForProperty(text);
  if (propertyCandidates.length) return keepLeafCategories(propertyCandidates);

  const suggestions = suggestNeedCategoriesFromText(text, 6);
  const candidates = suggestions
    .map((candidate) => normalizeCategoryPair(candidate.slug))
    .map((pair) => pair.subcategorySlug ?? pair.categorySlug)
    .filter((slug, index, all) => slug && all.indexOf(slug) === index)
    .map((slug) => ({ slug, label: getCategoryBySlug(slug)?.title ?? slug }));

  const servicePhrase = isServiceProviderText(text);
  const hasPropertyCue = /(?:متری|متر|ملک|آپارتمان|اپارتمان|مغازه|زمین|ویلا|سوله|واحد)/u.test(text);
  if (servicePhrase && (!hasPropertyCue || isServiceForLocationIntent(text))) {
    const serviceCandidates = candidates.filter(
      (candidate) => getCategoryPath(candidate.slug)[0]?.slug !== 'real-estate'
    );
    return keepLeafCategories(serviceCandidates.length ? serviceCandidates : candidates);
  }

  // The root `services` hint is never converted to its first child here.
  return keepLeafCategories(candidates);
}

function cleanNeighborhoodPhrase(fragment: string | undefined, city: string | undefined): string | undefined {
  if (!fragment?.trim()) return undefined;
  let value = fragment
    .replace(/[،,].*$/u, '')
    .replace(/\s+\d[\d۰-۹,]*(?:\s*(?:میلیارد|ملیارد|میلیون|ملیون|هزار|تومان|تومن))(?:\s+.*)?$/iu, '')
    .split(/\s+(?:برای|اجاره|رهن|فروش|خرید|بین|دنبال|واحد|طبقه|می[\s‌]?(?:خوام|خواهم)|میخوام|می‌خوام|پارکینگ|آسانسور|انباری|بودجه|خواب|اتاق|سند|لازم)/iu)[0]
    .replace(/^(?:(?:محدوده|محله|منطقه|حوالی|اطراف|حاشیه)\s+)+/u, '')
    .trim();
  if (city?.trim()) {
    value = value
      .replace(new RegExp(`(?:^|\\s)${city.trim()}(?=\\s|$)`, 'u'), ' ')
      .replace(/\s+/gu, ' ')
      .trim();
  }
  value = value.replace(/\s+(?:\d+|یک|دو|سه|چهار|پنج)\s*$/u, '').trim();
  if (
    /^(?:پارکینگ|آسانسور|انباری|بودجه|خرید|فروش|اجاره|رهن|برای|در|اطراف|ساخت|ساخت و ساز)$/u.test(value) ||
    /(?:دفتر\s+کار|کار)\s+در$/u.test(value)
  ) return undefined;
  return value || undefined;
}

function cleanExplicitSpatialPhrase(fragment: string | undefined, city: string | undefined): string | undefined {
  let value = cleanNeighborhoodPhrase(fragment, undefined);
  if (!value || !city?.trim()) return value;
  const normalizedValue = normalizePostNaturalText(value).replace(/\s+/gu, ' ').trim();
  const normalizedCity = normalizePostNaturalText(city.trim()).replace(/\s+/gu, ' ').trim();
  if (normalizedValue === normalizedCity) return undefined;
  return normalizedCity && normalizedValue.endsWith(` ${normalizedCity}`)
    ? normalizedValue.slice(0, -normalizedCity.length).trim()
    : normalizedValue;
}

function extractExplicitSpatialPhrase(text: string, city: string | undefined): string | undefined {
  const match = text.match(
    /(?:^|[\s،,؛])(?:محدوده(?:ٔ)?|محله|منطقه|حوالی|اطراف|حاشیه|نزدیک)\s+([^،,؛.]+?)(?=[،,؛.]|$)/u
  );
  return cleanExplicitSpatialPhrase(match?.[1], city);
}

function extractNeighborhoodBeforeCity(text: string, city: string | undefined): string | undefined {
  if (!city?.trim()) return undefined;
  const escapedCity = city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Digits belong to compound hood names too («فاز ۳ ویلاشهر»).
  const token = '[\\u0600-\\u06FF\\u200c\\-\\d]+';
  const patterns = [
    new RegExp(
      `(?:\\d[\\d,]*\\s*متر(?:ی)?|آپارتمان|اپارتمان|واحد|مغازه|دفتر)\\s+(?:توی|در|تو|حوالی|اطراف)?\\s*(${token}(?:\\s+${token}){0,2})\\s+${escapedCity}(?:\\s|$|،|,)`,
      'u'
    ),
    new RegExp(
      `(?:نزدیک|حوالی|اطراف)\\s+(?:میدان|خیابان|بلوار)?\\s*(${token}(?:\\s+${token}){0,2})\\s+${escapedCity}(?:\\s|$|،|,)`,
      'u'
    ),
  ];
  for (const pattern of patterns) {
    const cleaned = cleanNeighborhoodPhrase(text.match(pattern)?.[1], undefined);
    if (cleaned) return cleaned;
  }
  return undefined;
}

function hasExplicitTransactionCue(text: string): boolean {
  return /(?:خرید|خریدار|بخر|می[\s‌]?خر|برای\s+فروش|فروش(?!گاه|ی)|می[\s‌]?فروشم|اجاره|کرایه|رهن|ودیعه|روزانه|کوتاه[\s‌-]*مدت|استیجاری|ساعتی)/u.test(text);
}

const RENT_FAMILY_TRANSACTION_TYPES = new Set([
  'RENT',
  'FULL_DEPOSIT',
  'DEPOSIT_AND_RENT',
  'DAILY_RENT',
  'HOURLY_RENT',
]);

/**
 * The legacy parser can project colloquial intents («می‌خواهم»، «لازم دارم»)
 * onto buy even when the text states an explicit rent/رهن cue. When the
 * cue-based fallback resolves to a rent-family transaction, it wins. Buy/sell
 * texts keep the legacy parser first so its validated «برای فروش می‌خواهم»
 * interpretations stay unchanged.
 */
function resolveExplicitTransactionType(text: string): string | null {
  if (/(?:خرید|رهن)\s*(?:یا|و)\s*(?:رهن|خرید)|فرقی\s*نداره/u.test(text)) return null;
  if (!hasExplicitTransactionCue(text)) return null;
  const cueFallback = fallbackTransactionType(text);
  if (cueFallback && RENT_FAMILY_TRANSACTION_TYPES.has(cueFallback)) {
    return cueFallback;
  }
  return transactionTypeFromSourceText(text) ?? cueFallback ?? null;
}

function resolveCategoryTransactionType(text: string): string | undefined {
  return resolveExplicitTransactionType(text) ?? fallbackTransactionType(text);
}

/**
 * A typed model answer is not evidence that the user said a field. Keep
 * proposals out of the UI unless the normalized source contains a direct cue
 * for that decision. In particular, an omitted amenity must stay unknown.
 */
export function hasPostDecisionTextEvidence(questionKey: string, rawText: string): boolean {
  const text = normalizePostNaturalText(rawText);
  switch (questionKey) {
    case 'category_candidate': {
      const candidates = categoryCandidatesForText(text);
      const hasPropertyCategory = candidates.some(
        (candidate) => getCategoryPath(candidate.slug)[0]?.slug === 'real-estate'
      );
      // A real-estate leaf encodes both property type and transaction. Never
      // let the model invent rent/sale when neither is explicit or resolvable.
      return candidates.length > 0 && (!hasPropertyCategory || Boolean(resolveCategoryTransactionType(text)));
    }
    case 'transaction_type':
      return hasExplicitTransactionCue(text);
    case 'property_kind':
      return Boolean(inferPropertyKind(text));
    case 'deed_type':
      return Boolean(inferDeedType(text));
    case 'usage':
      return /(?:سالن|آرایشگاه|مزون|زیبایی|دفتر\s+کار|کاربری\s+(?:اداری|تجاری|مسکونی)|فعالیت\s+(?:اداری|تجاری)|مطب|شرکت|سکونت|مسکونی|برای\s+(?:زندگی|سکونت|فروشگاه|مغازه|کسب|لوازم|فروش|عرضه)|محل\s+کسب|کسب\s*و\s*کار|تجاری)/u.test(text);
    case 'parking':
      return triStateFeature(text, 'پارکینگ') !== 'unknown';
    case 'elevator':
      return triStateFeature(text, 'آسانسور') !== 'unknown';
    case 'storage':
      return triStateFeature(text, 'انباری') !== 'unknown';
    default:
      return false;
  }
}

function fallbackTransactionType(text: string): string | undefined {
  if (/(?:خرید|رهن)\s*(?:یا|و)\s*(?:رهن|خرید)|فرقی\s*نداره/u.test(text)) return undefined;
  // Word-bounded on both sides: the «یک شب» inside «نزدیک شبیری» is not a
  // short-stay duration, and a duration glued to other words is not evidence.
  const shortStayDuration =
    /(?:^|[\s،,؛(])(?:روزانه|شبانه|کوتاه[\s‌-]*مدت|(?:چند|یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده|\d+)\s*(?:شب|روز|هفته|ساعت(?:ه|ی)?)(?:ه[\s‌-]*ای|[\s‌-]*ای)?|آخر\s*هفته|تعطیلات)(?=$|[\s،,؛.؟!])/u.test(text);
  const shortStayIntent =
    /(?:اجاره|کرایه|اقامت|رزرو|سفر|تعطیلات|آخر\s*هفته|برای\s*(?:چند|یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده|\d+)\s*(?:شب|روز|هفته))/u.test(text);
  if (shortStayDuration && shortStayIntent) return 'DAILY_RENT';
  if (/اجاره\s*(?:روزانه|کوتاه)/u.test(text)) return 'DAILY_RENT';
  // «نه اجاره» / «بدون رهن» / «رهن ندارم» deny a slot: the denied word must
  // not act as its own cue (denied rent + deposit → FULL_DEPOSIT; denied
  // deposit + rent → plain RENT).
  const rentDenied =
    /(?:^|[\s،,؛])(?:نه|بدون|فاقد)\s*اجاره|اجاره\s*(?:ندارم|نداره|نداریم|نمی(?:‌|\s*)خ(?:وام|واهم))/u.test(text);
  const depositDenied =
    /(?:^|[\s،,؛])(?:نه|بدون|فاقد)\s*(?:رهن|ودیعه)|(?:رهن|ودیعه)\s*(?:ندارم|نداره|نداریم|نمی(?:‌|\s*)خ(?:وام|واهم))/u.test(text);
  // The money path repairs single-edit typos of deposit keywords («راهن»);
  // the transaction path must see the same keywords, or a repaired deposit
  // amount would ship inside a rent-only (RENT) deal.
  const depositMentioned =
    /رهن|ودیعه/u.test(text) ||
    findKeywordIndicesWithFuzzyRepair(text, RAHN_KEYWORD).indices.length > 0 ||
    findKeywordIndicesWithFuzzyRepair(text, VADIYEH_KEYWORD).indices.length > 0;
  if (/رهن\s*کامل|فقط\s*رهن/u.test(text)) return 'FULL_DEPOSIT';
  if (depositMentioned && !depositDenied && /اجاره|کرایه/u.test(text) && !rentDenied) {
    return 'DEPOSIT_AND_RENT';
  }
  if (/اجاره|کرایه/u.test(text) && !rentDenied) return 'RENT';
  if (/فروش(?!گاه|ی)|می[\s‌]?فروشم/u.test(text)) return 'SELL';
  if (/خرید|می[\s‌]?خرم|برای\s+خرید/u.test(text)) return 'BUY';
  return undefined;
}

function categoryCandidatesForProperty(text: string): Array<{ slug: string; label: string }> {
  const candidate = (slug: string) => ({
    slug,
    label: getCategoryBySlug(slug)?.title ?? slug,
  });

  // These service intents are explicit leaf categories; generic property
  // words («ملک», «ساخت») must not add a sale/rent listing category beside them.
  if (isConstructionPartnershipText(text)) {
    return getCategoryBySlug('construction-partnership')
      ? [candidate('construction-partnership')]
      : [];
  }
  const hasPreSaleIntent = /(?:پیش\s*(?:فروش|خرید))/u.test(text);
  const preSaleNegated = /(?:نه|بدون|غیر)\s*پیش\s*(?:فروش|خرید)|پیش\s*(?:فروش|خرید)\s*(?:نمی[\s‌]*خواهم|نمی[\s‌]*خوام|نمی[\s‌]*خوامش|نمی[\s‌]*پسندم)/u.test(text);
  if (hasPreSaleIntent && !preSaleNegated) {
    return getCategoryBySlug('pre-sale-services') ? [candidate('pre-sale-services')] : [];
  }

  const transaction = resolveCategoryTransactionType(text);
  if (transaction === 'DAILY_RENT') {
    if (/(?:ویلا|ویلایی|باغ\s*ویلا|باغ\s*ویلایی)/u.test(text)) {
      return getCategoryBySlug('villa-short-rent') ? [candidate('villa-short-rent')] : [];
    }
    if (/(?:پلاتو|استودیو|فضای\s*کاری|فضای\s*کار|دفتر|فضای\s*آموزشی|اتاق\s*جلسه)/u.test(text)) {
      return getCategoryBySlug('workspace-short-rent') ? [candidate('workspace-short-rent')] : [];
    }
    if (/(?:سوئیت|آپارتمان|اپارتمان|واحد)/u.test(text)) {
      return getCategoryBySlug('suite-apartment-rent') ? [candidate('suite-apartment-rent')] : [];
    }
  }

  const propertyKind = inferPropertyKind(text);
  if (!propertyKind) return [];
  const suffixes = transaction === 'BUY' || transaction === 'SELL'
    ? ['sale']
    : transaction === 'RENT' || transaction === 'FULL_DEPOSIT' || transaction === 'DEPOSIT_AND_RENT' || transaction === 'DAILY_RENT'
      ? ['rent']
      : ['rent', 'sale'];
  const kindSlugs: Record<string, string> = {
    apartment: 'apartment',
    villa: 'villa',
    office: 'office',
    shop: 'shop',
    land: 'land',
    industrial: 'industrial',
  };
  return suffixes
    .map((suffix) => `${kindSlugs[propertyKind]}-${suffix}`)
    .filter((slug) => getCategoryBySlug(slug))
    .map((slug) => ({ slug, label: getCategoryBySlug(slug)?.title ?? slug }));
}

/** Rules-only extraction shared by the route and the benchmark. */
export function extractPostNaturalFields(rawText: string): DeterministicPostExtraction {
  const normalizedText = normalizePostNaturalText(rawText);
  const parsed = parseIntentFromText(normalizedText);
  const enriched = enrichParsedIntentClient(parsed, {
    locationText: normalizedText,
  });
  const fields: PostNaturalField[] = [];
  const entities: Record<string, unknown> = {};
  const answers: Record<string, unknown> = {};
  const gaps: string[] = [];
  const warnings: string[] = [];

  const slots = extractPropertySlotsFromText(normalizedText);
  const explicitAreaRange = normalizedText.match(/(\d[\d,]*)\s*تا\s*(\d[\d,]*)\s*متر(?:ی)?/u);
  const areaMin = explicitAreaRange?.[1]
    ? numberValue(explicitAreaRange[1])
    : numberValue(slots.areaMin);
  const areaMax = explicitAreaRange?.[2]
    ? numberValue(explicitAreaRange[2])
    : numberValue(slots.areaMax);
  if (areaMin != null && areaMax != null && areaMin !== areaMax) {
    addField(fields, 'areaRange', { min: areaMin, max: areaMax }, 'بازهٔ متراژ صریح است؛ فرم فعلی یک متراژ canonical دارد.', true);
    gaps.push('areaRange');
  } else if (areaMin != null || areaMax != null) {
    const area = areaMin ?? areaMax;
    if (area != null) {
      entities.area = area;
      addField(fields, 'area', area, `${area} متر`);
    }
  }

  const roomsRejected = /(?:خواب|اتاق)\s*(?:لازم\s*نیست|نمی(?:‌|\s*)خ(?:وام|واهم))/u.test(normalizedText);
  const rooms = roomsRejected ? undefined : numberValue(slots.rooms);
  if (rooms != null) {
    entities.rooms = rooms;
    addField(fields, 'rooms', rooms, `${slots.rooms} خواب`);
  } else if (slots.rooms === '4+') {
    addField(fields, 'rooms', slots.rooms, '۴ خواب یا بیشتر', true);
  }

  const contextualMoney = parseContextualMoney(normalizedText);
  const money = {
    ...extractPropertyMoneyFromText(normalizedText),
    ...contextualMoney,
  };
  if (
    contextualMoney.rahnAmount != null &&
    /(?:^|[\s،,؛])(?:نه|بدون|فاقد)\s*اجاره|اجاره\s*(?:نداره|ندارم|نداریم)/u.test(normalizedText)
  ) {
    delete money.monthlyRent;
  }
  // Invariant (parse-persian-amount.ts): one money mention cannot be both
  // deposit and rent. The merge above can resurrect the slot the pure
  // extractor already deduped — e.g. a «رهن کامل» qualifier with no own amount
  // beside a rent-cue-owned mention («رهن کامل میخوام ولی اجاره ماهانه ۳۰
  // میلیون»). With exactly one distinct mention in the text, keep the slot
  // owned by the closer cue family and drop the phantom.
  if (
    money.rahnAmount != null &&
    money.monthlyRent != null &&
    money.rahnAmount === money.monthlyRent
  ) {
    const distinctMentions = [
      ...new Map(
        moneyMentionsInText(normalizedText).map((mention) => [
          `${mention.index}:${mention.end}:${mention.tomans}`,
          mention,
        ])
      ).values(),
    ];
    if (distinctMentions.length === 1) {
      const mention = distinctMentions[0]!;
      const nearestCueDistance = (indices: number[], keywordLength: number): number => {
        let best = Number.POSITIVE_INFINITY;
        for (const index of indices) {
          const gapBefore = index - mention.end;
          const gapAfter = mention.index - (index + keywordLength);
          best = Math.min(
            best,
            gapBefore >= 0 ? gapBefore : Number.POSITIVE_INFINITY,
            gapAfter >= 0 ? gapAfter : Number.POSITIVE_INFINITY
          );
        }
        return best;
      };
      const rahnHit = findKeywordIndicesWithFuzzyRepair(normalizedText, RAHN_KEYWORD);
      const vadiyehHit = findKeywordIndicesWithFuzzyRepair(normalizedText, VADIYEH_KEYWORD);
      const rentCueIndices = [...normalizedText.matchAll(/(?:اجاره|ماهی|ماهانه|کرایه)/gu)].map(
        (match) => match.index ?? 0
      );
      const rahnDistance = Math.min(
        nearestCueDistance(rahnHit.indices, RAHN_KEYWORD.length),
        nearestCueDistance(vadiyehHit.indices, VADIYEH_KEYWORD.length)
      );
      const rentDistance = nearestCueDistance(rentCueIndices, 0);
      if (rentDistance < rahnDistance) delete money.rahnAmount;
      else delete money.monthlyRent;
    }
  }
  const parsedBudgetBounds = parseBudgetBounds(normalizedText);
  const budgetBounds = {
    budgetMin: contextualMoney.budgetMin ?? parsedBudgetBounds.budgetMin,
    budgetMax: contextualMoney.budgetMax ?? parsedBudgetBounds.budgetMax,
  };
  if (budgetBounds.budgetMin != null) {
    entities.budgetMin = budgetBounds.budgetMin;
    addField(fields, 'budgetMin', budgetBounds.budgetMin, 'حداقل بودجهٔ صریح');
  }
  if (budgetBounds.budgetMax != null) {
    entities.budgetMax = budgetBounds.budgetMax;
    addField(fields, 'budgetMax', budgetBounds.budgetMax, 'حداکثر بودجهٔ صریح');
  }
  if (money.budgetMax != null && entities.budgetMax == null && entities.budgetMin == null) {
    entities.budgetMax = money.budgetMax;
    addField(fields, 'budgetMax', money.budgetMax, 'بودجهٔ استخراج‌شده از واحد پول');
  }
  if (money.rahnAmount != null) {
    entities.rahnAmount = money.rahnAmount;
    answers.rahnAmount = money.rahnAmount;
    answers.deposit = money.rahnAmount;
    addField(fields, 'rahnAmount', money.rahnAmount, 'مبلغ رهن/ودیعه');
  } else if (money.deposit != null) {
    entities.deposit = money.deposit;
    answers.deposit = money.deposit;
    answers.rahnAmount = money.deposit;
    addField(fields, 'deposit', money.deposit, 'مبلغ ودیعه');
  }
  if (money.monthlyRent != null) {
    entities.monthlyRent = money.monthlyRent;
    answers.monthlyRent = money.monthlyRent;
    addField(fields, 'monthlyRent', money.monthlyRent, 'اجارهٔ ماهانه');
  }
  // Short-stay prices live in the documented nightly slot (essential intake
  // schema for rent_short_term) — the sibling monthly projection above must
  // not swallow them.
  const nightlyRent =
    contextualMoney.nightlyRent ??
    (slots.nightlyRent != null ? Number(slots.nightlyRent) : undefined);
  if (nightlyRent != null && Number.isFinite(nightlyRent) && nightlyRent > 0) {
    entities.nightlyRent = nightlyRent;
    answers.nightlyRent = nightlyRent;
    addField(fields, 'nightlyRent', nightlyRent, 'قیمت هر شب');
  }

  // The legacy parser treats «می‌خواهم» as a buy cue in some colloquial
  // sentences. Require an explicit transaction word before projecting it.
  // The legacy parser can project colloquial intents («می‌خواهم»، «لازم دارم»)
  // onto buy; resolveExplicitTransactionType keeps explicit rent/رهن cues
  // authoritative while preserving the legacy buy/sell interpretations.
  const transactionType =
    money.rahnAmount != null &&
    /(?:^|[\s،,؛])(?:نه|بدون|فاقد)\s*اجاره|اجاره\s*(?:ندارم|نداریم|نداره|نمی(?:‌|\s*)خ(?:وام|واهم))/u.test(
      normalizedText
    )
      ? 'FULL_DEPOSIT'
      : resolveExplicitTransactionType(normalizedText);
  if (transactionType) {
    const dealType = legacyDealTypeFromTransactionType(transactionType);
    entities.transactionType = transactionType;
    if (dealType) answers.dealType = dealType;
    addField(fields, 'dealType', dealType ?? transactionType, 'نوع معاملهٔ صریح');
  }

  const propertyKind = inferPropertyKind(normalizedText);
  if (propertyKind) {
    entities.propertyKind = propertyKind;
    answers.propertyKind = propertyKind;
    addField(fields, 'propertyKind', propertyKind, `نوع ملک: ${inferPropertyKindLabel(propertyKind)}`);
  }

  const deedType = inferDeedType(normalizedText);
  if (deedType) {
    entities.deedType = deedType;
    answers.deedType = deedType;
    addField(fields, 'deedType', deedType, `نوع سند: ${inferDeedLabel(deedType)}`);
  }

  const amenityValues: string[] = [];
  for (const [fieldKey, amenity] of [
    ['parking', 'پارکینگ'],
    ['elevator', 'آسانسور'],
    ['storage', 'انباری'],
  ] as const) {
    const state = triStateFeature(normalizedText, amenity);
    if (state === 'yes') {
      amenityValues.push(fieldKey);
      addField(fields, fieldKey, 'yes', `${amenity} به‌صورت مثبت ذکر شده`);
    } else if (state === 'no') {
      // The current form stores positive amenities only. Keep an explicit
      // negative as a reviewable proposal instead of silently encoding false.
      addField(fields, fieldKey, 'no', `${amenity} به‌صورت منفی ذکر شده`, true);
    }
  }
  if (amenityValues.length) answers.amenities = amenityValues;

  // A nearby major city inferred by the legacy parser is not evidence that
  // the user named that city (for example, «اندیشه» must not become Tehran).
  // Only accept literal catalog mentions here; selected-city context is merged
  // separately by the API and remains authoritative.
  const cityCandidate = findExplicitCatalogCity(normalizedText);
  const explicitSpatialPhrase = extractExplicitSpatialPhrase(normalizedText, cityCandidate);
  const rawLocationPhrase =
    explicitSpatialPhrase ??
    extractNeighborhoodBeforeCity(normalizedText, cityCandidate) ??
    extractLocationFragment(normalizedText) ??
    enriched.entities?.neighborhood;
  const cleanedLocationPhrase = explicitSpatialPhrase ?? cleanNeighborhoodPhrase(rawLocationPhrase, undefined);
  const locationOnlyCity =
    !cityCandidate && cleanedLocationPhrase
      ? ALL_LOCATION_CITIES.find((city) => city.name === cleanedLocationPhrase)?.name
      : undefined;
  const finalCityCandidate = cityCandidate ?? locationOnlyCity;
  const neighborhoodPhrase = locationOnlyCity ? undefined : cleanedLocationPhrase;
  const categoryCandidates = categoryCandidatesForText(normalizedText);
  const includePropertyFields =
    categoryCandidates.some((candidate) => getCategoryPath(candidate.slug)[0]?.slug === 'real-estate') ||
    isBusinessCommercialPropertyIntent(normalizedText) ||
    Boolean(propertyKind || areaMin || areaMax || money.rahnAmount || money.monthlyRent);

  if (!categoryCandidates.length && !parsed.categorySlug) gaps.push('category');
  if (!finalCityCandidate) gaps.push('city');
  if (includePropertyFields && !neighborhoodPhrase) gaps.push('neighborhood');
  if (includePropertyFields && !transactionType) gaps.push('dealType');

  if (areaMin != null && areaMax != null && areaMin !== areaMax) {
    warnings.push('بازهٔ متراژ استخراج شد؛ برای ثبت دقیق، مقدار متراژ را در فرم تأیید کنید.');
  }

  return {
    normalizedText,
    entities,
    answers,
    fields,
    categoryCandidates,
    cityCandidate: finalCityCandidate,
    neighborhoodPhrase,
    includePropertyFields,
    gaps: [...new Set(gaps)],
    warnings,
  };
}
