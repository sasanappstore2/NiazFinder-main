import type { IntakeDomain } from '@prisma/client';

export type IntakeIntent = IntakeDomain | 'UNKNOWN';

export type CategoryRouteHit = {
  id: string;
  domain: IntakeDomain;
  slug: string;
  parentSlug: string | null;
  title: string;
  depth: number;
  categoryId: string | null;
  description: string;
  semanticPath: string | null;
  technicalConstraints: Record<string, unknown>;
  ruleCount: number;
  score: number;
};

export type IntakeRuleHit = {
  id: string;
  ruleKey: string;
  ruleKind: string;
  pattern: string;
  bundleType: string;
  description: string;
  technicalConstraints: Record<string, unknown>;
  categorySlug: string;
  score: number;
};

export type IntakeRulesBundle = {
  domain: IntakeDomain;
  categorySlug: string;
  categoryId: string | null;
  title: string;
  description: string;
  technicalConstraints: Record<string, unknown>;
  requirementRules: IntakeRuleHit[];
  matchRulesSample: IntakeRuleHit[];
};

export type ValidateIntakeInput = {
  domain: IntakeDomain;
  categorySlug: string;
  data: Record<string, unknown>;
};

export type ValidateIntakeResult = {
  valid: boolean;
  missing: string[];
  errors: Array<{ field: string; message: string }>;
  normalized: Record<string, unknown>;
  filledDefaults: Record<string, unknown>;
};

export type TechnicalConstraints = {
  requiredFields?: string[];
  optionalFields?: string[];
  brandDictionary?: string[];
  exclusions?: Array<{ pattern: string; unless: string[] }>;
  fieldTypes?: Record<string, string>;
  validators?: Record<string, string[]>;
  kind?: string;
  pattern?: string;
  set?: Record<string, string | number>;
  unless?: string[];
  titleTemplate?: string;
};
