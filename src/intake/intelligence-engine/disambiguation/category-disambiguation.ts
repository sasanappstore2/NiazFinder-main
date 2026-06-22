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
  matchCandidatesWithinSlugs,
  buildMatchResultForSlug,
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
import { semanticCategoryCandidates } from '@/intake/intelligence-engine/semantic/category-embedding-index';
import {
  isSemanticRetrievalEnabled,
  semanticTopK,
  fusionParams,
} from '@/intake/intelligence-engine/semantic/config';
import {
  detectQueryIntent,
  intentMultiplier,
} from '@/intake/intelligence-engine/semantic/intent-rerank';

export interface CategoryDisambiguationResult {
  match: CategoryMatchResult | null;
  candidates: CategoryMatchCandidate[];
  ambiguous: boolean;
  aiInvoked: boolean;
  aiProvider: string | null;
  aiLatencyMs: number;
  method:
    | 'rules-clear'
    | 'rules-ambiguous'
    | 'ai-pick'
    | 'ai-suggest-revalidate'
    | 'unresolved'
    | 'semantic-fused-clear'
    | 'semantic-fused-ai'
    | 'semantic-fused-top';
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
  if (isSemanticRetrievalEnabled()) {
    const fused = await runFusedCategoryDisambiguation(text, opts);
    if (fused) return fused;
    // semantic gateway unavailable → fall through to the rules-only path
  }
  return runRulesCategoryDisambiguation(text, opts);
}

/**
 * Fusion path: semantic top-K narrows the field (fast, language-aware), keyword
 * rules are scored ONLY within those candidates (no full-registry scan), and
 * Gemma disambiguates when the fused ranking is close. Returns null if the
 * embedding gateway is unavailable so the caller can fall back to rules.
 */
async function runFusedCategoryDisambiguation(
  text: string,
  opts?: { slugHints?: string[] }
): Promise<CategoryDisambiguationResult | null> {
  const started = performance.now();
  const sem = await semanticCategoryCandidates(text, semanticTopK());
  if (!sem.length) return null;

  const { semWeight, ruleWeight, clearMin, clearMargin, aiPickTopN } = fusionParams();
  const semSlugs = sem.map((s) => s.slug);
  const ruleCands = matchCandidatesWithinSlugs(text, semSlugs);
  const ruleBySlug = new Map(ruleCands.map((c) => [c.slug, c]));
  const intent = detectQueryIntent(text);

  const fused = sem
    .map((s) => {
      const rc = ruleBySlug.get(s.slug);
      const ruleSignal = rc ? rc.confidence : 0;
      const base = semWeight * s.score + ruleWeight * ruleSignal;
      return {
        slug: s.slug,
        semScore: s.score,
        ruleSignal,
        ruleCand: rc,
        fusedScore: base * intentMultiplier(s.slug, intent),
      };
    })
    .sort((a, b) => b.fusedScore - a.fusedScore);

  const candidates: CategoryMatchCandidate[] = fused.map((f) => ({
    slug: f.slug,
    score: Math.round(f.fusedScore * 1000),
    confidence: Math.min(0.98, Number(f.fusedScore.toFixed(4))),
    matchedRules: f.ruleCand?.matchedRules ?? [],
    source: f.ruleCand ? 'registry' : 'semantic',
  }));

  const top = fused[0]!;
  const second = fused[1];

  // Clear winner — confident and well ahead of #2.
  if (top.fusedScore >= clearMin && (!second || top.fusedScore - second.fusedScore >= clearMargin)) {
    return {
      match: buildMatchResultForSlug(text, top.slug, top.fusedScore),
      candidates,
      ambiguous: false,
      aiInvoked: false,
      aiProvider: null,
      aiLatencyMs: 0,
      method: 'semantic-fused-clear',
    };
  }

  // Ambiguous — let Gemma pick among the fused top-N (constrained).
  if (isDisambigAiEnabled()) {
    const aiCategories = toAiCategories(candidates.slice(0, aiPickTopN));
    const retrieval = emptyRetrieval(aiCategories);
    const pickContent = await callLlmPick(buildCategoryPickPrompt(text, aiCategories));
    const pickSlug = parseCategorySlug(pickContent);
    if (pickSlug) {
      const validation = validateConstrainedSelection(
        {
          category: pickSlug,
          city: null,
          neighborhood: null,
          transactionType: null,
          budget: null,
          area: null,
          rooms: null,
          confidence: 0.75,
        },
        retrieval
      );
      const accepted = validation.acceptedSlugs.categorySlug;
      if (accepted && semSlugs.includes(accepted)) {
        const chosen = fused.find((f) => f.slug === accepted) ?? top;
        return {
          match: buildMatchResultForSlug(text, accepted, Math.max(chosen.fusedScore, 0.7)),
          candidates,
          ambiguous: true,
          aiInvoked: true,
          aiProvider: 'local-llm',
          aiLatencyMs: Math.round(performance.now() - started),
          method: 'semantic-fused-ai',
        };
      }
    }
  }

  // No clear winner and no AI pick — take the fused top if it's reasonable,
  // otherwise surface candidates for the user to choose.
  if (top.fusedScore >= 0.5) {
    return {
      match: buildMatchResultForSlug(text, top.slug, top.fusedScore),
      candidates,
      ambiguous: true,
      aiInvoked: false,
      aiProvider: null,
      aiLatencyMs: 0,
      method: 'semantic-fused-top',
    };
  }

  return {
    match: null,
    candidates,
    ambiguous: true,
    aiInvoked: false,
    aiProvider: null,
    aiLatencyMs: 0,
    method: 'unresolved',
  };
}

async function runRulesCategoryDisambiguation(
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
