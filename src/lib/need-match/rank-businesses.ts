import type { MatchedBusinessItem, NeedMatchContext } from '@/contracts/need-match';
import { findCandidateBusinesses, toMatchedBusinessItems } from './candidate-query';

/** Deterministic business ranking — category, city, filters, distance. */
export async function matchBusinessesForNeed(
  need: NeedMatchContext,
  limit = 12
): Promise<{ businesses: MatchedBusinessItem[]; source: 'rules' }> {
  const candidates = await findCandidateBusinesses(need, 30);
  const ruleOrdered = toMatchedBusinessItems(candidates);
  return { businesses: ruleOrdered.slice(0, limit), source: 'rules' };
}
