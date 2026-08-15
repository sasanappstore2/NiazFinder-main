import 'server-only';

import { parseAiJsonPayload } from '@/ai/schema/extractionSchema';
import { constrainedSelectionSchema } from '@/ai/schema/extractionSchema';
import { validateConstrainedSelection } from '@/ai/schema/validationSchema';
import type { AiCandidateCity, AiCandidateRetrievalSet } from '@/ai/types';
import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';
import { CityMatcher } from '@/intake/matchers/cityMatcher';
import { generateNgrams } from '@/intake/ngrams/generateNgrams';
import { tokenize } from '@/intake/tokenizer/tokenize';
import { searchLocationIndex } from '@/intake/intelligence-engine/indexes/location-fuse-index';
import {
  buildCityPickPrompt,
  buildCitySuggestPrompt,
} from '@/intake/intelligence-engine/disambiguation/disambiguation-prompt';
import { isDisambigAiEnabled } from '@/intake/rules/config';
import { localChatCompletions } from '@/lib/need-intake/local-chat-client';
import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';

export interface CityCandidate {
  slug: string;
  name: string;
  score: number;
}

export interface CityDisambiguationResult {
  citySlug: string | null;
  cityName: string | null;
  candidates: CityCandidate[];
  ambiguous: boolean;
  aiInvoked: boolean;
  aiProvider: string | null;
  aiLatencyMs: number;
  method: 'rules-clear' | 'rules-ambiguous' | 'ai-pick' | 'ai-suggest-revalidate' | 'unresolved' | 'skipped';
}

const CITY_AMBIGUITY_GAP = 0.08;
const CITY_MIN_SCORE = 0.45;

export function matchCityCandidatesFromText(text: string, limit = 5): CityCandidate[] {
  const indexes = buildIntakeIndexesSync();
  const normalized = normalizeIntakeText(text);
  const tokens = tokenize(normalized, { removeStopWords: true });
  const ngrams = generateNgrams(tokens);
  const hits = new CityMatcher(indexes).match(tokens, ngrams.all);

  return hits
    .filter((h) => h.score >= CITY_MIN_SCORE)
    .slice(0, limit)
    .map((h) => ({
      slug: h.entry.slug,
      name: h.entry.name,
      score: h.score,
    }));
}

export function isCityAmbiguous(candidates: CityCandidate[]): boolean {
  if (candidates.length < 2) return false;
  const top = candidates[0]!;
  const second = candidates[1]!;
  return top.score - second.score < CITY_AMBIGUITY_GAP;
}

function pickCityIfClear(candidates: CityCandidate[]): CityCandidate | null {
  if (!candidates[0]) return null;
  if (isCityAmbiguous(candidates)) return null;
  return candidates[0];
}

async function callLlmCity(prompt: string): Promise<string | null> {
  const chat = await localChatCompletions(
    [
      { role: 'system', content: 'You pick one city slug from a list. JSON only.' },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 96, temperature: 0.05 }
  );
  return chat?.content?.trim() ?? null;
}

function parseCitySlug(content: string | null): string | null {
  if (!content) return null;
  const json = parseAiJsonPayload(content);
  if (!json || typeof json !== 'object') return null;
  const parsed = constrainedSelectionSchema.safeParse({
    category: null,
    city: (json as Record<string, unknown>).city ?? null,
    neighborhood: null,
    transactionType: null,
    budget: null,
    area: null,
    rooms: null,
    confidence: (json as Record<string, unknown>).confidence ?? 0.7,
  });
  if (!parsed.success) return null;
  return parsed.data.city?.trim() || null;
}

function toAiCities(candidates: CityCandidate[]): AiCandidateCity[] {
  return candidates.map((c) => ({
    id: c.slug,
    slug: c.slug,
    name: c.name,
    rankScore: c.score,
  }));
}

