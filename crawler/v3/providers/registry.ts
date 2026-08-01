import { mergeCapabilities } from '../sdk/capabilities';
import { BaseProviderAdapter } from '../sdk/base-provider';
import type { CrawlProviderContract } from '../sdk/provider-contract';
import type { PlatformConfigV3 } from '../config/schema';
import { FirecrawlProvider } from '../../providers/firecrawl/firecrawl-provider';
import { HttpProvider } from '../../providers/http/http-provider';
import { PlaywrightProvider } from '../../providers/playwright/playwright-provider';
import { ApiProvider } from './api/api-provider';
import { EstateScrapeLegacyProvider } from './legacy/estate-scrape-provider';
import { FutureBrowserProvider } from './future-browser/future-browser-provider';

export type ProviderFactory = (config: PlatformConfigV3) => CrawlProviderContract;

const registry = new Map<string, ProviderFactory>();

export function registerV3Provider(name: string, factory: ProviderFactory): void {
  registry.set(name, factory);
}

export function bootstrapV3Providers(config: PlatformConfigV3): void {
  if (registry.size > 0) return;

  registerV3Provider('firecrawl', (cfg) =>
    new BaseProviderAdapter(
      new FirecrawlProvider(cfg.providers.firecrawl),
      mergeCapabilities(
        {
          authentication: false,
          javascript: true,
          streaming: false,
          screenshots: true,
          structuredExtraction: true,
          pagination: true,
          incremental: true,
          rateLimiting: true,
          sitemapDiscovery: true,
          linkDiscovery: true,
          markdown: true,
          rawHtml: true,
        },
        {}
      )
    )
  );

  registerV3Provider('http', (cfg) =>
    new BaseProviderAdapter(
      new HttpProvider(cfg.providers.http),
      mergeCapabilities(
        {
          authentication: false,
          javascript: false,
          streaming: false,
          screenshots: false,
          structuredExtraction: false,
          pagination: true,
          incremental: true,
          rateLimiting: true,
          sitemapDiscovery: false,
          linkDiscovery: false,
          markdown: false,
          rawHtml: true,
        },
        {}
      )
    )
  );

  registerV3Provider('playwright', (cfg) =>
    new BaseProviderAdapter(
      new PlaywrightProvider({
        headless: cfg.providers.playwright.headless,
        timeoutMs: cfg.providers.playwright.timeoutMs,
      }),
      mergeCapabilities(
        {
          authentication: true,
          javascript: true,
          streaming: false,
          screenshots: true,
          structuredExtraction: false,
          pagination: true,
          incremental: true,
          rateLimiting: true,
          sitemapDiscovery: false,
          linkDiscovery: true,
          markdown: false,
          rawHtml: true,
        },
        {}
      )
    )
  );

  registerV3Provider('api', (cfg) => new ApiProvider(cfg.providers.api));
  registerV3Provider('estate-scrape-legacy', (cfg) =>
    new EstateScrapeLegacyProvider(cfg.providers['estate-scrape-legacy'])
  );
  registerV3Provider('future-browser', () => new FutureBrowserProvider());
}

export function createV3Provider(name: string, config: PlatformConfigV3): CrawlProviderContract {
  bootstrapV3Providers(config);
  const factory = registry.get(name);
  if (!factory) throw new Error(`Unknown crawler provider: ${name}`);
  return factory(config);
}

export function listV3Providers(): string[] {
  return [...registry.keys()];
}

export function selectProviderForSource(
  config: PlatformConfigV3,
  source: { provider: string; authenticationRequired: boolean; extractionStrategy: string }
): string {
  if (source.provider && registry.has(source.provider)) return source.provider;
  if (source.authenticationRequired && config.featureFlags.legacyEstateScrapeFallback) {
    return 'estate-scrape-legacy';
  }
  if (source.extractionStrategy === 'firecrawl-extract' && config.featureFlags.firecrawlPrimary) {
    return 'firecrawl';
  }
  return config.defaultProvider;
}
