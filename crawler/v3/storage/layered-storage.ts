import type {
  EnrichedProperty,
  ExtractedListing,
  NormalizedProperty,
  Property,
  RawPageRecord,
} from '../domain/property';
import type { PlatformConfigV3 } from '../config/schema';

export type StorageSnapshot = {
  rawHtml: RawPageRecord[];
  markdown: Array<{ id: string; jobId: string; url: string; markdown: string; storedAt: string }>;
  extractedJson: ExtractedListing[];
  normalized: NormalizedProperty[];
  enriched: EnrichedProperty[];
  properties: Property[];
  embeddings: Array<{ propertyId: string; vector: number[]; storedAt: string }>;
  media: Array<{ id: string; propertyId: string; url: string; hash: string }>;
  logs: Array<{ id: string; jobId: string; level: string; message: string; at: string }>;
  snapshots: Array<{ id: string; jobId: string; url: string; path: string; at: string }>;
  errors: Array<{ id: string; jobId: string; code: string; message: string; at: string }>;
  metrics: Array<{ jobId: string; key: string; value: number; at: string }>;
};

/** Immutable layered persistence — raw artifacts are never overwritten. */
export class LayeredCrawlStorage {
  private data: StorageSnapshot = {
    rawHtml: [],
    markdown: [],
    extractedJson: [],
    normalized: [],
    enriched: [],
    properties: [],
    embeddings: [],
    media: [],
    logs: [],
    snapshots: [],
    errors: [],
    metrics: [],
  };

  constructor(private readonly config: PlatformConfigV3) {}

  get snapshot(): StorageSnapshot {
    return structuredClone(this.data);
  }

  appendRaw(page: RawPageRecord): void {
    if (this.data.rawHtml.some((r) => r.contentHash === page.contentHash && r.jobId === page.jobId)) {
      return;
    }
    this.data.rawHtml.push(structuredClone(page));
  }

  appendMarkdown(jobId: string, url: string, markdown: string): void {
    this.data.markdown.push({
      id: `md_${this.data.markdown.length}`,
      jobId,
      url,
      markdown,
      storedAt: new Date().toISOString(),
    });
  }

  appendExtracted(listing: ExtractedListing): void {
    this.data.extractedJson.push(structuredClone(listing));
  }

  appendNormalized(property: NormalizedProperty): void {
    this.data.normalized.push(structuredClone(property));
  }

  appendEnriched(property: EnrichedProperty): void {
    this.data.enriched.push(structuredClone(property));
  }

  appendProperty(property: Property): void {
    this.data.properties.push(structuredClone(property));
  }

  appendEmbedding(propertyId: string, vector: number[]): void {
    this.data.embeddings.push({
      propertyId,
      vector,
      storedAt: new Date().toISOString(),
    });
  }

  appendError(jobId: string, code: string, message: string): void {
    this.data.errors.push({
      id: `err_${this.data.errors.length}`,
      jobId,
      code,
      message,
      at: new Date().toISOString(),
    });
  }

  appendMetric(jobId: string, key: string, value: number): void {
    this.data.metrics.push({ jobId, key, value, at: new Date().toISOString() });
  }

  propertiesForJob(jobId: string): Property[] {
    return this.data.properties.filter((p) => p.jobId === jobId);
  }
}
