import type { NeedDraft } from '@/contracts/need-intake';
import type { Priority } from '@prisma/client';
import {
  PROPERTY_DEAL_LABELS,
  PROPERTY_KIND_LABELS,
  PRODUCT_DEAL_LABELS,
  VEHICLE_DEAL_LABELS,
} from '@/config/need-schemas/labels';
import { isConstructionPartnershipText } from '@/lib/need-intake/intent-parser';
import { buildPropertyTitle, buildRealEstateServiceTitle } from '@/lib/need-intake/property-title';
import {
  CANONICAL_CITIES,
  getCityBySlug,
  getProvinceBySlug,
} from '@/config/locations';
import type { PublishCommand } from '@/intake/projections/publishProjection';
import { buildProjectionMetadata } from '@/intake/projections/metadata';

function answerBudget(answers: Record<string, unknown>, parsed: NeedDraft['parsedIntent']) {
  const b = answers.budget;
  if (typeof b === 'number') return { max: b };
  if (typeof b === 'string' && b) {
    const n = Number(String(b).replace(/,/g, ''));
    if (!Number.isNaN(n)) return { max: n };
  }
  return { max: parsed.budgetMax, min: parsed.budgetMin };
}

function buildIntakeTitle(parsed: NeedDraft['parsedIntent'], answers: Record<string, unknown>): string {
  const entities: Record<string, string> = {
    ...parsed.entities,
    ...(answers.propertyKind ? { propertyKind: String(answers.propertyKind) } : {}),
    ...(answers.areaMin != null ? { areaMin: String(answers.areaMin) } : {}),
    ...(answers.areaMax != null ? { areaMax: String(answers.areaMax) } : {}),
    ...(answers.plotWidth ? { plotWidth: String(answers.plotWidth) } : {}),
  };

  const hasAreaSize = Boolean(entities.areaMin || entities.areaMax);
  const existing = parsed.title?.trim();
  if (
    existing &&
    existing.length >= 8 &&
    existing !== 'ثبت نیاز' &&
    !(hasAreaSize && parsed.intentType.startsWith('property') && !existing.includes('متر'))
  ) {
    return existing.slice(0, 120);
  }

  if (
    parsed.intentType === 'real_estate_service' ||
    entities.serviceKind === 'partnership' ||
    isConstructionPartnershipText(parsed.rawText ?? '')
  ) {
    return buildRealEstateServiceTitle(entities, parsed.city);
  }
  if (parsed.intentType.startsWith('property')) {
    return buildPropertyTitle(parsed.intentType, entities, parsed.city, entities.area);
  }

  const deal = String(answers.dealType ?? parsed.entities?.dealType ?? '');
  const dealLabel = PROPERTY_DEAL_LABELS[deal] ?? VEHICLE_DEAL_LABELS[deal] ?? PRODUCT_DEAL_LABELS[deal];
  const kind = answers.propertyKind ?? parsed.entities?.propertyKind;
  const kindLabel = kind ? PROPERTY_KIND_LABELS[String(kind)] : '';

  const parts: string[] = [];
  if (dealLabel) parts.push(dealLabel);
  if (kindLabel) parts.push(kindLabel);
  if (answers.rooms) parts.push(`${answers.rooms} خواب`);
  const city = String(answers.location ?? parsed.city ?? '').trim();
  if (city) parts.push(city);

  if (parts.length >= 2) return parts.join(' — ').slice(0, 120);
  if (city) return `نیاز — ${city}`.slice(0, 120);
  return parts.join(' ') || 'ثبت نیاز';
}

function mapUrgency(parsed: NeedDraft['parsedIntent'], answers: Record<string, unknown>): Priority {
  if (parsed.urgency === 'URGENT') return 'URGENT';
  const u = answers.urgent ?? answers.when;
  if (u === 'urgent' || u === 'today') return 'URGENT';
  if (u === 'week') return 'HIGH';
  return 'NORMAL';
}

function resolveCityAndProvince(locationRaw: string | undefined, parsedCity?: string) {
  const raw = String(locationRaw ?? parsedCity ?? '').trim();
  if (!raw) return {} as { city?: string; province?: string };
  const bySlug = getCityBySlug(raw.toLowerCase());
  if (bySlug) {
    const province = getProvinceBySlug(bySlug.provinceSlug);
    return { city: bySlug.title, province: province?.title };
  }
  const byTitle = CANONICAL_CITIES.find((c) => c.title === raw || c.title.includes(raw) || raw.includes(c.title));
  if (byTitle) {
    const province = getProvinceBySlug(byTitle.provinceSlug);
    return { city: byTitle.title, province: province?.title };
  }
  return { city: raw };
}

/**
 * Legacy shadow path: uses stored parsedIntent/answers on the draft as-is.
 * Does NOT derive from NeedDraft.entities (pre-canonical behavior).
 */
export function toPublishCommandFromStoredLegacy(
  draft: NeedDraft,
  categoryId: string,
  subcategoryId?: string | null
): PublishCommand {
  const projection = buildProjectionMetadata(draft, 1);
  const parsed = draft.parsedIntent;
  const answers = draft.answers as Record<string, unknown>;

  const budget =
    draft.listingPreview?.budgetMax || draft.listingPreview?.budgetMin
      ? { max: draft.listingPreview?.budgetMax, min: draft.listingPreview?.budgetMin }
      : answerBudget(answers, parsed);

  let description = draft.listingPreview?.description
    ? draft.listingPreview.description.trim()
    : String(answers.details ?? answers.serviceType ?? parsed.description ?? parsed.rawText).trim() ||
      parsed.rawText;

  let title = draft.listingPreview?.title?.trim() || buildIntakeTitle(parsed, answers);
  if (title.length < 8) title = 'ثبت نیاز';

  const { city, province } = resolveCityAndProvince(String(answers.location ?? ''), parsed.city);
  const tags: string[] = [parsed.intentType, parsed.categorySlug];
  if (parsed.subcategorySlug) tags.push(parsed.subcategorySlug);
  if (answers.dealType) tags.push(String(answers.dealType));

  return {
    projection,
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
    dynamicAnswers: { ...answers },
    aiExtractedData: {
      projection,
      model: 'legacy-stored-snapshot-v1',
      categorySlug: parsed.categorySlug,
      subcategorySlug: parsed.subcategorySlug,
      confidence: parsed.confidence,
      entities: parsed.entities,
    },
    source: 'intake_chat',
  };
}
