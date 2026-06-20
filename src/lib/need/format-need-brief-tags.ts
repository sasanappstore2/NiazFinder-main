import { getCategoryBySlug } from '@/config/categories';
import {
  CONDITION,
  DEAL_TYPE_PRODUCT,
  DEAL_TYPE_PROPERTY,
  DEAL_TYPE_VEHICLE,
} from '@/config/category-filters/options';
import { categorySuggestionLabelFromSlug } from '@/lib/categories/format-category-suggestion-label';
import type { ParsedIntent } from '@/contracts/need-intake';
import { legacyDealTypeFromTransactionType } from '@/lib/need-intake/resolve-transaction-type';
import { formatWhenLabel } from '@/lib/need-intake/intake-timing-options';

const DEAL_TYPE_LABELS = new Map<string, string>(
  [...DEAL_TYPE_PROPERTY, ...DEAL_TYPE_VEHICLE, ...DEAL_TYPE_PRODUCT].map((o) => [
    o.value,
    o.label,
  ])
);

const CONDITION_LABELS = new Map<string, string>(
  CONDITION.map((o) => [o.value, o.label])
);

const TRANSACTION_LABELS: Record<string, string> = {
  RENT: '\u0627\u062C\u0627\u0631\u0647',
  BUY: '\u062E\u0631\u06CC\u062F',
  SELL: '\u0641\u0631\u0648\u0634',
  FULL_DEPOSIT: '\u0631\u0647\u0646 \u06A9\u0627\u0645\u0644',
  DEPOSIT_AND_RENT: '\u0631\u0647\u0646 \u0648 \u0627\u062C\u0627\u0631\u0647',
  DAILY_RENT: '\u0627\u062C\u0627\u0631\u0647 \u0631\u0648\u0632\u0627\u0646\u0647',
  HOURLY_RENT: '\u0627\u062C\u0627\u0631\u0647 \u0633\u0627\u0639\u062A\u06CC',
};

const INTENT_SKIP = new Set([
  'property_search',
  'property_listing',
  'product_search',
  'product_listing',
  'vehicle_search',
  'vehicle_listing',
  'service_request',
  'job_search',
  'real_estate_service',
]);

export interface NeedBriefTagsInput {
  tags?: string[] | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  dealType?: string | null;
  dynamicAnswers?: Record<string, unknown> | null;
  parsedIntent?: Pick<ParsedIntent, 'categorySlug' | 'subcategorySlug' | 'intentType'> | null;
}

function readEntitySlugs(
  dynamicAnswers?: Record<string, unknown> | null,
  parsed?: NeedBriefTagsInput['parsedIntent']
): { categorySlug?: string; subcategorySlug?: string } {
  const entities =
    dynamicAnswers?.entities && typeof dynamicAnswers.entities === 'object'
      ? (dynamicAnswers.entities as Record<string, unknown>)
      : undefined;

  const subcategorySlug =
    (typeof entities?.subcategorySlug === 'string' && entities.subcategorySlug.trim()) ||
    parsed?.subcategorySlug?.trim() ||
    undefined;

  const categorySlug =
    (typeof entities?.categorySlug === 'string' && entities.categorySlug.trim()) ||
    parsed?.categorySlug?.trim() ||
    undefined;

  return { categorySlug, subcategorySlug };
}

function readDealTypeKey(
  dealType?: string | null,
  dynamicAnswers?: Record<string, unknown> | null
): string | undefined {
  if (dealType?.trim()) return dealType.trim();
  const raw = dynamicAnswers?.dealType;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  const tx = dynamicAnswers?.transactionType;
  if (typeof tx === 'string' && tx.trim()) {
    return legacyDealTypeFromTransactionType(tx) ?? tx.trim();
  }
  return undefined;
}

