import { IntakeJobWatchError } from '@/lib/need-intake/intake-queue-client-browser';

const JOB_LABELS: Record<string, string> = {
  'intake.analyze': '\u062A\u062D\u0644\u06CC\u0644 \u0646\u06CC\u0627\u0632',
  'intake.listing-copy': '\u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u0622\u06AF\u0647\u06CC',
  'intake.assess': '\u0627\u0631\u0632\u06CC\u0627\u0628\u06CC',
  'intake.assess-enrich': '\u062A\u06A9\u0645\u06CC\u0644 \u0627\u0637\u0644\u0627\u0639\u0627\u062A',
};

const RATE_LIMIT_PATTERN = /\u062A\u0639\u062F\u0627\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0632\u06CC\u0627\u062F|429|rate limit/i;

export function isIntakeRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return RATE_LIMIT_PATTERN.test(msg);
}

export function intakeAsyncErrorMessage(
  err: unknown,
  jobName?: string
): string {
  const label = jobName ? JOB_LABELS[jobName] ?? jobName : '\u0639\u0645\u0644\u06CC\u0627\u062A';
  if (err instanceof IntakeJobWatchError) {
    if (err.code === 'timeout') {
      return `${label}: \u0645\u0647\u0644\u062A \u0628\u0647 \u067E\u0627\u06CC\u0627\u0646 \u0631\u0633\u06CC\u062F \u2014 \u062F\u0648\u0628\u0627\u0631\u0647 \u062A\u0644\u0627\u0634 \u06A9\u0646\u06CC\u062F`;
    }
    if (err.code === 'not_found') {
      return `${label}: job \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F`;
    }
    return `${label}: ${err.message}`;
  }
  if (err instanceof Error && /[\u0600-\u06FF]/.test(err.message)) {
    return err.message;
  }
  return `${label}: \u062E\u0637\u0627 \u0627\u0631\u062A\u0628\u0627\u0637 \u0628\u0627 \u0633\u0631\u0648\u06CC\u0633 \u0647\u0648\u0634 \u0645\u0635\u0646\u0648\u0639\u06CC`;
}

export type IntakePipelineJobKind = 'analyze' | 'copy' | 'assess';

export type IntakePipelineJobStatus = 'idle' | 'queued' | 'active' | 'completed' | 'failed';

export interface IntakePipelineJobState {
  status: IntakePipelineJobStatus;
  error: string | null;
  jobId: string | null;
}

export const IDLE_PIPELINE_JOB: IntakePipelineJobState = {
  status: 'idle',
  error: null,
  jobId: null,
};
