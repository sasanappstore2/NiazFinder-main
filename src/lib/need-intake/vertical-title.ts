import type { NeedDraft } from '@/contracts/need-intake';
import { CANONICAL_CITIES } from '@/config/locations';
import { getCategoryPath } from '@/config/categories';
import { JOB_ROLE_LABELS, VEHICLE_DEAL_LABELS } from '@/config/need-schemas/labels';
import {
  joinListingTitleParts,
  LISTING_TITLE_MAX_LENGTH,
} from '@/lib/need-intake/listing-title';
import { toAsciiDigits, toPersianDigits } from '@/lib/format/digits';
import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';
import {
  dedupeRedundantDealPhrases,
  isAcceptableListingTitle,
} from '@/lib/need-intake/listing-title-sanitize';

const VEHICLE_TYPE_LABELS: { pattern: RegExp; label: string }[] = [
  { pattern: /کارواش/u, label: 'کارواش' },
  { pattern: /(?:^|[\s،])ون(?:[\s،]|$)/u, label: 'ون' },
  { pattern: /پیکاپ/u, label: 'پیکاپ' },
  { pattern: /موتور|موتورسیکلت/u, label: 'موتور' },
  { pattern: /ماشین\s*سنگین|کامیون/u, label: 'کامیون' },
  { pattern: /سواری/u, label: 'سواری' },
];

function formatPeugeotModel(code: string): string {
  const ascii = toAsciiDigits(code);
  const display = toPersianDigits(ascii);
  return `پژو ${display}`;
}

