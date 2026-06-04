import { getCategoryPath } from '@/config/categories';
import { dealLabelForCategory } from '@/lib/need-intake/listing-title';
import { PROPERTY_KIND_LABELS } from '@/config/need-schemas/labels';
import { formatMoneyToman } from '@/lib/format/money';
import type { NeedDraft } from '@/contracts/need-intake';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { LISTING_TITLE_MAX_LENGTH } from '@/lib/need-intake/listing-title';
import {
  extractVehicleConditionFromText,
  extractVehicleSubjectFromText,
} from '@/lib/need-intake/vertical-title';

export interface ListingTitleContext {
  needType: string;
  intentType: string;
  categorySlug?: string;
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
  vehicleSubject?: string;
  vehicleCondition?: string;
  brand?: string;
  model?: string;
  sourceSummary: string;
  rawTextExcerpt?: string;
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

  const rawFull = (draft.sourceText ?? parsed.rawText ?? '').trim();
  const sourceSummary = rawFull.slice(0, 400);
  const rawTextExcerpt = rawFull.slice(0, 200) || undefined;

  const brand = String(answers.brand ?? parsed.entities?.brand ?? '').trim() || undefined;
  const model = String(answers.model ?? parsed.entities?.model ?? '').trim() || undefined;
  const vehicleSubject =
    [brand, model].filter(Boolean).join(' ').trim() ||
    extractVehicleSubjectFromText(rawFull) ||
    undefined;
  const vehicleCondition = extractVehicleConditionFromText(rawFull) || undefined;

  return {
    needType: draft.needType,
    intentType: parsed.intentType,
    categorySlug: parsed.categorySlug,
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
    vehicleSubject,
    vehicleCondition,
    brand,
    model,
    sourceSummary,
    rawTextExcerpt,
  };
}

export function buildListingTitleSystemPrompt(): string {
  return [
    'You write concise Persian marketplace listing titles for Iran (نیازفایندر).',
    `Output ONLY one line title, max ${LISTING_TITLE_MAX_LENGTH} characters, no quotes, no emoji.`,
    'Include: what is needed (product, vehicle type, service) + deal type (if known) + location when relevant.',
    'Never output only deal type and city (e.g. "خرید — مشهد"). Extract the subject from userNeedSummary or rawTextExcerpt.',
    'Do not copy user text verbatim; summarize clearly.',
    'Use Persian digits only if numbers appear.',
  ].join(' ');
}

export function buildListingTitleUserPrompt(ctx: ListingTitleContext): string {
  const payload = {
    needType: ctx.needType,
    intentType: ctx.intentType,
    categorySlug: ctx.categorySlug,
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
    vehicleSubject: ctx.vehicleSubject,
    vehicleCondition: ctx.vehicleCondition,
    brand: ctx.brand,
    model: ctx.model,
    userNeedSummary: ctx.sourceSummary,
    rawTextExcerpt: ctx.rawTextExcerpt,
  };

  return `Write one listing title in Persian for this need:\n${JSON.stringify(payload, null, 2)}`;
}

/** Short prompt for Ollama /generate (single string). */
export function buildListingTitleOllamaPrompt(ctx: ListingTitleContext): string {
  return `${buildListingTitleSystemPrompt()}\n\n${buildListingTitleUserPrompt(ctx)}\n\nTitle:`;
}
