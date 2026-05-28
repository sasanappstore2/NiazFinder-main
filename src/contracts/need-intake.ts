/**
 * Need intake — conversational posting contracts.
 */

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
  | 'upload'
  | 'toggle'
  | 'slider';

export interface FieldOption {
  value: string;
  label: string;
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
  neighborhoodCandidates?: Array<{ slug: string; label: string }>;
  /** Intake field keys still needed (from question-engine). */
  missingFields?: string[];
}

export type IntakeStep =
  | 'idle'
  | 'parsing'
  | 'clarifying'
  | 'questioning'
  | 'chatting'
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
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface NeedDraft {
  parsedIntent: ParsedIntent;
  answers: Record<string, string | number | boolean | string[]>;
  turns: ConversationTurn[];
  leadPhone?: string;
  listingPreview?: ListingPreview;
}

export interface ChatTurnResponse {
  assistantMessage: string;
  slotUpdates?: Record<string, unknown>;
  readinessScore: number;
  readyToPreview: boolean;
  suggestedChips?: FieldOption[];
}

export interface PreviewListingResponse {
  title: string;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  suggestedExtras?: string[];
}

export interface NextQuestionResponse {
  done: boolean;
  question?: string;
  field?: FieldSchema;
  chips?: FieldOption[];
  /** When set, client should show option chips before continuing schema questions. */
  disambiguation?: {
    kind: 'neighborhood';
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
