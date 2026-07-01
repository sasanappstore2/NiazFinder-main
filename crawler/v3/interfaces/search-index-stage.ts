import type { Property } from '../domain/property';

export type IndexDocument = {
  id: string;
  title: string;
  sourceUrl: string;
  city?: string;
  neighborhood?: string;
  dealType?: string;
  propertyKind?: string;
  price?: string;
  indexedAt: string;
};

export interface ISearchIndexStage {
  index(property: Property): Promise<void>;
  remove(propertyId: string): Promise<void>;
  bulkIndex(properties: Property[]): Promise<{ indexed: number; failed: number }>;
}
