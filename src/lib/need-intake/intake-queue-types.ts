/** Phase 46 ? intake async job queue types. */

export const INTAKE_JOB_ANALYZE = 'intake.analyze' as const;
export const INTAKE_JOB_LISTING_COPY = 'intake.listing-copy' as const;
export const INTAKE_JOB_ASSESS = 'intake.assess' as const;
export const INTAKE_JOB_ASSESS_ENRICH = 'intake.assess-enrich' as const;

export type IntakeQueueJobName =
  | typeof INTAKE_JOB_ANALYZE
  | typeof INTAKE_JOB_LISTING_COPY
  | typeof INTAKE_JOB_ASSESS
  | typeof INTAKE_JOB_ASSESS_ENRICH;

export type IntakeQueueJobStatus = 'queued' | 'active' | 'completed' | 'failed' | 'dead_letter';

export interface IntakeAnalyzeJobPayload {
  text: string;
  citySlug?: string;
  cityName?: string;
  formHints?: {
    categorySlug?: string;
    subcategorySlug?: string;
    city?: string;
    neighborhood?: string;
    categoryLockedByUser?: boolean;
  };
  fastParse?: boolean;
  forceAi?: boolean;
  enrich?: boolean;
}

export interface IntakeListingCopyJobPayload {
  draft: Record<string, unknown>;
  extras?: string[];
}

export interface IntakeAssessJobPayload {
  draft: Record<string, unknown>;
  listingPreview?: { title: string; description: string; qualityScore?: number } | null;
  rulesOnly?: boolean;
}

export interface IntakeAssessEnrichJobPayload {
  draft: Record<string, unknown>;
  listingPreview?: { title: string; description: string } | null;
  userReply: string;
  gapId?: string;
}

export type IntakeQueueJobPayload =
  | IntakeAnalyzeJobPayload
  | IntakeListingCopyJobPayload
  | IntakeAssessJobPayload
  | IntakeAssessEnrichJobPayload;

export interface IntakeQueueJobProgressEvent {
  type: 'copy_delta' | 'status';
  title?: string;
  description?: string;
  descriptionDelta?: string;
}

export interface IntakeQueueJobRecord {
  jobId: string;
  jobName: IntakeQueueJobName;
  status: IntakeQueueJobStatus;
  idempotencyKey: string;
  priority: number;
  createdAt: number;
  updatedAt: number;
  result?: unknown;
  error?: string;
  syncFallback?: boolean;
  /** Partial events for listing-copy live UI (phase 3b). */
  progressEvents?: IntakeQueueJobProgressEvent[];
}

export interface IntakeQueueEnqueueRequest {
  jobName: IntakeQueueJobName;
  payload: IntakeQueueJobPayload;
  idempotencyKey?: string;
  /** Optional paid-tier boost (lower BullMQ priority number = higher priority). */
  paidTier?: boolean;
}

export interface IntakeQueueEnqueueResponse {
  jobId: string;
  status: IntakeQueueJobStatus;
  idempotencyKey: string;
  pollUrl: string;
  streamUrl: string;
  syncFallback?: boolean;
  result?: unknown;
}
