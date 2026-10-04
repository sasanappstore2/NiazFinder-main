import 'server-only';

import {
  listCatalogCityIds,
  loadCityCatalogFile,
  loadCityNeighborhoods,
} from '@/lib/neighborhoods/catalog';
import { normalizePostNaturalText } from '@/lib/need-intake/laya/post-natural-normalization';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';

export type { ManagedNeighborhood };

export type CatalogCityMention =
  | { cityId: string; cityName: string }
  | { ambiguous: true; cityName: string; cityIds: string[] };

type CityTrieNode = {
  children: Map<string, CityTrieNode>;
  matches?: Map<string, string>;
};

type WordToken = { value: string; end: number };

const WORD_RE = /[\p{L}\p{N}]+/gu;
let cityTriePromise: Promise<CityTrieNode> | null = null;

function wordTokens(value: string): WordToken[] {
  return Array.from(normalizePostNaturalText(value).toLocaleLowerCase().matchAll(WORD_RE), (match) => ({
    value: match[0],
    end: (match.index ?? 0) + match[0].length,
  }));
}

async function buildCityTrie(): Promise<CityTrieNode> {
  const root: CityTrieNode = { children: new Map() };
  for (const cityId of await listCatalogCityIds()) {
    const cityName = (await loadCityCatalogFile(cityId))?.cityName?.trim();
    if (!cityName) continue;
    const tokens = wordTokens(cityName);
    if (!tokens.length) continue;
    let node = root;
    for (const token of tokens) {
      let child = node.children.get(token.value);
      if (!child) {
        child = { children: new Map() };
        node.children.set(token.value, child);
      }
      node = child;
    }
    (node.matches ??= new Map()).set(cityId, cityName);
  }
  return root;
}

function getCityTrie(): Promise<CityTrieNode> {
  cityTriePromise ??= buildCityTrie().catch((error: unknown) => {
    cityTriePromise = null;
    throw error;
  });
  return cityTriePromise;
}

function chooseCatalogCity(
  matches: Map<string, string>,
  preferredCityId?: string
): CatalogCityMention {
  if (preferredCityId) {
    const preferred = matches.get(preferredCityId);
    if (preferred) return { cityId: preferredCityId, cityName: preferred };
  }
  if (matches.size === 1) {
    const [cityId, cityName] = matches.entries().next().value as [string, string];
    return { cityId, cityName };
  }
  return {
    ambiguous: true,
    cityName: matches.values().next().value as string,
    cityIds: [...matches.keys()].sort(),
  };
}

/** Resolve a complete canonical city label, disambiguating with the selected city id. */
export async function resolveCatalogCityByName(
  rawName: string,
  preferredCityId?: string
): Promise<CatalogCityMention | null> {
  const trie = await getCityTrie();
  const tokens = wordTokens(rawName);
  if (!tokens.length) return null;
  let node = trie;
  for (const token of tokens) {
    const child = node.children.get(token.value);
    if (!child) return null;
    node = child;
  }
  return node.matches ? chooseCatalogCity(node.matches, preferredCityId) : null;
}

/** Resolve the rightmost exact city-name mention against all location catalogs. */
export async function resolveCatalogCityMention(
  rawText: string,
  preferredCityId?: string
): Promise<CatalogCityMention | null> {
  const [trie, tokens] = await Promise.all([getCityTrie(), Promise.resolve(wordTokens(rawText))]);
  let best: {
    end: number;
    tokenCount: number;
    matches: Map<string, string>;
  } | undefined;

  for (let start = 0; start < tokens.length; start += 1) {
    let node = trie;
    for (let end = start; end < tokens.length; end += 1) {
      const child = node.children.get(tokens[end]!.value);
      if (!child) break;
      node = child;
      if (!node.matches) continue;
      const candidate = {
        end: tokens[end]!.end,
        tokenCount: end - start + 1,
        matches: node.matches,
      };
      if (
        !best || candidate.end > best.end ||
        (candidate.end === best.end && candidate.tokenCount > best.tokenCount)
      ) best = candidate;
    }
  }

  if (!best) return null;
  return chooseCatalogCity(best.matches, preferredCityId);
}

export async function getNeighborhoodsForCity(
  cityId: string
): Promise<ManagedNeighborhood[]> {
  return loadCityNeighborhoods(cityId);
}

export async function resolveNeighborhoodSlugs(
  cityId: string,
  slugs: string[]
): Promise<ManagedNeighborhood[]> {
  if (!slugs.length) return [];
  const all = await getNeighborhoodsForCity(cityId);
  const set = new Set(slugs.map((s) => s.toLowerCase()));
  return all.filter((n) => set.has(n.id.toLowerCase()));
}
