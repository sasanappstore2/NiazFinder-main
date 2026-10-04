import type { IPersistenceStage } from '../interfaces/persistence-stage';
import type { Property, RawPageRecord, ExtractedListing } from '../domain/property';
import { LayeredCrawlStorage } from '../storage/layered-storage';

/** Adapter — LayeredCrawlStorage satisfies IPersistenceStage. */
export class LayeredPersistenceStage implements IPersistenceStage {
  constructor(private readonly storage: LayeredCrawlStorage) {}

  async appendRaw(page: RawPageRecord): Promise<void> {
    this.storage.appendRaw(page);
  }

  async appendMarkdown(jobId: string, url: string, markdown: string): Promise<void> {
    this.storage.appendMarkdown(jobId, url, markdown);
  }

  async appendExtracted(listing: ExtractedListing): Promise<void> {
    this.storage.appendExtracted(listing);
  }

  async appendProperty(property: Property): Promise<void> {
    this.storage.appendProperty(property);
  }

  async appendError(jobId: string, code: string, message: string): Promise<void> {
    this.storage.appendError(jobId, code, message);
  }

  propertiesForJob(jobId: string): Property[] {
    return this.storage.propertiesForJob(jobId);
  }
}
