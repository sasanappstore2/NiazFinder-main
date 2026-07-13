import type { NeedDraft } from '@/contracts/need-intake';
import { toMatchProjection } from '@/intake/projections/matchProjection';
import type { ProjectionMetadata } from '@/intake/projections/metadata';
import { buildProjectionMetadata } from '@/intake/projections/metadata';
import { resolveTemplateFromDraftEntities } from '@/intake/template/resolveTemplate';
import { getAnalyticsSegment } from '@/intake/template/analyticsSegment';
import { recordToEntities } from '@/intake/entities/entityRecord';

export interface AnalyticsProjection {
  projection: ProjectionMetadata;
  templateId: string;
  templateVersion: number;
  rootSlug: string;
  categoryPath: readonly string[];
  schemaVersion: number;
  completionScore: number;
  matchabilityScore: number;
  missingFields: string[];
  topWeakness?: string;
}

export function toAnalyticsProjection(draft: NeedDraft): AnalyticsProjection {
  const match = toMatchProjection(draft);
  const template = resolveTemplateFromDraftEntities(recordToEntities(draft.entities));
  const segment = getAnalyticsSegment(template);
  return {
    projection: buildProjectionMetadata(draft, 1),
    templateId: draft.templateId,
    templateVersion: draft.templateVersion,
    rootSlug: segment.rootSlug,
    categoryPath: segment.categoryPath,
    schemaVersion: draft.schemaVersion,
    completionScore: draft.completionScore,
    matchabilityScore: match.analysis.score,
    missingFields: draft.missingFields.map((f) => f.field),
    topWeakness: match.analysis.weaknesses[0],
  };
}
