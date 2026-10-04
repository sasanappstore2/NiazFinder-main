/**
 * Limited, unique fuzzy matching for neighborhood names ("محله").
 *
 * Fixes the «اسم محله» failure class: a single-edit typo in a neighborhood
 * name — standalone (سجاد → سجا / جساد) or in one part of a two-part name
 * (وکیل‌آباد → وکل آباد / وکیل آبااد) — used to fall through every exact
 * matcher, and the previous fuzzy fallback skipped multi-word hoods entirely.
 *
 * Design (mirrors the house rules of fuzzy-corrector.ts):
 *  - The valid hood list is ALWAYS a function argument — nothing is hardcoded.
 *  - A candidate is accepted only when its OSA distance to exactly ONE valid
 *    hood is within a small bound (≤1, ≤2 for names ≥7 chars). A tie between
 *    two different hoods is rejected (ambiguity guard), so "limited & unique".
 *  - Two-part (and three-part) names are matched against adjacent token
 *    windows, so a typo in any single part is recoverable.
 *  - Fuzzy results carry a confidence strictly below the exact-match
 *    confidence (0.8 in the rules pipeline): 0.65 for distance 1, 0.60 for
 *    distance 2. Distance-0 hits report the exact confidence.
 *
 * Deterministic, rules-only, no AI, no network.
 *
 * Intended wiring points in smart-field-extractor.ts (owner: wiring step):
 *  1. Fallback scan when no exact hood mention matched:
 *       matchHoodInText(originalText /* fullText *\/, MULTI_HOODS)
 *     replaces matchFuzzyNeighborhood (which skipped two-part hoods). Feed the
 *     RAW text, not the typo-alias/fuzzy-corrector output: that pass can
 *     rewrite a corrupted hood token first (سناد → سند) and the correction is
 *     unrecoverable downstream. This module normalizes internally (ZWNJ,
 *     Arabic variants, digits).
 *  2. Validation of the advanced-rules `neighborhood_with_context` capture:
 *       const m = matchHoodPhrase(patch.neighborhood, MULTI_HOODS);
 *       if (m) patch.neighborhood = m.hood;   // exact → unchanged; fuzzy → corrected
 *     On no match, keep the capture as-is (downstream disambiguation still
 *     validates it) — this module never invents a hood that is not in the list.
 */

import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import { osaDistanceBounded } from '@/intake/intelligence-engine/normalizer/fuzzy-corrector';

/** Confidence returned for an exact (distance 0) match — aligned with the rules pipeline. */
export const EXACT_HOOD_CONFIDENCE = 0.8;
/** Confidence for distance-1 fuzzy matches — strictly below exact (ask requirement). */
export const FUZZY_HOOD_CONFIDENCE = 0.65;
/** Confidence for distance-2 fuzzy matches (long names only). */
export const FAR_HOOD_CONFIDENCE = 0.6;

export interface HoodFuzzyOptions {
  /** Max OSA distance for hood phrases shorter than longPhraseLength (default 1). */
  maxDistanceShort?: number;
  /** Max OSA distance for hood phrases at/above longPhraseLength (default 2). */
  maxDistanceLong?: number;
  /**
   * Hood phrase length from which the long threshold applies (default 8).
   * Mid-length names (≤7 chars) stay at distance 1: at distance 2 they
   * collide with unrelated real place names and common words.
   */
  longPhraseLength?: number;
  /** Minimum normalized token length considered a hood-name candidate (default 3). */
  minTokenLength?: number;
  /**
   * Require a location cue (در، خیابان، محله، …) right before a FUZZY hit in
   * matchHoodInText (default true). Exact hits are never gated. Prevents
   * common verb fragments («خوام») from folding into short hood names.
   */
  requireCueForFuzzy?: boolean;
}

export interface HoodFuzzyMatch {
  /** Canonical hood name, exactly as spelled in the provided validHoods list. */
  hood: string;
  /** 0.8 exact / 0.65 distance-1 / 0.60 distance-2 (overridable via options). */
  confidence: number;
  /** OSA distance between the matched text and the hood (0 = exact after normalization). */
  distance: number;
  /** True when distance === 0 after Persian normalization. */
  exact: boolean;
  /** The (normalized) text span that matched — for traces and telemetry. */
  matchedText: string;
}

interface ResolvedHood {
  hood: string;
  norm: string;
  parts: string[];
  maxD: number;
}

const DIGIT_RE = /[\d\u06F0-\u06F9\u0660-\u0669]/;
/** Names longer than this are common street/place words — never fuzzy targets. */
const MAX_HOOD_PART_LEN = 24;
/** Max number of space-separated parts supported for a hood name. */
const MAX_HOOD_PARTS = 3;

/**
 * Location cues a FUZZY hood hit must follow (mirrors the cues the
 * neighborhood_with_context rule keys on). Exact mentions are not gated.
 */
const LOCATION_CUES: ReadonlySet<string> = new Set(
  ['در', 'تو', 'توی', 'محله', 'منطقه', 'خیابان', 'بلوار', 'میدان', 'کوچه', 'نزدیک', 'نبش', 'حوالی', 'اطراف', 'جنب'].map(
    (c) => normalizePersian(c)
  )
);

