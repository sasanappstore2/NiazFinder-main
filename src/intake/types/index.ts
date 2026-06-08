/** Transaction intent detected from Persian free text. */
export type TransactionType =
  | 'BUY'
  | 'RENT'
  | 'FULL_DEPOSIT'
  | 'DEPOSIT_AND_RENT'
  | 'DAILY_RENT'
  | 'HOURLY_RENT'
  | 'SELL';

/** Structured entities extracted from user text. */
export interface IntakeEntities {
  /** Root domain/vertical, e.g. `real-estate`, `services`, `vehicles`. */
  vertical: string | null;
  /** Simplified category key, e.g. `apartment`, `villa`, `plumbing`. */
  category: string | null;
  /** Canonical need category slug from registry. */
  categorySlug: string | null;
  subcategorySlug: string | null;
  city: string | null;
  citySlug: string | null;
  province: string | null;
  neighborhood: string | null;
  neighborhoodSlug: string | null;
  area: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  rooms: number | null;
  transactionType: TransactionType | null;
  /** Map pin from intake location picker. */
  lat?: number | null;
  lng?: number | null;
}

/** Per-field confidence scores in [0, 1]. */
export type IntakeConfidence = Partial<
  Record<
    | 'category'
    | 'city'
    | 'neighborhood'
    | 'area'
    | 'budget'
    | 'rooms'
    | 'transactionType',
    number
  >
>;

export type WizardFieldType = 'singleChoice' | 'text' | 'number' | 'location';

export interface WizardQuestionOption {
  value: string;
  label: string;
}

export interface WizardQuestion {
  field: string;
  type: WizardFieldType;
  label: string;
  options?: WizardQuestionOption[];
  required?: boolean;
}

export interface MissingFieldItem {
  field: string;
  priority: number;
  required: boolean;
}

export type CompletionState =
  | 'VERY_INCOMPLETE'
  | 'NEEDS_INFO'
  | 'ALMOST_READY'
  | 'READY_TO_PUBLISH';

/** LRE metadata returned from analyze (server-side location resolution). */
export interface IntakeLocationHints {
  locationAmbiguous?: boolean;
  neighborhoodSlug?: string;
  neighborhoodCandidates?: Array<{ slug: string; label: string; city?: string }>;
  cityCandidates?: Array<{ cityId: string; label: string }>;
  locationResolutionStatus?: string;
  rejectLocationAutoConfirm?: boolean;
  areaLabel?: string;
}

/** Full analysis output from the intake engine. */
export interface IntakeAnalysisResult {
  entities: IntakeEntities;
  confidence: IntakeConfidence;
  needType: string;
  detectedVertical: string | null;
  detectedCategory: string | null;
  /** Sorted by priority desc, ready for wizard/question planners. */
  missingFields: MissingFieldItem[];
  nextQuestion: WizardQuestion | null;
  /** Convenience array derived from missingFields (field names only). */
  recommendedQuestions: string[];
  completionScore: number;
  matchabilityScore: number;
  completionState: CompletionState;
  sections: Array<{ key: string; label: string; fields: string[] }>;
  /** Normalized input text (for debugging). */
  normalizedText: string;
  /** Analysis latency in milliseconds. */
  latencyMs: number;
  /** Server LRE hints for ambiguous neighborhood/city (optional). */
  locationHints?: IntakeLocationHints;
}

/** Swappable matcher contract — future Aho-Corasick implementations use this. */
export interface MatchHit<TEntry> {
  entry: TEntry;
  matchedText: string;
  score: number;
  matchType: 'exact' | 'alias' | 'ngram' | 'token';
}

export interface DictionaryMatcher<TEntry> {
  match(tokens: readonly string[], ngrams: readonly string[]): MatchHit<TEntry>[];
}

export interface CategoryIndexEntry {
  slug: string;
  simplifiedKey: string;
  title: string;
  synonyms: readonly string[];
}

export interface CityIndexEntry {
  id: string;
  slug: string;
  name: string;
  provinceName: string;
}

export interface NeighborhoodIndexEntry {
  slug: string;
  name: string;
  cityId: string;
  cityName: string;
  aliases: readonly string[];
}

export interface IntakeIndexes {
  categories: Map<string, CategoryIndexEntry>;
  /** normalized synonym/phrase → category slug */
  categoryLookup: Map<string, string>;
  cities: Map<string, CityIndexEntry>;
  /** normalized city name → city id */
  cityLookup: Map<string, string>;
  neighborhoods: Map<string, NeighborhoodIndexEntry>;
  /** normalized phrase → neighborhood slug (may map to multiple — resolved by city) */
  neighborhoodLookup: Map<string, string[]>;
  loadedAt: number;
  stats: {
    categories: number;
    cities: number;
    neighborhoods: number;
    synonyms: number;
  };
}
