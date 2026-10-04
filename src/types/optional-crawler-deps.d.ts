/** Optional crawler runtime deps — loaded dynamically from @crawler imports. */

declare module 'firecrawl' {
  export class Firecrawl {
    constructor(opts?: { apiKey?: string; baseUrl?: string });
    scrape(url: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
    crawl(url: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
    map(url: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
    extract?(input: Record<string, unknown>): Promise<Record<string, unknown>>;
    search?(query: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  }

  const mod: { Firecrawl: typeof Firecrawl; default?: { Firecrawl: typeof Firecrawl } };
  export default mod;
}

declare module 'bullmq' {
  export class Queue {
    constructor(name: string, opts?: Record<string, unknown>);
    add(name: string, data: unknown, opts?: Record<string, unknown>): Promise<unknown>;
    close(): Promise<void>;
  }

  export class Worker {
    constructor(name: string, processor: (job: { data: unknown }) => Promise<void>, opts?: Record<string, unknown>);
    close(): Promise<void>;
  }

  export class QueueEvents {
    constructor(name: string, opts?: Record<string, unknown>);
    close(): Promise<void>;
  }
}

declare module 'yaml' {
  export function parse(source: string): unknown;
}
