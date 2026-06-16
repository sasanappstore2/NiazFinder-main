import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import type { MissingFieldItem, TransactionType, WizardQuestion } from '@/intake/types';
import type { IntakeParseGap } from '@/lib/need-intake/intake-parse-schema';

export type FieldSource = 'rule' | 'dictionary' | 'resolver' | 'ai' | 'user' | 'form';

export interface FieldState<T = unknown> {
  value: T | null;
  confidence: number;
  source: FieldSource;
  lockedByUser?: boolean;
  evidence?: string;
}

export type IntakeFieldKey =
  | 'vertical'
  | 'categorySlug'
  | 'subcategorySlug'
  | 'transactionType'
  | 'dealType'
  | 'city'
  | 'citySlug'
  | 'province'
  | 'neighborhood'
  | 'neighborhoodSlug'
  | 'area'
  | 'rooms'
  | 'budgetMin'
  | 'budgetMax'
  | 'rahnAmount'
  | 'monthlyRent'
  | 'deposit'
  | 'propertyKind'
  | 'floorMin'
  | 'yearMin';

export type IntakeFieldBag = Record<IntakeFieldKey, FieldState>;

export interface IntakeIntelligenceInput {
  text: string;
  citySlug?: string | null;
  cityName?: string | null;
  formHints?: {
    categorySlug?: string;
    subcategorySlug?: string;
    city?: string;
    neighborhood?: string;
    categoryLockedByUser?: boolean;
  };
  forceAi?: boolean;
}

export interface IntakeIntelligenceStepTrace {
  name: string;
  latencyMs: number;
  resolver?: string;
  summary?: string;
}

export interface IntakeIntelligenceTrace {
  traceId: string;
  inputText: string;
  normalizedText: string;
  steps: IntakeIntelligenceStepTrace[];
  aiInvoked: boolean;
  aiProvider?: string | null;
  aiLatencyMs?: number;
  cacheHit?: boolean;
  fieldMeta: Record<string, FieldState>;
  /** AI truth verification pass ? corrected vs confirmed fields. */
  truthVerification?: {
    invoked: boolean;
    fieldsChecked: string[];
    corrected: string[];
    confirmed: string[];
    skipped: string[];
    latencyMs: number;
  };
}

export interface IntakeIntelligenceResult {
  fields: IntakeFieldBag;
  gaps: IntakeParseGap[];
  trace: IntakeIntelligenceTrace;
  draft: NeedDraft;
  missingFields: MissingFieldItem[];
  nextQuestion: WizardQuestion | null;
  recommendedQuestions: string[];
  parsedIntent: ParsedIntent;
  meta: {
    engine: 'intake-intelligence' | 'intake-intelligence+ai' | 'intake-intelligence+truth-verify';
    aiInvoked: boolean;
    latencyMs: number;
    truthVerifyCorrected?: string[];
  };
}

export function emptyFieldState<T = unknown>(defaults?: Partial<FieldState<T>>): FieldState<T> {
  return {
    value: defaults?.value ?? null,
    confidence: defaults?.confidence ?? 0,
    source: defaults?.source ?? 'rule',
    lockedByUser: defaults?.lockedByUser,
    evidence: defaults?.evidence,
  };
}

export function createEmptyFieldBag(): IntakeFieldBag {
  const keys: IntakeFieldKey[] = [
    'vertical',
    'categorySlug',
    'subcategorySlug',
    'transactionType',
    'dealType',
    'city',
    'citySlug',
    'province',
    'neighborhood',
    'neighborhoodSlug',
    'area',
    'rooms',
    'budgetMin',
    'budgetMax',
    'rahnAmount',
    'monthlyRent',
    'deposit',
    'propertyKind',
    'floorMin',
    'yearMin',
  ];
  return Object.fromEntries(keys.map((k) => [k, emptyFieldState()])) as IntakeFieldBag;
}

export function setField<T>(
  bag: IntakeFieldBag,
  key: IntakeFieldKey,
  patch: Partial<FieldState<T>> & { value?: T | null }
): void {
  const prev = bag[key];
  bag[key] = {
    ...prev,
    ...patch,
    value: patch.value !== undefined ? patch.value : prev.value,
  } as FieldState;
}

export function fieldBagToRecord(bag: IntakeFieldBag): Record<string, FieldState> {
  const out: Record<string, FieldState> = {};
  for (const [k, v] of Object.entries(bag)) {
    if (v.value != null && v.value !== '') out[k] = v;
  }
  return out;
}

export function isTransactionType(v: unknown): v is TransactionType {
  return (
    v === 'BUY' ||
    v === 'RENT' ||
    v === 'FULL_DEPOSIT' ||
    v === 'DEPOSIT_AND_RENT' ||
    v === 'DAILY_RENT' ||
    v === 'HOURLY_RENT' ||
    v === 'SELL'
  );
}
