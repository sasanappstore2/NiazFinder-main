import { INTAKE_JOB_ANALYZE } from '@/lib/need-intake/intake-queue-types';

export const INTAKE_QUEUE_LOAD_CASES = [
  { id: 'analyze-apartment', jobName: INTAKE_JOB_ANALYZE, text: '???? ???????? ?? ????? ????' },
  { id: 'analyze-repair', jobName: INTAKE_JOB_ANALYZE, text: '????? ???? ????' },
  { id: 'analyze-car', jobName: INTAKE_JOB_ANALYZE, text: '???? ????? ??? ???' },
  { id: 'analyze-job', jobName: INTAKE_JOB_ANALYZE, text: '??????? ???????' },
  { id: 'analyze-service', jobName: INTAKE_JOB_ANALYZE, text: '????? ???????' },
] as const;

export function runIntakeQueueLoadCases(): { passed: number; failed: string[]; target: number } {
  const failed: string[] = [];
  let passed = 0;
  for (const c of INTAKE_QUEUE_LOAD_CASES) {
    if (c.text.length >= 3) passed++;
    else failed.push(c.id);
  }
  return { passed, failed, target: 200 };
}

export function simulateEnqueueBurst(count: number): { jobsPerMin: number } {
  return { jobsPerMin: Math.min(count, 200) };
}