async function validateCitySlug(slug: string, candidates: CityCandidate[]): Promise<CityCandidate | null> {
  const hit = candidates.find((c) => c.slug === slug);
  if (hit) return hit;

  const fuseHits = await searchLocationIndex(slug, { limit: 3 });
  const cityHit = fuseHits.find((h) => h.record.type === 'city' && h.record.slug === slug);
  if (cityHit) {
    return { slug: cityHit.record.slug, name: cityHit.record.name, score: 0.7 };
  }
  return null;
}

export async function runCityDisambiguation(
  text: string,
  opts?: { allowAi?: boolean }
): Promise<CityDisambiguationResult> {
  const started = performance.now();
  const candidates = matchCityCandidatesFromText(text);

  const clear = pickCityIfClear(candidates);
  if (clear) {
    return {
      citySlug: clear.slug,
      cityName: clear.name,
      candidates,
      ambiguous: false,
      aiInvoked: false,
      aiProvider: null,
      aiLatencyMs: 0,
      method: 'rules-clear',
    };
  }

  if (candidates.length === 0) {
    return {
      citySlug: null,
      cityName: null,
      candidates,
      ambiguous: false,
      aiInvoked: false,
      aiProvider: null,
      aiLatencyMs: 0,
      method: 'skipped',
    };
  }

  if (!isCityAmbiguous(candidates) && candidates[0]) {
    return {
      citySlug: candidates[0].slug,
      cityName: candidates[0].name,
      candidates,
      ambiguous: false,
      aiInvoked: false,
      aiProvider: null,
      aiLatencyMs: 0,
      method: 'rules-clear',
    };
  }

  if (opts?.allowAi === false || !isDisambigAiEnabled()) {
    return {
      citySlug: null,
      cityName: null,
      candidates,
      ambiguous: true,
      aiInvoked: false,
      aiProvider: null,
      aiLatencyMs: 0,
      method: 'rules-ambiguous',
    };
  }

  const aiCities = toAiCities(candidates);
  const retrieval: AiCandidateRetrievalSet = {
    categories: [],
    cities: aiCities,
    neighborhoods: [],
    transactionTypes: [],
    retrievalCount: aiCities.length,
  };

  const pickContent = await callLlmCity(buildCityPickPrompt(text, aiCities));
  const pickSlug = parseCitySlug(pickContent);

  if (pickSlug) {
    const selection = {
      category: null,
      city: pickSlug,
      neighborhood: null,
      transactionType: null,
      budget: null,
      area: null,
      rooms: null,
      confidence: 0.75,
    };
    const validation = validateConstrainedSelection(selection, retrieval);
    if (validation.acceptedSlugs.citySlug) {
      const hit = await validateCitySlug(validation.acceptedSlugs.citySlug, candidates);
      if (hit) {
        return {
          citySlug: hit.slug,
          cityName: hit.name,
          candidates,
          ambiguous: true,
          aiInvoked: true,
          aiProvider: 'local-llm',
          aiLatencyMs: Math.round(performance.now() - started),
          method: 'ai-pick',
        };
      }
    }
  }

  const suggestContent = await callLlmCity(buildCitySuggestPrompt(text));
  const suggestSlug = parseCitySlug(suggestContent);
  if (suggestSlug) {
    const hit = await validateCitySlug(suggestSlug, candidates);
    if (hit) {
      return {
        citySlug: hit.slug,
        cityName: hit.name,
        candidates,
        ambiguous: true,
        aiInvoked: true,
        aiProvider: 'local-llm',
        aiLatencyMs: Math.round(performance.now() - started),
        method: 'ai-suggest-revalidate',
      };
    }
  }

  return {
    citySlug: null,
    cityName: null,
    candidates,
    ambiguous: true,
    aiInvoked: true,
    aiProvider: 'local-llm',
    aiLatencyMs: Math.round(performance.now() - started),
    method: 'unresolved',
  };
}

export function cityCandidatesForUi(
  candidates: CityCandidate[]
): Array<{ cityId: string; label: string; score?: number }> {
  return candidates.map((c) => ({
    cityId: c.slug,
    label: c.name,
    score: c.score,
  }));
}
