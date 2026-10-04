/**
 * Shared typo-simulation and evaluation helpers for the smart-intake tests.
 * Used by typo-stress-test.ts (permanent gate) and scripts/deep-test/eval-slice.ts
 * (workflow deep test). Keep the seed formulas stable — numbers are compared
 * across runs.
 */
import { extractSmartFields } from '../smart-field-extractor';
import type { ExpectedField, SmartIntakeScenario } from './scenarios';

/** Deterministic PRNG so failure reproduction is exact. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const PERSIAN_LETTERS = 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی';

export type TypoOp = 'delete' | 'duplicate' | 'insert' | 'substitute' | 'transpose';
export const TYPO_OPS: TypoOp[] = ['delete', 'duplicate', 'insert', 'substitute', 'transpose'];

/** Corrupt one random letter-word with one random single-edit op. */
export function injectTypo(text: string, rng: () => number): { text: string; word: string } | null {
  const words = text.split(/\s+/);
  const candidates = words
    .map((w, i) => ({ w, i }))
    .filter(
      ({ w }) =>
        w.length >= 3 &&
        /[\u0600-\u06FF]/.test(w) &&
        !/^[\d\u06F0-\u06F9\u0660-\u0669.,]+$/.test(w)
    );
  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(rng() * candidates.length)]!;
  const word = pick.w;
  const pos = Math.floor(rng() * word.length);
  const op = TYPO_OPS[Math.floor(rng() * TYPO_OPS.length)]!;
  const letter = PERSIAN_LETTERS[Math.floor(rng() * PERSIAN_LETTERS.length)]!;

  let corrupted: string;
  switch (op) {
    case 'delete':
      corrupted = word.slice(0, pos) + word.slice(pos + 1);
      break;
    case 'duplicate':
      corrupted = word.slice(0, pos) + word[pos] + word.slice(pos);
      break;
    case 'insert':
      corrupted = word.slice(0, pos) + letter + word.slice(pos);
      break;
    case 'substitute':
      corrupted = word.slice(0, pos) + letter + word.slice(pos + 1);
      break;
    case 'transpose':
      if (pos === word.length - 1) {
        corrupted = word.slice(0, pos - 1) + word[pos] + word[pos - 1];
      } else {
        corrupted = word.slice(0, pos) + word[pos + 1] + word[pos] + word.slice(pos + 2);
      }
      break;
  }
  if (corrupted === word) return null;
  words[pick.i] = corrupted;
  return { text: words.join(' '), word };
}

// ---------- evaluation (same semantics as comprehensive-test.ts) ----------

export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const p of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function checkField(result: unknown, field: ExpectedField): string | null {
  const actual = getPath(result, field.path);

  if ('disambiguationNeeded' in field && field.disambiguationNeeded) {
    const needed = getPath(result, 'location.disambiguationNeeded') === true;
    const alts = getPath(result, 'location.alternatives');
    const altLen = Array.isArray(alts) ? alts.length : 0;
    if (!(needed && altLen >= (field.alternativesMin ?? 2))) return 'disambiguation';
    return null;
  }
  if ('includes' in field && field.includes != null) {
    const norm = (s: string) => String(s).replace(/\u200c/g, '').replace(/\s+/g, '');
    return typeof actual === 'string' &&
      (actual.includes(field.includes) || norm(actual).includes(norm(field.includes)))
      ? null
      : `${field.path}.includes`;
  }
  if ('equals' in field) {
    return actual === field.equals ? null : `${field.path}=${JSON.stringify(actual)}`;
  }
  return null;
}

export interface EvalOutcome {
  ok: boolean;
  failures: string[];
  ms: number;
}

export async function evaluateScenario(
  scenario: SmartIntakeScenario,
  text: string
): Promise<EvalOutcome> {
  const started = Date.now();
  const failures: string[] = [];
  try {
    const result = await extractSmartFields(text, '', {
      preferredCity: scenario.preferredCity ?? 'مشهد',
      preferredCitySlug: scenario.preferredCitySlug ?? 'mashhad',
      useAI: false,
      useRules: true,
    });
    if (!scenario.smokeOnly && scenario.expected.length > 0) {
      for (const field of scenario.expected) {
        const fail = checkField(result, field);
        if (fail) failures.push(fail);
      }
    }
  } catch (err) {
    failures.push(`throw:${err instanceof Error ? err.message : String(err)}`);
  }
  return { ok: failures.length === 0, failures, ms: Date.now() - started };
}
