import type { AiEnricher } from '../interfaces/ai';
import type { EnrichedProperty, NormalizedProperty } from '../types/property';
import { ok, type Result } from '../types/errors';

/** AI enriches only — never fetches URLs. */
export class NoopAiEnricher implements AiEnricher {
  readonly enabled = false;

  async enrich(property: NormalizedProperty): Promise<Result<EnrichedProperty>> {
    return ok({ ...property, enrichedAt: new Date().toISOString() });
  }
}

export class PassthroughAiEnricher implements AiEnricher {
  readonly enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  async enrich(property: NormalizedProperty): Promise<Result<EnrichedProperty>> {
    if (!this.enabled) return ok(property);
    const keywords = property.title
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 12);
    return ok({
      ...property,
      keywords,
      aiMeta: { enricher: 'passthrough', version: 1 },
      enrichedAt: new Date().toISOString(),
    });
  }
}
