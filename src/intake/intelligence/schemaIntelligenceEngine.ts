import type { PostIntakeEvent } from '@/intake/telemetry/postIntakeEvents';
import { resolveTemplate } from '@/intake/template/resolveTemplate';
import { aggregateSessions } from '@/intake/intelligence/sessionAggregator';
import { scoreFields } from '@/intake/intelligence/fieldScorer';
import { analyzeFunnel } from '@/intake/intelligence/funnelAnalyzer';
import { detectDrift } from '@/intake/intelligence/driftDetector';
import { generateSuggestions } from '@/intake/intelligence/suggestionEngine';
import type { AnalysisOptions, SchemaInsights } from '@/intake/intelligence/types';
import { buildEvolutionProposal } from '@/intake/evolution/proposalEngine';
import { rankProposals } from '@/intake/evolution/proposalRanker';
import { persistProposal } from '@/intake/evolution/proposalStore';
import type { SchemaEvolutionProposal } from '@/intake/evolution/proposalTypes';

const MIN_SESSION_COUNT = 10;

function emptyInsights(opts: AnalysisOptions, eventCount: number): SchemaInsights {
  const funnelSteps = ['need', 'details', 'location', 'preview'];
  const zeroRates = Object.fromEntries(funnelSteps.map((s) => [s, 0]));
  return {
    templateId: opts.templateId,
    fieldStats: {},
    stepStats: Object.fromEntries(
      funnelSteps.map((s) => [
        s,
        {
          avgDurationMs: 0,
          backNavigationRate: 0,
          sessionsReached: 0,
          sessionsExited: 0,
        },
      ])
    ),
    funnelStats: {
      stepConversionRates: { ...zeroRates },
      dropOffRates: { ...zeroRates },
    },
    driftSignals: [],
    suggestions: [],
    meta: {
      generatedAt: new Date().toISOString(),
      eventCount,
      sessionCount: 0,
      categorySlug: opts.categorySlug,
      lowConfidence: true,
      sinceDays: opts.sinceDays ?? 7,
    },
  };
}

function collectObservedFieldKeys(events: PostIntakeEvent[]): string[] {
  const keys = new Set<string>();
  for (const event of events) {
    if (event.type === 'field_change') keys.add(event.fieldKey);
  }
  return [...keys];
}

function schemaFieldKeyList(template: ReturnType<typeof resolveTemplate>): string[] {
  const keys = new Set<string>();
  for (const key of Object.keys(template.fieldMap)) keys.add(key);
  for (const section of template.sections) {
    for (const field of section.fields) keys.add(field);
  }
  return [...keys];
}

export function analyzeSchemaIntelligence(
  events: PostIntakeEvent[],
  opts: AnalysisOptions
): SchemaInsights {
  const filtered = events.filter((e) => e.templateId === opts.templateId);
  if (filtered.length === 0) {
    return emptyInsights(opts, 0);
  }

  const categorySlug = opts.categorySlug ?? filtered.find((e) => e.categorySlug)?.categorySlug;
  const template = resolveTemplate({
    categorySlug: categorySlug ?? opts.templateId,
    subcategorySlug: categorySlug ?? undefined,
  });

  const aggregation = aggregateSessions(filtered);
  const observedFieldKeys = collectObservedFieldKeys(filtered);
  const schemaKeys = schemaFieldKeyList(template);

  const fieldStats = scoreFields({
    aggregation,
    schemaFieldKeys: schemaKeys,
    observedFieldKeys,
  });

  const { funnelStats, stepStats } = analyzeFunnel(aggregation);

  const driftSignals = detectDrift({
    template: { ...template, id: opts.templateId },
    fieldStats,
    aggregation,
    observedFieldKeys,
  });

  const suggestions = generateSuggestions({
    templateId: opts.templateId,
    driftSignals,
    fieldStats,
    funnelStats,
  });

  const minSessions = opts.minSessionCount ?? MIN_SESSION_COUNT;

  return {
    templateId: opts.templateId,
    fieldStats,
    stepStats,
    funnelStats,
    driftSignals,
    suggestions,
    meta: {
      generatedAt: new Date().toISOString(),
      eventCount: filtered.length,
      sessionCount: aggregation.totalSessions,
      categorySlug,
      lowConfidence: aggregation.totalSessions < minSessions,
      sinceDays: opts.sinceDays ?? 7,
    },
  };
}

/**
 * Async evolution proposal from insights ? analysis only, never mutates templates.
 * Safe to call fire-and-forget; does not alter SchemaInsights.
 */
export async function generateSchemaEvolutionProposal(
  insights: SchemaInsights
): Promise<SchemaEvolutionProposal> {
  const proposal = buildEvolutionProposal(insights);
  const ranked = rankProposals([proposal])[0]!;
  persistProposal(ranked);
  return ranked;
}
