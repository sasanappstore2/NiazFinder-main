import type {
  FieldSchema,
  IntentType,
  NextQuestionResponse,
  ParsedIntent,
} from '@/contracts/need-intake';
import { getIntentDefinition } from '@/config/need-intents';
import { getEffectiveIntakeSchema } from '@/lib/need-intake/essential-intake-schema';
import {
  JOB_ROLE_LABELS,
  PRODUCT_DEAL_LABELS,
  PROPERTY_DEAL_LABELS,
  PROPERTY_KIND_LABELS,
  VEHICLE_DEAL_LABELS,
} from '@/config/need-schemas/labels';
import { formatMoneyToman } from '@/lib/format/money';
import { realEstateFilterSummaryLines } from '@/lib/need-intake/filter-answer-lines';
import { isCoreIntakeComplete } from '@/lib/need-intake/core-progress';
import { isIntakeFieldAnswered } from '@/lib/need-intake/intake-field-answered';
import { toAsciiDigits } from '@/lib/need-intake/extract-property-slots';

/** Ask only when user hinted or after higher-value fields (budget, rent amounts). */
const LOW_PRIORITY_UNLESS_HINTED = [
  'rooms',
  'yearMin',
  'yearMax',
  'familyCount',
  'amenities',
  'floorMin',
  'floorMax',
  'pricePerMeterMin',
  'pricePerMeterMax',
  'deedType',
  'guestCount',
] as const;

function fieldHintedInRawText(fieldKey: string, rawText: string): boolean {
  const t = toAsciiDigits(rawText.toLowerCase());
  switch (fieldKey) {
    case 'rooms':
      return t.includes('خواب');
    case 'yearMin':
    case 'yearMax':
      return t.includes('سال ساخت') || t.includes('نوساز') || t.includes('قدیمی');
    case 'familyCount':
      return t.includes('نفر') || t.includes('خانواده') || t.includes('مجرد');
    case 'amenities':
      return (
        t.includes('پارکینگ') ||
        t.includes('آسانسور') ||
        t.includes('انباری') ||
        t.includes('مبله') ||
        t.includes('بالکن') ||
        t.includes('بازسازی')
      );
    case 'floorMin':
    case 'floorMax':
      return t.includes('طبقه');
    case 'pricePerMeterMin':
    case 'pricePerMeterMax':
      return t.includes('متری') || t.includes('هر متر');
    case 'deedType':
      return t.includes('سند') || t.includes('تک برگ') || t.includes('تک‌برگ');
    case 'guestCount':
      return t.includes('نفر');
    default:
      return false;
  }
}

function sortPendingByPriority(
  pending: FieldSchema[],
  parsed: ParsedIntent
): FieldSchema[] {
  const raw = parsed.rawText ?? '';
  return [...pending].sort((a, b) => {
    const aLow =
      LOW_PRIORITY_UNLESS_HINTED.includes(a.key as (typeof LOW_PRIORITY_UNLESS_HINTED)[number]) &&
      !fieldHintedInRawText(a.key, raw);
    const bLow =
      LOW_PRIORITY_UNLESS_HINTED.includes(b.key as (typeof LOW_PRIORITY_UNLESS_HINTED)[number]) &&
      !fieldHintedInRawText(b.key, raw);
    if (aLow && !bLow) return 1;
    if (!aLow && bLow) return -1;
    return 0;
  });
}

function fieldVisible(field: FieldSchema, answers: Record<string, unknown>): boolean {
  if (field.showIf) {
    return String(answers[field.showIf.field]) === field.showIf.equals;
  }
  if (field.showIfIn) {
    const val = String(answers[field.showIfIn.field] ?? '');
    return field.showIfIn.values.includes(val);
  }
  return true;
}

