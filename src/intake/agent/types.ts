/**
 * Intake Agent — product-facing structured understanding schema.
 * Same shape for Mode A (LLM+rules) and Mode B (rules-only).
 * Category-agnostic: works for real-estate, services, products, jobs, vehicles, …
 */

import type { NeedDraft, CategoryCandidateOption } from '@/contracts/need-intake';
import type { IntakeAnalysisMode } from '@/lib/intake/rules-only-mode';
import type { FieldState } from '@/intake/intelligence-engine/types';
import type { IntakeParseGap } from '@/lib/need-intake/intake-parse-schema';
import type { MissingFieldItem } from '@/intake/types';

/** How the UI should treat a projected field. */
export type IntakeFieldAction = 'auto_accept' | 'confirm' | 'ask';

export interface IntakeAgentLocation {
  city: string | null;
  citySlug: string | null;
  neighborhood: string | null;
  neighborhoodSlug: string | null;
  province: string | null;
}

export interface IntakeAgentFieldProjection {
  key: string;
  label: string;
  value: unknown;
  displayValue: string;
  confidence: number;
  source: FieldState['source'];
  action: IntakeFieldAction;
}

export interface IntakeAgentSuggestedQuestion {
  fieldKey: string;
  questionFa: string;
  reason: 'missing' | 'low_confidence' | 'ambiguous' | 'incompatible';
}

export interface IntakeAgentWarning {
  code: string;
  messageFa: string;
  fieldKey?: string;
}

/**
 * Canonical agent output — UI + draft merge consume this, not raw engine bags.
 */
export interface IntakeAgentResult {
  schemaVersion: 1;
  analysisMode: IntakeAnalysisMode;
  aiInvoked: boolean;
  /** Overall understanding confidence 0–1. */
  confidence: number;
  /** Headline for verification card. */
  title: string;
  /** Short human summary (gist or synthesized). */
  description: string;
  vertical: string | null;
  categorySlug: string | null;
  subcategorySlug: string | null;
  categoryLabel: string | null;
  location: IntakeAgentLocation;
  /** Dynamic extracted fields (not RE-only). */
  fields: IntakeAgentFieldProjection[];
  extractedEntities: Record<string, unknown>;
  missingFields: MissingFieldItem[];
  warnings: IntakeAgentWarning[];
  suggestedQuestions: IntakeAgentSuggestedQuestion[];
  categoryCandidates?: CategoryCandidateOption[];
  gaps: IntakeParseGap[];
  /** Underlying draft SoT (unchanged aggregate). */
  draft: NeedDraft;
  fieldMeta: Record<string, FieldState>;
  latencyMs: number;
  engine: string;
}

export interface IntakeUserCorrection {
  fieldKey: string;
  value: unknown;
  /** Optional secondary keys (e.g. neighborhoodSlug with neighborhood). */
  extras?: Record<string, unknown>;
}
