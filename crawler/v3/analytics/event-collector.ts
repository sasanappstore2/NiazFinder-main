import type { IAnalyticsStage, AnalyticsCounter } from '../interfaces/analytics-stage';
import type { DomainEvent } from '../domain/events';

/** Event-driven analytics — feeds dashboards from domain events. */
export class EventAnalyticsStage implements IAnalyticsStage {
  private counters: AnalyticsCounter[] = [];

  async recordEvent(event: DomainEvent): Promise<void> {
    this.increment(`event_${event.type.toLowerCase()}`, { source_id: event.sourceId });
    if (event.type === 'EntityCreated') {
      this.increment('entities_created', { source_id: event.sourceId });
    }
    if (event.type === 'DuplicateDetected') {
      this.increment('duplicates_detected', { source_id: event.sourceId });
    }
    if (event.type === 'ProviderFailed') {
      this.increment('provider_failures', { source_id: event.sourceId });
    }
  }

  increment(name: string, labels?: Record<string, string>): void {
    this.counters.push({
      name,
      value: 1,
      labels,
      at: new Date().toISOString(),
    });
  }

  snapshot(): AnalyticsCounter[] {
    return [...this.counters];
  }

  dailyStats(): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const c of this.counters) {
      totals[c.name] = (totals[c.name] ?? 0) + c.value;
    }
    return totals;
  }
}
