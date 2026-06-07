import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import type { NeedIntelligenceProfile } from '@/contracts/need-intelligence';
import { JOB_ROLE_LABELS, PROPERTY_KIND_LABELS } from '@/config/need-schemas/labels';
import { getRootCategorySlug } from '@/config/need-schemas/resolve-schema';
import { formatMoneyToman } from '@/lib/format/money';
import { dealLabelForCategory, LISTING_TITLE_MAX_LENGTH } from '@/lib/need-intake/listing-title';
import { isGenericListingTitle, buildVerticalTitleFromDraft } from '@/lib/need-intake/vertical-title';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
import { realEstateFilterSummaryLines } from '@/lib/need-intake/filter-answer-lines';

export interface ComposedListing {
  title: string;
  description: string;
}

function buildIntelligenceLines(profile?: NeedIntelligenceProfile): string[] {
  if (!profile) return [];
  const lines: string[] = [];
  if (profile.mustHave?.length) lines.push(`الزامی: ${profile.mustHave.join('، ')}`);
  if (profile.niceToHave?.length) lines.push(`ترجیحات: ${profile.niceToHave.join('، ')}`);
  if (profile.locationPreferences?.length) {
    lines.push(`محدوده ترجیحی: ${profile.locationPreferences.join('، ')}`);
  }
  if (profile.priorities?.length) lines.push(`اولویت‌ها: ${profile.priorities.join(' > ')}`);
  if (profile.urgency === 'HIGH' || profile.urgency === 'URGENT') {
    lines.push('فوریت: بالا');
  }
  if (profile.motivation === 'business') lines.push('هدف: کسب‌وکار');
  return lines;
}

function buildIntelligenceTitle(
  draft: NeedDraft,
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): string | null {
  const ip = draft.intelligenceProfile;
  const deal = String(answers.dealType ?? ip?.transaction ?? parsed.entities?.dealType ?? '');
  const kind = String(answers.propertyKind ?? parsed.entities?.propertyKind ?? '');
  if (!deal && !kind) return null;

  const dealFa = deal ? dealLabelForCategory(parsed.categorySlug, deal) : '';
  const kindFa = kind ? (PROPERTY_KIND_LABELS[kind] ?? kind) : 'ملک';
  const area = ip?.area?.min ?? answers.areaMin;
  const approx = ip?.area?.approximate;
  const sizePart =
    area != null ? (approx ? ` ~${area}m` : ` ${area} متر`) : '';

  const hood = ip?.location?.neighborhood;
  const city = ip?.location?.city ?? parsed.city;
  const locPart = hood && city ? `${hood} ${city}` : hood ?? city ?? '';
  const core = `${dealFa} ${kindFa}${sizePart}`.trim();
  return locPart ? `${core} — ${locPart}` : core || null;
}

