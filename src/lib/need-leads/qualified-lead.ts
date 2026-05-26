import type { MatchedBusinessItem } from '@/contracts/need-match';

export interface QualifiedLead extends MatchedBusinessItem {
  qualifyScore: number;
  qualifyReasonFa: string;
}
