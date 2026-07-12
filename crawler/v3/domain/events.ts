import type { CrawlError } from '../../types/errors';
import type { Property } from './property';

export type DomainEventType =
  | 'CrawlStarted'
  | 'CrawlCompleted'
  | 'CrawlFailed'
  | 'PageDiscovered'
  | 'PageFetched'
  | 'ExtractionCompleted'
  | 'ValidationFailed'
  | 'EntityCreated'
  | 'EntityUpdated'
  | 'DuplicateDetected'
  | 'ProviderFailed'
  | 'JobQueued'
  | 'JobPaused'
  | 'JobResumed'
  | 'JobCancelled';

export type DomainEventBase = {
  type: DomainEventType;
  eventId: string;
  occurredAt: string;
  jobId: string;
  sourceId: string;
  traceId?: string;
};

export type CrawlStartedEvent = DomainEventBase & {
  type: 'CrawlStarted';
  provider: string;
  seedUrls: string[];
};

export type PageDiscoveredEvent = DomainEventBase & {
  type: 'PageDiscovered';
  url: string;
  depth: number;
  canonicalUrl?: string;
};

export type PageFetchedEvent = DomainEventBase & {
  type: 'PageFetched';
  url: string;
  provider: string;
  statusCode?: number;
  latencyMs: number;
  contentHash: string;
};

export type ExtractionCompletedEvent = DomainEventBase & {
  type: 'ExtractionCompleted';
  url: string;
  extractor: string;
  listingCount: number;
};

export type ValidationFailedEvent = DomainEventBase & {
  type: 'ValidationFailed';
  url: string;
  issues: string[];
};

export type EntityCreatedEvent = DomainEventBase & {
  type: 'EntityCreated';
  propertyId: string;
  externalId: string;
};

export type EntityUpdatedEvent = DomainEventBase & {
  type: 'EntityUpdated';
  propertyId: string;
  externalId: string;
};

export type DuplicateDetectedEvent = DomainEventBase & {
  type: 'DuplicateDetected';
  propertyId: string;
  duplicateOf: string;
  confidence: number;
};

export type ProviderFailedEvent = DomainEventBase & {
  type: 'ProviderFailed';
  provider: string;
  operation: string;
  error: CrawlError;
};

export type CrawlCompletedEvent = DomainEventBase & {
  type: 'CrawlCompleted';
  listingsStored: number;
  duplicatesSkipped: number;
  pagesCrawled: number;
};

export type CrawlFailedEvent = DomainEventBase & {
  type: 'CrawlFailed';
  error: CrawlError;
};

export type DomainEvent =
  | CrawlStartedEvent
  | CrawlCompletedEvent
  | CrawlFailedEvent
  | PageDiscoveredEvent
  | PageFetchedEvent
  | ExtractionCompletedEvent
  | ValidationFailedEvent
  | EntityCreatedEvent
  | EntityUpdatedEvent
  | DuplicateDetectedEvent
  | ProviderFailedEvent
  | DomainEventBase;

export type PropertyMutation = {
  kind: 'created' | 'updated';
  property: Property;
};