function resolveHoods(
  validHoods: readonly string[],
  opts: Required<HoodFuzzyOptions>
): ResolvedHood[] {
  const seen = new Set<string>();
  const out: ResolvedHood[] = [];
  for (const hood of validHoods) {
    if (!hood) continue;
    const norm = normalizePersian(hood);
    if (!norm || seen.has(norm)) continue;
    const parts = norm.split(' ').filter((p) => p.length > 0);
    if (parts.length === 0 || parts.length > MAX_HOOD_PARTS) continue;
    if (parts.some((p) => p.length < opts.minTokenLength || p.length > MAX_HOOD_PART_LEN)) continue;
    seen.add(norm);
    const phraseLen = parts.join('').length;
    const maxD =
      phraseLen >= opts.longPhraseLength ? opts.maxDistanceLong : opts.maxDistanceShort;
    out.push({ hood, norm, parts, maxD });
  }
  return out;
}

function confidenceFor(distance: number): number {
  if (distance <= 0) return EXACT_HOOD_CONFIDENCE;
  if (distance === 1) return FUZZY_HOOD_CONFIDENCE;
  return FAR_HOOD_CONFIDENCE;
}

/** Pick the unique winner among candidate hits; ties between different hoods → null. */
function pickBest(hits: HoodFuzzyMatch[]): HoodFuzzyMatch | null {
  if (hits.length === 0) return null;
  let bestD = Infinity;
  for (const h of hits) if (h.distance < bestD) bestD = h.distance;
  const atBest = hits.filter((h) => h.distance === bestD);
  const uniqueHoods = new Set(atBest.map((h) => normalizePersian(h.hood)));
  if (uniqueHoods.size !== 1) return null; // ambiguous — reject (limited & unique)
  return atBest[0]!;
}

/**
 * Validate/correct one captured neighborhood phrase against the valid list.
 * Returns the canonical hood when the phrase is an exact (after Persian
 * normalization) or an unambiguous near-match (OSA ≤1, ≤2 for long names);
 * null when the phrase matches nothing or matches ambiguously. The caller
 * keeps its previous behavior on null — this module never fabricates hoods.
 */
export function matchHoodPhrase(
  phrase: string,
  validHoods: readonly string[],
  options?: HoodFuzzyOptions
): HoodFuzzyMatch | null {
  if (!phrase) return null;
  const opts: Required<HoodFuzzyOptions> = {
    maxDistanceShort: 1,
    maxDistanceLong: 2,
    longPhraseLength: 8,
    minTokenLength: 3,
    requireCueForFuzzy: true,
    ...options,
  };
  const norm = normalizePersian(phrase);
  if (!norm || DIGIT_RE.test(norm)) return null;

  const hits: HoodFuzzyMatch[] = [];
  for (const hood of resolveHoods(validHoods, opts)) {
    if (Math.abs(norm.length - hood.norm.length) > hood.maxD) continue;
    const d = osaDistanceBounded(norm, hood.norm, hood.maxD);
    if (d > hood.maxD) continue;
    hits.push({
      hood: hood.hood,
      confidence: confidenceFor(d),
      distance: d,
      exact: d === 0,
      matchedText: norm,
    });
  }
  return pickBest(hits);
}

/**
 * Scan free text for a valid neighborhood mention and return the unique best
 * match. Supports two-part (وکیل آباد) and three-part names via adjacent
 * token windows, so a single-edit typo in any one part is recoverable
 * (وکل آبااد → وکیل آباد). Returns null when no hood is within the distance
 * bound or when the best match is ambiguous between different hoods.
 */
export function matchHoodInText(
  text: string,
  validHoods: readonly string[],
  options?: HoodFuzzyOptions
): HoodFuzzyMatch | null {
  if (!text) return null;
  const opts: Required<HoodFuzzyOptions> = {
    maxDistanceShort: 1,
    maxDistanceLong: 2,
    longPhraseLength: 8,
    minTokenLength: 3,
    requireCueForFuzzy: true,
    ...options,
  };
  const normalized = normalizePersian(text);
  if (!normalized) return null;
  const tokens = normalized.split(' ').filter((t) => t.length > 0);
  if (tokens.length === 0) return null;

  const hoods = resolveHoods(validHoods, opts);
  const hits: HoodFuzzyMatch[] = [];

  for (const hood of hoods) {
    const k = hood.parts.length;
    for (let i = 0; i + k <= tokens.length; i++) {
      const window = tokens.slice(i, i + k);
      // Digits and sub-minimal tokens can never be (part of) a hood name.
      if (window.some((t) => t.length < opts.minTokenLength || DIGIT_RE.test(t))) continue;
      const candidate = window.join(' ');
      if (Math.abs(candidate.length - hood.norm.length) > hood.maxD) continue;
      const d = osaDistanceBounded(candidate, hood.norm, hood.maxD);
      if (d > hood.maxD) continue;
      // Fuzzy hits must sit behind a location cue — common words like verb
      // fragments must not fold into short hood names. Exact hits pass free.
      if (d > 0 && opts.requireCueForFuzzy && !(i > 0 && LOCATION_CUES.has(tokens[i - 1]!))) {
        continue;
      }
      hits.push({
        hood: hood.hood,
        confidence: confidenceFor(d),
        distance: d,
        exact: d === 0,
        matchedText: candidate,
      });
    }
  }
  return pickBest(hits);
}
