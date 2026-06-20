import 'server-only';

import { getCategoryBySlug } from '@/config/categories';
import { parseAiJsonPayload } from '@/ai/schema/extractionSchema';
import { validateConstrainedSelection } from '@/ai/schema/validationSchema';
import type { AiCandidateCategory, AiCandidateRetrievalSet } from '@/ai/types';
import { localChatCompletions } from '@/lib/need-intake/local-chat-client';
import {
  candidateToCategoryMatchResult,
  matchCategoryCandidatesFromRules,
  matchCategoryFromRules,
  pickClearCategoryFromRules,
} from '@/intake/rules/registry.server';
import { isCategoryAmbiguous } from '@/intake/rules/registry-match';
import {
  isDisambigAiEnabled,
  REGISTRY_CATEGORY_OVERRIDE_THRESHOLD,
} from '@/intake/rules/config';
import type { CategoryMatchCandidate, CategoryMatchResult } from '@/intake/rules/types';
import {
  buildCategoryPickPrompt,
  buildCategorySuggestPrompt,
} from '@/intake/intelligence-engine/disambiguation/disambiguation-prompt';
import { constrainedSelectionSchema } from '@/ai/schema/extractionSchema';

export interface CategoryDisambiguationResult {
  match: CategoryMatchResult | null;
  candidates: CategoryMatchCandidate[];
  ambiguous: boolean;
  aiInvoked: boolean;
  aiProvider: string | null;
  aiLatencyMs: number;
  method: 'rules-clear' | 'rules-ambiguous' | 'ai-pick' | 'ai-suggest-revalidate' | 'unresolved';
}

function toAiCategories(candidates: CategoryMatchCandidate[]): AiCandidateCategory[] {
  return candidates.map((c) => {
    const meta = getCategoryBySlug(c.slug);
    return {
      slug: c.slug,
      title: meta?.title ?? c.slug,
      rankScore: c.confidence,
    };
  });
}

function emptyRetrieval(categories: AiCandidateCategory[]): AiCandidateRetrievalSet {
  return {
    categories,
    cities: [],
    neighborhoods: [],
    transactionTypes: [],
    retrievalCount: categories.length,
  };
}

async function callLlmPick(prompt: string): Promise<string | null> {
  const chat = await localChatCompletions(
    [
      { role: 'system', content: 'You pick one slug from a list. JSON only.' },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 128, temperature: 0.05 }
  );
  return chat?.content?.trim() ?? null;
}

function parseCategorySlug(content: string | null): string | null {
  if (!content) return null;
  const json = parseAiJsonPayload(content);
  if (!json || typeof json !== 'object') return null;
  const parsed = constrainedSelectionSchema.safeParse({
    category: (json as Record<string, unknown>).category ?? null,
    city: null,
    neighborhood: null,
    transactionType: null,
    budget: null,
    area: null,
    rooms: null,
    confidence: (json as Record<string, unknown>).confidence ?? 0.7,
  });
  if (!parsed.success) return null;
  return parsed.data.category?.trim() || null;
}

export async function runCategoryDisambiguation(
  text: string,
  opts?: { slugHints?: string[] }
): Promise<CategoryDisambiguationResult> {
  const started = performance.now();
  const candidates = matchCategoryCandidatesFromRules(text, {
    slugHints: opts?.slugHints,
  });

  const clear = pickClearCategoryFromRules(text, { slugHints: opts?.slugHints });
  if (clear) {
    return {
      match: clear,
      candidates,
      ambiguous: false,
      aiInvoked: false,
      aiProvider: null,
      aiLatencyMs: 0,
      method: 'rules-clear',
    };
  }

  const ambiguous = isCategoryAmbiguous(candidates) || candidates.length >= 2;

  if (!ambiguous || candidates.length === 0) {
    const fallback = matchCategoryFromRules(text, { slugHints: opts?.slugHints });
    return {
      match: fallback,
      candidates,
      ambiguous: false,
      aiInvoked: false,
      aiProvider: null,
      aiLatencyMs: 0,
      method: fallback ? 'rules-clear' : 'unresolved',
    };
  }

  if (!isDisambigAiEnabled()) {
    return {
      match: null,
      candidates,
      ambiguous: true,
      aiInvoked: false,
      aiProvider: null,
      aiLatencyMs: 0,
      method: 'rules-ambiguous',
    };
  }

  const aiCategories = toAiCategories(candidates);
  const retrieval = emptyRetrieval(aiCategories);

  const pickContent = await callLlmPick(buildCategoryPickPrompt(text, aiCategories));
  const pickSlug = parseCategorySlug(pickContent);

  if (pickSlug) {
    const selection = {
      category: pickSlug,
      city: null,
      neighborhood: null,
      transactionType: null,
      budget: null,
      area: null,
      rooms: null,
      confidence: 0.75,
    };
    const validation = validateConstrainedSelection(selection, retrieval);
    if (validation.acceptedSlugs.categorySlug) {
      const hit = candidates.find((c) => c.slug === validation.acceptedSlugs.categorySlug);
      if (hit) {
        return {
          match: candidateToCategoryMatchResult(text, hit, []),
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

  const suggestContent = await callLlmPick(buildCategorySuggestPrompt(text));
  const suggestSlug = parseCategorySlug(suggestContent);
  if (suggestSlug) {
    const revalidated = matchCategoryFromRules(text, { slugHints: [suggestSlug] });
    if (revalidated && revalidated.confidence >= REGISTRY_CATEGORY_OVERRIDE_THRESHOLD * 0.85) {
      return {
        match: revalidated,
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
    match: null,
    candidates,
    ambiguous: true,
    aiInvoked: true,
    aiProvider: 'local-llm',
    aiLatencyMs: Math.round(performance.now() - started),
    method: 'unresolved',
  };
}

export function categoryCandidatesForUi(
  candidates: CategoryMatchCandidate[]
): Array<{ slug: string; label: string; confidence: number; matchedRules?: string[] }> {
  return candidates.map((c) => {
    const meta = getCategoryBySlug(c.slug);
    return {
      slug: c.slug,
      label: meta?.title ?? c.slug,
      confidence: c.confidence,
      matchedRules: c.matchedRules.slice(0, 3),
    };
  });
}
