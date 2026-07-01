import type { ProviderHealth } from '../../interfaces/crawler-provider';
import type { CrawlProviderContract } from '../sdk/provider-contract';

export interface IProviderAdapterStage {
  readonly provider: CrawlProviderContract;
  health(): Promise<ProviderHealth>;
}

export type { CrawlProviderContract };
