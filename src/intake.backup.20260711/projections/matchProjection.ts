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
  /** Estate match signals from dynamic answers (non-canonical). */
  estateSignals: {
    area: number | null;
    rooms: number | null;
    rahnAmount: number | null;
    monthlyRent: number | null;
    deposit: number | null;
    parkingCount: string | number | null;
    buildingAge: string | number | null;
    deedType: string | null;
    amenities: unknown;
  };
  analysis: MatchabilityAnalysis;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
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
  const answers = draft.answers as Record<string, unknown>;
  return {
    projection: buildProjectionMetadata(draft, 1),
    vertical: entities.vertical,
    category: entities.category,
    city: entities.city,
    neighborhood: entities.neighborhood,
    transactionType: entities.transactionType,
    budget: entities.budgetMax ?? entities.budgetMin ?? null,
    estateSignals: {
      area: asFiniteNumber(entities.area ?? answers.areaMin ?? answers.area),
      rooms: asFiniteNumber(entities.rooms ?? answers.rooms),
      rahnAmount: asFiniteNumber(answers.rahnAmount ?? entities.rahnAmount),
      monthlyRent: asFiniteNumber(answers.monthlyRent ?? entities.monthlyRent),
      deposit: asFiniteNumber(answers.deposit ?? entities.deposit),
      parkingCount: (answers.parkingCount as string | number | null) ?? null,
      buildingAge: (answers.buildingAge as string | number | null) ?? answers.yearMin ?? null,
      deedType: typeof answers.deedType === 'string' ? answers.deedType : null,
      amenities: answers.amenities ?? null,
    },
    analysis: analyze(draft),
  };
}
