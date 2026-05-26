import type { NeedMatchContext } from '@/contracts/need-match';
import { matchBusinessesForNeed } from '@/lib/need-match/rank-businesses';
import { getLeadMinMatchScore } from './env';
import { qualifyLeadsWithLlm, type QualifiedLead } from './llm-qualify-outreach';

export async function qualifyBusinessesForOutreach(
  need: NeedMatchContext
): Promise<QualifiedLead[]> {
  const minScore = getLeadMinMatchScore();
  const { businesses } = await matchBusinessesForNeed(need, 20);

  const aboveThreshold = businesses.filter((b) => b.matchScore >= minScore);
  const qualified = await qualifyLeadsWithLlm(need, aboveThreshold);

  if (qualified.length > 0) return qualified;

  return aboveThreshold.map((c) => ({
    ...c,
    qualifyScore: c.matchScore,
    qualifyReasonFa: c.matchReasonFa,
  }));
}
