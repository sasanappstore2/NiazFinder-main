import 'server-only';

import type { CategoryMatchCandidate, CategoryMatchResult } from '@/intake/rules/types';
import {
  categoryCandidatesForUi,
  runCategoryIntentEngine,
} from '@/intake/intelligence-engine/category/category-intent-engine';

export { categoryCandidatesForUi };

export interface CategoryDisambiguationResult {
  match: CategoryMatchResult | null;
  candidates: CategoryMatchCandidate[];
  ambiguous: boolean;
  aiInvoked: boolean;
  aiProvider: string | null;
  aiLatencyMs: number;
  method: 'rules-clear' | 'rules-ambiguous' | 'ai-pick' | 'ai-suggest-revalidate' | 'unresolved';
}

/**
 * Thin legacy wrapper — category+intent live in category-intent-engine.
 */
export async function runCategoryDisambiguation(
  text: string,
  opts?: { slugHints?: string[] }
): Promise<CategoryDisambiguationResult> {
  const result = await runCategoryIntentEngine({
    text,
    slugHints: opts?.slugHints,
  });

  const method =
    result.method === 'locked' ||
    result.method === 'rules-fallback' ||
    result.method === 'rules-clear'
      ? result.method === 'rules-clear'
        ? 'rules-clear'
        : result.match
          ? 'rules-clear'
          : 'unresolved'
      : result.method === 'ai-pick'
        ? 'ai-pick'
        : result.method === 'ai-suggest-revalidate'
          ? 'ai-suggest-revalidate'
          : result.method === 'rules-ambiguous'
            ? 'rules-ambiguous'
            : 'unresolved';

  return {
    match: result.match,
    candidates: result.candidates,
    ambiguous: result.ambiguous,
    aiInvoked: result.aiInvoked,
    aiProvider: result.aiProvider,
    aiLatencyMs: result.aiLatencyMs,
    method,
  };
}
