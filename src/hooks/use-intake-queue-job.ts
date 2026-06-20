'use client';

import { useCallback, useState } from 'react';
import { runIntakeQueueJob } from '@/lib/need-intake/intake-queue-client-browser';
import type {
  IntakeQueueEnqueueRequest,
  IntakeQueueJobProgressEvent,
} from '@/lib/need-intake/intake-queue-types';
import { isIntakeWizardQueueEnabled, getIntakeQueueJobTimeoutMs } from '@/lib/need-intake/intake-wizard-queue-policy';

export function useIntakeQueueJob<T = unknown>() {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (request: IntakeQueueEnqueueRequest): Promise<T | null> => {
    if (!isIntakeWizardQueueEnabled()) return null;
    setRunning(true);
    setError(null);
    setStatus('queued');
    try {
      const result = await runIntakeQueueJob<T>(request, {
        timeoutMs: getIntakeQueueJobTimeoutMs(),
        onStatus: setStatus,
        onProgress: (_evt: IntakeQueueJobProgressEvent) => undefined,
      });
      setStatus('completed');
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'queue job failed');
      setStatus('failed');
      return null;
    } finally {
      setRunning(false);
    }
  }, []);

  return { run, running, status, error, enabled: isIntakeWizardQueueEnabled() };
}
