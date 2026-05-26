import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import {
  JOB_ROLE_LABELS,
  PRODUCT_DEAL_LABELS,
  PROPERTY_DEAL_LABELS,
  PROPERTY_KIND_LABELS,
  VEHICLE_DEAL_LABELS,
} from '@/config/need-schemas/labels';
import { getRootCategorySlug } from '@/config/need-schemas/resolve-schema';
import { formatMoneyToman } from '@/lib/format/money';
import { mapDraftToCreateRequest } from '@/lib/need-intake/map-to-request';

export interface ComposedListing {
  title: string;
  description: string;
}

function dealLabel(parsed: ParsedIntent, answers: Record<string, unknown>): string | undefined {
  const deal = String(answers.dealType ?? parsed.entities?.dealType ?? '');
  return (
    PROPERTY_DEAL_LABELS[deal] ??
    VEHICLE_DEAL_LABELS[deal] ??
    PRODUCT_DEAL_LABELS[deal]
  );
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

  if (root === 'real-estate') {
    const kind = answers.propertyKind ?? parsed.entities?.propertyKind;
    if (kind) lines.push(`نوع ملک: ${PROPERTY_KIND_LABELS[String(kind)] ?? kind}`);
    if (answers.rooms) lines.push(`تعداد خواب: ${answers.rooms}`);
    if (answers.areaMin) lines.push(`متراژ حداقل: ${answers.areaMin} متر`);
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
  const mapped = mapDraftToCreateRequest(draft, 'preview', null);
  const { parsedIntent: parsed, answers } = draft;

  let title = mapped.title;
  if (title.length < 12 || title === 'ثبت نیاز') {
    const parts: string[] = [];
    const deal = dealLabel(parsed, answers);
    if (deal) parts.push(deal);
    const root = getRootCategorySlug(parsed.categorySlug);
    if (root === 'real-estate') {
      const kind = answers.propertyKind ?? parsed.entities?.propertyKind;
      if (kind) parts.push(PROPERTY_KIND_LABELS[String(kind)] ?? String(kind));
    }
    if (answers.serviceType) parts.push(String(answers.serviceType).slice(0, 40));
    if (answers.productName) parts.push(String(answers.productName));
    const loc = String(answers.location ?? parsed.city ?? '').trim();
    if (loc) parts.push(loc);
    if (parts.length >= 2) title = parts.join(' — ').slice(0, 120);
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