export function formatDealTypeTag(dealType: string | undefined | null): string | null {
  const key = dealType?.trim();
  if (!key) return null;
  const fromMap = DEAL_TYPE_LABELS.get(key);
  if (fromMap) return fromMap;
  const tx = TRANSACTION_LABELS[key.toUpperCase()];
  if (tx) return tx;
  return null;
}

function formatConditionTag(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const key = value.trim();
  if (key === 'any') return null;
  return CONDITION_LABELS.get(key) ?? null;
}

function formatRawNeedTag(
  tag: string,
  coveredSlugs: Set<string>,
  coveredLabels: Set<string>
): string | null {
  const raw = tag.trim();
  if (!raw) return null;
  if (INTENT_SKIP.has(raw)) return null;
  if (coveredSlugs.has(raw)) return null;

  const dealLabel = formatDealTypeTag(raw);
  if (dealLabel) {
    if (coveredLabels.has(dealLabel)) return null;
    return dealLabel;
  }

  const txLabel = TRANSACTION_LABELS[raw.toUpperCase()];
  if (txLabel) {
    if (coveredLabels.has(txLabel)) return null;
    return txLabel;
  }

  if (getCategoryBySlug(raw)) {
    const label = categorySuggestionLabelFromSlug(raw);
    if (coveredLabels.has(label)) return null;
    return label;
  }

  if (/[\u0600-\u06FF]/.test(raw)) {
    if (coveredLabels.has(raw)) return null;
    return raw;
  }

  if (/^[a-z0-9_-]+$/i.test(raw)) return null;
  return raw;
}

/** User-facing Persian tags for need briefing UI. */
export function buildNeedBriefTags(input: NeedBriefTagsInput): string[] {
  const labels: string[] = [];
  const coveredSlugs = new Set<string>();
  const coveredLabels = new Set<string>();

  const add = (label: string | null | undefined, slug?: string) => {
    const text = label?.trim();
    if (!text || coveredLabels.has(text)) return;
    coveredLabels.add(text);
    labels.push(text);
    if (slug) coveredSlugs.add(slug);
  };

  const { categorySlug, subcategorySlug } = readEntitySlugs(
    input.dynamicAnswers,
    input.parsedIntent
  );
  const leafSlug = subcategorySlug || categorySlug || input.categorySlug?.trim();
  if (leafSlug) {
    coveredSlugs.add(leafSlug);
    if (categorySlug && categorySlug !== leafSlug) coveredSlugs.add(categorySlug);
    if (subcategorySlug) coveredSlugs.add(subcategorySlug);
    add(categorySuggestionLabelFromSlug(leafSlug), leafSlug);
  } else if (input.categoryName?.trim()) {
    add(input.categoryName.trim());
  }

  const dealKey = readDealTypeKey(input.dealType, input.dynamicAnswers);
  if (dealKey) {
    coveredSlugs.add(dealKey);
    add(formatDealTypeTag(dealKey), dealKey);
  }

  add(formatConditionTag(input.dynamicAnswers?.condition));

  const when = input.dynamicAnswers?.when;
  if (typeof when === 'string') add(formatWhenLabel(when));

  for (const tag of input.tags ?? []) {
    add(formatRawNeedTag(tag, coveredSlugs, coveredLabels), tag);
  }

  return labels;
}

/** Tags stored at publish time — Persian labels tied to category + deal type. */
export function buildPublishNeedTags(opts: {
  parsed: Pick<ParsedIntent, 'categorySlug' | 'subcategorySlug' | 'intentType'>;
  answers: Record<string, unknown>;
  entities?: Record<string, unknown>;
}): string[] {
  const dynamicAnswers: Record<string, unknown> = {
    ...opts.answers,
    entities: opts.entities ?? opts.answers.entities,
  };
  return buildNeedBriefTags({
    tags: [],
    parsedIntent: opts.parsed,
    dynamicAnswers,
    dealType: readDealTypeKey(
      typeof opts.answers.dealType === 'string' ? opts.answers.dealType : null,
      dynamicAnswers
    ),
  });
}
