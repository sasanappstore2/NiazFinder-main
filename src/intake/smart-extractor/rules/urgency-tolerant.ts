/**
 * Typo-tolerant urgency extraction (generic fix for `metadata.urgency=undefined`).
 *
 * The legacy urgency chain in smart-field-extractor matched urgency phrases with
 * exact substring/regex checks, so a single typo inside a trigger word broke the
 * whole class: «فوری» → «فور», «تا آخر تیر» → «تا آرخ تیر» / «تا آخر تتیر» /
 * «تا آخر یر» all yielded `metadata.urgency=undefined`.
 *
 * This module replaces that brittleness with ONE bounded mechanism:
 * phrase templates are matched over normalized tokens where every slot accepts
 * an OSA distance ≤ 1 (restricted Damerau-Levenshtein — handles substitution,
 * insertion, deletion, duplication and transposition) under conservative
 * length guards:
 *   - single-token triggers («فوری», «عجله») require tokens ≥ 3 chars;
 *   - inside multi-token phrases («تا آخر تیر») the surrounding context lets
 *     2-char tokens match too (deleted-letter shapes like «آخ», «یر», «تر»);
 *   - a month slot also accepts exact month+suffix compounds («تیرماه»).
 * Nothing else is loosened: the trigger vocabulary is exactly the legacy one
 * (فوری/فوریه/عجله → immediate, این هفته → this_week, این ماه/ماه جاری/
 * تا آخر <month> → this_month), so clean text keeps the legacy outcome —
 * verified against the full 1000-scenario corpus by urgency-tolerant-self-test.ts.
 *
 * Deterministic, rules-only, no AI. Kill switch: INTAKE_FUZZY_CORRECTOR=false
 * (same semantics as fuzzy-corrector) degrades this module to exact matching.
 *
 * Intended wiring: replace the urgency includes/regex chain inside
 * `extractWithRules` (smart-field-extractor.ts) with
 *   const urgency = extractUrgencyTolerant(normalizedText);
 *   if (urgency) {
 *     result.metadata.urgency = urgency.urgency;
 *     result.trace!.rulesUsed.push(...urgency.rules);
 *   }
 */
import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import { osaDistanceBounded } from '@/intake/intelligence-engine/normalizer/fuzzy-corrector';

export type UrgencyLevel = 'immediate' | 'this_week' | 'this_month';

export interface TolerantUrgencyMatch {
  urgency: UrgencyLevel;
  /**
   * Trace rule names with legacy parity: 'immediate' pushed 'urgency',
   * 'this_month' pushed 'urgency_deadline_month', 'this_week' pushed none.
   * When `tolerant` is true the wiring may additionally push a distinct rule
   * tag for telemetry.
   */
  rules: string[];
  /** True when at least one slot matched fuzzily (distance > 0). */
  tolerant: boolean;
  /** Sum of per-slot OSA distances (0 = exact legacy match). */
  distance: number;
  /** Matched substring of the (normalized) input text. */
  matchedText: string;
}

/** Solar Hijri months the legacy deadline regex accepted. */
const MONTHS: readonly string[] = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

type Slot = { kind: 'kw'; word: string } | { kind: 'month' };

interface Phrase {
  urgency: UrgencyLevel;
  /** Legacy trace tag(s) — kept for drop-in parity with the old chain. */
  rules: string[];
  /** Single-token phrases keep the stricter ≥3-char token floor. */
  single: boolean;
  slots: Slot[];
}

/**
 * Phrase templates in legacy evaluation order — the list order doubles as the
 * priority tie-break (immediate > this_week > this_month), mirroring the
 * legacy if/else chain.
 */
const PHRASES: readonly Phrase[] = [
  { urgency: 'immediate', rules: ['urgency'], single: true, slots: [{ kind: 'kw', word: 'فوری' }] },
  { urgency: 'immediate', rules: ['urgency'], single: true, slots: [{ kind: 'kw', word: 'فوریه' }] },
  { urgency: 'immediate', rules: ['urgency'], single: true, slots: [{ kind: 'kw', word: 'عجله' }] },
  {
    urgency: 'this_week',
    rules: [],
    single: false,
    slots: [{ kind: 'kw', word: 'این' }, { kind: 'kw', word: 'هفته' }],
  },
  {
    urgency: 'this_month',
    rules: ['urgency_deadline_month'],
    single: false,
    slots: [{ kind: 'kw', word: 'این' }, { kind: 'kw', word: 'ماه' }],
  },
  {
    urgency: 'this_month',
    rules: ['urgency_deadline_month'],
    single: false,
    slots: [{ kind: 'kw', word: 'ماه' }, { kind: 'kw', word: 'جاری' }],
  },
  {
    urgency: 'this_month',
    rules: ['urgency_deadline_month'],
    single: false,
    slots: [{ kind: 'kw', word: 'تا' }, { kind: 'kw', word: 'آخر' }, { kind: 'month' }],
  },
];

const MAX_DISTANCE = 1;
/** Tokens shorter than this never match fuzzily in single-token phrases. */
const SINGLE_TOKEN_MIN_LEN = 3;
/** Inside multi-token phrases the context lets 2-char tokens match («آخ», «یر»). */
const PHRASE_TOKEN_MIN_LEN = 2;
/** Max extra chars an exact month compound may carry («تیرماه», «تیری»). */
const MAX_MONTH_SUFFIX = 3;

