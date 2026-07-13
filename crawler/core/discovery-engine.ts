import type { DiscoveryEngine, DiscoveredUrl, DiscoveryOptions } from '../interfaces/discovery';
import type { CrawlerProvider } from '../interfaces/crawler-provider';
import { hostnameFromUrl, patternsToRegex } from './utils';

export class UrlDiscoveryEngine implements DiscoveryEngine {
  constructor(private readonly provider?: CrawlerProvider) {}

  canonicalize(url: string): string {
    try {
      const u = new URL(url);
      u.hash = '';
      if (u.pathname.endsWith('/') && u.pathname.length > 1) {
        u.pathname = u.pathname.slice(0, -1);
      }
      return u.toString();
    } catch {
      return url;
    }
  }

  isAllowed(
    url: string,
    options: Pick<DiscoveryOptions, 'allowedDomains' | 'includePatterns' | 'excludePatterns'>
  ): boolean {
    let host = '';
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return false;
    }

    if (options.allowedDomains.length > 0) {
      const allowed = options.allowedDomains.some(
        (d) => host === d.replace(/^www\./, '') || host.endsWith(`.${d.replace(/^www\./, '')}`)
      );
      if (!allowed) return false;
    }

    if (options.excludePatterns.some((re) => re.test(url))) return false;
    if (options.includePatterns.length > 0) {
      return options.includePatterns.some((re) => re.test(url));
    }
    return true;
  }

  async *discover(
    seeds: string[],
    options: Omit<DiscoveryOptions, 'seedUrls'>
  ): AsyncGenerator<DiscoveredUrl, void, unknown> {
    const visited = options.visitedCache ?? new Set<string>();
    const queue: Array<{ url: string; depth: number; parent?: string; source: DiscoveredUrl['source'] }> =
      seeds.map((url) => ({ url, depth: 0, source: 'seed' as const }));

    let yielded = 0;

    while (queue.length > 0 && yielded < options.maxUrls) {
      const current = queue.shift()!;
      const canonical = this.canonicalize(current.url);
      if (visited.has(canonical)) continue;
      if (!this.isAllowed(canonical, options)) continue;

      visited.add(canonical);
      yielded += 1;

      yield {
        url: canonical,
        canonicalUrl: canonical,
        depth: current.depth,
        parentUrl: current.parent,
        discoveredAt: new Date().toISOString(),
        source: current.source,
      };

      if (current.depth >= options.maxDepth) continue;

      const childUrls = await this.expandUrl(canonical, options);
      for (const child of childUrls) {
        const childCanonical = this.canonicalize(child);
        if (visited.has(childCanonical)) continue;
        queue.push({
          url: child,
          depth: current.depth + 1,
          parent: canonical,
          source: 'link',
        });
      }
    }
  }

  private async expandUrl(url: string, options: Omit<DiscoveryOptions, 'seedUrls'>): Promise<string[]> {
    if (this.provider) {
      const mapped = await this.provider.map(url, { limit: 200 });
      if (mapped.ok && mapped.value.urls.length) {
        return mapped.value.urls.filter((u) => this.isAllowed(u, options));
      }
    }

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      const html = await res.text();
      const baseHost = hostnameFromUrl(url);
      const links: string[] = [];
      for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
        try {
          const abs = new URL(m[1]!, url).toString();
          if (hostnameFromUrl(abs) === baseHost) links.push(abs);
        } catch {
          /* skip */
        }
      }
      return [...new Set(links)].filter((u) => this.isAllowed(u, options));
    } catch {
      return [];
    }
  }
}

export function buildDiscoveryOptions(input: {
  seedUrls: string[];
  maxDepth: number;
  maxUrls: number;
  allowedDomains: string[];
  includePatterns: string[];
  excludePatterns: string[];
  incremental: boolean;
  visitedCache?: Set<string>;
}): DiscoveryOptions {
  return {
    ...input,
    includePatterns: patternsToRegex(input.includePatterns),
    excludePatterns: patternsToRegex(input.excludePatterns),
  };
}
