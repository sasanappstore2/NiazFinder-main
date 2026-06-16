export interface SectionMoveSuggestion {
  field: string;
  from: string;
  to: string;
}

export interface ImpactEstimate {
  /** Estimated conversion lift if proposal applied (0?1 heuristic). */
  conversionLift: number;
  /** Estimated drop-off reduction at bottleneck step (0?1). */
  dropoffReduction: number;
  bottleneckStep?: string;
}

export interface SchemaEvolutionProposal {
  id: string;
  templateId: string;
  categorySlug?: string | null;
  suggestedFieldsToAdd: string[];
  suggestedFieldsToRemove: string[];
  suggestedSectionMoves: SectionMoveSuggestion[];
  rationale: string[];
  confidenceScore: number;
  impactEstimate: ImpactEstimate;
  generatedAt: string;
  sourceInsightsRangeDays: number;
  rankScore?: number;
}

export interface SchemaEvolutionProposalsResponse {
  proposals: SchemaEvolutionProposal[];
  lastUpdated: string;
  sourceInsightsRange: string;
}
