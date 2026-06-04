import type { NeedDraft } from '@/contracts/need-intake';
import type { Priority } from '@prisma/client';
import { LISTING_TITLE_MAX_LENGTH } from '@/lib/need-intake/listing-title';
import { isGenericListingTitle, buildVerticalTitleFromDraft } from '@/lib/need-intake/vertical-title';
import {
  CANONICAL_CITIES,
  getCityBySlug,
  getProvinceBySlug,
} from '@/config/locations';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
import { truncateListingTitle } from '@/lib/need-intake/listing-title-sanitize';
import { toMatchProjection } from '@/intake/projections/matchProjection';
import type { ProjectionMetadata } from '@/intake/projections/metadata';
import { buildProjectionMetadata } from '@/intake/projections/metadata';

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
  const { parsedIntent: parsed } = draftToLegacyPayload(draft);
  const existing = parsed.title?.trim();
  if (
    existing &&
    existing.length >= 8 &&
    existing !== 'ثبت نیاز' &&
    !isGenericListingTitle(existing)
  ) {
    return existing.slice(0, LISTING_TITLE_MAX_LENGTH);
  }
  return buildVerticalTitleFromDraft(draft);
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
  title = truncateListingTitle(title);
  if (title.length < 8 || isGenericListingTitle(title)) {
    title = truncateListingTitle(buildIntakeTitle(draft));
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
  const tags: string[] = [parsed.intentType, parsed.categorySlug];
  if (parsed.subcategorySlug) tags.push(parsed.subcategorySlug);
  if (answers.condition) tags.push(String(answers.condition));
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
    dynamicAnswers: {
      projection,
      needType: draft.needType,
      schemaVersion: draft.schemaVersion,
      sourceText: draft.sourceText,
      entities: draft.entities,
      location: answers.location,
      details: answers.details,
      rooms: answers.rooms,
      familyCount: answers.familyCount,
      amenities: answers.amenities,
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
