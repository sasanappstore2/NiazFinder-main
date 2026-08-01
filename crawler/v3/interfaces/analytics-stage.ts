import type { DomainEvent } from '../domain/events';

export type AnalyticsCounter = {
  name: string;
  value: number;
  labels?: Record<string, string>;
  at: string;
};

export interface IAnalyticsStage {
  recordEvent(event: DomainEvent): Promise<void>;
  increment(name: string, labels?: Record<string, string>): void;
  snapshot(): AnalyticsCounter[];
}
