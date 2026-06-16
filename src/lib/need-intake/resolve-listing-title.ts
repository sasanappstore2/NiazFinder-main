import type { NeedDraft } from '@/contracts/need-intake';
import { getCategoryPath } from '@/config/categories';
import { PROPERTY_KIND_LABELS } from '@/config/need-schemas/labels';
import { getRootCategorySlug } from '@/config/need-schemas/resolve-schema';
import { recordToEntities } from '@/intake/entities/entityRecord';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
import { extractLocationFragment } from '@/lib/need-intake/location-fragment';
import {
  dealLabelForCategory,
  joinListingTitleParts,
  LISTING_TITLE_MAX_LENGTH,
  buildProductSearchTitle,
} from '@/lib/need-intake/listing-title';
import {
  finalizeListingTitle,
  isAcceptableListingTitle,
  isStructuredListingTitle,
  aiTitleConflictsDeterministicDeal,
  rejectListingTitleReason,
  type TitleQualityContext,
} from '@/lib/need-intake/listing-title-sanitize';
import { pickListingTitleWithDealGuard } from '@/lib/need-intake/listing-copy-guards';
import { isConstructionPartnershipText } from '@/lib/need-intake/intent-parser';
import {
  buildPropertyTitle,
  buildRealEstateServiceTitle,
} from '@/lib/need-intake/property-title';
import { inferPropertyKindFromCategory } from '@/lib/need-intake/listing-copy-prompt';
import {
  buildJobTitle,
  buildServiceTitle,
  buildVehicleTitle,
  extractTitleSnippetFromSourceText,
  extractVehicleSubjectFromText,
  listingTitleCityFromDraft,
  resolveListingTitleCandidate,
} from '@/lib/need-intake/vertical-title';

export type DeterministicTitleSource = 'vertical' | 'snippet';

export interface ResolvedListingTitle {
  title: string;
  source: DeterministicTitleSource;
}

function shortCategoryLabel(categorySlug: string | undefined): string | undefined {
  if (!categorySlug) return undefined;
  const path = getCategoryPath(categorySlug);
  return path[path.length - 1]?.title?.trim();
}

function titleQualityContext(draft: NeedDraft): TitleQualityContext {
  return { sourceText: (draft.sourceText ?? draft.parsedIntent?.rawText ?? '').trim() };
}

function propertyAreaName(draft: NeedDraft, parsed: NeedDraft['parsedIntent']): string | undefined {
  const entities = recordToEntities(draft.entities);
  const rawText = (draft.sourceText ?? parsed.rawText ?? '').trim();
  return (
    entities.neighborhood?.trim() ||
    parsed.entities?.area?.trim() ||
    extractLocationFragment(rawText)?.trim() ||
    undefined
  );
}

function isPropertyDraft(
  draft: NeedDraft,
  parsed: NeedDraft['parsedIntent'],
  root: string
): boolean {
  if (parsed.intentType.startsWith('property')) return true;
  if (parsed.intentType === 'real_estate_service') return true;
  if (root === 'real-estate') return true;
  const raw = (draft.sourceText ?? parsed.rawText ?? '').trim();
  return Boolean(raw && isConstructionPartnershipText(raw));
}

function isVehicleDraft(parsed: NeedDraft['parsedIntent'], root: string): boolean {
  return root === 'vehicles' || parsed.intentType.startsWith('vehicle');
}

/**
 * Build a marketplace title from canonical draft state only.
 * Never reads parsedIntent.title — that field is a legacy projection artifact.
 */
