import type {
  EnrichedProperty,
  ExtractedListing,
  NormalizedProperty,
  RawPageRecord,
  StoredProperty,
} from '../types/property';

export type { RawPageRecord, StoredProperty, ExtractedListing } from '../types/property';

export interface RawPageStore {
  append(page: RawPageRecord): Promise<void>;
  get(id: string): Promise<RawPageRecord | null>;
  listByJob(jobId: string, opts?: { limit?: number; offset?: number }): Promise<RawPageRecord[]>;
}

export interface ExtractionStore {
  append(extraction: ExtractedListing & { jobId: string; pageId: string }): Promise<void>;
  listByJob(jobId: string): Promise<ExtractedListing[]>;
}

export interface PropertyStore {
  save(property: StoredProperty): Promise<void>;
  saveBatch(properties: StoredProperty[]): Promise<void>;
  findByExternalId(siteKey: string, externalId: string): Promise<StoredProperty | null>;
  findByUrl(url: string): Promise<StoredProperty | null>;
}

export interface EmbeddingStore {
  save(propertyId: string, vector: number[], meta?: Record<string, unknown>): Promise<void>;
  findSimilar(vector: number[], limit: number): Promise<Array<{ propertyId: string; score: number }>>;
}

export interface CrawlLogStore {
  log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): Promise<void>;
  listErrors(jobId: string): Promise<Array<{ message: string; meta?: Record<string, unknown>; at: string }>>;
}

export interface CrawlStorage {
  raw: RawPageStore;
  extractions: ExtractionStore;
  properties: PropertyStore;
  embeddings?: EmbeddingStore;
  logs: CrawlLogStore;
}

export type StorageLayers = {
  rawPages: RawPageRecord[];
  extractions: Array<ExtractedListing & { jobId: string; pageId: string }>;
  normalized: NormalizedProperty[];
  enriched: EnrichedProperty[];
  stored: StoredProperty[];
};
