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
}

export type IntakeStep =
  | 'idle'
  | 'parsing'
  | 'clarifying'
  | 'questioning'
  | 'summary'
  | 'publishing'
  | 'done';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface NeedDraft {
  parsedIntent: ParsedIntent;
  answers: Record<string, string | number | boolean | string[]>;
  turns: ConversationTurn[];
}

export interface NextQuestionResponse {
  done: boolean;
  question?: string;
  field?: FieldSchema;
  chips?: FieldOption[];
  progress: { current: number; total: number };
}

export interface ParseIntentMeta {
  source?: 'llm' | 'rules' | 'hybrid';
  aiEnabled?: boolean;
  vertical?: string;
  cacheHit?: boolean;
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