export function buildDeterministicListingTitle(draft: NeedDraft): string {
  const { parsedIntent: parsed, answers } = draftToLegacyPayload(draft);
  const entities = recordToEntities(draft.entities);
  const rawText = (draft.sourceText ?? parsed.rawText ?? '').trim();
  const categorySlug =
    entities.subcategorySlug ?? entities.categorySlug ?? parsed.subcategorySlug ?? parsed.categorySlug ?? '';
  const root = getRootCategorySlug(categorySlug);
  const deal = String(answers.dealType ?? parsed.entities?.dealType ?? '').trim();
  const city =
    listingTitleCityFromDraft(draft, parsed.city ?? entities.city ?? undefined, String(answers.location ?? '')) ||
    undefined;

  if (
    parsed.intentType === 'real_estate_service' ||
    parsed.entities?.serviceKind === 'partnership' ||
    isConstructionPartnershipText(rawText)
  ) {
    return buildRealEstateServiceTitle(
      { ...parsed.entities, ...answers } as Record<string, string>,
      parsed.city ?? entities.city ?? undefined
    );
  }

  if (isPropertyDraft(draft, parsed, root)) {
    const intent = parsed.intentType.startsWith('property') ? parsed.intentType : 'property_search';
    const inferredKind = inferPropertyKindFromCategory(categorySlug);
    const entityRecord = {
      ...parsed.entities,
      ...answers,
      ...(inferredKind && !parsed.entities?.propertyKind && !(answers as Record<string, unknown>).propertyKind
        ? { propertyKind: inferredKind }
        : {}),
    } as Record<string, string>;
    return buildPropertyTitle(
      intent,
      entityRecord,
      parsed.city ?? entities.city ?? undefined,
      propertyAreaName(draft, parsed)
    );
  }

  if (
    parsed.intentType === 'product_search' ||
    root === 'personal-items' ||
    root === 'electronics' ||
    root === 'entertainment' ||
    root === 'home-appliances'
  ) {
    return buildProductSearchTitle(rawText, deal || 'buy', parsed.city ?? entities.city ?? undefined);
  }

  if (isVehicleDraft(parsed, root)) {
    const budgetMax =
      typeof answers.budget === 'number'
        ? answers.budget
        : parsed.budgetMax ?? entities.budgetMax ?? undefined;
    return buildVehicleTitle({
      rawText,
      deal,
      brand: String(answers.brand ?? parsed.entities?.brand ?? '').trim() || undefined,
      model: String(answers.model ?? parsed.entities?.model ?? '').trim() || undefined,
      vehicleKind:
        String(answers.vehicleKind ?? parsed.entities?.vehicleKind ?? '').trim() || undefined,
      city,
      budgetMax,
    });
  }

  if (root === 'jobs' || parsed.intentType.startsWith('job')) {
    return buildJobTitle({
      jobTitle: String(answers.jobTitle ?? '').trim() || undefined,
      roleType: String(answers.roleType ?? parsed.entities?.roleType ?? '').trim() || undefined,
      city,
    });
  }

  if (root === 'services' || parsed.intentType.includes('service')) {
    return buildServiceTitle({
      serviceType: String(answers.serviceType ?? '').trim() || undefined,
      deal,
      city,
      categoryShort: shortCategoryLabel(categorySlug),
    });
  }

  const dealFa = dealLabelForCategory(categorySlug, deal);
  const parts: string[] = [];
  if (dealFa) parts.push(dealFa);
  const productName = String(answers.productName ?? '').trim();
  if (productName) parts.push(productName);
  const serviceType = String(answers.serviceType ?? '').trim();
  if (serviceType) parts.push(serviceType.slice(0, 40));
  if (city) parts.push(city);
  const joined = joinListingTitleParts(parts);
  if (joined.length >= 10) return joined.slice(0, LISTING_TITLE_MAX_LENGTH);

  const categoryShort = shortCategoryLabel(categorySlug);
  if (categoryShort && city) {
    return joinListingTitleParts(['نیاز', categoryShort, city]).slice(0, LISTING_TITLE_MAX_LENGTH);
  }
  if (categoryShort) return `نیاز ${categoryShort}`.slice(0, LISTING_TITLE_MAX_LENGTH);
  if (city) return `نیاز — ${city}`.slice(0, LISTING_TITLE_MAX_LENGTH);
  return 'ثبت نیاز';
}

