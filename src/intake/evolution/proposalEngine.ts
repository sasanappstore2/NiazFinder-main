import { resolveTemplate } from '@/intake/template/resolveTemplate';
import type { SchemaInsights } from '@/intake/intelligence/types';
import type { ImpactEstimate, SchemaEvolutionProposal, SectionMoveSuggestion } from '@/intake/evolution/proposalTypes';

const ADD_FIELD_USAGE_THRESHOLD = 0.05;
const HIGH_INTENT_IMPORTANCE = 0.3;
const REMOVE_USAGE_THRESHOLD = 0.02;
const HIGH_FRICTION_THRESHOLD = 0.4;
const BOTTLENECK_DROP_THRESHOLD = 0.1;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function buildFieldSectionMap(
  categorySlug: string | null | undefined,
  templateId: string
): Map<string, string> {
  const template = resolveTemplate({
    categorySlug: categorySlug ?? templateId,
    subcategorySlug: categorySlug ?? undefined,
  });
  const map = new Map<string, string>();
  for (const section of template.sections) {
    for (const field of section.fields) {
      map.set(field, section.key);
    }
  }
  return map;
}

function firstSectionKey(fieldSectionMap: Map<string, string>): string | undefined {
  for (const key of fieldSectionMap.values()) {
    return key;
  }
  return undefined;
}

function proposalId(templateId: string, generatedAt: string): string {
  return `${templateId}-${generatedAt.replace(/[:.]/g, '-')}`;
}

/** Deterministic evolution proposal from SchemaInsights (read-only, no schema mutation). */
export function buildEvolutionProposal(insights: SchemaInsights): SchemaEvolutionProposal {
  const rationale: string[] = [];
  const suggestedFieldsToAdd: string[] = [];
  const suggestedFieldsToRemove: string[] = [];
  const suggestedSectionMoves: SectionMoveSuggestion[] = [];

  const categorySlug = insights.meta.categorySlug;
  const fieldSectionMap = buildFieldSectionMap(categorySlug, insights.templateId);
  const firstSection = firstSectionKey(fieldSectionMap);

  for (const signal of insights.driftSignals) {
    const stats = insights.fieldStats[signal.fieldKey];
    if (signal.type === 'MISSING_FIELD') {
      const usage = stats?.usageRate ?? 0;
      const importance = stats?.importanceScore ?? usage;
      if (usage >= ADD_FIELD_USAGE_THRESHOLD && importance >= HIGH_INTENT_IMPORTANCE) {
        suggestedFieldsToAdd.push(signal.fieldKey);
        rationale.push(
          `${signal.fieldKey} appears in ${(usage * 100).toFixed(0)}% of sessions (high-intent signal)`
        );
      } else if (usage >= ADD_FIELD_USAGE_THRESHOLD) {
        suggestedFieldsToAdd.push(signal.fieldKey);
        rationale.push(
          `${signal.fieldKey} appears in ${(usage * 100).toFixed(0)}% of sessions but is not in schema`
        );
      }
    }
    if (signal.type === 'DEAD_FIELD') {
      const usage = stats?.usageRate ?? 0;
      const importance = stats?.importanceScore ?? 0;
      if (usage < REMOVE_USAGE_THRESHOLD && importance < 0.15) {
        suggestedFieldsToRemove.push(signal.fieldKey);
        rationale.push(
          `${signal.fieldKey} has low usage (${(usage * 100).toFixed(1)}%) and low completion value`
        );
      }
    }
    if (signal.type === 'UX_MISMATCH') {
      const friction = stats?.frictionScore ?? 0;
      const from = fieldSectionMap.get(signal.fieldKey);
      if (friction >= HIGH_FRICTION_THRESHOLD && from && firstSection && from !== firstSection) {
        suggestedSectionMoves.push({
          field: signal.fieldKey,
          from,
          to: firstSection,
        });
        rationale.push(
          `${signal.fieldKey} has high friction (${(friction * 100).toFixed(0)}%) ? consider moving earlier`
        );
      }
    }
  }

  const bottleneck = insights.funnelStats.bottleneckStep;
  const bottleneckDrop = bottleneck ? (insights.funnelStats.dropOffRates[bottleneck] ?? 0) : 0;

  if (bottleneck && bottleneckDrop >= BOTTLENECK_DROP_THRESHOLD) {
    rationale.push(`${bottleneck} step causes ${(bottleneckDrop * 100).toFixed(0)}% drop-off`);

    if (bottleneck === 'location') {
      for (const field of ['city', 'neighborhood', 'mapPin']) {
        const from = fieldSectionMap.get(field);
        if (from && firstSection && from !== firstSection) {
          const exists = suggestedSectionMoves.some((m) => m.field === field);
          if (!exists) {
            suggestedSectionMoves.push({ field, from, to: firstSection });
          }
        }
      }
    }
  }

  for (const suggestion of insights.suggestions) {
    if (suggestion.type === 'MOVE_FIELD' && suggestion.fieldKey) {
      const from = fieldSectionMap.get(suggestion.fieldKey);
      if (from && firstSection && from !== firstSection) {
        const exists = suggestedSectionMoves.some((m) => m.field === suggestion.fieldKey);
        if (!exists) {
          suggestedSectionMoves.push({
            field: suggestion.fieldKey,
            from,
            to: firstSection,
          });
        }
      }
    }
  }

  const confidenceParts: number[] = [];
  if (suggestedFieldsToAdd.length > 0) {
    const avgUsage =
      suggestedFieldsToAdd.reduce(
        (sum, f) => sum + (insights.fieldStats[f]?.usageRate ?? 0),
        0
      ) / suggestedFieldsToAdd.length;
    confidenceParts.push(avgUsage);
  }
  if (bottleneckDrop > 0) confidenceParts.push(bottleneckDrop);
  if (suggestedFieldsToRemove.length > 0) confidenceParts.push(0.5);

  const confidenceScore =
    confidenceParts.length > 0
      ? clamp01(confidenceParts.reduce((a, b) => a + b, 0) / confidenceParts.length)
      : insights.meta.lowConfidence
        ? 0.2
        : 0.1;

  const impactEstimate: ImpactEstimate = {
    conversionLift: clamp01(
      (suggestedFieldsToAdd.length > 0 ? 0.05 : 0) +
        (bottleneckDrop > 0 ? bottleneckDrop * 0.3 : 0)
    ),
    dropoffReduction: clamp01(bottleneckDrop * 0.25),
    bottleneckStep: bottleneck,
  };

  const generatedAt = new Date().toISOString();

  return {
    id: proposalId(insights.templateId, generatedAt),
    templateId: insights.templateId,
    categorySlug,
    suggestedFieldsToAdd: [...new Set(suggestedFieldsToAdd)].sort(),
    suggestedFieldsToRemove: [...new Set(suggestedFieldsToRemove)].sort(),
    suggestedSectionMoves,
    rationale: [...new Set(rationale)],
    confidenceScore,
    impactEstimate,
    generatedAt,
    sourceInsightsRangeDays: insights.meta.sinceDays,
  };
}
