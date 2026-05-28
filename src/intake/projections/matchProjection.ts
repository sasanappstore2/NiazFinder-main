import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { computeMatchabilityScore } from '@/intake/scoring/matchabilityEngine';
import type { NeedDraft } from '@/contracts/need-intake';
import type { ProjectionMetadata } from '@/intake/projections/metadata';
import { buildProjectionMetadata } from '@/intake/projections/metadata';

export interface MatchabilityAnalysis {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface MatchProjection {
  projection: ProjectionMetadata;
  vertical: string | null;
  category: string | null;
  city: string | null;
  neighborhood: string | null;
  transactionType: string | null;
  budget: number | null;
  analysis: MatchabilityAnalysis;
}

function analyze(draft: NeedDraft): MatchabilityAnalysis {
  const entities = recordToEntities(draft.entities);
  const score = computeMatchabilityScore(entities);
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const checks: Array<[string, boolean]> = [
    ['category', Boolean(entities.categorySlug)],
    ['city', Boolean(entities.city)],
    ['neighborhood', Boolean(entities.neighborhood)],
    ['transactionType', Boolean(entities.transactionType)],
    ['budget', entities.budgetMin != null || entities.budgetMax != null],
  ];

  for (const [key, ok] of checks) {
    (ok ? strengths : weaknesses).push(key);
  }

  return {
    score,
    strengths,
    weaknesses,
    recommendations: [...weaknesses],
  };
}

export function toMatchProjection(draft: NeedDraft): MatchProjection {
  const entities = recordToEntities(draft.entities);
  return {
    projection: buildProjectionMetadata(draft, 1),
    vertical: entities.vertical,
    category: entities.category,
    city: entities.city,
    neighborhood: entities.neighborhood,
    transactionType: entities.transactionType,
    budget: entities.budgetMax ?? entities.budgetMin ?? null,
    analysis: analyze(draft),
  };
}
