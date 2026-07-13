/**
 * Need intake — form wizard contracts (`/post`).
 */

import type { NeedIntelligenceProfile } from '@/contracts/need-intelligence';
import type { IntakeAnalysisSnapshot } from '@/intake/training/types';
import type { IntakeAnalysisTrace } from '@/intake/types/analysis-trace';
import type {
  CompletionState,
  MissingFieldItem,
  WizardQuestion,
} from '@/intake/types';

export type { CompletionState, MissingFieldItem, WizardQuestion };

export interface NeedDraftSection {
  key: string;
  label: string;
  fields: string[];
}

export type IntentType =
  | 'service_request'
  | 'booking'
  | 'consultation'
  | 'product_search'
  | 'product_listing'
  | 'vehicle_search'
  | 'vehicle_listing'
  | 'vehicle_service'
  | 'property_search'
  | 'property_listing'
  | 'real_estate_service'
  | 'job_search'
  | 'help_request'
  | 'general';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'price'
  | 'price_range'
  | 'select'
  | 'multi_select'
  | 'chips'
  | 'date'
  | 'location'
  | 'category'
  | 'city'
  | 'neighborhood'
  | 'mapPin'
  | 'upload'
  | 'toggle'
  | 'slider';

export interface FieldOption {
  value: string;
  label: string;
}

/** Rule-ranked category options when intake text matches multiple slugs. */
export interface CategoryCandidateOption {
  slug: string;
  label: string;
  confidence: number;
  matchedRules?: string[];
}

export interface FieldSchema {
  key: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  options?: FieldOption[];
  /** Show when answers[field] equals value */
  showIf?: { field: string; equals: string };
  /** Show when answers[field] is one of values */
  showIfIn?: { field: string; values: string[] };
}

export interface IntentSchema {
  intentType: IntentType;
  label: string;
  fields: FieldSchema[];
}

export interface ParsedIntent {
  intentType: IntentType;
  categorySlug: string;
  subcategorySlug?: string;
  title?: string;
  description?: string;
  budgetMin?: number;
  budgetMax?: number;
  city?: string;
  province?: string;
  urgency?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  confidence: number;
  entities: Record<string, string>;
  rawText: string;
  /** Canonical neighborhood slug from admin-locations (e.g. abadgaran). */
  neighborhoodSlug?: string;
  /**
   * True when the area fragment matches several catalog neighborhoods and must not
   * auto-resolve to a single slug until the user picks one.
   */
  locationAmbiguous?: boolean;
  /** Top neighborhood options for disambiguation UI (same city as `city`). */
  neighborhoodCandidates?: Array<{ slug: string; label: string; city?: string }>;
  /** LRE status — cross-city / within-city resolution state. */
  locationResolutionStatus?:
    | 'resolved'
    | 'city_ambiguous'
    | 'neighborhood_ambiguous'
    | 'unresolved';
  /** When true, do not auto-confirm location from catalog match alone. */
  rejectLocationAutoConfirm?: boolean;
  /** Cross-city disambiguation options when city is ambiguous. */
  cityCandidates?: Array<{ cityId: string; label: string; score?: number }>;
  /** Rule-ranked category options when slug is ambiguous. */
  categoryCandidates?: CategoryCandidateOption[];
  /** MLX parse confidence (0–1) when from /v1/parse. */
  parseConfidence?: number;
  /** Inline listing from high-confidence parse JSON v2. */
  inlineListingTitle?: string;
  inlineListingDescription?: string;
  /** Intake field keys still needed (from question-engine). */
  missingFields?: string[];
  /** MLX / rules parse gaps for wizard chips (v2.1). */
  parseGaps?: Array<{
    id: string;
    kind?: 'missing' | 'contradictory' | 'uncertain';
    messageFa?: string;
    fieldKey?: string;
  }>;
}

export type IntakeStep =
  | 'compose'
  | 'need'
  | 'details'
  | 'location'
  | 'preview'
  | 'summary'
  | 'publishing'
  | 'done';

export interface ListingPreview {
  title: string;
  description: string;
  extras?: string[];
  budgetMin?: number;
  budgetMax?: number;
  /** How the title was generated (preview step). */
  titleSource?: 'qwen' | 'template';
  /** How the description was generated (preview step). */
  descriptionSource?: 'qwen' | 'template';
  /** Cached quality score 0–1 (phase 35.3). */
  qualityScore?: number;
}

/**
 * Canonical NeedDraft schema version (documented as v1.0).
 * Bump only with migration + golden tests — see docs/intake-schema-versions.md.
 */
export const NEED_DRAFT_SCHEMA_VERSION = 1 as const;

export type NeedDraftSchemaVersion = typeof NEED_DRAFT_SCHEMA_VERSION;

export interface NeedDraft {
  /** Canonical intake aggregate — single source of truth for wizard + publish. */
  id?: string;
  templateId: string;
  templateVersion: number;
  schemaVersion: number;
  vertical: string;
  category: string;
  entities: Record<string, unknown>;
  completionScore: number;
  matchabilityScore: number;
  completionState: CompletionState;
  sections: NeedDraftSection[];
  missingFields: MissingFieldItem[];
  nextQuestion?: WizardQuestion | null;
  sourceText: string;
  updatedAt: string;

  /**
   * @deprecated Derived read model — generated from `entities` via projection.
   * Do not write directly. Use `patchNeedDraftEntities()` instead.
   */
  parsedIntent: ParsedIntent;
  /**
   * @deprecated Derived read model — generated from `entities` via projection.
   * Do not write directly. Use `patchNeedDraftEntities()` instead.
   */
  answers: Record<string, string | number | boolean | string[]>;
  leadPhone?: string;
  listingPreview?: ListingPreview;
  /** Optional analyze session metadata for training flywheel. */
  intakeTrace?: IntakeAnalysisTrace;
  /** Snapshot of last analyze (AI/rules predictions) at publish time. */
  analysisSnapshot?: IntakeAnalysisSnapshot;
  /** Optional enrichment for listing copy (future / rules extraction). */
  intelligenceProfile?: NeedIntelligenceProfile;
  /** Per-field confidence + source from Intelligence Engine v1. */
  fieldMeta?: Record<string, { value: unknown; confidence: number; source: string; evidence?: string }>;
}

export interface PublishValidationError {
  field: string;
  message: string;
}

export interface PublishNeedValidationResponse {
  success: false;
  errors: PublishValidationError[];
}

export interface PreviewListingResponse {
  title: string;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  suggestedExtras?: string[];
  titleSource?: 'qwen' | 'template';
}

export interface NextQuestionResponse {
  done: boolean;
  question?: string;
  field?: FieldSchema;
  chips?: FieldOption[];
  /** When set, client should show option chips before continuing schema questions. */
  disambiguation?: {
    kind: 'neighborhood' | 'category';
    question: string;
    options: FieldOption[];
  };
  progress: { current: number; total: number };
}

export interface ParseIntentMeta {
  source?: 'rules' | 'llm' | 'hybrid';
  engine?: 'internal' | 'llm' | 'hybrid';
  vertical?: string;
  verticalScore?: number;
  verticalCertainty?: number;
  skipClarifying?: boolean;
  latencyMs?: number;
}

export interface ParseIntentResponse {
  parsed: ParsedIntent;
  suggestedChips: FieldOption[];
  assistantMessage: string;
  meta?: ParseIntentMeta;
}

export interface PublishNeedResponse {
  id: string;
  slug: string;
  title: string;
}
