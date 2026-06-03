import { getCategoryPath } from '@/config/categories';
import { dealLabelForCategory } from '@/lib/need-intake/listing-title';
import { PROPERTY_KIND_LABELS } from '@/config/need-schemas/labels';
import { formatMoneyToman } from '@/lib/format/money';
import type { NeedDraft } from '@/contracts/need-intake';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { LISTING_TITLE_MAX_LENGTH } from '@/lib/need-intake/listing-title';

export interface ListingTitleContext {
  needType: string;
  intentType: string;
  categoryPathFa: string;
  city?: string;
  neighborhood?: string;
  dealTypeFa?: string;
  propertyKind?: string;
  rooms?: string;
  productName?: string;
  serviceType?: string;
  jobTitle?: string;
  budgetHint?: string;
  sourceSummary: string;
}

export function buildListingTitleContext(draft: NeedDraft): ListingTitleContext {
  const { parsedIntent: parsed, answers } = draftToLegacyPayload(draft);
  const entities = recordToEntities(draft.entities);
  const leafSlug =
    entities.subcategorySlug ?? entities.categorySlug ?? parsed.subcategorySlug ?? parsed.categorySlug;
  const path = leafSlug ? getCategoryPath(leafSlug) : [];
  const categoryPathFa = path.map((p) => p.title).join(' › ') || draft.category || 'عمومی';

  const deal = String(answers.dealType ?? parsed.entities?.dealType ?? entities.transactionType ?? '');
  const dealTypeFa = dealLabelForCategory(parsed.categorySlug, deal.toLowerCase());

  const city = String(answers.location ?? parsed.city ?? entities.city ?? '').trim() || undefined;
  const neighborhood = String(answers.neighborhood ?? entities.neighborhood ?? '').trim() || undefined;

  const propertyKindRaw = answers.propertyKind ?? parsed.entities?.propertyKind;
  const propertyKind = propertyKindRaw
    ? (PROPERTY_KIND_LABELS[String(propertyKindRaw)] ?? String(propertyKindRaw))
    : undefined;

  const rooms = answers.rooms != null ? String(answers.rooms) : entities.rooms != null ? String(entities.rooms) : undefined;

  const budget =
    parsed.budgetMax ?? entities.budgetMax ?? (typeof answers.budget === 'number' ? answers.budget : undefined);
  const budgetHint = budget ? `تا ${formatMoneyToman(budget)}` : undefined;

  const sourceSummary = (draft.sourceText ?? parsed.rawText ?? '').trim().slice(0, 400);

  return {
    needType: draft.needType,
    intentType: parsed.intentType,
    categoryPathFa,
    city,
    neighborhood,
    dealTypeFa,
    propertyKind,
    rooms: rooms ? `${rooms} خواب` : undefined,
    productName: String(answers.productName ?? '').trim() || undefined,
    serviceType: String(answers.serviceType ?? '').trim().slice(0, 60) || undefined,
    jobTitle: String(answers.jobTitle ?? '').trim() || undefined,
    budgetHint,
    sourceSummary,
  };
}

export function buildListingTitleSystemPrompt(): string {
  return [
    'You write concise Persian marketplace listing titles for Iran (نیازفایندر).',
    `Output ONLY one line title, max ${LISTING_TITLE_MAX_LENGTH} characters, no quotes, no emoji.`,
    'Include: what is needed + deal type (if known) + location (city/neighborhood) when relevant.',
    'Be specific (product type, rooms, service name) — never generic like "ثبت نیاز" or only "خرید — شهر".',
    'Do not copy user text verbatim; summarize clearly.',
    'Use Persian digits only if numbers appear.',
  ].join(' ');
}

export function buildListingTitleUserPrompt(ctx: ListingTitleContext): string {
  const payload = {
    needType: ctx.needType,
    intentType: ctx.intentType,
    category: ctx.categoryPathFa,
    city: ctx.city,
    neighborhood: ctx.neighborhood,
    dealType: ctx.dealTypeFa,
    propertyKind: ctx.propertyKind,
    rooms: ctx.rooms,
    productName: ctx.productName,
    serviceType: ctx.serviceType,
    jobTitle: ctx.jobTitle,
    budget: ctx.budgetHint,
    userNeedSummary: ctx.sourceSummary,
  };

  return `Write one listing title in Persian for this need:\n${JSON.stringify(payload, null, 2)}`;
}

/** Short prompt for Ollama /generate (single string). */
export function buildListingTitleOllamaPrompt(ctx: ListingTitleContext): string {
  return `${buildListingTitleSystemPrompt()}\n\n${buildListingTitleUserPrompt(ctx)}\n\nTitle:`;
}
