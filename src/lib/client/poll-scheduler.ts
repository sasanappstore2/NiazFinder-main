/**
 * Client poll scheduler with jitter, visibility gating, and single-flight queue.
 * Spreads periodic requests so many open tabs do not hit the server in sync.
 */

export type PollSchedulerOptions = {
  /** Base interval between completed runs. */
  intervalMs: number;
  /** Random extra delay (0..jitterMs) added after each run. */
  jitterMs: number;
  enabled: boolean;
  /** Skip scheduling when this returns false (e.g. hidden tab). */
  isActive?: () => boolean;
  run: (signal: AbortSignal) => Promise<void>;
};

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function randomJitter(maxMs: number): number {
  if (maxMs <= 0) return 0;
  return Math.floor(Math.random() * maxMs);
}

/** Start a self-scheduling poll loop; returns cleanup. */
export function startPollScheduler(options: PollSchedulerOptions): () => void {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;

  const schedule = (delayMs: number) => {
    if (controller.signal.aborted || !options.enabled) return;
    timer = setTimeout(() => void tick(), delayMs);
  };

  const tick = async () => {
    if (controller.signal.aborted || !options.enabled) return;
    if (options.isActive && !options.isActive()) {
      schedule(options.intervalMs);
      return;
    }
    if (inFlight) {
      schedule(options.intervalMs);
      return;
    }

    inFlight = true;
    try {
      await options.run(controller.signal);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        // Swallow — caller may log; polling should keep going.
      }
    } finally {
      inFlight = false;
    }

    if (controller.signal.aborted || !options.enabled) return;
    schedule(options.intervalMs + randomJitter(options.jitterMs));
  };

  schedule(randomJitter(options.jitterMs));

  return () => {
    controller.abort();
    if (timer) clearTimeout(timer);
  };
}
