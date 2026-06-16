import type { NeedDraft } from '@/contracts/need-intake';
import type { Priority } from '@prisma/client';
import { LISTING_TITLE_MAX_LENGTH } from '@/lib/need-intake/listing-title';
import { resolveDeterministicListingTitle } from '@/lib/need-intake/resolve-listing-title';
import {
  CANONICAL_CITIES,
  getCityBySlug,
  getProvinceBySlug,
} from '@/config/locations';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
import { finalizeListingTitle } from '@/lib/need-intake/listing-title-sanitize';
import { isGenericListingTitle } from '@/lib/need-intake/resolve-listing-title';
import { toMatchProjection } from '@/intake/projections/matchProjection';
import type { ProjectionMetadata } from '@/intake/projections/metadata';
import { buildProjectionMetadata } from '@/intake/projections/metadata';
import { flattenDraftAnswersForPublish } from '@/intake/projections/flatten-draft-answers-for-publish';
import { recordToEntities } from '@/intake/entities/entityRecord';
import { resolveTemplateFromDraftEntities } from '@/intake/template/resolveTemplate';

export interface PublishCommand {
  projection: ProjectionMetadata;
  title: string;
  description: string;
  categoryId: string;
  subcategoryId?: string | null;
  budgetMin?: number;
  budgetMax?: number;
  budgetType: 'FIXED' | 'HOURLY' | 'NEGOTIABLE';
  city?: string;
  province?: string;
  lat?: number;
  lng?: number;
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

function buildIntakeTitle(draft: NeedDraft): string {
  return resolveDeterministicListingTitle(draft).title;
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

export function toPublishCommand(
  draft: NeedDraft,
  categoryId: string,
  subcategoryId?: string | null
): PublishCommand {
  const projection = buildProjectionMetadata(draft, 1);
  const { parsedIntent: parsed, answers } = draftToLegacyPayload(draft);
  const matchProjection = toMatchProjection(draft);
  const budget = draft.listingPreview?.budgetMax || draft.listingPreview?.budgetMin
    ? { max: draft.listingPreview?.budgetMax, min: draft.listingPreview?.budgetMin }
    : answerBudget(answers, parsed);

  let description = draft.listingPreview?.description
    ? draft.listingPreview.description.trim()
    : String(answers.details ?? answers.serviceType ?? parsed.description ?? parsed.rawText).trim() || parsed.rawText;
  if (description.length < 30) {
    const extras = [
      parsed.city && `شهر: ${parsed.city}`,
      parsed.budgetMax && `بودجه تا ${parsed.budgetMax.toLocaleString('fa-IR')} تومان`,
      answers.when && `زمان: ${String(answers.when)}`,
    ].filter(Boolean);
    description = [description, ...extras].join('\n').trim() || parsed.rawText;
  }

  let title = draft.listingPreview?.title?.trim() || buildIntakeTitle(draft);
  title = finalizeListingTitle(title);
  if (title.length < 8 || isGenericListingTitle(title)) {
    title = finalizeListingTitle(buildIntakeTitle(draft));
  }
  if (title.length < 8) title = 'ثبت نیاز';

  const listingExtras = [
    ...(draft.listingPreview?.extras ?? []),
    ...(Array.isArray(answers.extras)
      ? (answers.extras as string[]).filter(Boolean)
      : typeof answers.extras === 'string' && answers.extras.trim()
        ? [answers.extras.trim()]
        : []),
  ].filter(Boolean);
  if (listingExtras.length > 0) {
    description = `${description.trim()}\n\n${listingExtras.map((e) => `• ${e}`).join('\n')}`.trim();
  }

  const { city, province } = resolveCityAndProvince(String(answers.location ?? ''), parsed.city);
  const entities = draft.entities as Record<string, unknown>;
  const neighborhoodSlug =
    typeof entities.neighborhoodSlug === 'string' ? entities.neighborhoodSlug.trim() : '';
  const lat =
    typeof entities.lat === 'number' && Number.isFinite(entities.lat) ? entities.lat : undefined;
  const lng =
    typeof entities.lng === 'number' && Number.isFinite(entities.lng) ? entities.lng : undefined;
  const flatAnswers = flattenDraftAnswersForPublish(draft);
  const tags: string[] = [parsed.intentType, parsed.categorySlug];
  if (parsed.subcategorySlug) tags.push(parsed.subcategorySlug);
  if (answers.condition) tags.push(String(answers.condition));
  if (answers.dealType) tags.push(String(answers.dealType));

  const neighborhoodName =
    typeof entities.neighborhood === 'string' ? entities.neighborhood.trim() : '';
  const locationLine =
    String(flatAnswers.location ?? answers.location ?? '').trim() ||
    (neighborhoodName && city
      ? `${neighborhoodName}، ${city}`
      : neighborhoodName || city || '');

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
    lat,
    lng,
    priority: mapUrgency(parsed, answers),
    tags,
    intentType: parsed.intentType,
    dynamicAnswers: {
      projection,
      templateId: draft.templateId,
      templateVersion: draft.templateVersion,
      rootSlug: resolveTemplateFromDraftEntities(recordToEntities(draft.entities)).rootSlug,
      sourceText: draft.sourceText,
      entities: draft.entities,
      ...flatAnswers,
      location: locationLine || flatAnswers.location || answers.location,
      ...(neighborhoodSlug ? { _neighborhoodSlug: neighborhoodSlug } : {}),
      ...(lat != null && lng != null ? { _mapLat: lat, _mapLng: lng } : {}),
    },
    aiExtractedData: {
      projection,
      model: 'need-draft-projection-v1',
      completionScore: draft.completionScore,
      matchability: matchProjection.analysis,
      categorySlug: parsed.categorySlug,
      subcategorySlug: parsed.subcategorySlug,
    },
    source: 'intake_chat',
  };
}
