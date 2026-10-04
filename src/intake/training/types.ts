import type { CategoryCandidateOption, MissingFieldItem } from '@/contracts/need-intake';
import type { FieldState } from '@/intake/intelligence-engine/types';
import type { PostIntakeEvent } from '@/intake/telemetry/postIntakeEvents';

/** Snapshot of AI/rules analyze at publish time (training flywheel). */
export interface IntakeAnalysisSnapshot {
  predictedAt: string;
  sourceText: string;
  normalizedText: string;
  intentGist?: string | null;
  intentGistProvider?: string | null;
  fieldMeta: Record<string, FieldState>;
  recommendedQuestions: string[];
  categoryCandidates?: CategoryCandidateOption[];
  cityCandidates?: Array<{ cityId: string; label: string; score?: number }>;
  missingFields: MissingFieldItem[];
  engine: string;
  aiInvoked: boolean;
  traceId?: string | null;
  truthVerification?: unknown;
}

export interface FieldCorrection {
  field: string;
  predicted: unknown;
  final: unknown;
  source: 'fieldMeta' | 'telemetry' | 'both';
}

export interface CorrectionResult {
  corrections: FieldCorrection[];
  correctionFields: string[];
  hasUserCorrections: boolean;
  correctedEntities: Record<string, unknown>;
  qualityFlags: string[];
}

export interface CaptureTrainingInput {
  /**
   * Server-verified explicit opt-in. Never derive this from an unchecked client
   * boolean; capture remains disabled when consent evidence is absent.
   */
  trainingConsent?: {
    grantedAt: string;
    policyVersion: string;
    actorUserId: string;
  };
  draft: {
    templateId: string;
    templateVersion?: number;
    sourceText?: string;
    entities: Record<string, unknown>;
    analysisSnapshot?: IntakeAnalysisSnapshot;
    intakeTrace?: unknown;
    fieldMeta?: Record<string, unknown>;
    parsedIntent?: Record<string, unknown>;
    listingPreview?: unknown;
    completionScore?: number;
    matchabilityScore?: number;
    leadPhone?: string;
  };
  serviceRequestId: string;
  sessionId?: string | null;
  telemetryEvents?: PostIntakeEvent[];
}

export type TrainingExportFormat = 'mlx-jsonl' | 'dataset-fixtures' | 'raw-jsonl';
