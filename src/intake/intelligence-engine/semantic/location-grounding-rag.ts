/**
 * Hybrid RAG location grounding (fallback layer).
 *
 * Loads the precomputed bge-m3 embeddings of the location/category grounding
 * corpus (provinces + cities + categories + major-capital neighborhoods) into an
 * in-memory L2-normalized index, and answers "which city/province does this text
 * refer to?" by cosine similarity — used ONLY as a fallback when the deterministic
 * catalog lookup is empty/ambiguous.
 *
 * Fully offline (local bge-m3 gateway). Degrades to [] if the embeddings file is
 * missing or the gateway is down, so the deterministic path always still works.
 *
 * Vectors are L2-normalized at load → cosine == dot product (fast, no per-call
 * norm). ~5.9k vectors × 1024 dims as Float32 ≈ 24MB resident.
 */
import 'server-only';

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { embedText } from '@/lib/local-llm/local-embeddings-client';
import { normalizeForEmbedding } from '@/intake/intelligence-engine/semantic/finglish';

const EMBED_FILE = path.join(process.cwd(), 'data/rag/location-grounding.embeddings.jsonl');

export type GroundingType = 'province' | 'city' | 'neighborhood' | 'category';

export interface GroundingMeta {
  id: string;
  type: GroundingType;
  name: string;
  nameEn?: string | null;
  aliases?: string[];
  province?: string;
  provinceId?: string;
  city?: string;
  cityId?: string;
  slug?: string;
  path?: string;
}

export interface GroundingCandidate extends GroundingMeta {
  score: number;
}

interface GroundingIndex {
  meta: GroundingMeta[];
  matrix: Float32Array; // flat [count * dims], each row L2-normalized
  dims: number;
  count: number;
}

let indexCache: GroundingIndex | null | undefined; // undefined = not tried, null = unavailable

function normalizeRow(out: Float32Array, base: number, dims: number): void {
  let sum = 0;
  for (let i = 0; i < dims; i++) sum += out[base + i]! * out[base + i]!;
  const inv = sum > 0 ? 1 / Math.sqrt(sum) : 0;
  for (let i = 0; i < dims; i++) out[base + i] = out[base + i]! * inv;
}

function loadIndex(): GroundingIndex | null {
  if (indexCache !== undefined) return indexCache;
  try {
    if (!existsSync(EMBED_FILE)) {
      indexCache = null;
      return null;
    }
    const lines = readFileSync(EMBED_FILE, 'utf8').split('\n').filter(Boolean);
    const count = lines.length;
    const meta: GroundingMeta[] = new Array(count);
    let dims = 0;
    let matrix: Float32Array | null = null;
    for (let r = 0; r < count; r++) {
      const rec = JSON.parse(lines[r]!) as GroundingMeta & { vec: number[] };
      const vec = rec.vec;
      if (!dims) {
        dims = vec.length;
        matrix = new Float32Array(count * dims);
      }
      const base = r * dims;
      for (let i = 0; i < dims; i++) matrix![base + i] = vec[i]!;
      normalizeRow(matrix!, base, dims);
      const { vec: _omit, ...m } = rec;
      meta[r] = m;
    }
    indexCache = matrix ? { meta, matrix, dims, count } : null;
    return indexCache;
  } catch {
    indexCache = null;
    return null;
  }
}

export function resetLocationGroundingIndex(): void {
  indexCache = undefined;
}

export function isLocationRagAvailable(): boolean {
  return loadIndex() != null;
}

/** Top-K grounding records most similar to `text`. [] if unavailable. */
export async function queryLocationGrounding(
  text: string,
  opts?: { k?: number; types?: GroundingType[] },
): Promise<GroundingCandidate[]> {
  const idx = loadIndex();
  if (!idx) return [];
  const q = await embedText(normalizeForEmbedding(text));
  if (!q || q.length !== idx.dims) return [];

  // Normalize the query so dot product == cosine.
  let qn = 0;
  for (let i = 0; i < idx.dims; i++) qn += q[i]! * q[i]!;
  const inv = qn > 0 ? 1 / Math.sqrt(qn) : 0;
  const qv = new Float32Array(idx.dims);
  for (let i = 0; i < idx.dims; i++) qv[i] = q[i]! * inv;

  const typeFilter = opts?.types ? new Set(opts.types) : null;
  const k = opts?.k ?? 8;
  const scored: GroundingCandidate[] = [];
  for (let r = 0; r < idx.count; r++) {
    if (typeFilter && !typeFilter.has(idx.meta[r]!.type)) continue;
    const base = r * idx.dims;
    let dot = 0;
    for (let i = 0; i < idx.dims; i++) dot += qv[i]! * idx.matrix[base + i]!;
    scored.push({ ...idx.meta[r]!, score: dot });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export interface RagLocationResult {
  cityName: string | null;
  province: string | null;
  neighborhoodName: string | null;
  viaType: GroundingType;
  score: number;
  candidates: GroundingCandidate[];
}

/**
 * Resolve a free-text location mention to city + province via RAG. Returns null
 * when nothing clears `minScore` (so the caller can keep the deterministic
 * result). If the text explicitly names a province, candidates inside it win.
 */
export async function ragResolveLocation(
  text: string,
  opts?: { minScore?: number },
): Promise<RagLocationResult | null> {
  const cands = await queryLocationGrounding(text, {
    k: 10,
    types: ['province', 'city', 'neighborhood'],
  });
  if (!cands.length) return null;
  if (cands[0]!.score < (opts?.minScore ?? 0.5)) return null;

  const norm = normalizeForEmbedding(text);
  const provinceMentioned = cands.find(
    (c) => c.type === 'province' && norm.includes(normalizeForEmbedding(c.name)),
  );
  const pool = provinceMentioned
    ? cands.filter((c) => (c.type === 'province' ? c.name : c.province) === provinceMentioned.name)
    : cands;
  const best = pool[0] ?? cands[0]!;

  if (best.type === 'province') {
    return { cityName: null, province: best.name, neighborhoodName: null, viaType: 'province', score: best.score, candidates: cands };
  }
  if (best.type === 'city') {
    return { cityName: best.name, province: best.province ?? null, neighborhoodName: null, viaType: 'city', score: best.score, candidates: cands };
  }
  return { cityName: best.city ?? null, province: best.province ?? null, neighborhoodName: best.name, viaType: 'neighborhood', score: best.score, candidates: cands };
}
