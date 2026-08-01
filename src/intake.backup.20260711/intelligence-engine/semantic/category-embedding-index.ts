/**
 * In-memory semantic category index.
 *
 * Embeds category exemplars once (lazy, cached), then ranks categories for a
 * query by max cosine similarity over each category's exemplar vectors. Fully
 * offline (local embedding gateway). Degrades gracefully: if the gateway is
 * unreachable it returns [] so the keyword-rules path still works.
 */
import 'server-only';

import { buildCategoryExemplars } from '@/intake/intelligence-engine/semantic/category-exemplars';
import {
  embedBatch,
  embedText,
  cosineSimilarity,
} from '@/lib/local-llm/local-embeddings-client';
import { docPrefix, queryPrefix, semanticTopK } from '@/intake/intelligence-engine/semantic/config';
import { normalizeForEmbedding } from '@/intake/intelligence-engine/semantic/finglish';

interface IndexedCategory {
  slug: string;
  vertical: string;
  vecs: number[][];
}

export interface SemanticCandidate {
  slug: string;
  vertical: string;
  score: number;
}

let indexPromise: Promise<IndexedCategory[] | null> | null = null;

async function buildIndex(): Promise<IndexedCategory[] | null> {
  const cats = buildCategoryExemplars();
  const flat: string[] = [];
  const owner: number[] = [];
  cats.forEach((c, ci) => {
    for (const ex of c.exemplars) {
      flat.push(ex);
      owner.push(ci);
    }
  });

  const vecs = await embedBatch(flat, { prefix: docPrefix() });
  if (!vecs) return null;

  const out: IndexedCategory[] = cats.map((c) => ({
    slug: c.slug,
    vertical: c.vertical,
    vecs: [],
  }));
  vecs.forEach((v, i) => {
    out[owner[i]!]!.vecs.push(v);
  });
  return out.filter((c) => c.vecs.length > 0);
}

async function getIndex(): Promise<IndexedCategory[] | null> {
  if (!indexPromise) indexPromise = buildIndex();
  const idx = await indexPromise;
  if (!idx) indexPromise = null; // failed — allow a retry on the next call
  return idx;
}

/** Warm the index ahead of first request (optional). */
export async function warmCategoryEmbeddingIndex(): Promise<boolean> {
  return (await getIndex()) != null;
}

export function resetCategoryEmbeddingIndex(): void {
  indexPromise = null;
}

/** Top-K categories by semantic similarity to `text`. [] if embeddings unavailable. */
export async function semanticCategoryCandidates(
  text: string,
  k: number = semanticTopK()
): Promise<SemanticCandidate[]> {
  try {
    const idx = await getIndex();
    if (!idx?.length) return [];
    const q = await embedText(normalizeForEmbedding(text), { prefix: queryPrefix() });
    if (!q) return [];

    const scored: SemanticCandidate[] = idx.map((c) => {
      let best = -1;
      for (const v of c.vecs) {
        const s = cosineSimilarity(q, v);
        if (s > best) best = s;
      }
      return { slug: c.slug, vertical: c.vertical, score: best };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  } catch {
    return [];
  }
}
