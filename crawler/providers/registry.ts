import type { CrawlerProvider } from '../interfaces/crawler-provider';
import type { CrawlerConfig } from '../config/schema';
import { FirecrawlProvider } from './firecrawl/firecrawl-provider';
import { HttpProvider } from './http/http-provider';
import { PlaywrightProvider } from './playwright/playwright-provider';

const registry = new Map<string, () => CrawlerProvider>();

export function registerProvider(name: string, factory: () => CrawlerProvider): void {
  registry.set(name, factory);
}

export function createProvider(name: string, config: CrawlerConfig): CrawlerProvider {
  const factory = registry.get(name);
  if (!factory) throw new Error(`Unknown crawler provider: ${name}`);
  return factory();
}

export function bootstrapProviders(config: CrawlerConfig): void {
  registry.clear();
  registerProvider('firecrawl', () => new FirecrawlProvider(config.providers.firecrawl));
  registerProvider('http', () => new HttpProvider(config.providers.http));
  registerProvider('playwright', () => new PlaywrightProvider(config.providers.playwright));
}

export function listProviders(): string[] {
  return [...registry.keys()];
}
