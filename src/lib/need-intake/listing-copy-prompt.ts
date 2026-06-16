import { getCategoryPath } from '@/config/categories';
import { CANONICAL_CITIES } from '@/config/locations';
import { PROPERTY_KIND_LABELS, PROPERTY_DEAL_LABELS } from '@/config/need-schemas/labels';
import type { NeedDraft } from '@/contracts/need-intake';
import { recordToEntities } from '@/intake/entities/entityRecord';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
import { resolveTemplateFromDraftEntities } from '@/intake/template/resolveTemplate';
import { formatMoneyToman } from '@/lib/format/money';
import { realEstateFilterSummaryLines } from '@/lib/need-intake/filter-answer-lines';
import { dealLabelForCategory, LISTING_TITLE_MAX_LENGTH } from '@/lib/need-intake/listing-title';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import {
  extractVehicleConditionFromText,
  extractVehicleSubjectFromText,
  listingTitleCityFromDraft,
} from '@/lib/need-intake/vertical-title';

/** Payload sent to intake-mlx for title + description generation. */
export interface ListingCopyContext {
  templateId: string;
  rootSlug: string;
  intentType: string;
  categorySlug?: string;
  categoryPathFa: string;
  vertical: string;
  city?: string;
  neighborhood?: string;
  locationDisplay?: string;
  dealTypeFa?: string;
  propertyKind?: string;
  rooms?: string;
  areaMin?: string;
  areaMax?: string;
  budgetHint?: string;
  depositHint?: string;
  monthlyRentHint?: string;
  productName?: string;
  serviceType?: string;
  jobTitle?: string;
  vehicleSubject?: string;
  vehicleCondition?: string;
  brand?: string;
  model?: string;
  needText: string;
  detailsText?: string;
  sourceSummary: string;
  filterSummaryLines: string[];
  structuredFieldLines: string[];
  baselineTitle: string;
  baselineDescription: string;
  completionScore: number;
  missingFieldLabels: string[];
}

function categoryPathForAi(pathFa: string, dealTypeFa: string | undefined, sourceText: string): string {
  if (!pathFa.includes('فروش') && !pathFa.includes('خرید')) return pathFa;
  const src = sourceText.trim();
  const rentDeal =
    dealTypeFa?.includes('رهن') ||
    dealTypeFa?.includes('اجاره') ||
    (/رهن|ودیعه|اجاره/u.test(src) && !/(?:^|\s)(?:فروش|خرید)(?:\s|$)/u.test(src));
  if (!rentDeal) return pathFa;
  return pathFa.replace(/فروش/g, 'املاک').replace(/خرید/g, 'املاک');
}

export function inferPropertyKindFromCategory(slug?: string | null): string | undefined {
  if (!slug) return undefined;
  const s = slug.toLowerCase();
  if (s.includes('apartment')) return 'apartment';
  if (s.includes('villa') || (s.includes('house') && !s.includes('warehouse'))) return 'villa';
  if (s.includes('land')) return 'land';
  if (s.includes('office')) return 'office';
  if (s.includes('shop') || s.includes('store')) return 'shop';
  if (s.includes('industrial') || s.includes('warehouse')) return 'industrial';
  return undefined;
}

function splitLocationDisplay(raw: string): { neighborhood?: string; city?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/[،,]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const cityHit = CANONICAL_CITIES.find(
      (c) => parts[parts.length - 1] === c.title || parts[parts.length - 1]!.includes(c.title)
    );
    if (cityHit) {
      return {
        neighborhood: parts.slice(0, -1).join('، '),
        city: cityHit.title,
      };
    }
  }
  const cityOnly = CANONICAL_CITIES.find((c) => trimmed === c.title || trimmed.includes(c.title));
  if (cityOnly) return { city: cityOnly.title };
  return { neighborhood: trimmed };
}

function extractDetailsFromSource(sourceText: string, needText: string): string | undefined {
  const raw = sourceText.trim();
  const need = needText.trim();
  if (!raw || raw === need) return undefined;
  if (raw.startsWith(need)) {
    const rest = raw.slice(need.length).replace(/^[\n\s]+/, '').trim();
    return rest || undefined;
  }
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) return lines.slice(1).join('\n');
  return undefined;
}

