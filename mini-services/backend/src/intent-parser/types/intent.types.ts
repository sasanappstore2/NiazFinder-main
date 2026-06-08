export type SourceType = 'llm' | 'embedding' | 'rule';

export interface LocationMatch {
  id: string;
  name: string;
  type: 'province' | 'city' | 'neighborhood';
  parentId?: string;
  confidence: number;
}

export interface LocationResult {
  province?: LocationMatch;
  city?: LocationMatch;
  neighborhood?: LocationMatch;
  confidence: number;
  extractedTokens: string[];
}

export interface ClassifierResult {
  source: SourceType;
  categoryId: string;
  confidence: number;
  alternatives: { id: string; confidence: number }[];
}

export interface AggregatedCategory {
  categoryId: string;
  finalConfidence: number;
  contributions: {
    source: SourceType;
    confidence: number;
    weight: number;
  }[];
}

export interface ParsedIntent {
  raw: string;
  cleanedText: string;
  category: {
    id: string;
    name: string;
    confidence: number;
    contributions: AggregatedCategory['contributions'];
  };
  location: LocationResult;
  overallConfidence: number;
  requiresConfirmation: boolean;
  alternatives: {
    categories: { id: string; name: string; confidence: number }[];
  };
}
