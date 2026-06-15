/** Phase 46.8/46.10 ? intake queue architecture release registry. */

export const INTAKE_QUEUE_V1_TAG = 'intake-queue-v1';

export const INTAKE_QUEUE_JOB_NAMES = [
  'intake.analyze',
  'intake.listing-copy',
  'intake.assess',
  'intake.assess-enrich',
] as const;

export const INTAKE_QUEUE_LOAD_TARGET_JOBS_PER_MIN = 200;

export const INTAKE_QUEUE_MIN_LOAD_CASES = 5;

export function allIntakeQueueChecksPass(loadCaseCount: number): boolean {
  return loadCaseCount >= INTAKE_QUEUE_MIN_LOAD_CASES;
}
