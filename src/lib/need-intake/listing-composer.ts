import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import { JOB_ROLE_LABELS, PROPERTY_KIND_LABELS } from '@/config/need-schemas/labels';
import { getRootCategorySlug } from '@/config/need-schemas/resolve-schema';
import { formatMoneyToman } from '@/lib/format/money';
import { isConstructionPartnershipText } from '@/lib/need-intake/intent-parser';
import {
  buildProductSearchTitle,
  dealLabelForCategory,
  joinListingTitleParts,
} from '@/lib/need-intake/listing-title';
import { buildRealEstateServiceTitle } from '@/lib/need-intake/property-title';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';

export interface ComposedListing {
  title: string;
  description: string;
}

function dealLabel(parsed: ParsedIntent, answers: Record<string, unknown>): string | undefined {
  const deal = String(answers.dealType ?? parsed.entities?.dealType ?? '');
  return dealLabelForCategory(parsed.categorySlug, deal);
}

function buildDescriptionLines(
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): string[] {
  const lines: string[] = [];
  const root = getRootCategorySlug(parsed.categorySlug);

  const intro =
    parsed.description?.trim() ||
    String(answers.details ?? answers.serviceType ?? parsed.rawText).trim();
  if (intro) lines.push(intro);

  const deal = dealLabel(parsed, answers);
  if (deal) lines.push(`نوع معامله: ${deal}`);

  if (parsed.entities?.serviceKind === 'partnership' || parsed.intentType === 'real_estate_service') {
    lines.push('نوع درخواست: مشارکت در ساخت');
    const kind = answers.propertyKind ?? parsed.entities?.propertyKind;
    if (kind) lines.push(`نوع ملک: ${PROPERTY_KIND_LABELS[String(kind)] ?? kind}`);
    if (answers.areaMin) lines.push(`متراژ زمین: ${answers.areaMin} متر`);
    if (answers.plotWidth) lines.push(`عرض زمین: ${answers.plotWidth} متر`);
  } else if (root === 'real-estate') {
    const kind = answers.propertyKind ?? parsed.entities?.propertyKind;
    if (kind) lines.push(`نوع ملک: ${PROPERTY_KIND_LABELS[String(kind)] ?? kind}`);
    if (answers.rooms) lines.push(`تعداد خواب: ${answers.rooms}`);
    if (answers.areaMin) lines.push(`متراژ حداقل: ${answers.areaMin} متر`);
    if (answers.areaMax) lines.push(`متراژ حداکثر: ${answers.areaMax} متر`);
    if (answers.floorMin) lines.push(`طبقه: ${answers.floorMin}`);
    if (answers.pricePerMeterMin) {
      lines.push(`قیمت هر متر: از ${formatMoneyToman(Number(answers.pricePerMeterMin))}`);
    }
    if (answers.deposit) lines.push(`ودیعه: ${formatMoneyToman(Number(answers.deposit))}`);
    if (answers.monthlyRent) {
      lines.push(`اجاره ماهانه: ${formatMoneyToman(Number(answers.monthlyRent))}`);
    }
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

  return lines;
}

/** Template-based title/description polish — replaces LLM enrich. */
export function composeListingFromDraft(draft: NeedDraft): ComposedListing {
  const { parsedIntent: parsed, answers } = draftToLegacyPayload(draft);

  const parsedTitle = parsed.title?.trim();
  let title =
    parsedTitle && parsedTitle.length >= 8 && parsedTitle !== 'ثبت نیاز'
      ? parsedTitle
      : 'ثبت نیاز';

  if (
    parsed.intentType === 'real_estate_service' ||
    parsed.entities?.serviceKind === 'partnership' ||
    isConstructionPartnershipText(parsed.rawText ?? '')
  ) {
    title = buildRealEstateServiceTitle(
      { ...parsed.entities, ...answers } as Record<string, string>,
      parsed.city
    );
  }

  if (title.length < 12 || title === 'ثبت نیاز') {
    const root = getRootCategorySlug(parsed.categorySlug);
    const deal = String(answers.dealType ?? parsed.entities?.dealType ?? '');
    if (
      parsed.intentType === 'product_search' ||
      root === 'personal-items' ||
      root === 'electronics'
    ) {
      title = buildProductSearchTitle(parsed.rawText ?? '', deal || 'buy', parsed.city);
    } else {
      const parts: string[] = [];
      const dealFa = dealLabel(parsed, answers);
      if (dealFa) parts.push(dealFa);
      if (root === 'real-estate') {
        const kind = answers.propertyKind ?? parsed.entities?.propertyKind;
        if (kind) parts.push(PROPERTY_KIND_LABELS[String(kind)] ?? String(kind));
      }
      const serviceType = String(answers.serviceType ?? '').trim();
      if (serviceType) parts.push(serviceType.slice(0, 40));
      const productName = String(answers.productName ?? '').trim();
      if (productName) parts.push(productName);
      const loc = String(answers.location ?? parsed.city ?? '').trim();
      if (loc) parts.push(loc);
      const joined = joinListingTitleParts(parts);
      if (joined.length >= 8) title = joined.slice(0, 120);
    }
  }

  const bodyLines = buildDescriptionLines(parsed, answers);
  let description = bodyLines.join('\n').trim();
  if (description.length < 40 && parsed.rawText) {
    description = `${parsed.rawText.trim()}\n\n${description}`.trim();
  }

  return {
    title: title.slice(0, 120),
    description: description.slice(0, 2000),
  };
}
