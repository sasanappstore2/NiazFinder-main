import type { Property, RawPageRecord, ExtractedListing } from '../domain/property';

export interface IPersistenceStage {
  appendRaw(page: RawPageRecord): Promise<void>;
  appendMarkdown(jobId: string, url: string, markdown: string): Promise<void>;
  appendExtracted(listing: ExtractedListing): Promise<void>;
  appendProperty(property: Property): Promise<void>;
  appendError(jobId: string, code: string, message: string): Promise<void>;
  propertiesForJob(jobId: string): Property[];
}
