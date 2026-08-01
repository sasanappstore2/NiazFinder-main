export type DiscoveredUrl = {
  url: string;
  canonicalUrl?: string;
  depth: number;
  parentUrl?: string;
  discoveredAt: string;
  source: 'seed' | 'link' | 'sitemap' | 'map' | 'pagination';
};

export type DiscoveryOptions = {
  seedUrls: string[];
  maxDepth: number;
  maxUrls: number;
  allowedDomains: string[];
  includePatterns: RegExp[];
  excludePatterns: RegExp[];
  incremental: boolean;
  visitedCache?: Set<string>;
};

export interface DiscoveryEngine {
  discover(
    seeds: string[],
    options: Omit<DiscoveryOptions, 'seedUrls'>
  ): AsyncGenerator<DiscoveredUrl, void, unknown>;

  canonicalize(url: string): string;
  isAllowed(url: string, options: Pick<DiscoveryOptions, 'allowedDomains' | 'includePatterns' | 'excludePatterns'>): boolean;
}