/** Full intake context for AI title + description — all wizard steps. */
export function buildListingCopyContext(draft: NeedDraft): ListingCopyContext {
  const { parsedIntent: parsed, answers } = draftToLegacyPayload(draft);
  const entities = recordToEntities(draft.entities);
  const leafSlug =
    entities.subcategorySlug ?? entities.categorySlug ?? parsed.subcategorySlug ?? parsed.categorySlug;
  const path = leafSlug ? getCategoryPath(leafSlug) : [];
  const rawFullEarly = (draft.sourceText ?? parsed.rawText ?? '').trim();
  const pathFaRaw = path.map((p) => p.title).join(' › ') || draft.category || 'عمومی';

  const deal = String(answers.dealType ?? parsed.entities?.dealType ?? entities.transactionType ?? '');
  const dealTypeFa = deal
    ? (PROPERTY_DEAL_LABELS[deal] ??
        dealLabelForCategory(parsed.categorySlug ?? leafSlug ?? '', deal.toLowerCase()))
    : undefined;

  const categoryPathFa = categoryPathForAi(pathFaRaw, dealTypeFa, rawFullEarly);

  const cityFromEntities = entities.city?.trim() || parsed.city?.trim() || undefined;
  const neighborhoodFromEntities = entities.neighborhood?.trim() || undefined;
  const locationAnswer = String(answers.location ?? '').trim();
  const splitLoc = locationAnswer ? splitLocationDisplay(locationAnswer) : {};
  const city =
    cityFromEntities ||
    splitLoc.city ||
    listingTitleCityFromDraft(draft, parsed.city, locationAnswer) ||
    undefined;
  const neighborhood =
    neighborhoodFromEntities || splitLoc.neighborhood || parsed.entities?.area?.trim() || undefined;
  const locationDisplay =
    neighborhood && city ? `${neighborhood}، ${city}` : (city ?? locationAnswer) || undefined;

  const rawFull = (draft.sourceText ?? parsed.rawText ?? '').trim();
  const needText = parsed.rawText?.trim() || rawFull.split('\n')[0]?.trim() || rawFull;
  const detailsText =
    String(answers.details ?? '').trim() ||
    extractDetailsFromSource(rawFull, needText) ||
    undefined;

  const propertyKindRaw =
    answers.propertyKind ??
    parsed.entities?.propertyKind ??
    inferPropertyKindFromCategory(leafSlug);
  const propertyKind = propertyKindRaw
    ? (PROPERTY_KIND_LABELS[String(propertyKindRaw)] ?? String(propertyKindRaw))
    : undefined;

  const roomsRaw = answers.rooms ?? entities.rooms ?? parsed.entities?.rooms;
  const rooms = roomsRaw != null && roomsRaw !== '' ? `${roomsRaw} خواب` : undefined;

  const areaMin =
    String(answers.areaMin ?? entities.area ?? parsed.entities?.areaMin ?? '').trim() || undefined;
  const areaMax = String(answers.areaMax ?? parsed.entities?.areaMax ?? '').trim() || undefined;

  const budget =
    parsed.budgetMax ?? entities.budgetMax ?? (typeof answers.budget === 'number' ? answers.budget : undefined);
  const isRahnDeal = deal === 'rent_rahn_ejare' || deal === 'rent_rahn_full';
  const budgetHint = !isRahnDeal && budget ? `تا ${formatMoneyToman(budget)}` : undefined;
  const depositHint =
    answers.rahnAmount != null
      ? formatMoneyToman(Number(answers.rahnAmount))
      : parsed.entities?.rahnAmount
        ? formatMoneyToman(Number(parsed.entities.rahnAmount))
        : answers.deposit != null
          ? formatMoneyToman(Number(answers.deposit))
          : undefined;
  const monthlyRentHint =
    answers.monthlyRent != null ? formatMoneyToman(Number(answers.monthlyRent)) : undefined;

  const brand = String(answers.brand ?? parsed.entities?.brand ?? '').trim() || undefined;
  const model = String(answers.model ?? parsed.entities?.model ?? '').trim() || undefined;
  const vehicleSubject =
    [brand, model].filter(Boolean).join(' ').trim() ||
    extractVehicleSubjectFromText(rawFull) ||
    undefined;
  const vehicleCondition = extractVehicleConditionFromText(rawFull) || undefined;

  const filterSummaryLines = realEstateFilterSummaryLines(answers as Record<string, unknown>);
  const structuredFieldLines: string[] = [];
  if (dealTypeFa) structuredFieldLines.push(`نوع معامله: ${dealTypeFa}`);
  if (propertyKind) structuredFieldLines.push(`نوع ملک: ${propertyKind}`);
  if (rooms) structuredFieldLines.push(`خواب: ${rooms}`);
  if (areaMin) structuredFieldLines.push(`متراژ: ${areaMin}${areaMax ? ` تا ${areaMax}` : ''} متر`);
  if (neighborhood) structuredFieldLines.push(`محله: ${neighborhood}`);
  if (city) structuredFieldLines.push(`شهر: ${city}`);
  if (budgetHint) structuredFieldLines.push(`بودجه: ${budgetHint}`);

  const composed = composeListingFromDraft(draft);
  const baselineTitle = resolveDeterministicListingTitle(draft).title;

  const template = resolveTemplateFromDraftEntities(entities);

  return {
    templateId: draft.templateId,
    rootSlug: template.rootSlug,
    intentType: parsed.intentType,
    categorySlug: parsed.categorySlug ?? leafSlug ?? undefined,
    categoryPathFa,
    vertical: draft.vertical || entities.vertical || 'general',
    city,
    neighborhood,
    locationDisplay,
    dealTypeFa,
    propertyKind,
    rooms,
    areaMin,
    areaMax,
    budgetHint,
    depositHint,
    monthlyRentHint,
    productName: String(answers.productName ?? '').trim() || undefined,
    serviceType: String(answers.serviceType ?? '').trim().slice(0, 80) || undefined,
    jobTitle: String(answers.jobTitle ?? '').trim() || undefined,
    vehicleSubject,
    vehicleCondition,
    brand,
    model,
    needText,
    detailsText,
    sourceSummary: rawFull.slice(0, 600),
    filterSummaryLines,
    structuredFieldLines,
    baselineTitle,
    baselineDescription: composed.description,
    completionScore: draft.completionScore,
    missingFieldLabels: draft.missingFields?.slice(0, 6).map((f) => f.field) ?? [],
  };
}

