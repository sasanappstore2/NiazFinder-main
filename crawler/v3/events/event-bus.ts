import type { DomainEvent, DomainEventType } from '../domain/events';
import { newId } from '../../core/utils';

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEventType>(type: T, handler: EventHandler): () => void;
  history(jobId?: string): DomainEvent[];
}

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<DomainEventType, Set<EventHandler>>();
  private log: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    const enriched = { ...event, eventId: event.eventId ?? newId('evt') };
    this.log.push(enriched);
    const set = this.handlers.get(enriched.type);
    if (!set) return;
    await Promise.all([...set].map((h) => h(enriched)));
  }

  subscribe<T extends DomainEventType>(type: T, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  history(jobId?: string): DomainEvent[] {
    return jobId ? this.log.filter((e) => e.jobId === jobId) : [...this.log];
  }
}
