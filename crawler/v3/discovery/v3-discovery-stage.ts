import type { IDiscoveryStage } from '../interfaces/discovery-stage';
import type { DiscoveredUrl, DiscoveryOptions } from '../../interfaces/discovery';
import { UrlDiscoveryEngine } from '../../core/discovery-engine';
import type { CrawlProviderContract } from '../sdk/provider-contract';
import type { CrawlerProvider } from '../../interfaces/crawler-provider';

/**
 * V3 discovery stage — incremental visited cache + canonical URLs.
 */
export class V3DiscoveryStage implements IDiscoveryStage {
  private readonly engine: UrlDiscoveryEngine;
  private readonly visitedTtlMs: number;
  private visitedCache = new Map<string, number>();

  constructor(provider: CrawlProviderContract, visitedTtlHours = 168) {
    this.engine = new UrlDiscoveryEngine(provider as unknown as CrawlerProvider);
    this.visitedTtlMs = visitedTtlHours * 60 * 60 * 1000;
  }

  canonicalize(url: string): string {
    return this.engine.canonicalize(url);
  }

  private pruneVisited(): void {
    const now = Date.now();
    for (const [url, ts] of this.visitedCache) {
      if (now - ts > this.visitedTtlMs) this.visitedCache.delete(url);
    }
  }

  async *discover(
    seeds: string[],
    options: Omit<DiscoveryOptions, 'seedUrls'>
  ): AsyncGenerator<DiscoveredUrl> {
    this.pruneVisited();
    const visited = new Set<string>([...this.visitedCache.keys()]);

    for await (const item of this.engine.discover(seeds, { ...options, visitedCache: visited })) {
      const canonical = this.canonicalize(item.url);
      if (this.visitedCache.has(canonical)) continue;
      this.visitedCache.set(canonical, Date.now());
      yield { ...item, canonicalUrl: canonical };
    }
  }
}
