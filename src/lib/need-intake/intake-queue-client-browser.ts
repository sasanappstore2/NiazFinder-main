import type {
  IntakeQueueEnqueueRequest,
  IntakeQueueEnqueueResponse,
  IntakeQueueJobName,
  IntakeQueueJobPayload,
  IntakeQueueJobProgressEvent,
} from '@/lib/need-intake/intake-queue-types';

export interface WatchIntakeJobOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  onStatus?: (status: string) => void;
  onProgress?: (event: IntakeQueueJobProgressEvent) => void;
}

export class IntakeJobWatchError extends Error {
  constructor(
    message: string,
    readonly code: 'timeout' | 'failed' | 'not_found' | 'network'
  ) {
    super(message);
    this.name = 'IntakeJobWatchError';
  }
}

/** Watch queue job SSE until result, error, or timeout. */
export async function watchIntakeJobStream<T = unknown>(
  enqueue: IntakeQueueEnqueueResponse,
  options: WatchIntakeJobOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  if (enqueue.status === 'completed' && enqueue.result !== undefined) {
    clearTimeout(timer);
    return enqueue.result as T;
  }

  try {
    const res = await fetch(enqueue.streamUrl, { signal: controller.signal });
    if (!res.ok || !res.body) {
      throw new IntakeJobWatchError('\u062E\u0637\u0627 \u062F\u0631 \u067E\u0627\u06CC\u0634 job', 'network');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') {
          clearTimeout(timer);
          throw new IntakeJobWatchError('\u062A\u0645\u0627\u0645 \u0634\u062F \u0628\u062F\u0648\u0646 \u0646\u062A\u06CC\u062C\u0647', 'failed');
        }
        try {
          const evt = JSON.parse(raw) as {
            type: string;
            status?: string;
            result?: T;
            message?: string;
            event?: IntakeQueueJobProgressEvent;
          };
          if (evt.type === 'status' && evt.status) {
            options.onStatus?.(evt.status);
          }
          if (evt.type === 'progress' && evt.event) {
            options.onProgress?.(evt.event);
          }
          if (evt.type === 'result') {
            clearTimeout(timer);
            return evt.result as T;
          }
          if (evt.type === 'error') {
            clearTimeout(timer);
            throw new IntakeJobWatchError(
              evt.message ?? '\u062E\u0637\u0627\u06CC job',
              evt.message === 'not_found' ? 'not_found' : 'failed'
            );
          }
        } catch (parseErr) {
          if (parseErr instanceof IntakeJobWatchError) throw parseErr;
        }
      }
    }

    clearTimeout(timer);
    throw new IntakeJobWatchError('\u067E\u0627\u06CC\u0627\u0646 stream', 'failed');
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof IntakeJobWatchError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new IntakeJobWatchError('\u0645\u0647\u0644\u062A \u0628\u0647 \u067E\u0627\u06CC\u0627\u0646 \u0631\u0633\u06CC\u062F', 'timeout');
    }
    throw new IntakeJobWatchError('\u0627\u0631\u062A\u0628\u0627\u0637 \u0628\u0631\u0642\u0631 \u0646\u06CC\u0633\u062A', 'network');
  }
}

function stableHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postEnqueue(
  jobName: IntakeQueueJobName,
  payload: IntakeQueueJobPayload,
  idempotencyKey?: string
): Promise<Response> {
  return fetch('/api/need-intake/queue/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobName, payload, idempotencyKey }),
  });
}

export async function enqueueIntakeJobBrowser(
  jobName: IntakeQueueJobName,
  payload: IntakeQueueJobPayload,
  idempotencySeed?: string
): Promise<IntakeQueueEnqueueResponse> {
  const idempotencyKey = idempotencySeed ? stableHash(`${jobName}:${idempotencySeed}`) : undefined;

  let res = await postEnqueue(jobName, payload, idempotencyKey);

  if (res.status === 429) {
    const retryAfterSec = Number(res.headers.get('Retry-After')) || 2;
    await sleep(Math.min(retryAfterSec * 1000, 5000));
    res = await postEnqueue(jobName, payload, idempotencyKey);
  }

  if (res.status >= 500) {
    res = await postEnqueue(jobName, payload, idempotencyKey);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `\u062E\u0637\u0627 \u062F\u0631 \u0635\u0641 job (${res.status})`);
  }

  return res.json() as Promise<IntakeQueueEnqueueResponse>;
}

export async function runIntakeQueueJob<T = unknown>(
  request: IntakeQueueEnqueueRequest,
  options?: WatchIntakeJobOptions
): Promise<T> {
  const seed = JSON.stringify(request.payload);
  const enqueued = await enqueueIntakeJobBrowser(
    request.jobName,
    request.payload,
    request.idempotencyKey ?? seed
  );
  return watchIntakeJobStream<T>(enqueued, options);
}
