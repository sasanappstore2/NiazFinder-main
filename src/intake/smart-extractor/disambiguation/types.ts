export interface NeighborhoodCandidate {
  name: string;
  id: string;
  confidence: number;
  matchReason: 'exact' | 'sub_area' | 'street_reference' | 'fuzzy';
  /** e.g. "خیابان فردوسی" vs "محله فردوسی" */
  context?: string;
  lat?: number;
  lng?: number;
}

export interface DisambiguationResult {
  needsDisambiguation: boolean;
  candidates: NeighborhoodCandidate[];
  selectedId?: string | null;
  selectedName?: string | null;
}

export interface DisambiguateNeighborhoodInput {
  phrase: string;
  rawText?: string;
  cityName?: string | null;
  citySlug?: string | null;
}
