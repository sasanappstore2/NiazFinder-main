import type { NeedDraft } from '@/contracts/need-intake';
import type { Priority } from '@prisma/client';
import {
  PROPERTY_DEAL_LABELS,
  PROPERTY_KIND_LABELS,
  VEHICLE_DEAL_LABELS,
  PRODUCT_DEAL_LABELS,
} from '@/config/need-schemas/labels';

export interface MappedCreateRequest {
  title: string;
  description: string;
  categoryId: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetType: 'FIXED' | 'HOURLY' | 'NEGOTIABLE';
  city?: string;
  province?: string;
  priority: Priority;
  tags: string[];
  intentType: string;
  dynamicAnswers: Record<string, unknown>;
  aiExtractedData: Record<string, unknown>;
  source: 'intake_chat';
}

function answerBudget(answers: Record<string, unknown>, parsed: NeedDraft['parsedIntent']) {
  const b = answers.budget;
  if (typeof b === 'number') return { max: b };
  if (typeof b === 'string' && b) {
    const n = Number(String(b).replace(/,/g, ''));
    if (!Number.isNaN(n)) return { max: n };
  }
  return { max: parsed.budgetMax, min: parsed.budgetMin };
}

function buildIntakeTitle(
  parsed: NeedDraft['parsedIntent'],
  answers: Record<string, unknown>
): string {
  const deal = String(answers.dealType ?? parsed.entities?.dealType ?? '');
  const dealLabel =
    PROPERTY_DEAL_LABELS[deal] ??
    VEHICLE_DEAL_LABELS[deal] ??
    PRODUCT_DEAL_LABELS[deal];

  const kind = answers.propertyKind ?? parsed.entities?.propertyKind;
  const kindLabel = kind ? PROPERTY_KIND_LABELS[String(kind)] : '';

  const parts: string[] = [];
  if (dealLabel) parts.push(dealLabel);
  if (kindLabel) parts.push(kindLabel);
  if (answers.rooms) parts.push(`${answers.rooms} خواب`);
  if (answers.productName) parts.push(String(answers.productName));
  if (answers.brand) parts.push(String(answers.brand));
  if (answers.jobTitle) parts.push(String(answers.jobTitle));
  if (answers.serviceType) parts.push(String(answers.serviceType).slice(0, 40));

  const city = String(answers.location ?? parsed.city ?? '').trim();
  if (city) parts.push(city);

  if (parts.length >= 2) return parts.join(' — ').slice(0, 120);
  if (parsed.title && parsed.title.length >= 10) return parsed.title.slice(0, 120);
  return parts.join(' ') || parsed.rawText.slice(0, 80) || 'ثبت نیاز';
}

function mapUrgency(
  parsed: NeedDraft['parsedIntent'],
  answers: Record<string, unknown>
): Priority {
  if (parsed.urgency === 'URGENT') return 'URGENT';
  const u = answers.urgent ?? answers.when;
  if (u === 'urgent' || u === 'today') return 'URGENT';
  if (u === 'week') return 'HIGH';
  return 'NORMAL';
}

export function mapDraftToCreateRequest(
  draft: NeedDraft,
  categoryId: string
): MappedCreateRequest {
  const { parsedIntent: parsed, answers } = draft;
  const budget = answerBudget(answers, parsed);

  let description =
    String(answers.details ?? answers.serviceType ?? parsed.description ?? parsed.rawText).trim() ||
    parsed.rawText;

  if (description.length < 30) {
    const extras = [
      parsed.city && `شهر: ${parsed.city}`,
      parsed.budgetMax && `بودجه تا ${parsed.budgetMax.toLocaleString('fa-IR')} تومان`,
      answers.when && `زمان: ${String(answers.when)}`,
    ].filter(Boolean);
    description = [description, ...extras].join('\n').trim() || parsed.rawText;
  }

  let title = buildIntakeTitle(parsed, answers);
  if (title.length < 8) {
    title = (parsed.title ?? description).trim().slice(0, 120) || 'ثبت نیاز';
  }

  const city = String(answers.location ?? parsed.city ?? '').trim() || undefined;

  const tags: string[] = [parsed.intentType, parsed.categorySlug];
  if (answers.condition) tags.push(String(answers.condition));
  if (answers.dealType) tags.push(String(answers.dealType));

  return {
    title,
    description,
    categoryId,
    budgetMin: budget.min,
    budgetMax: budget.max,
    budgetType: budget.max || budget.min ? 'FIXED' : 'NEGOTIABLE',
    city,
    priority: mapUrgency(parsed, answers),
    tags,
    intentType: parsed.intentType,
    dynamicAnswers: answers,
    aiExtractedData: {
      confidence: parsed.confidence,
      entities: parsed.entities,
      categorySlug: parsed.categorySlug,
      subcategorySlug: parsed.subcategorySlug,
    },
    source: 'intake_chat',
  };
}