export function getNextQuestion(
  intentType: IntentType,
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): NextQuestionResponse {
  const schema = getEffectiveIntakeSchema(intentType, parsed.categorySlug, parsed, answers);
  const visible = schema.fields.filter((f) => fieldVisible(f, answers));
  const pending = sortPendingByPriority(
    visible.filter((f) => !isIntakeFieldAnswered(f, answers, parsed)),
    parsed
  );
  const total = visible.length;
  const answered = total - pending.length;

  if (parsed.locationAmbiguous === true && parsed.neighborhoodCandidates?.length) {
    const totalSteps = Math.max(total, 1);
    return {
      done: false,
      disambiguation: {
        kind: 'neighborhood',
        question:
          'چند محله نزدیک این نام وجود دارد. لطفاً یکی را انتخاب کنید؛ یا گزینهٔ «دیگر» را بزنید تا متن دقیق بنویسید.',
        options: [
          ...parsed.neighborhoodCandidates.map((c) => ({
            value: c.slug,
            label: c.label,
          })),
          { value: '__neighborhood_other__', label: 'هیچ‌کدام / متن دقیق‌تر' },
        ],
      },
      progress: { current: 1, total: totalSteps },
    };
  }

  if (pending.length === 0) {
    if (isCoreIntakeComplete(parsed, answers)) {
      return { done: true, progress: { current: total, total } };
    }
    const optionalUnanswered = visible.filter((f) => !isIntakeFieldAnswered(f, answers, parsed));
    if (optionalUnanswered.length > 0) {
      const field = optionalUnanswered[0];
      return {
        done: false,
        question: field.label,
        field,
        chips:
          field.type === 'chips' || field.type === 'select' ? field.options : undefined,
        progress: { current: answered, total },
      };
    }
    const optionalAny = visible.filter((f) => !f.required);
    if (optionalAny.length > 0) {
      const field = optionalAny[0];
      return {
        done: false,
        question: field.label,
        field,
        chips:
          field.type === 'chips' || field.type === 'select' ? field.options : undefined,
        progress: { current: answered, total },
      };
    }
    return { done: true, progress: { current: total, total } };
  }

  const field = pending[0];

  return {
    done: false,
    question: field.label,
    field,
    chips:
      field.type === 'chips' || field.type === 'select' ? field.options : undefined,
    progress: { current: answered + 1, total },
  };
}

function labelDeal(deal?: unknown): string | null {
  if (!deal) return null;
  const d = String(deal);
  return (
    PROPERTY_DEAL_LABELS[d] ??
    VEHICLE_DEAL_LABELS[d] ??
    PRODUCT_DEAL_LABELS[d] ??
    JOB_ROLE_LABELS[d] ??
    d
  );
}

export function buildSummary(
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): string {
  const def = getIntentDefinition(parsed.intentType);
  const parts: string[] = [];
  parts.push(`دسته: ${def.labelFa}`);

  const dealLabel = labelDeal(answers.dealType ?? parsed.entities?.dealType);
  if (dealLabel) parts.push(`نوع معامله: ${dealLabel}`);

  const kind = answers.propertyKind ?? parsed.entities?.propertyKind;
  if (kind) {
    parts.push(`نوع ملک: ${PROPERTY_KIND_LABELS[String(kind)] ?? kind}`);
  }

  for (const line of realEstateFilterSummaryLines(answers)) {
    parts.push(line);
  }

  if (answers.areaMin) parts.push(`حداقل متراژ: ${answers.areaMin} متر`);
  if (answers.areaMax) parts.push(`حداکثر متراژ: ${answers.areaMax} متر`);
  if (answers.yearMin || answers.yearMax) {
    const yMin = answers.yearMin ? String(answers.yearMin) : '—';
    const yMax = answers.yearMax ? String(answers.yearMax) : '—';
    parts.push(`سال ساخت: ${yMin} تا ${yMax}`);
  }
  if (parsed.title) parts.push(`عنوان: ${parsed.title}`);
  if (answers.location || parsed.city) {
    parts.push(`مکان: ${answers.location ?? parsed.city}`);
  }
  if (answers.budget) {
    parts.push(`بودجه: ${formatMoneyToman(Number(answers.budget))} تومان`);
  } else if (parsed.budgetMax) {
    parts.push(`بودجه: ${formatMoneyToman(parsed.budgetMax)} تومان`);
  }
  if (answers.deposit) {
    parts.push(`ودیعه: ${formatMoneyToman(Number(answers.deposit))} تومان`);
  }
  if (answers.brand) parts.push(`خودرو: ${answers.brand}`);
  if (answers.productName) parts.push(`کالا: ${answers.productName}`);
  if (answers.jobTitle) parts.push(`شغل: ${answers.jobTitle}`);
  if (answers.serviceType) parts.push(`خدمت: ${answers.serviceType}`);
  if (parsed.urgency === 'URGENT') parts.push('اولویت: فوری');

  const detail = answers.details ?? answers.serviceType;
  if (detail && String(detail).length > 3) {
    parts.push(`جزئیات: ${String(detail)}`);
  }

  return parts.join('\n');
}