export function buildListingCopySystemPrompt(): string {
  return [
    'تو نویسندهٔ آگهی فارسی برای بازار نیازفایندر (ایران) هستی.',
    'فقط یک JSON معتبر UTF-8 برگردان — بدون markdown، بدون توضیح اضافه.',
    `فرمت دقیق: {"title":"...","description":"..."}`,
    `title: یک خط، حداکثر ${LISTING_TITLE_MAX_LENGTH} کاراکتر، بدون emoji و گیومه.`,
    'title باید شامل: نوع معامله + موضوع دقیق (آپارتمان/خودرو/…) + متراژ یا خواب (اگر هست) + محله/شهر.',
    'هرگز فقط «اجاره ملک در شهر» ننویس — از propertyKind و rooms و areaMin استفاده کن.',
    'description: ۲–۵ جملهٔ روان فارسی؛ نیاز کاربر را خلاصه کن، جزئیات structuredFields و detailsText را بگنجان.',
    'تکرار نوع معامله در title ممنوع (مثلاً «اجاره … برای اجاره»).',
    'اگر baselineTitle مشخص است از آن بهتر یا دقیق‌تر بنویس، نه کپی verbatim.',
    'اگر propertyKind مشخص است هرگز «ملک» عمومی ننویس.',
    'dealType از structuredFields معتبرتر از category path است — هرگز نوع معامله را بر اساس دسته‌بندی عوض نکن.',
  ].join(' ');
}

export function buildListingCopyUserPrompt(ctx: ListingCopyContext): string {
  const payload = {
    category: ctx.categoryPathFa,
    vertical: ctx.vertical,
    dealType: ctx.dealTypeFa,
    propertyKind: ctx.propertyKind,
    rooms: ctx.rooms,
    areaMin: ctx.areaMin,
    areaMax: ctx.areaMax,
    city: ctx.city,
    neighborhood: ctx.neighborhood,
    location: ctx.locationDisplay,
    budget: ctx.budgetHint,
    deposit: ctx.depositHint,
    monthlyRent: ctx.monthlyRentHint,
    vehicle: ctx.vehicleSubject,
    vehicleCondition: ctx.vehicleCondition,
    productName: ctx.productName,
    serviceType: ctx.serviceType,
    jobTitle: ctx.jobTitle,
    needText: ctx.needText,
    detailsText: ctx.detailsText,
    structuredFields: ctx.structuredFieldLines,
    filterLines: ctx.filterSummaryLines,
    baselineTitle: ctx.baselineTitle,
    baselineDescriptionExcerpt: ctx.baselineDescription.slice(0, 400),
    completionScore: ctx.completionScore,
    stillMissing: ctx.missingFieldLabels,
  };

  return `بر اساس اطلاعات زیر یک title و description برای آگهی بنویس:\n${JSON.stringify(payload, null, 2)}`;
}
