import type { PostIntakeWizardStep } from '@/intake/telemetry/postIntakeEvents';

export type FunnelStep = 'need' | 'details' | 'location' | 'preview';

export const FUNNEL_STEPS: readonly FunnelStep[] = [
  'need',
  'details',
  'location',
  'preview',
];

export interface FieldStats {
  usageRate: number;
  avgTimeSpent: number;
  errorRate: number;
  importanceScore: number;
  frictionScore: number;
  sessionTouchCount: number;
  changeCount: number;
}

export interface StepStats {
  avgDurationMs: number;
  backNavigationRate: number;
  sessionsReached: number;
  sessionsExited: number;
}

export interface FunnelStats {
  stepConversionRates: Record<string, number>;
  dropOffRates: Record<string, number>;
  bottleneckStep?: string;
}

export type DriftSignalType = 'MISSING_FIELD' | 'DEAD_FIELD' | 'UX_MISMATCH';
export type DriftSeverity = 'low' | 'medium' | 'high';

export interface DriftSignal {
  type: DriftSignalType;
  severity: DriftSeverity;
  fieldKey: string;
  templateId: string;
  evidence: string[];
}

export type SchemaSuggestionType =
  | 'ADD_FIELD'
  | 'REMOVE_FIELD'
  | 'MOVE_FIELD'
  | 'FLOW_OPTIMIZATION';

export interface SchemaSuggestion {
  type: SchemaSuggestionType;
  templateId: string;
  description: string;
  confidence: number;
  evidence: string[];
  fieldKey?: string;
}

export interface SchemaInsightsMeta {
  generatedAt: string;
  eventCount: number;
  sessionCount: number;
  categorySlug?: string | null;
  lowConfidence: boolean;
  sinceDays: number;
}

export interface SchemaInsights {
  templateId: string;
  fieldStats: Record<string, FieldStats>;
  stepStats: Record<string, StepStats>;
  funnelStats: FunnelStats;
  driftSignals: DriftSignal[];
  suggestions: SchemaSuggestion[];
  meta: SchemaInsightsMeta;
}

export interface AnalysisOptions {
  templateId: string;
  categorySlug?: string | null;
  minSessionCount?: number;
  sinceDays?: number;
}

export interface SessionFieldTouch {
  changes: number;
  totalTimeMs: number;
  corrections: number;
}

export interface AggregatedSession {
  sessionId: string;
  templateId: string;
  categorySlug?: string | null;
  stepsReached: Set<FunnelStep | PostIntakeWizardStep>;
  fieldsTouched: Map<string, SessionFieldTouch>;
  validationErrors: Map<string, number>;
  publishOutcome?: 'success' | 'fail';
  dropoffStep?: PostIntakeWizardStep;
  stepDurations: Map<PostIntakeWizardStep, number>;
  backNavigations: number;
  stepTransitions: number;
}

export interface SessionAggregationResult {
  sessions: AggregatedSession[];
  totalSessions: number;
  dropoffsByStep: Map<string, number>;
  globalFieldChanges: Map<string, number>;
  globalValidationErrors: Map<string, number>;
  missingRequiredFieldCounts: Map<string, number>;
}
