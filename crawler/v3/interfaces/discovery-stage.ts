import type { DiscoveredUrl, DiscoveryOptions } from '../../interfaces/discovery';

export interface IDiscoveryStage {
  discover(seeds: string[], options: Omit<DiscoveryOptions, 'seedUrls'>): AsyncGenerator<DiscoveredUrl>;
  canonicalize(url: string): string;
}

export type { DiscoveredUrl, DiscoveryOptions };
