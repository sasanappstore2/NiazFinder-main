/**
 * Phase 48.2 ? load ServiceRequest ? NeedDraft for edit wizard.
 */
import {
  NEED_DRAFT_SCHEMA_VERSION,
  type ListingPreview,
  type NeedDraft,
} from '@/contracts/need-intake';
import { recomputeNeedDraft } from '@/intake/aggregate/needDraftAggregate';
import type { ServiceRequestV2 } from '@/intake/projections/serviceRequestV2';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';

export interface MappedIntakeEditPayload {
  requestId: string;
  slug: string;
  draft: NeedDraft;
  listingPreview: ListingPreview;
}

export function parseServiceRequestDynamicAnswers(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toBudget(n: bigint | number | null | undefined): number | null {
  if (n == null) return null;
  const v = typeof n === 'bigint' ? Number(n) : n;
  return Number.isFinite(v) ? v : null;
}

export function mapServiceRequestToNeedDraft(row: {
  id: string;
  slug: string;
  title: string;
  description: string;
  budgetMin?: bigint | number | null;
  budgetMax?: bigint | number | null;
  city?: string | null;
  province?: string | null;
  lat?: number | null;
  lng?: number | null;
  intentType?: string | null;
  dynamicAnswers: string;
  category?: { slug: string; name?: string } | null;
  subcategory?: { slug: string } | null;
}): MappedIntakeEditPayload {
  const dynamic = parseServiceRequestDynamicAnswers(row.dynamicAnswers);
  const v2 = dynamic.serviceRequestV2 as ServiceRequestV2 | undefined;
  const budgetMin = toBudget(row.budgetMin);
  const budgetMax = toBudget(row.budgetMax);

  const entities: Record<string, unknown> = v2?.entities ? { ...v2.entities } : {};
  if (!v2?.entities) {
    if (row.city) entities.city = row.city;
    if (row.province) entities.province = row.province;
    if (row.lat != null) entities.lat = row.lat;
    if (row.lng != null) entities.lng = row.lng;
    const catSlug = row.subcategory?.slug ?? row.category?.slug;
    if (catSlug) entities.categorySlug = catSlug;
    if (row.intentType) entities.intentType = row.intentType;
  }

  const sourceText =
    (typeof dynamic.sourceText === 'string' && dynamic.sourceText.trim()) ||
    row.description ||
    row.title;

  const rawAnswers =
    (dynamic.answers as Record<string, string | number | boolean | string[]>) ?? {};
  const answers: Record<string, string | number | boolean | string[]> = { ...rawAnswers };
  if (!answers.location && entities.neighborhood && entities.city) {
    answers.location = `${entities.neighborhood}، ${entities.city}`;
  } else if (!answers.location && entities.city) {
    answers.location = String(entities.city);
  }
  if (dynamic.dealType && answers.dealType == null) {
    answers.dealType = String(dynamic.dealType);
  }

  const listingPreview: ListingPreview = {
    title: row.title,
    description: row.description,
    budgetMin: budgetMin ?? undefined,
    budgetMax: budgetMax ?? undefined,
  };

  const draftBase: NeedDraft = {
    id: row.id,
    needType: v2?.needType ?? 'general-seeking',
    schemaVersion: v2?.schemaVersion ?? NEED_DRAFT_SCHEMA_VERSION,
    vertical: v2?.vertical ?? 'general',
    category: v2?.category ?? row.category?.slug ?? 'general',
    entities,
    completionScore: v2?.completionScore ?? 0.6,
    matchabilityScore: v2?.matchabilityScore ?? 0.6,
    completionState: 'ALMOST_READY',
    sections: [],
    missingFields: [],
    sourceText,
    updatedAt: new Date().toISOString(),
    parsedIntent: parseIntentFromText(sourceText),
    answers: answers as Record<string, string | number | boolean | string[]>,
    turns: [],
    listingPreview,
  };

  return {
    requestId: row.id,
    slug: row.slug,
    draft: recomputeNeedDraft(draftBase),
    listingPreview,
  };
}
