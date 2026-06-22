/**
 * Validate LLM-proposed category slugs against the REAL category tree + rule
 * packs. Drops anything that isn't a real leaf (no hallucination), then ranks by
 * a blend of the LLM's order and keyword-rule confidence.
 */
import { isCategorySlug, normalizeCategoryPair } from '@/config/categories';
import {
  matchCandidatesWithinSlugs,
  buildMatchResultForSlug,
} from '@/intake/rules/registry.server';
import type { CategoryMatchCandidate, CategoryMatchResult } from '@/intake/rules/types';

export interface ValidatedCategories {
  top: CategoryMatchResult | null;
  candidates: CategoryMatchCandidate[];
}

export interface SemanticSlugCandidate {
  slug: string;
  score: number; // cosine 0..1
}

/** Normalize any slug to its real leaf, or null if not a real category. */
function toLeaf(raw: string): string | null {
  const slug = raw.trim();
  if (!slug || !isCategorySlug(slug)) return null;
  const pair = normalizeCategoryPair(slug);
  return pair.subcategorySlug ?? pair.categorySlug ?? null;
}

/**
 * Validate + rank category candidates. The pool = LLM-proposed slugs ∪ semantic
 * (bge-m3) candidates. Rules + semantic are the PRECISION signal and outweigh the
 * raw LLM rank, so a confident-but-wrong LLM slug with no rule/semantic support
 * can't win (it falls below the auto-fill gate → surfaces as a chip instead).
 * This is what rescues OOV items (e.g. گرامافون → آلات موسیقی via semantic).
 */
export function validateProposedCategories(
  text: string,
  proposedSlugs: string[],
  semantic: SemanticSlugCandidate[] = [],
): ValidatedCategories {
  // LLM rank weight per leaf (1.0 best → decreasing).
  const llmLeaves: string[] = [];
  for (const raw of proposedSlugs) {
    const leaf = toLeaf(raw);
    if (leaf && !llmLeaves.includes(leaf)) llmLeaves.push(leaf);
  }
  const llmWeight = new Map<string, number>();
  llmLeaves.forEach((slug, i) => llmWeight.set(slug, (llmLeaves.length - i) / llmLeaves.length));

  // Semantic score per leaf.
  const semWeight = new Map<string, number>();
  for (const c of semantic) {
    const leaf = toLeaf(c.slug);
    if (leaf) semWeight.set(leaf, Math.max(semWeight.get(leaf) ?? 0, c.score));
  }

  const pool = [...new Set([...llmLeaves, ...semWeight.keys()])];
  if (!pool.length) return { top: null, candidates: [] };

  // Keyword-score within just the pool (cheap; no full-registry scan).
  const ruleCandidates = matchCandidatesWithinSlugs(text, pool, { limit: pool.length });
  const ruleBySlug = new Map(ruleCandidates.map((c) => [c.slug, c]));

  const candidates: CategoryMatchCandidate[] = pool.map((slug) => {
    const llm = llmWeight.get(slug) ?? 0;
    const sem = semWeight.get(slug) ?? 0;
    const ruleHit = ruleBySlug.get(slug);
    const ruleConf = ruleHit?.confidence ?? 0;
    // Precision-first: rules + semantic dominate; LLM rank is a lighter prior.
    let confidence = 0.45 * ruleConf + 0.35 * sem + 0.2 * llm;
    if (llm > 0 && sem > 0) confidence += 0.1; // LLM↔semantic agreement bonus
    return {
      slug,
      score: ruleHit?.score ?? 0,
      confidence: Math.min(1, confidence),
      matchedRules: ruleHit?.matchedRules ?? [],
      source: ruleHit ? 'registry' : 'semantic',
    };
  });
  candidates.sort((a, b) => b.confidence - a.confidence);

  const best = candidates[0];
  const top = best ? buildMatchResultForSlug(text, best.slug, best.confidence) : null;
  return { top, candidates: candidates.slice(0, 6) };
}
