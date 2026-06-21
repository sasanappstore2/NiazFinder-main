export type RuleKind =
  | 'phrase'
  | 'keyword'
  | 'regex'
  | 'brand'
  | 'model'
  | 'scenario'
  | 'negative'
  | 'deal'
  | 'title';

export interface IntakeRule {
  id: string;
  kind: RuleKind;
  /** Canonical category slug this rule targets. */
  slug: string;
  /** Match pattern: phrase/keyword text, regex source, or brand name. */
  pattern: string;
  weight?: number;
  priority?: number;
  /** Fields to set when matched (brand, condition, dealType, ...). */
  set?: Record<string, string | number>;
  /** For negative rules: block match when text contains any of these. */
  unless?: string[];
  /** Optional title subject template with {brand} {model} {condition}. */
  titleTemplate?: string;
}

export interface RulePackMeta {
  slug: string;
  version: number;
  ruleCount: number;
  requiredFields?: string[];
  optionalFields?: string[];
  brandDictionary?: string[];
  titleTemplates?: string[];
  exclusions?: Array<{ pattern: string; unless: string[] }>;
}

export interface RulePack {
  meta: RulePackMeta;
  rules: IntakeRule[];
}

export interface CategoryMatchCandidate {
  slug: string;
  score: number;
  confidence: number;
  matchedRules: string[];
  source: 'registry' | 'semantic';
}

export interface CategoryMatchResult {
  categorySlug: string;
  subcategorySlug?: string;
  confidence: number;
  score: number;
  matchedRules: string[];
  brand?: string;
  model?: string;
  condition?: string;
  titleSubject?: string;
}

export interface ExtractedRuleFields {
  brand?: string;
  model?: string;
  condition?: string;
  dealType?: string;
  titleSubject?: string;
}
