import type { NeedMatchContext } from '@/contracts/need-match';
import { matchBusinessesForNeed } from '@/lib/need-match/rank-businesses';
import { getLeadMinMatchScore } from './env';
import type { QualifiedLead } from './qualified-lead';

/** Qualify businesses for outreach by match score threshold — no LLM. */
export async function qualifyBusinessesForOutreach(
  need: NeedMatchContext
): Promise<QualifiedLead[]> {
  const minScore = getLeadMinMatchScore();
  const { businesses } = await matchBusinessesForNeed(need, 20);

  return businesses
    .filter((b) => b.matchScore >= minScore)
    .map((c) => ({
      ...c,
      qualifyScore: c.matchScore,
      qualifyReasonFa: c.matchReasonFa,
    }));
}
