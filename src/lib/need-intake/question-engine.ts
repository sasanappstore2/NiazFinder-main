import type {
  FieldSchema,
  IntentType,
  NextQuestionResponse,
  ParsedIntent,
} from '@/contracts/need-intake';
import { getIntentDefinition } from '@/config/need-intents';
import { getSchemaForIntake } from '@/config/need-schemas/resolve-schema';
import {
  JOB_ROLE_LABELS,
  PRODUCT_DEAL_LABELS,
  PROPERTY_DEAL_LABELS,
  PROPERTY_KIND_LABELS,
  VEHICLE_DEAL_LABELS,
} from '@/config/need-schemas/labels';
import { formatMoneyToman } from '@/lib/format/money';

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

function isAnswered(
  field: FieldSchema,
  answers: Record<string, unknown>,
  parsed: ParsedIntent
): boolean {
  const val = answers[field.key];
  if (val !== undefined && val !== null && val !== '') return true;

  const e = parsed.entities ?? {};

  if (field.key === 'dealType' && (answers.dealType || e.dealType)) return true;
  if (field.key === 'propertyKind' && e.propertyKind) return true;
  if (field.key === 'vehicleKind' && e.vehicleKind) return true;
  if (field.key === 'roleType' && e.roleType) return true;
  if (field.key === 'serviceCategory' && e.serviceCategory) return true;

  if (field.key === 'budget' && (parsed.budgetMax || parsed.budgetMin)) return true;
  if (field.key === 'rahnAmount' && parsed.budgetMax && e.dealType?.includes('rahn')) {
    return true;
  }
  if (field.key === 'location' && (parsed.city || answers.location)) return true;
  if (field.key === 'area' && parsed.city) return true;

  if (field.key === 'productName' && parsed.title && parsed.intentType === 'product_search') {
    const t = parsed.rawText.toLowerCase();
    if (t.length > 4) return true;
  }
  if (field.key === 'serviceType' && parsed.description && parsed.description.length > 12) {
    return true;
  }
  if (field.key === 'jobTitle' && parsed.title && parsed.title.length > 5) {
    return true;
  }

  return false;
}

export function getNextQuestion(
  intentType: IntentType,
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): NextQuestionResponse {
  const schema = getSchemaForIntake(intentType, parsed.categorySlug);
  const visible = schema.fields.filter((f) => fieldVisible(f, answers));
  const pending = visible.filter((f) => !isAnswered(f, answers, parsed));
  const total = visible.length;
  const answered = total - pending.length;

  if (pending.length === 0) {
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

  if (answers.rooms) parts.push(`خواب: ${answers.rooms}`);
  if (parsed.title) parts.push(`عنوان: ${parsed.title}`);
  if (answers.location || parsed.city) {
    parts.push(`مکان: ${answers.location ?? parsed.city}`);
  }
  if (answers.budget) {
    parts.push(`بودجه: ${formatMoneyToman(Number(answers.budget))} تومان`);
  } else if (parsed.budgetMax) {
    parts.push(`بودجه: ${formatMoneyToman(parsed.budgetMax)} تومان`);
  }
  if (answers.rahnAmount) {
    parts.push(`رهن: ${formatMoneyToman(Number(answers.rahnAmount))} تومان`);
  }
  if (answers.deposit) {
    parts.push(`ودیعه: ${formatMoneyToman(Number(answers.deposit))} تومان`);
  }
  if (answers.monthlyRent) {
    parts.push(`اجاره ماهانه: ${formatMoneyToman(Number(answers.monthlyRent))} تومان`);
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
