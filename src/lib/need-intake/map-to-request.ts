import type { NeedDraft } from '@/contracts/need-intake';
import type { Priority } from '@prisma/client';
import {
  PROPERTY_DEAL_LABELS,
  PROPERTY_KIND_LABELS,
  VEHICLE_DEAL_LABELS,
  PRODUCT_DEAL_LABELS,
} from '@/config/need-schemas/labels';
import {
  CANONICAL_CITIES,
  getCityBySlug,
  getProvinceBySlug,
} from '@/config/locations';

export interface MappedCreateRequest {
  title: string;
  description: string;
  categoryId: string;
  subcategoryId?: string | null;
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

  const cityOnly = String(parsed.city ?? '').trim();
  if (cityOnly) return `نیاز — ${cityOnly}`.slice(0, 120);

  return parts.join(' ') || 'ثبت نیاز';
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

function resolveCityAndProvince(
  locationRaw: string | undefined,
  parsedCity?: string
): { city?: string; province?: string } {
  const raw = String(locationRaw ?? parsedCity ?? '').trim();
  if (!raw) return {};

  const bySlug = getCityBySlug(raw.toLowerCase());
  if (bySlug) {
    const province = getProvinceBySlug(bySlug.provinceSlug);
    return { city: bySlug.title, province: province?.title };
  }

  const byTitle = CANONICAL_CITIES.find(
    (c) => c.title === raw || c.title.includes(raw) || raw.includes(c.title)
  );
  if (byTitle) {
    const province = getProvinceBySlug(byTitle.provinceSlug);
    return { city: byTitle.title, province: province?.title };
  }

  return { city: raw };
}

export function mapDraftToCreateRequest(
  draft: NeedDraft,
  categoryId: string,
  subcategoryId?: string | null
): MappedCreateRequest {
  const { parsedIntent: parsed, answers } = draft;
  const preview = draft.listingPreview;
  const budget = preview?.budgetMax || preview?.budgetMin
    ? { max: preview.budgetMax, min: preview.budgetMin }
    : answerBudget(answers, parsed);

  let description = preview?.description
    ? preview.description.trim()
    : String(answers.details ?? answers.serviceType ?? parsed.description ?? parsed.rawText).trim() ||
      parsed.rawText;

  if (description.length < 30) {
    const extras = [
      parsed.city && `شهر: ${parsed.city}`,
      parsed.budgetMax && `بودجه تا ${parsed.budgetMax.toLocaleString('fa-IR')} تومان`,
      answers.when && `زمان: ${String(answers.when)}`,
    ].filter(Boolean);
    description = [description, ...extras].join('\n').trim() || parsed.rawText;
  }

  let title = preview?.title?.trim() || buildIntakeTitle(parsed, answers);
  if (title.length < 8) {
    title = 'ثبت نیاز';
  }

  const listingExtras = [
    ...(preview?.extras ?? []),
    ...(Array.isArray(answers.extras)
      ? (answers.extras as string[]).filter(Boolean)
      : typeof answers.extras === 'string' && answers.extras.trim()
        ? [answers.extras.trim()]
        : []),
  ].filter(Boolean);

  if (listingExtras.length > 0) {
    const block = listingExtras.map((e) => `• ${e}`).join('\n');
    description = `${description.trim()}\n\n${block}`.trim();
  }

  const { city, province } = resolveCityAndProvince(
    String(answers.location ?? ''),
    parsed.city
  );

  const tags: string[] = [parsed.intentType, parsed.categorySlug];
  if (parsed.subcategorySlug) tags.push(parsed.subcategorySlug);
  if (answers.condition) tags.push(String(answers.condition));
  if (answers.dealType) tags.push(String(answers.dealType));

  return {
    title,
    description,
    categoryId,
    subcategoryId: subcategoryId ?? null,
    budgetMin: budget.min,
    budgetMax: budget.max,
    budgetType: budget.max || budget.min ? 'FIXED' : 'NEGOTIABLE',
    city,
    province,
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