const VEHICLE_BRAND_MODEL: { pattern: RegExp; format: (m: RegExpMatchArray) => string }[] = [
  { pattern: /دوو\s*سیلو|دولو|deauville/iu, format: () => 'دوو سیلو' },
  { pattern: /پژو\s*([۰-۹0-9]{2,4})/u, format: (m) => formatPeugeotModel(m[1]!) },
  { pattern: /(?:^|[\s،(—\-])((?:20[678]|405)|(?:۲۰[۰-۹][۶-۸]))(?=[\s،.\-—]|$)/u, format: (m) => formatPeugeotModel(m[1]!) },
  { pattern: /(?:^|[\s،(])۲۰۷(?=[\s،.\-—]|$)/u, format: () => 'پژو ۲۰۷' },
  { pattern: /(?:^|[\s،(])۲۰۶(?=[\s،.\-—]|$)/u, format: () => 'پژو ۲۰۶' },
  { pattern: /(?:^|[\s،(])۲۰۸(?=[\s،.\-—]|$)/u, format: () => 'پژو ۲۰۸' },
  { pattern: /(?:^|[\s،(])۴۰۵(?=[\s،.\-—]|$)/u, format: () => 'پژو ۴۰۵' },
  { pattern: /پراید/u, format: () => 'پراید' },
  { pattern: /تیبا/u, format: () => 'تیبا' },
  { pattern: /سمند/u, format: () => 'سمند' },
  { pattern: /دنا/u, format: () => 'دنا' },
  { pattern: /شاهین/u, format: () => 'شاهین' },
  { pattern: /رانا/u, format: () => 'رانا' },
  { pattern: /پارس/u, format: () => 'پژو پارس' },
];

const CONDITION_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /در\s*حد\s*نو/u, label: 'در حد نو' },
  { pattern: /کارکرده/u, label: 'کارکرده' },
  { pattern: /صفر\s*کیلومتر|خشک/u, label: 'صفر' },
  { pattern: /دست\s*دوم/u, label: 'دست دوم' },
];

const INTENT_FILLER =
  /^(یک|یه|میخوام|می‌خوام|میخواهم|دنبال|نیاز\s*دارم|لطفا|لطفاً)\s+/u;

/** City only for listing titles — not «محله، شهر». */
export function listingTitleCityFromDraft(
  draft: NeedDraft,
  parsedCity?: string,
  locationAnswer?: string
): string {
  if (parsedCity?.trim()) return parsedCity.trim();
  const loc = (locationAnswer ?? '').trim();
  if (loc) {
    const parts = loc.split(/[،,]/).map((p) => p.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const hit = CANONICAL_CITIES.find((c) => parts[i] === c.title || parts[i]!.includes(c.title));
      if (hit) return hit.title;
    }
  }
  const raw = (draft.sourceText ?? '').trim();
  for (const c of CANONICAL_CITIES) {
    if (raw.includes(c.title)) return c.title;
  }
  return '';
}

export function extractVehicleConditionFromText(rawText: string): string | null {
  const t = normalizeIntakeText(rawText);
  for (const { pattern, label } of CONDITION_PATTERNS) {
    if (pattern.test(t)) return label;
  }
  return null;
}

/** Concrete vehicle subject from free text (کارواش, پژو ۲۰۶, …). */
export function extractVehicleSubjectFromText(rawText: string): string | null {
  const t = normalizeIntakeText(rawText);
  if (!t) return null;

  for (const { pattern, format } of VEHICLE_BRAND_MODEL) {
    const m = t.match(pattern);
    if (m) return format(m);
  }

  for (const { pattern, label } of VEHICLE_TYPE_LABELS) {
    if (pattern.test(t)) return label;
  }

  if (/خودرو|ماشین/u.test(t)) {
    const stripped = t
      .replace(INTENT_FILLER, '')
      .replace(
        /\s*(میخوام|می‌خوام|میخواهم|خرید|فروش|در|مشهد|تهران|اصفهان|شیراز|تبریز).*$/u,
        ''
      )
      .trim();
    if (stripped.length >= 3 && stripped.length <= 32 && !/^(خودرو|ماشین)$/u.test(stripped)) {
      return stripped;
    }
  }

  return null;
}

/** Compact budget hint for titles (e.g. «تا ۱ میلیارد»). */
export function formatCompactBudgetHint(toman: number | undefined): string | undefined {
  if (toman == null || !Number.isFinite(toman) || toman <= 0) return undefined;
  if (toman >= 1_000_000_000) {
    const billions = toman / 1_000_000_000;
    if (billions >= 1 && billions <= 999 && Number.isInteger(billions)) {
      return `تا ${toPersianDigits(String(billions))} میلیارد`;
    }
  }
  if (toman >= 10_000_000 && toman % 1_000_000 === 0) {
    const millions = toman / 1_000_000;
    if (millions >= 10 && millions <= 9999) {
      return `تا ${toPersianDigits(String(millions))} میلیون`;
    }
  }
  return undefined;
}

export interface BuildVehicleTitleInput {
  rawText?: string;
  deal?: string;
  brand?: string;
  model?: string;
  vehicleKind?: string;
  city?: string;
  condition?: string;
  budgetMax?: number;
}

export function buildVehicleTitle(input: BuildVehicleTitleInput): string {
  const dealKey = (input.deal ?? 'buy').toLowerCase();
  const dealFaFull = VEHICLE_DEAL_LABELS[dealKey] ?? 'خرید خودرو';

  const subject =
    [input.brand, input.model].filter(Boolean).join(' ').trim() ||
    extractVehicleSubjectFromText(input.rawText ?? '') ||
    (input.vehicleKind ? String(input.vehicleKind) : '');

  const condition =
    input.condition?.trim() ||
    extractVehicleConditionFromText(input.rawText ?? '') ||
    undefined;

  const budgetHint = formatCompactBudgetHint(input.budgetMax);
  const dealFa = subject && dealKey === 'buy' ? 'خرید' : dealFaFull;

  const parts: string[] = [];
  if (dealFa) parts.push(dealFa);
  if (subject) parts.push(subject.slice(0, 36));
  if (condition) parts.push(condition);
  if (input.city?.trim()) parts.push(input.city.trim());

  let joined = joinListingTitleParts(parts);
  if (budgetHint) {
    const withBudget = joinListingTitleParts([...parts, budgetHint]);
    if (withBudget.length <= LISTING_TITLE_MAX_LENGTH) joined = withBudget;
  }

  return joined.slice(0, LISTING_TITLE_MAX_LENGTH) || dealFaFull;
}

export function buildServiceTitle(input: {
  serviceType?: string;
  deal?: string;
  city?: string;
  categoryShort?: string;
}): string {
  const service = input.serviceType?.trim().slice(0, 40);
  const category = input.categoryShort?.trim().slice(0, 24);
  const subject = service || category || 'خدمات';
  const parts: string[] = ['نیاز', subject];
  if (input.city?.trim()) parts.push(input.city.trim());
  return joinListingTitleParts(parts).slice(0, LISTING_TITLE_MAX_LENGTH);
}

export function buildJobTitle(input: {
  jobTitle?: string;
  roleType?: string;
  city?: string;
}): string {
  const role = input.roleType ? JOB_ROLE_LABELS[input.roleType] ?? input.roleType : undefined;
  const title = input.jobTitle?.trim().slice(0, 40);
  const parts: string[] = [];
  if (role) parts.push(role);
  if (title) parts.push(title);
  if (!parts.length) parts.push('استخدام');
  if (input.city?.trim()) parts.push(input.city.trim());
  return joinListingTitleParts(parts).slice(0, LISTING_TITLE_MAX_LENGTH);
}

/** Snippet from user text when vertical builder is still too generic. */
export function extractTitleSnippetFromSourceText(
  sourceText: string,
  options?: { dealFa?: string; city?: string; categoryShort?: string }
): string {
  const raw = sourceText.trim();
  if (!raw) return '';

  const vehicleSubject = extractVehicleSubjectFromText(raw);
  if (vehicleSubject) {
    const parts: string[] = [];
    if (options?.dealFa) parts.push(options.dealFa);
    parts.push(vehicleSubject);
    const condition = extractVehicleConditionFromText(raw);
    if (condition) parts.push(condition);
    if (options?.city) parts.push(options.city);
    return joinListingTitleParts(parts).slice(0, LISTING_TITLE_MAX_LENGTH);
  }

  let snippet = raw
    .replace(INTENT_FILLER, '')
    .split(/[\n.!؟]/)[0]
    ?.trim()
    ?? raw;

  snippet = snippet
    .replace(/\s*(میخوام|می‌خوام|میخواهم|لطفا|لطفاً|بودجه).*$/u, '')
    .replace(/\s*مدلش\s+.*$/u, '')
    .trim();

  if (options?.dealFa) {
    const deal = options.dealFa.trim();
    if (deal) {
      snippet = snippet
        .replace(new RegExp(`^${deal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'u'), '')
        .replace(/\s+برای\s+(اجاره(?:\s+روزانه)?|رهن(?:\s+و\s+اجاره)?|خرید|فروش)\s*$/u, '')
        .trim();
    }
  }

  if (snippet.length > 42) {
    const cut = snippet.slice(0, 42);
    const space = cut.lastIndexOf(' ');
    snippet = (space >= 20 ? cut.slice(0, space) : cut).trim();
  }

  const parts: string[] = [];
  if (options?.dealFa) parts.push(options.dealFa);
  if (snippet.length >= 3) parts.push(snippet);
  if (options?.city) parts.push(options.city);

  return dedupeRedundantDealPhrases(joinListingTitleParts(parts)).slice(
    0,
    LISTING_TITLE_MAX_LENGTH
  );
}

/** Pick best acceptable title from candidates (first that passes quality gate). */
export function resolveListingTitleCandidate(
  candidates: string[],
  qualityCtx?: { sourceText?: string }
): string {
  for (const c of candidates) {
    const t = c.trim();
    if (!t) continue;
    if (isAcceptableListingTitle(t, qualityCtx)) return t.slice(0, LISTING_TITLE_MAX_LENGTH);
  }
  const last = candidates.filter(Boolean).pop()?.trim();
  return (last ?? 'ثبت نیاز').slice(0, LISTING_TITLE_MAX_LENGTH);
}

export {
  buildDeterministicListingTitle as buildVerticalTitleFromDraft,
  buildDeterministicListingTitle,
  buildHeuristicListingTitle,
  isGenericListingTitle,
  mergeListingTitleWithAi,
  resolveDeterministicListingTitle,
} from '@/lib/need-intake/resolve-listing-title';