function buildDescriptionLines(
  parsed: ParsedIntent,
  answers: Record<string, unknown>,
  profile?: NeedIntelligenceProfile
): string[] {
  const lines: string[] = [];
  const root = getRootCategorySlug(parsed.categorySlug);

  const intro =
    parsed.description?.trim() ||
    String(answers.details ?? answers.serviceType ?? parsed.rawText).trim();
  if (intro) lines.push(intro);

  const deal = String(answers.dealType ?? parsed.entities?.dealType ?? '');
  const dealFa = deal ? dealLabelForCategory(parsed.categorySlug, deal) : undefined;
  if (dealFa) lines.push(`نوع معامله: ${dealFa}`);

  if (parsed.entities?.serviceKind === 'partnership' || parsed.intentType === 'real_estate_service') {
    lines.push('نوع درخواست: مشارکت در ساخت');
    const kind = answers.propertyKind ?? parsed.entities?.propertyKind;
    if (kind) lines.push(`نوع ملک: ${PROPERTY_KIND_LABELS[String(kind)] ?? kind}`);
    if (answers.areaMin) lines.push(`متراژ زمین: ${answers.areaMin} متر`);
    if (answers.plotWidth) lines.push(`عرض زمین: ${answers.plotWidth} متر`);
  } else if (root === 'real-estate') {
    const kind = answers.propertyKind ?? parsed.entities?.propertyKind;
    if (kind) lines.push(`نوع ملک: ${PROPERTY_KIND_LABELS[String(kind)] ?? kind}`);
    lines.push(...realEstateFilterSummaryLines(answers));
    if (answers.areaMin) {
      const approx = profile?.area?.approximate;
      lines.push(
        approx
          ? `متراژ تقریبی: ~${answers.areaMin} متر`
          : `متراژ حداقل: ${answers.areaMin} متر`
      );
    }
    if (answers.areaMax) lines.push(`متراژ حداکثر: ${answers.areaMax} متر`);
    if (answers.floorMin) lines.push(`طبقه: ${answers.floorMin}`);
    if (answers.pricePerMeterMin) {
      lines.push(`قیمت هر متر: از ${formatMoneyToman(Number(answers.pricePerMeterMin))}`);
    }
    if (answers.deposit) lines.push(`ودیعه: ${formatMoneyToman(Number(answers.deposit))}`);
    if (answers.nightlyRent) {
      lines.push(`اجاره هر شب: ${formatMoneyToman(Number(answers.nightlyRent))}`);
    }
    if (answers.guestCount) lines.push(`تعداد نفرات: ${answers.guestCount}`);
  }

  if (root === 'vehicles') {
    const kind = answers.vehicleKind ?? parsed.entities?.vehicleKind;
    if (kind) lines.push(`نوع خودرو: ${kind}`);
    if (answers.brand) lines.push(`برند: ${answers.brand}`);
    if (answers.model) lines.push(`مدل: ${answers.model}`);
  }

  if (root === 'jobs') {
    const role = answers.roleType ?? parsed.entities?.roleType;
    if (role) lines.push(`نقش: ${JOB_ROLE_LABELS[String(role)] ?? role}`);
    if (answers.jobTitle) lines.push(`عنوان شغلی: ${answers.jobTitle}`);
  }

  const loc = String(answers.location ?? parsed.city ?? '').trim();
  if (loc) lines.push(`محدوده: ${loc}`);

  const budget =
    typeof answers.budget === 'number'
      ? answers.budget
      : parsed.budgetMax;
  if (budget) lines.push(`بودجه: تا ${formatMoneyToman(budget)}`);

  if (answers.when) lines.push(`زمان: ${String(answers.when)}`);

  lines.push(...buildIntelligenceLines(profile));

  return lines;
}

/** Template-based title/description polish — replaces LLM enrich. */
export function composeListingFromDraft(draft: NeedDraft): ComposedListing {
  const { parsedIntent: parsed, answers } = draftToLegacyPayload(draft);

  const intelligenceTitle = buildIntelligenceTitle(draft, parsed, answers);
  const parsedTitle = parsed.title?.trim();
  let title =
    parsedTitle &&
    parsedTitle.length >= 8 &&
    parsedTitle !== 'ثبت نیاز' &&
    !isGenericListingTitle(parsedTitle)
      ? parsedTitle
      : intelligenceTitle ?? buildVerticalTitleFromDraft(draft);

  if (title.length < 10 || title === 'ثبت نیاز' || isGenericListingTitle(title)) {
    title = intelligenceTitle ?? buildVerticalTitleFromDraft(draft);
  }

  const bodyLines = buildDescriptionLines(parsed, answers, draft.intelligenceProfile);
  let description = bodyLines.join('\n').trim();
  if (description.length < 40 && parsed.rawText) {
    description = `${parsed.rawText.trim()}\n\n${description}`.trim();
  }

  return {
    title: title.slice(0, LISTING_TITLE_MAX_LENGTH),
    description: description.slice(0, 2000),
  };
}
