/** Config for the semantic category-retrieval layer (offline embeddings). */

export function isSemanticRetrievalEnabled(): boolean {
  return process.env.NEED_INTAKE_SEMANTIC_RETRIEVAL_ENABLED === 'true';
}

/** Smart city/neighborhood resolver (full-catalog inference + finglish/fuzzy). */
export function isSemanticLocationEnabled(): boolean {
  return process.env.NEED_INTAKE_SEMANTIC_LOCATION_ENABLED === 'true';
}

/**
 * RAG fallback for location grounding (bge-m3 embeddings over the province/city/
 * neighborhood corpus). Used ONLY when the deterministic resolver finds no city.
 */
export function isLocationRagEnabled(): boolean {
  return process.env.NEED_INTAKE_LOCATION_RAG_ENABLED === 'true';
}

/** Embedding prefix convention: bge-m3 = none, e5 = query/passage, nomic = search_*. */
export type EmbedPrefixStyle = 'none' | 'e5' | 'nomic';

export function getEmbedPrefixStyle(): EmbedPrefixStyle {
  const v = (process.env.LOCAL_EMBED_PREFIX_STYLE ?? 'none').toLowerCase();
  return v === 'e5' || v === 'nomic' ? v : 'none';
}

export function queryPrefix(): string | undefined {
  const s = getEmbedPrefixStyle();
  return s === 'e5' ? 'query: ' : s === 'nomic' ? 'search_query: ' : undefined;
}

export function docPrefix(): string | undefined {
  const s = getEmbedPrefixStyle();
  return s === 'e5' ? 'passage: ' : s === 'nomic' ? 'search_document: ' : undefined;
}

/** How many semantic candidate categories to surface for fusion / disambiguation. */
export function semanticTopK(): number {
  const n = Number(process.env.NEED_INTAKE_SEMANTIC_TOP_K ?? 12);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 12;
}

function num(env: string | undefined, fallback: number): number {
  const n = Number(env);
  return Number.isFinite(n) ? n : fallback;
}

/** Fusion weights + decision thresholds (env-tunable for fast iteration). */
export function fusionParams(): {
  semWeight: number;
  ruleWeight: number;
  clearMin: number;
  clearMargin: number;
  aiPickTopN: number;
} {
  // Semantic-dominant: the synthetic rule packs are noisy and even mislabeled,
  // so rules act only as a light tiebreak/boost, never overriding semantics.
  return {
    semWeight: num(process.env.NEED_INTAKE_FUSION_SEM_WEIGHT, 0.9),
    ruleWeight: num(process.env.NEED_INTAKE_FUSION_RULE_WEIGHT, 0.1),
    clearMin: num(process.env.NEED_INTAKE_FUSION_CLEAR_MIN, 0.5),
    clearMargin: num(process.env.NEED_INTAKE_FUSION_CLEAR_MARGIN, 0.04),
    aiPickTopN: num(process.env.NEED_INTAKE_FUSION_AI_TOPN, 6),
  };
}
