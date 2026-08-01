import type { DedupeEngine, DedupeMatch } from '../interfaces/dedupe';
import type { EnrichedProperty, NormalizedProperty } from '../types/property';
import { sha256 } from '../core/utils';

type IndexEntry = {
  propertyId: string;
  url: string;
  title: string;
  price?: string;
  location?: string;
  contentHash: string;
};

export class MultiSignalDedupeEngine implements DedupeEngine {
  private index: IndexEntry[] = [];

  async check(property: NormalizedProperty): Promise<DedupeMatch | null> {
    const signals: DedupeMatch['signals'] = [];
    let best: DedupeMatch | null = null;

    for (const row of this.index) {
      if (row.contentHash === property.contentHash) {
        return { propertyId: row.propertyId, confidence: 1, signals: ['exact_hash'] };
      }
      if (property.detailUrl && row.url === property.detailUrl) {
        signals.push('url');
      }
      if (property.title && row.title === property.title) {
        signals.push('title');
      }
      if (property.price && row.price === property.price && property.location === row.location) {
        signals.push('price', 'location');
      }

      if (signals.length) {
        const confidence = Math.min(0.95, 0.5 + signals.length * 0.15);
        if (!best || confidence > best.confidence) {
          best = { propertyId: row.propertyId, confidence, signals: [...signals] };
        }
      }
    }

    return best && best.confidence >= 0.7 ? best : null;
  }

  async register(property: EnrichedProperty): Promise<void> {
    this.index.push({
      propertyId: property.id,
      url: property.detailUrl ?? property.sourceUrl,
      title: property.title,
      price: property.price,
      location: property.location,
      contentHash: property.contentHash,
    });
  }
}

export function contentHashForProperty(property: NormalizedProperty): string {
  return sha256(
    [property.title, property.price, property.area, property.location, property.externalId].join('|')
  );
}
