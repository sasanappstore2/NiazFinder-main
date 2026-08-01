import type { IExtractionStage, ExtractionContext } from '../interfaces/extraction-stage';
import type { ExtractionStrategyId } from '../interfaces/extraction-stage';
import { ok, err, crawlError, type Result } from '../../types/errors';
import type { ExtractedListing } from '../domain/property';

export class DomExtractionStage implements IExtractionStage {
  readonly strategy: ExtractionStrategyId = 'dom';

  async extract(ctx: ExtractionContext): Promise<Result<ExtractedListing[]>> {
    const html = ctx.scrape.html ?? '';
    if (!html.trim()) {
      return err(crawlError('extraction', 'empty html for dom extraction', { url: ctx.url }));
    }
    return ok([
      {
        sourceUrl: ctx.url,
        raw: { html: html.slice(0, 50_000), strategy: this.strategy },
        extractedAt: new Date().toISOString(),
        extractor: 'dom',
      },
    ]);
  }
}

export class FirecrawlExtractStage implements IExtractionStage {
  readonly strategy: ExtractionStrategyId = 'firecrawl-extract';

  async extract(ctx: ExtractionContext): Promise<Result<ExtractedListing[]>> {
    const meta = ctx.scrape.metadata ?? {};
    return ok([
      {
        sourceUrl: ctx.url,
        externalId: String(meta.externalId ?? meta.id ?? ''),
        raw: { ...meta, markdown: ctx.scrape.markdown },
        extractedAt: new Date().toISOString(),
        extractor: 'firecrawl-extract',
      },
    ]);
  }
}

export class LegacyEstateScrapeExtractStage implements IExtractionStage {
  readonly strategy: ExtractionStrategyId = 'legacy-estate-scrape';

  async extract(ctx: ExtractionContext): Promise<Result<ExtractedListing[]>> {
    const meta = ctx.scrape.metadata as Record<string, unknown> | undefined;
    if (!meta) {
      return err(crawlError('extraction', 'missing legacy metadata', { url: ctx.url }));
    }
    return ok([
      {
        sourceUrl: String(meta.detailUrl ?? ctx.url),
        externalId: String(meta.externalId ?? meta.fileCode ?? ''),
        raw: meta,
        extractedAt: new Date().toISOString(),
        extractor: 'legacy-estate-scrape',
      },
    ]);
  }
}

export class HybridExtractionStage implements IExtractionStage {
  readonly strategy: ExtractionStrategyId = 'hybrid';
  private readonly stages: IExtractionStage[];

  constructor(stages: IExtractionStage[]) {
    this.stages = stages;
  }

  async extract(ctx: ExtractionContext): Promise<Result<ExtractedListing[]>> {
    const merged: ExtractedListing[] = [];
    for (const stage of this.stages) {
      const result = await stage.extract({ ...ctx, strategy: stage.strategy });
      if (result.ok) merged.push(...result.value);
    }
    return merged.length ? ok(merged) : err(crawlError('extraction', 'hybrid produced no listings', { url: ctx.url }));
  }
}

const REGISTRY: Record<ExtractionStrategyId, () => IExtractionStage> = {
  dom: () => new DomExtractionStage(),
  schema: () => new DomExtractionStage(),
  'json-ld': () => new DomExtractionStage(),
  microdata: () => new DomExtractionStage(),
  llm: () => new DomExtractionStage(),
  'firecrawl-extract': () => new FirecrawlExtractStage(),
  'custom-parser': () => new DomExtractionStage(),
  hybrid: () =>
    new HybridExtractionStage([
      new FirecrawlExtractStage(),
      new DomExtractionStage(),
    ]),
  'legacy-estate-scrape': () => new LegacyEstateScrapeExtractStage(),
};

export function resolveExtractionStage(strategy: string): IExtractionStage {
  const id = strategy as ExtractionStrategyId;
  const factory = REGISTRY[id] ?? REGISTRY.dom;
  return factory();
}
