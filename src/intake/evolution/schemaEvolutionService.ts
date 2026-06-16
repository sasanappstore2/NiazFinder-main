import { getSchemaInsights } from '@/intake/intelligence/schemaInsightsService';
import { buildEvolutionProposal } from '@/intake/evolution/proposalEngine';
import { rankProposals } from '@/intake/evolution/proposalRanker';
import { getStoredProposals, persistProposal } from '@/intake/evolution/proposalStore';
import type { SchemaEvolutionProposalsResponse } from '@/intake/evolution/proposalTypes';

export interface GetSchemaEvolutionOptions {
  categorySlug?: string | null;
  sinceDays?: number;
  /** When true, generate a fresh proposal from current insights. */
  refresh?: boolean;
}

export async function getSchemaEvolutionProposals(
  templateId: string,
  opts: GetSchemaEvolutionOptions = {}
): Promise<SchemaEvolutionProposalsResponse> {
  const sinceDays = opts.sinceDays ?? 7;

  if (opts.refresh !== false) {
    const insights = await getSchemaInsights(templateId, {
      categorySlug: opts.categorySlug,
      sinceDays,
    });
    const proposal = buildEvolutionProposal(insights);
    const ranked = rankProposals([proposal])[0];
    if (ranked) {
      persistProposal(ranked);
    }
  }

  const proposals = rankProposals(getStoredProposals(templateId));
  const lastUpdated = proposals[0]?.generatedAt ?? new Date().toISOString();

  return {
    proposals,
    lastUpdated,
    sourceInsightsRange: `${sinceDays}d`,
  };
}
