import type { CrawlerProvider } from '../interfaces/crawler-provider';
import type { AiEnricher } from '../interfaces/ai';
import type { DedupeEngine } from '../interfaces/dedupe';
import type { PropertyNormalizer, PropertyValidator } from '../interfaces/parser';
import type { CrawlStorage } from '../interfaces/storage';
import type { MetricsCollector } from '../interfaces/monitoring';
import type { CrawlJob } from '../types/crawl-job';
import type { ExtractedListing, RawPageRecord, StoredProperty } from '../types/property';
import { crawlError } from '../types/errors';
import { newId } from '../core/utils';

export type PipelineContext = {
  job: CrawlJob;
  provider: CrawlerProvider;
  storage: CrawlStorage;
  normalizer: PropertyNormalizer;
  validator: PropertyValidator;
  dedupe?: DedupeEngine;
  ai?: AiEnricher;
  metrics: MetricsCollector;
  retainRawHtml: boolean;
};

export type PipelinePageInput = {
  url: string;
  depth: number;
};

/** Streaming extraction pipeline — one page at a time. */
export class ExtractionPipeline {
  async processPage(ctx: PipelineContext, input: PipelinePageInput): Promise<{ stored: number; skipped: number }> {
    const start = Date.now();
    let stored = 0;
    let skipped = 0;

    const scraped = await ctx.provider.scrape(input.url, {
      formats: ['markdown', 'html'],
      timeoutMs: 120_000,
    });

    if (!scraped.ok) {
      await ctx.storage.logs.log('error', scraped.error.message, {
        jobId: ctx.job.id,
        url: input.url,
        code: scraped.error.code,
      });
      ctx.metrics.record('pages_failed', 1, { jobId: ctx.job.id });
      return { stored, skipped };
    }

    const raw: RawPageRecord = ctx.provider.toRawPage(ctx.job.id, scraped.value);
    if (!ctx.retainRawHtml) {
      raw.html = undefined;
    }
    await ctx.storage.raw.append(raw);

    const extractions = await this.extractStructured(ctx, scraped.value.url, scraped.value.markdown, scraped.value.html);
    for (const extraction of extractions) {
      const withMeta: ExtractedListing & { jobId: string; pageId: string } = {
        ...extraction,
        jobId: ctx.job.id,
        pageId: raw.id,
      };
      await ctx.storage.extractions.append(withMeta);

      const normalized = ctx.normalizer.normalize(extraction, {
        siteKey: ctx.job.siteKey,
        jobId: ctx.job.id,
      });
      if (!normalized.ok) {
        ctx.metrics.record('validation_rejected', 1, { jobId: ctx.job.id });
        continue;
      }

      const validated = ctx.validator.validate(normalized.value);
      if (!validated.ok) {
        ctx.metrics.record('validation_rejected', 1, { jobId: ctx.job.id });
        continue;
      }

      let enriched = validated.value;
      if (ctx.ai?.enabled) {
        const aiResult = await ctx.ai.enrich(validated.value);
        if (aiResult.ok) enriched = aiResult.value;
      }

      if (ctx.dedupe && ctx.job.config.deduplication) {
        const dup = await ctx.dedupe.check(validated.value);
        if (dup && dup.confidence >= 0.85) {
          skipped += 1;
          ctx.metrics.record('duplicates_skipped', 1, { jobId: ctx.job.id });
          continue;
        }
      }

      const record: StoredProperty = {
        ...enriched,
        dedupeKey: enriched.contentHash,
        storedAt: new Date().toISOString(),
      };

      await ctx.storage.properties.save(record);
      if (ctx.dedupe) await ctx.dedupe.register(enriched);
      stored += 1;
    }

    ctx.metrics.record('pages_crawled', 1, { jobId: ctx.job.id });
    ctx.metrics.record('provider_latency_ms', Date.now() - start, { jobId: ctx.job.id });
    return { stored, skipped };
  }

  private async extractStructured(
    ctx: PipelineContext,
    url: string,
    markdown?: string,
    html?: string
  ): Promise<ExtractedListing[]> {
    if (ctx.job.config.extractSchema) {
      const extracted = await ctx.provider.extract([url], {
        schema: ctx.job.config.extractSchema,
        prompt: 'Extract real estate listing fields from this page.',
      });
      if (extracted.ok && extracted.value.length) {
        return extracted.value.map((row) => ({
          sourceUrl: row.url,
          raw: (row.data as Record<string, unknown>) ?? {},
          extractedAt: new Date().toISOString(),
          extractor: 'firecrawl-extract',
        }));
      }
    }

    const text = markdown ?? html ?? '';
    if (!text.trim()) return [];

    return [
      {
        sourceUrl: url,
        raw: { title: inferTitle(text), description: text.slice(0, 2000), detailUrl: url },
        extractedAt: new Date().toISOString(),
        extractor: 'heuristic-markdown',
      },
    ];
  }
}

function inferTitle(text: string): string {
  const line = text.split('\n').find((l) => l.trim().length > 8);
  return line?.trim().slice(0, 200) ?? 'Untitled listing';
}
