import { loadPostIntakeEventsForAnalysis } from '@/intake/telemetry/postIntakeTelemetryReplayReader';
import { analyzeSchemaIntelligence } from '@/intake/intelligence/schemaIntelligenceEngine';
import type { AnalysisOptions, SchemaInsights } from '@/intake/intelligence/types';

export interface GetSchemaInsightsOptions {
  categorySlug?: string | null;
  sinceDays?: number;
  minSessionCount?: number;
}

export async function getSchemaInsights(
  templateId: string,
  opts: GetSchemaInsightsOptions = {}
): Promise<SchemaInsights> {
  const sinceDays = opts.sinceDays ?? 7;
  const events = await loadPostIntakeEventsForAnalysis({
    templateId,
    categorySlug: opts.categorySlug ?? undefined,
    sinceDays,
  });

  const analysisOpts: AnalysisOptions = {
    templateId,
    categorySlug: opts.categorySlug,
    sinceDays,
    minSessionCount: opts.minSessionCount,
  };

  return analyzeSchemaIntelligence(events, analysisOpts);
}
