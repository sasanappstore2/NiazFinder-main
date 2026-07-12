import type { Result } from '../../types/errors';
import type { ExtractedListing } from '../domain/property';
import type { ScrapeResult } from '../../interfaces/crawler-provider';

export type ExtractionStrategyId =
  | 'dom'
  | 'schema'
  | 'json-ld'
  | 'microdata'
  | 'llm'
  | 'firecrawl-extract'
  | 'custom-parser'
  | 'hybrid'
  | 'legacy-estate-scrape';

export type ExtractionContext = {
  jobId: string;
  sourceId: string;
  url: string;
  strategy: ExtractionStrategyId;
  scrape: ScrapeResult;
};

export interface IExtractionStage {
  readonly strategy: ExtractionStrategyId;
  extract(ctx: ExtractionContext): Promise<Result<ExtractedListing[]>>;
}
