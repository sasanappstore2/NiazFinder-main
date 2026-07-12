import type {
  DriftSignal,
  FieldStats,
  FunnelStats,
  SchemaSuggestion,
} from '@/intake/intelligence/types';

export interface SuggestionEngineInput {
  templateId: string;
  driftSignals: DriftSignal[];
  fieldStats: Record<string, FieldStats>;
  funnelStats: FunnelStats;
}

export function generateSuggestions(input: SuggestionEngineInput): SchemaSuggestion[] {
  const { templateId, driftSignals, fieldStats, funnelStats } = input;
  const suggestions: SchemaSuggestion[] = [];

  for (const signal of driftSignals) {
    if (signal.type === 'MISSING_FIELD') {
      const usage = fieldStats[signal.fieldKey]?.usageRate ?? 0;
      suggestions.push({
        type: 'ADD_FIELD',
        templateId,
        fieldKey: signal.fieldKey,
        description: `Add field '${signal.fieldKey}' to ${templateId} template`,
        confidence: Math.min(0.95, Math.max(0.05, usage)),
        evidence: [...signal.evidence],
      });
    }
    if (signal.type === 'DEAD_FIELD') {
      const usage = fieldStats[signal.fieldKey]?.usageRate ?? 0;
      suggestions.push({
        type: 'REMOVE_FIELD',
        templateId,
        fieldKey: signal.fieldKey,
        description: `Remove '${signal.fieldKey}' due to low usage (${(usage * 100).toFixed(1)}%)`,
        confidence: Math.min(0.95, Math.max(0.05, 1 - usage)),
        evidence: [...signal.evidence],
      });
    }
    if (signal.type === 'UX_MISMATCH') {
      const friction = fieldStats[signal.fieldKey]?.frictionScore ?? 0;
      if (friction >= 0.4) {
        suggestions.push({
          type: 'MOVE_FIELD',
          templateId,
          fieldKey: signal.fieldKey,
          description: `Move '${signal.fieldKey}' earlier in flow (high friction / validation errors)`,
          confidence: Math.min(0.9, friction),
          evidence: [...signal.evidence],
        });
      }
    }
  }

  if (funnelStats.bottleneckStep) {
    const rate = funnelStats.dropOffRates[funnelStats.bottleneckStep] ?? 0;
    if (rate >= 0.1) {
      suggestions.push({
        type: 'FLOW_OPTIMIZATION',
        templateId,
        description: `${funnelStats.bottleneckStep} step causes ${(rate * 100).toFixed(0)}% drop-off`,
        confidence: Math.min(0.95, rate),
        evidence: [
          `bottleneckStep=${funnelStats.bottleneckStep}`,
          `dropOffRate=${(rate * 100).toFixed(1)}%`,
        ],
      });
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}
