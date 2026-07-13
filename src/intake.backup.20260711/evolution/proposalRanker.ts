import type { SchemaEvolutionProposal } from '@/intake/evolution/proposalTypes';

const SEVERITY_WEIGHT = {
  dropoff: 0.35,
  fieldGap: 0.3,
  uxMismatch: 0.25,
  confidence: 0.1,
} as const;

function rankScore(proposal: SchemaEvolutionProposal): number {
  const dropoffImpact = proposal.impactEstimate.dropoffReduction;
  const fieldGap =
    proposal.suggestedFieldsToAdd.length * 0.15 +
    proposal.suggestedFieldsToRemove.length * 0.05;
  const uxMoves = proposal.suggestedSectionMoves.length * 0.12;
  const confidence = proposal.confidenceScore;

  return (
    dropoffImpact * SEVERITY_WEIGHT.dropoff +
    Math.min(1, fieldGap) * SEVERITY_WEIGHT.fieldGap +
    Math.min(1, uxMoves) * SEVERITY_WEIGHT.uxMismatch +
    confidence * SEVERITY_WEIGHT.confidence
  );
}

/** Rank proposals by impact — does not mutate schema or proposals in place. */
export function rankProposals(
  proposals: readonly SchemaEvolutionProposal[]
): SchemaEvolutionProposal[] {
  return [...proposals]
    .map((p) => ({
      ...p,
      rankScore: rankScore(p),
    }))
    .sort((a, b) => {
      const diff = (b.rankScore ?? 0) - (a.rankScore ?? 0);
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });
}