interface Token {
  text: string;
  start: number;
  end: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return tokens;
}

/** Same kill-switch semantics as the fuzzy corrector. */
function isFuzzyDisabled(): boolean {
  const raw = process.env.INTAKE_FUZZY_CORRECTOR?.trim().toLowerCase();
  return raw === 'false' || raw === '0' || raw === 'off' || raw === 'no';
}

function withinLengthBand(tokenLen: number, keywordLen: number, minTokenLen: number): boolean {
  if (tokenLen < minTokenLen) return false;
  if (keywordLen < 2) return false;
  return Math.abs(tokenLen - keywordLen) <= MAX_DISTANCE;
}

/** Exact month match, including month+suffix compounds («تیرماه», «مهرماه»). */
function isExactMonth(token: string): boolean {
  return MONTHS.some(
    (month) =>
      token === month ||
      (token.length > month.length &&
        token.length - month.length <= MAX_MONTH_SUFFIX &&
        token.startsWith(month))
  );
}

/** Distance of a token to one keyword, or null when not eligible. */
function keywordDistance(token: string, keyword: string, minTokenLen: number): number | null {
  if (token === keyword) return 0;
  if (!withinLengthBand(token.length, keyword.length, minTokenLen)) return null;
  const d = osaDistanceBounded(token, keyword, MAX_DISTANCE);
  return d <= MAX_DISTANCE ? d : null;
}

/** Best fuzzy distance of a token to the month slot, or null when ineligible. */
function fuzzyMonthDistance(token: string, minTokenLen: number): number | null {
  let best: number | null = null;
  for (const month of MONTHS) {
    if (!withinLengthBand(token.length, month.length, minTokenLen)) continue;
    const d = osaDistanceBounded(token, month, MAX_DISTANCE);
    if (d <= MAX_DISTANCE && (best === null || d < best)) best = d;
  }
  return best;
}

function slotDistance(
  token: string,
  slot: Slot,
  single: boolean,
  fuzzyAllowed: boolean
): number | null {
  if (!fuzzyAllowed) {
    // Kill switch: exact matches only.
    return slot.kind === 'kw' ? (token === slot.word ? 0 : null) : isExactMonth(token) ? 0 : null;
  }
  const minTokenLen = single ? SINGLE_TOKEN_MIN_LEN : PHRASE_TOKEN_MIN_LEN;
  return slot.kind === 'kw'
    ? keywordDistance(token, slot.word, minTokenLen)
    : isExactMonth(token)
      ? 0
      : fuzzyMonthDistance(token, minTokenLen);
}

interface BestMatch {
  phrase: Phrase;
  phraseIdx: number;
  distance: number;
  slots: number;
  tolerant: boolean;
  start: number;
  end: number;
}

function isBetterMatch(candidate: BestMatch, best: BestMatch): boolean {
  if (candidate.distance !== best.distance) return candidate.distance < best.distance;
  // Fuzzy ties: a longer phrase (more context slots) is the stronger reading —
  // e.g. «ماه فاری» reads as a corrupted «ماه جاری» (2 slots), not «فوری» (1).
  if (candidate.distance > 0 && candidate.slots !== best.slots) {
    return candidate.slots > best.slots;
  }
  // Exact ties (and fuzzy ties at equal slot count): legacy evaluation order.
  return candidate.phraseIdx < best.phraseIdx;
}

function findBestMatch(text: string, tokens: Token[]): BestMatch | null {
  const fuzzyAllowed = !isFuzzyDisabled();
  let best: BestMatch | null = null;

  for (let p = 0; p < PHRASES.length; p++) {
    const phrase = PHRASES[p]!;
    for (let i = 0; i + phrase.slots.length <= tokens.length; i++) {
      let total = 0;
      let tolerant = false;
      let ok = true;
      for (let s = 0; s < phrase.slots.length; s++) {
        const d = slotDistance(tokens[i + s]!.text, phrase.slots[s]!, phrase.single, fuzzyAllowed);
        if (d === null) {
          ok = false;
          break;
        }
        total += d;
        if (d > 0) tolerant = true;
      }
      if (!ok) continue;
      const candidate: BestMatch = {
        phrase,
        phraseIdx: p,
        distance: total,
        slots: phrase.slots.length,
        tolerant,
        start: tokens[i]!.start,
        end: tokens[i + phrase.slots.length - 1]!.end,
      };
      if (!best || isBetterMatch(candidate, best)) best = candidate;
    }
  }
  return best;
}

/**
 * Extract `metadata.urgency` from normalized intake text with bounded fuzzy
 * tolerance. Returns null when no urgency phrase (exact or within one edit)
 * is present — the caller then leaves `metadata.urgency` unset, exactly like
 * the legacy chain.
 */
export function extractUrgencyTolerant(needText: string): TolerantUrgencyMatch | null {
  if (!needText) return null;
  // normalizePersian is idempotent; running it makes the module safe for
  // callers that pass raw text (the extractor passes normalizedText already).
  const text = normalizePersian(needText);
  if (!text) return null;

  const best = findBestMatch(text, tokenize(text));
  if (!best) return null;

  return {
    urgency: best.phrase.urgency,
    rules: [...best.phrase.rules],
    tolerant: best.tolerant,
    distance: best.distance,
    matchedText: text.slice(best.start, best.end),
  };
}
