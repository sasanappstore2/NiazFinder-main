import type { DedupeMatch } from '../../interfaces/dedupe';
import type { IDeduplicationStage, DedupeSignal } from '../interfaces/deduplication-stage';
import type { EnrichedProperty, NormalizedProperty } from '../domain/property';
import { sha256 } from '../../core/utils';

type IndexEntry = {
  propertyId: string;
  url: string;
  canonicalUrl?: string;
  externalId?: string;
  title: string;
  price?: string;
  location?: string;
  contentHash: string;
  imageHashes: string[];
};

const SIGNAL_WEIGHTS: Record<DedupeSignal, number> = {
  exact_hash: 1.0,
  external_id: 0.95,
  url: 0.9,
  canonical_url: 0.88,
  image_hash: 0.75,
  location: 0.65,
  address_similarity: 0.65,
  title: 0.6,
  title_similarity: 0.6,
  price: 0.55,
  price_similarity: 0.55,
  embedding: 0.7,
  embedding_similarity: 0.7,
  geo_proximity: 0.5,
};

function titleSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aw = new Set(a.toLowerCase().split(/\s+/));
  const bw = new Set(b.toLowerCase().split(/\s+/));
  let inter = 0;
  for (const w of aw) if (bw.has(w)) inter += 1;
  return inter / Math.max(aw.size, bw.size, 1);
}

/**
 * Multi-signal weighted deduplication — configurable threshold.
 */
export class WeightedDedupeStage implements IDeduplicationStage {
  private index: IndexEntry[] = [];
  private readonly threshold: number;

  constructor(threshold = 0.72) {
    this.threshold = threshold;
  }

  async check(property: NormalizedProperty): Promise<DedupeMatch | null> {
    let best: DedupeMatch | null = null;

    for (const row of this.index) {
      const signals: DedupeSignal[] = [];
      let score = 0;

      if (row.contentHash === property.contentHash) {
        return { propertyId: row.propertyId, confidence: 1, signals: ['exact_hash'] };
      }
      if (property.externalId && row.externalId === property.externalId) {
        signals.push('external_id');
        score += SIGNAL_WEIGHTS.external_id;
      }
      if (property.detailUrl && row.url === property.detailUrl) {
        signals.push('url');
        score += SIGNAL_WEIGHTS.url;
      }
      const titleSim = titleSimilarity(property.title, row.title);
      if (titleSim > 0.85) {
        signals.push('title_similarity');
        score += SIGNAL_WEIGHTS.title_similarity * titleSim;
      }
      if (
        property.price &&
        row.price === property.price &&
        property.location &&
        row.location === property.location
      ) {
        signals.push('price_similarity', 'address_similarity');
        score += SIGNAL_WEIGHTS.price_similarity + SIGNAL_WEIGHTS.address_similarity;
      }

      const confidence = Math.min(0.99, score);
      if (confidence >= this.threshold && (!best || confidence > best.confidence)) {
        best = { propertyId: row.propertyId, confidence, signals };
      }
    }

    return best;
  }

  async register(property: EnrichedProperty): Promise<void> {
    this.index.push({
      propertyId: property.id,
      url: property.detailUrl ?? property.sourceUrl,
      externalId: property.externalId,
      title: property.title,
      price: property.price,
      location: property.location,
      contentHash: property.contentHash,
      imageHashes: property.images.map((u) => sha256(u)),
    });
  }
}
