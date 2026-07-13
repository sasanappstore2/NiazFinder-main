import type { AiEnricher } from '../../interfaces/ai';
import type { EnrichedProperty, NormalizedProperty } from '../domain/property';
import { ok, type Result } from '../../types/errors';

export type EnrichmentTask =
  | 'address-normalization'
  | 'geo-resolution'
  | 'amenity-extraction'
  | 'neighborhood-detection'
  | 'duplicate-scoring'
  | 'category-inference'
  | 'missing-field-inference'
  | 'embedding-generation'
  | 'semantic-tagging'
  | 'keyword-generation'
  | 'confidence-scoring';

export type EnrichmentPipelineOptions = {
  enabled: boolean;
  tasks: EnrichmentTask[];
};

const DEFAULT_TASKS: EnrichmentTask[] = [
  'keyword-generation',
  'category-inference',
  'confidence-scoring',
];

/**
 * AI enrichment pipeline — NEVER fetches URLs.
 * Composes pluggable enrichers; LLM hooks attach here without touching providers.
 */
export class EnrichmentPipeline implements AiEnricher {
  readonly enabled: boolean;

  constructor(
    private readonly opts: EnrichmentPipelineOptions,
    private readonly inner: AiEnricher
  ) {
    this.enabled = opts.enabled && inner.enabled;
  }

  async enrich(property: NormalizedProperty): Promise<Result<EnrichedProperty>> {
    if (!this.enabled) return this.inner.enrich(property);

    const base = await this.inner.enrich(property);
    if (!base.ok) return base;

    let enriched = base.value;
    const tasks = this.opts.tasks.length ? this.opts.tasks : DEFAULT_TASKS;

    if (tasks.includes('keyword-generation')) {
      enriched = {
        ...enriched,
        keywords: enriched.keywords ?? this.keywordsFromTitle(enriched.title),
      };
    }

    if (tasks.includes('category-inference') && !enriched.categorySlug) {
      enriched = {
        ...enriched,
        categorySlug: this.inferCategorySlug(enriched),
      };
    }

    if (tasks.includes('confidence-scoring')) {
      enriched = {
        ...enriched,
        aiMeta: {
          ...enriched.aiMeta,
          confidence: this.confidenceScore(enriched),
          tasks,
          version: 3,
        },
      };
    }

    return ok({ ...enriched, enrichedAt: new Date().toISOString() });
  }

  private keywordsFromTitle(title: string): string[] {
    return title
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 12);
  }

  private inferCategorySlug(property: NormalizedProperty): string | undefined {
    const kind = property.propertyKind;
    const deal = property.dealType;
    if (kind === 'unknown' || deal === 'unknown') return undefined;
    const dealSuffix =
      deal === 'sell'
        ? 'sale'
        : deal === 'rent_rahn_ejare'
          ? 'rent-rahn-ejare'
          : deal === 'rent_rahn_full'
            ? 'rent-rahn-full'
            : 'rent-short-term';
    return `${kind}-${dealSuffix}`;
  }

  private confidenceScore(property: NormalizedProperty): number {
    let score = 0.4;
    if (property.title) score += 0.1;
    if (property.price || property.deposit) score += 0.15;
    if (property.area) score += 0.1;
    if (property.location) score += 0.1;
    if (property.externalId) score += 0.15;
    return Math.min(1, score);
  }
}