function buildSnippetListingTitle(draft: NeedDraft): string {
  const ctx = titleQualityContext(draft);
  const { parsedIntent: parsed, answers } = draftToLegacyPayload(draft);
  const entities = recordToEntities(draft.entities);
  const categorySlug =
    entities.subcategorySlug ?? entities.categorySlug ?? parsed.subcategorySlug ?? parsed.categorySlug;
  const root = getRootCategorySlug(categorySlug ?? '');

  if (isPropertyDraft(draft, parsed, root)) {
    return '';
  }

  const deal = String(answers.dealType ?? parsed.entities?.dealType ?? '');
  const dealFa = dealLabelForCategory(categorySlug, deal);
  const city =
    listingTitleCityFromDraft(draft, parsed.city, String(answers.location ?? '')) || undefined;

  return extractTitleSnippetFromSourceText(ctx.sourceText ?? '', {
    dealFa: dealFa && dealFa.length <= 20 ? dealFa : undefined,
    city,
    categoryShort: shortCategoryLabel(categorySlug),
  });
}

/** Canonical sync title — single entry for compose, publish, and template fallback. */
export function resolveDeterministicListingTitle(draft: NeedDraft): ResolvedListingTitle {
  const ctx = titleQualityContext(draft);
  const vertical = buildDeterministicListingTitle(draft);
  const snippet = buildSnippetListingTitle(draft);
  const candidates = snippet ? [vertical, snippet] : [vertical];
  let picked = resolveListingTitleCandidate(candidates, ctx);

  if (
    picked !== vertical &&
    isStructuredListingTitle(vertical) &&
    rejectListingTitleReason(vertical, ctx) === 'verbatim_copy'
  ) {
    picked = vertical;
  }

  const title = finalizeListingTitle(picked, ctx);

  return {
    title,
    source: picked === snippet && snippet.length >= 10 ? 'snippet' : 'vertical',
  };
}

/** Alias used by generate-listing-title and legacy imports. */
export function buildHeuristicListingTitle(draft: NeedDraft): string {
  return resolveDeterministicListingTitle(draft).title;
}

/**
 * Pick final title: structured deterministic base wins unless AI is clearly better.
 * AI never bypasses normalize + quality gates.
 */
export function mergeListingTitleWithAi(
  draft: NeedDraft,
  aiTitle: string | undefined
): string {
  const ctx = titleQualityContext(draft);
  const deterministic = resolveDeterministicListingTitle(draft).title;

  if (!aiTitle?.trim()) {
    return deterministic;
  }

  const normalizedAi = finalizeListingTitle(aiTitle, ctx);
  if (!isAcceptableListingTitle(normalizedAi, ctx)) {
    return deterministic;
  }

  if (aiTitleConflictsDeterministicDeal(deterministic, normalizedAi, ctx.sourceText)) {
    return deterministic;
  }

  const guarded = pickListingTitleWithDealGuard(deterministic, normalizedAi, ctx.sourceText);
  if (guarded === deterministic && guarded !== normalizedAi) {
    return deterministic;
  }

  const detReason = rejectListingTitleReason(deterministic, ctx);
  if (
    detReason === 'too_short' ||
    detReason === 'generic' ||
    detReason === 'generic_parser_title'
  ) {
    return guarded;
  }

  if (isAcceptableListingTitle(deterministic, ctx)) {
    return deterministic;
  }

  return guarded;
}

export function isGenericListingTitle(title: string): boolean {
  return rejectListingTitleReason(title) !== null;
}

/** Structured subject label for tests and prompts. */
export function listingTitleSubjectSummary(draft: NeedDraft): string | undefined {
  const { parsedIntent: parsed, answers } = draftToLegacyPayload(draft);
  const entities = recordToEntities(draft.entities);
  const categorySlug =
    entities.subcategorySlug ?? entities.categorySlug ?? parsed.categorySlug ?? '';
  const root = getRootCategorySlug(categorySlug);
  const rawText = (draft.sourceText ?? parsed.rawText ?? '').trim();

  if (isPropertyDraft(draft, parsed, root)) {
    const kind = answers.propertyKind ?? parsed.entities?.propertyKind;
    return kind ? (PROPERTY_KIND_LABELS[String(kind)] ?? String(kind)) : 'ملک';
  }
  if (isVehicleDraft(parsed, root)) {
    return (
      extractVehicleSubjectFromText(rawText) ||
      [answers.brand, answers.model].filter(Boolean).join(' ').trim() ||
      undefined
    );
  }
  const path = getCategoryPath(categorySlug);
  return path[path.length - 1]?.title;
}
