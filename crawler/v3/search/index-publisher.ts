import type { ISearchIndexStage, IndexDocument } from '../interfaces/search-index-stage';
import type { Property } from '../domain/property';

/** In-memory search index — swap for Typesense/Elasticsearch without pipeline changes. */
export class InMemorySearchIndexStage implements ISearchIndexStage {
  private docs = new Map<string, IndexDocument>();

  private toDoc(property: Property): IndexDocument {
    return {
      id: property.id,
      title: property.title,
      sourceUrl: property.sourceUrl,
      city: property.city,
      neighborhood: property.neighborhood,
      dealType: property.dealType,
      propertyKind: property.propertyKind,
      price: property.price,
      indexedAt: new Date().toISOString(),
    };
  }

  async index(property: Property): Promise<void> {
    this.docs.set(property.id, this.toDoc(property));
  }

  async remove(propertyId: string): Promise<void> {
    this.docs.delete(propertyId);
  }

  async bulkIndex(properties: Property[]): Promise<{ indexed: number; failed: number }> {
    let failed = 0;
    for (const p of properties) {
      try {
        await this.index(p);
      } catch {
        failed += 1;
      }
    }
    return { indexed: properties.length - failed, failed };
  }

  all(): IndexDocument[] {
    return [...this.docs.values()];
  }
}

export class NoopSearchIndexStage implements ISearchIndexStage {
  async index(): Promise<void> {}
  async remove(): Promise<void> {}
  async bulkIndex(properties: Property[]): Promise<{ indexed: number; failed: number }> {
    return { indexed: properties.length, failed: 0 };
  }
}
