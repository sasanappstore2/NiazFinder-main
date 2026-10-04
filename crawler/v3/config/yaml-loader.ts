import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { crawlSourceSchema, type CrawlSource } from '../domain/crawl-source';

/**
 * Load source registry from YAML (requires `yaml` package) or JSON fallback.
 */
export function loadSourcesFromFile(path: string): CrawlSource[] {
  const abs = resolve(path);
  if (!existsSync(abs)) return [];

  const raw = readFileSync(abs, 'utf8');
  if (path.endsWith('.yaml') || path.endsWith('.yml')) {
    return loadSourcesFromYaml(raw);
  }

  const parsed = JSON.parse(raw) as unknown[];
  if (!Array.isArray(parsed)) return [];
  return parsed.map((row) => crawlSourceSchema.parse(row));
}

export function loadSourcesFromYaml(yamlText: string): CrawlSource[] {
  try {
    // Optional dep — only needed when loading .yaml source configs (worker / CLI).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const YAML = require('yaml') as { parse: (s: string) => unknown };
    const parsed = YAML.parse(yamlText);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => crawlSourceSchema.parse(row));
  } catch {
    throw new Error('YAML sources require: npm install yaml');
  }
}
