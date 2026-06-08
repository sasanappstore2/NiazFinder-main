import type { NeedDraft } from '@/contracts/need-intake';
import {
  buildListingCopyContext,
  buildListingCopySystemPrompt,
  buildListingCopyUserPrompt,
  type ListingCopyContext,
} from '@/lib/need-intake/listing-copy-prompt';
import { LISTING_TITLE_MAX_LENGTH } from '@/lib/need-intake/listing-title';

export type { ListingCopyContext };

/** MLX title endpoint payload (subset of copy context). */
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
  areaMin?: string;
  areaMax?: string;
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
  structuredFieldLines?: string[];
  baselineTitle?: string;
}

function titleContextFromCopy(copy: ListingCopyContext): ListingTitleContext {
  return {
    needType: copy.needType,
    intentType: copy.intentType,
    categorySlug: copy.categorySlug,
    categoryPathFa: copy.categoryPathFa,
    city: copy.city,
    neighborhood: copy.neighborhood,
    dealTypeFa: copy.dealTypeFa,
    propertyKind: copy.propertyKind,
    rooms: copy.rooms,
    areaMin: copy.areaMin,
    areaMax: copy.areaMax,
    productName: copy.productName,
    serviceType: copy.serviceType,
    jobTitle: copy.jobTitle,
    budgetHint: copy.budgetHint,
    vehicleSubject: copy.vehicleSubject,
    vehicleCondition: copy.vehicleCondition,
    brand: copy.brand,
    model: copy.model,
    sourceSummary: copy.sourceSummary,
    rawTextExcerpt: copy.needText.slice(0, 200) || undefined,
    structuredFieldLines: copy.structuredFieldLines,
    baselineTitle: copy.baselineTitle,
  };
}

export function buildListingTitleContext(draft: NeedDraft): ListingTitleContext {
  return titleContextFromCopy(buildListingCopyContext(draft));
}

export function buildListingTitleSystemPrompt(): string {
  return [
    buildListingCopySystemPrompt(),
    `If outputting title only: one line, max ${LISTING_TITLE_MAX_LENGTH} chars.`,
  ].join(' ');
}

export function buildListingTitleUserPrompt(ctx: ListingTitleContext): string {
  const copy: ListingCopyContext = {
    needType: ctx.needType,
    intentType: ctx.intentType,
    categorySlug: ctx.categorySlug,
    categoryPathFa: ctx.categoryPathFa,
    vertical: 'general',
    city: ctx.city,
    neighborhood: ctx.neighborhood,
    locationDisplay:
      ctx.neighborhood && ctx.city ? `${ctx.neighborhood}، ${ctx.city}` : ctx.city,
    dealTypeFa: ctx.dealTypeFa,
    propertyKind: ctx.propertyKind,
    rooms: ctx.rooms,
    areaMin: ctx.areaMin,
    areaMax: ctx.areaMax,
    budgetHint: ctx.budgetHint,
    productName: ctx.productName,
    serviceType: ctx.serviceType,
    jobTitle: ctx.jobTitle,
    vehicleSubject: ctx.vehicleSubject,
    vehicleCondition: ctx.vehicleCondition,
    brand: ctx.brand,
    model: ctx.model,
    needText: ctx.rawTextExcerpt ?? ctx.sourceSummary.slice(0, 200),
    detailsText: undefined,
    sourceSummary: ctx.sourceSummary,
    filterSummaryLines: [],
    structuredFieldLines: ctx.structuredFieldLines ?? [],
    baselineTitle: ctx.baselineTitle ?? '',
    baselineDescription: '',
    completionScore: 0,
    missingFieldLabels: [],
  };
  return buildListingCopyUserPrompt(copy);
}

export function buildListingTitleOllamaPrompt(ctx: ListingTitleContext): string {
  return `${buildListingTitleSystemPrompt()}\n\n${buildListingTitleUserPrompt(ctx)}\n\nTitle:`;
}
