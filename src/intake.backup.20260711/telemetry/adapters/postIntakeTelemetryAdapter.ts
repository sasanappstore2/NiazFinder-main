import type { PostIntakeEvent, PostIntakeTelemetryBatch } from '@/intake/telemetry/postIntakeEvents';

export interface PostIntakeTelemetryAdapter {
  emit(events: readonly PostIntakeEvent[]): void | Promise<void>;
}

export function createConsolePostIntakeTelemetryAdapter(): PostIntakeTelemetryAdapter {
  return {
    emit(events) {
      if (process.env.NODE_ENV === 'production') return;
      for (const event of events) {
        console.debug('[post-intake-telemetry]', event.type, event);
      }
    },
  };
}

export function createHttpPostIntakeTelemetryAdapter(
  endpoint = '/api/telemetry/post-intake'
): PostIntakeTelemetryAdapter {
  return {
    emit(events) {
      if (typeof fetch === 'undefined' || events.length === 0) return;
      const body: PostIntakeTelemetryBatch = { events: [...events] };
      void fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {
        /* silent */
      });
    },
  };
}

/** Default: dev console + async HTTP batch (production-safe, non-blocking). */
export function createDefaultPostIntakeTelemetryAdapters(): PostIntakeTelemetryAdapter[] {
  const adapters: PostIntakeTelemetryAdapter[] = [createConsolePostIntakeTelemetryAdapter()];
  if (typeof window !== 'undefined') {
    adapters.push(createHttpPostIntakeTelemetryAdapter());
  }
  return adapters;
}

export function composePostIntakeTelemetryAdapters(
  adapters: readonly PostIntakeTelemetryAdapter[]
): PostIntakeTelemetryAdapter {
  return {
    async emit(events) {
      await Promise.all(
        adapters.map((adapter) => {
          try {
            return Promise.resolve(adapter.emit(events));
          } catch {
            return Promise.resolve();
          }
        })
      );
    },
  };
}
