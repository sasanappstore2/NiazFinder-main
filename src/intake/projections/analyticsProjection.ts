import type { NeedDraft } from '@/contracts/need-intake';
import { toMatchProjection } from '@/intake/projections/matchProjection';
import type { ProjectionMetadata } from '@/intake/projections/metadata';
import { buildProjectionMetadata } from '@/intake/projections/metadata';

export interface AnalyticsProjection {
  projection: ProjectionMetadata;
  needType: string;
  schemaVersion: number;
  completionScore: number;
  matchabilityScore: number;
  missingFields: string[];
  topWeakness?: string;
}

export function toAnalyticsProjection(draft: NeedDraft): AnalyticsProjection {
  const match = toMatchProjection(draft);
  return {
    projection: buildProjectionMetadata(draft, 1),
    needType: draft.needType,
    schemaVersion: draft.schemaVersion,
    completionScore: draft.completionScore,
    matchabilityScore: match.analysis.score,
    missingFields: draft.missingFields.map((f) => f.field),
    topWeakness: match.analysis.weaknesses[0],
  };
}
