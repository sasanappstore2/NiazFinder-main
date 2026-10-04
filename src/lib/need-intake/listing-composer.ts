import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import type { NeedIntelligenceProfile } from '@/contracts/need-intelligence';
import { JOB_ROLE_LABELS, PROPERTY_KIND_LABELS } from '@/config/need-schemas/labels';
import { formatMoneyToman } from '@/lib/format/money';
import { dealLabelForCategory, LISTING_TITLE_MAX_LENGTH } from '@/lib/need-intake/listing-title';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
import { realEstateFilterSummaryLines } from '@/lib/need-intake/filter-answer-lines';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import { formatWhenLabel } from '@/lib/need-intake/intake-timing-options';

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

function buildDescriptionLines(
  parsed: ParsedIntent,
  answers: Record<string, unknown>,
  profile?: NeedIntelligenceProfile
): string[] {
  const lines: string[] = [];
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
  } else if (parsed.intentType.startsWith('property') || parsed.categorySlug?.includes('rent') || parsed.categorySlug?.includes('sale')) {
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

  if (parsed.intentType.startsWith('vehicle')) {
    const kind = answers.vehicleKind ?? parsed.entities?.vehicleKind;
    if (kind) lines.push(`نوع خودرو: ${kind}`);
    if (answers.brand) lines.push(`برند: ${answers.brand}`);
    if (answers.model) lines.push(`مدل: ${answers.model}`);
  }

  if (parsed.intentType.startsWith('job')) {
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

  if (answers.when) {
    const whenLabel = formatWhenLabel(String(answers.when)) ?? String(answers.when);
    lines.push(`زمان: ${whenLabel}`);
  }

  lines.push(...buildIntelligenceLines(profile));

  return lines;
}

/** Template-based title/description — title always from canonical resolver. */
export function composeListingFromDraft(draft: NeedDraft): ComposedListing {
  const { parsedIntent: parsed, answers } = draftToLegacyPayload(draft);
  const title = resolveDeterministicListingTitle(draft).title;

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
