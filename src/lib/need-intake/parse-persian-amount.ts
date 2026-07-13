/**
 * Parse colloquial Persian number phrases for intake budgets (million/billion toman).
 * Word-boundary aware so "sad" (100) does not match inside "pon-sad" (500).
 */
import { toAsciiDigits } from '@/lib/format/digits';

const ONES: Record<string, number> = {
  '\u06CC\u06A9': 1,
  '\u06CC\u0647': 1,
  '\u062F\u0648': 2,
  '\u0633\u0647': 3,
  '\u0686\u0647\u0627\u0631': 4,
  '\u067E\u0646\u062C': 5,
  '\u0634\u0634': 6,
  '\u0634\u06CC\u0634': 6,
  '\u0647\u0641\u062A': 7,
  '\u0647\u0634\u062A': 8,
  '\u0646\u0647': 9,
  '\u062F\u0647': 10,
  '\u06CC\u0627\u0632\u062F\u0647': 11,
  '\u062F\u0648\u0627\u0632\u062F\u0647': 12,
  '\u0633\u06CC\u0632\u062F\u0647': 13,
  '\u0686\u0647\u0627\u0631\u062F\u0647': 14,
  '\u067E\u0627\u0646\u0632\u062F\u0647': 15,
  '\u0634\u0627\u0646\u0632\u062F\u0647': 16,
  '\u0647\u0641\u062F\u0647': 17,
  '\u0647\u062C\u062F\u0647': 18,
  '\u0646\u0648\u0632\u062F\u0647': 19,
};

const TENS: Record<string, number> = {
  '\u0628\u06CC\u0633\u062A': 20,
  '\u0633\u06CC': 30,
  '\u0686\u0647\u0644': 40,
  '\u067E\u0646\u062C\u0627\u0647': 50,
  '\u0634\u0635\u062A': 60,
  '\u0647\u0641\u062A\u0627\u062F': 70,
  '\u0647\u0634\u062A\u0627\u062F': 80,
  '\u0646\u0648\u062F': 90,
};

const HUNDREDS: Record<string, number> = {
  '\u0635\u062F': 100,
  '\u062F\u0648\u06CC\u0633\u062A': 200,
  '\u0633\u06CC\u0635\u062F': 300,
  '\u0686\u0647\u0627\u0631\u0635\u062F': 400,
  '\u067E\u0627\u0646\u0635\u062F': 500,
  '\u067E\u0648\u0646\u0635\u062F': 500,
  '\u0634\u0634\u0635\u062F': 600,
  '\u0634\u06CC\u0634\u0635\u062F': 600,
  '\u0647\u0641\u062A\u0635\u062F': 700,
  '\u0647\u0634\u062A\u0635\u062F': 800,
  '\u0646\u0647\u0635\u062F': 900,
};

const COLLOQUIAL_ALIASES: Record<string, string> = {
  '\u067E\u0648\u0646\u0635\u062F': '\u067E\u0627\u0646\u0635\u062F',
  '\u067E\u0648\u0646 \u0635\u062F': '\u067E\u0627\u0646\u0635\u062F',
  '\u0634\u06CC\u0634\u0635\u062F': '\u0634\u0634\u0635\u062F',
  '\u0634\u06CC\u0634 \u0635\u062F': '\u0634\u0634\u0635\u062F',
  // Common misspelling: ملیون → میلیون
  '\u0645\u0644\u06CC\u0648\u0646': '\u0645\u06CC\u0644\u06CC\u0648\u0646',
  '\u0645\u0644\u06CC\u0627\u0631\u062F': '\u0645\u06CC\u0644\u06CC\u0627\u0631\u062F',
};

const PHRASE_LOOKUP: Record<string, number> = {
  ...ONES,
  ...TENS,
  ...HUNDREDS,
  '\u0646\u0647\u0635\u062F \u0648 \u067E\u0646\u062C\u0627\u0647': 950,
  '\u0633\u06CC\u0635\u062F \u0648 \u067E\u0646\u062C\u0627\u0647': 350,
  '\u0635\u062F \u0648 \u0633\u06CC': 130,
  '\u0635\u062F \u0648 \u0628\u06CC\u0633\u062A': 120,
  '\u0635\u062F \u0648 \u067E\u0646\u062C\u0627\u0647': 150,
  '\u06CC\u06A9 \u0648 \u0646\u06CC\u0645': 1.5,
  '\u06CC\u0647 \u0648 \u0646\u06CC\u0645': 1.5,
};

const PERSIAN_LETTER = '\\u0600-\\u06FF';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeAmountToken(raw: string): string {
  return raw.trim().replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Normalize colloquial amount word variants before parsing. */
export function normalizeColloquialAmountWords(text: string): string {
  let out = text;
  const entries = Object.entries(COLLOQUIAL_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of entries) {
    out = out.replace(new RegExp(escapeRegex(from), 'gu'), to);
  }
  return out;
}

function lookupWord(token: string): number | undefined {
  const t = normalizeAmountToken(token);
  if (!t) return undefined;
  if (PHRASE_LOOKUP[t] != null) return PHRASE_LOOKUP[t];
  const ascii = toAsciiDigits(t);
  const n = Number(ascii.replace(/,/g, ''));
  if (Number.isFinite(n) && n > 0) return n;
  return undefined;
}

/** Parse a Persian number phrase to a scalar (e.g. compound hundreds + tens, or 500). */
export function parsePersianAmountPhrase(raw: string): number | null {
  let t = normalizeColloquialAmountWords(normalizeAmountToken(raw));
  if (!t) return null;

  const direct = lookupWord(t);
  if (direct != null) return direct;

  if (/^(?:\u06CC\u0647|\u06CC\u06A9)\s*\u0648\s*\u0646\u06CC\u0645$/u.test(t)) return 1.5;

  if (t.includes(' \u0648 ')) {
    const parts = t.split(/\s+\u0648\s+/u).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      let sum = 0;
      let ok = true;
      for (const part of parts) {
        const n = lookupWord(part);
        if (n == null) {
          ok = false;
          break;
        }
        sum += n;
      }
      if (ok && sum > 0) return sum;
    }
  }

  return null;
}

export function parseMillionTomanFromPhrase(phrase: string): number | undefined {
  const n = parsePersianAmountPhrase(phrase);
  if (n == null || n <= 0 || n > 5_000) return undefined;
  return Math.round(n * 1_000_000);
}

export function parseBillionTomanFromPhrase(phrase: string): number | undefined {
  const n = parsePersianAmountPhrase(phrase);
  if (n == null || n <= 0 || n > 500) return undefined;
  return Math.round(n * 1_000_000_000);
}

function boundedWordAlternation(): string {
  const words = Object.keys(PHRASE_LOOKUP).sort((a, b) => b.length - a.length);
  const bounded = words.map(
    (w) => `(?<![${PERSIAN_LETTER}])${escapeRegex(w)}(?![${PERSIAN_LETTER}])`
  );
  return `(?:${bounded.join('|')}|\\d+(?:\\.\\d+)?)`;
}

const AMOUNT_CORE = boundedWordAlternation();

/** Regex fragment: bounded Persian number phrase (optionally ?X ? Y [? Z]?). */
export const PERSIAN_AMOUNT_CAPTURE = `${AMOUNT_CORE}(?:\\s+\\u0648\\s+${AMOUNT_CORE}){0,2}`;

export function parseCapturedMillionAmount(token: string | undefined): number | undefined {
  if (!token?.trim()) return undefined;
  return parseMillionTomanFromPhrase(token.trim());
}

export interface MoneyMention {
  index: number;
  end: number;
  tomans: number;
  unit: 'million' | 'billion';
  raw: string;
}

const MILLION_WORD = '\u0645\u06CC\u0644\u06CC\u0648\u0646';
const BILLION_WORD = '\u0645\u06CC\u0644\u06CC\u0627\u0631\u062F';
const RAHN_WORD = '\u0631\u0647\u0646';
const EJARE_WORD = '\u0627\u062C\u0627\u0631\u0647';
const VA_WORD = '\u0648';
const METER_WORD = '\u0645\u062A\u0631';
const METRI_WORD = '\u0645\u062A\u0631\u06CC';
const EJARE_NADARAM = '\u0627\u062C\u0627\u0631\u0647 \u0646\u062F\u0627\u0631\u0645';

const MILLION_PHRASE_RE = new RegExp(`(${PERSIAN_AMOUNT_CAPTURE})\\s*${MILLION_WORD}`, 'gu');
const BILLION_PHRASE_RE = new RegExp(`(${PERSIAN_AMOUNT_CAPTURE})\\s*${BILLION_WORD}`, 'gu');
const DIGIT_MILLION_RE = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${MILLION_WORD}`, 'gu');
const DIGIT_BILLION_RE = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${BILLION_WORD}`, 'gu');

function collectMoneyMentions(norm: string): MoneyMention[] {
  const mentions: MoneyMention[] = [];

  for (const re of [MILLION_PHRASE_RE, DIGIT_MILLION_RE]) {
    for (const m of norm.matchAll(re)) {
      const token = m[1]?.trim();
      if (!token) continue;
      const tomans =
        re === DIGIT_MILLION_RE
          ? parseMillionTomanFromPhrase(token)
          : parseCapturedMillionAmount(token);
      if (tomans == null) continue;
      mentions.push({
        index: m.index ?? 0,
        end: (m.index ?? 0) + m[0].length,
        tomans,
        unit: 'million',
        raw: m[0],
      });
    }
  }

  for (const re of [BILLION_PHRASE_RE, DIGIT_BILLION_RE]) {
    for (const m of norm.matchAll(re)) {
      const token = m[1]?.trim();
      if (!token) continue;
      const tomans =
        re === DIGIT_BILLION_RE
          ? parseBillionTomanFromPhrase(token)
          : parseBillionTomanFromPhrase(token);
      if (tomans == null) continue;
      mentions.push({
        index: m.index ?? 0,
        end: (m.index ?? 0) + m[0].length,
        tomans,
        unit: 'billion',
        raw: m[0],
      });
    }
  }

  mentions.sort((a, b) => a.index - b.index);
  return mentions;
}

const KEYWORD_PROXIMITY = 48;

function pickTomansForKeyword(
  norm: string,
  mentions: MoneyMention[],
  keyword: string,
  opts?: { unit?: MoneyMention['unit'] }
): number | undefined {
  let pool = mentions;
  if (opts?.unit) pool = pool.filter((m) => m.unit === opts.unit);
  if (pool.length === 0) return undefined;

  const kwIndices: number[] = [];
  let scan = 0;
  while (scan <= norm.length) {
    const kwIdx = norm.indexOf(keyword, scan);
    if (kwIdx < 0) break;
    kwIndices.push(kwIdx);
    scan = kwIdx + Math.max(1, keyword.length);
  }
  if (kwIndices.length === 0) return undefined;

  let best: { dist: number; tomans: number } | undefined;
  for (const m of pool) {
    for (const kwIdx of kwIndices) {
      const kwEnd = kwIdx + keyword.length;
      const gapBefore = kwIdx - m.end;
      const gapAfter = m.index - kwEnd;
      const near =
        (gapBefore >= 0 && gapBefore <= KEYWORD_PROXIMITY) ||
        (gapAfter >= 0 && gapAfter <= KEYWORD_PROXIMITY);
      if (!near) continue;
      const dist = Math.min(
        gapBefore >= 0 ? gapBefore : Number.POSITIVE_INFINITY,
        gapAfter >= 0 ? gapAfter : Number.POSITIVE_INFINITY
      );
      if (!best || dist < best.dist) best = { dist, tomans: m.tomans };
    }
  }
  return best?.tomans;
}

export interface PropertyMoneyFromText {
  rahnAmount?: number;
  monthlyRent?: number;
  deposit?: number;
  budgetMax?: number;
}

/**
 * Unified money extraction from property intake text.
 * Associates million/billion phrases with rahn, rent, deposit, budget by proximity.
 */
export function extractPropertyMoneyFromText(rawText: string): PropertyMoneyFromText {
  let norm = normalizeColloquialAmountWords(rawText);
  norm = norm.replace(/[\u0660-\u0669\u06F0-\u06F9\u0030-\u0039]+/g, (run) => toAsciiDigits(run));

  const mentions = collectMoneyMentions(norm);
  const out: PropertyMoneyFromText = {};

  const rahn =
    pickTomansForKeyword(norm, mentions, RAHN_WORD) ??
    pickTomansForKeyword(norm, mentions, '\u0648\u062F\u06CC\u0639\u0647') ??
    (norm.includes(RAHN_WORD)
      ? pickTomansForKeyword(norm, mentions, '\u0628\u0648\u062F\u062C\u0647')
      : undefined);
  if (rahn != null) out.rahnAmount = rahn;

  // Monthly rent keywords before bare «اجاره» (often listing intent, not price).
  const rent =
    pickTomansForKeyword(norm, mentions, '\u0645\u0627\u0647\u0627\u0646\u0647', { unit: 'million' }) ??
    pickTomansForKeyword(norm, mentions, '\u0645\u0627\u0647\u06CC\u0627\u0646\u0647', { unit: 'million' }) ??
    pickTomansForKeyword(norm, mentions, EJARE_WORD, { unit: 'million' });
  if (rent != null) out.monthlyRent = rent;

  const deposit = pickTomansForKeyword(norm, mentions, '\u0648\u062F\u06CC\u0639\u0647');
  if (deposit != null && out.rahnAmount == null) out.deposit = deposit;

  const budget = pickTomansForKeyword(norm, mentions, '\u0628\u0648\u062F\u062C\u0647');
  if (budget != null) out.budgetMax = budget;

  const rahnEjareShort = new RegExp(
    `${RAHN_WORD}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:${VA_WORD}\\s*)?${EJARE_WORD}\\s*(\\d+(?:\\.\\d+)?)`,
    'u'
  );
  const rahnEjareMatch = norm.match(rahnEjareShort);
  if (rahnEjareMatch?.[1] && rahnEjareMatch[2]) {
    out.rahnAmount = Math.round(Number(rahnEjareMatch[1]) * 1_000_000);
    out.monthlyRent = Math.round(Number(rahnEjareMatch[2]) * 1_000_000);
  }

  if (out.rahnAmount == null) {
    const rahnOnly = new RegExp(
      `${RAHN_WORD}\\s*(\\d+(?:\\.\\d+)?)(?:\\s*${EJARE_WORD}\\s*\u0646\u062F\u0627\u0631\u0645|\\s*\u0641\u0642\u0637)?`,
      'u'
    );
    const rahnOnlyMatch = norm.match(rahnOnly);
    if (rahnOnlyMatch?.[1] && norm.includes(EJARE_NADARAM)) {
      out.rahnAmount = Math.round(Number(rahnOnlyMatch[1]) * 1_000_000);
    }
  }

  if (out.monthlyRent == null) {
    const ejareMoney = new RegExp(
      `${EJARE_WORD}\\s*(\\d[\\d,]*)(?!\\d*(?:m(?:\\s|$|\u060C|\\.|\/)|i)|${METER_WORD}|${METRI_WORD})`,
      'iu'
    );
    const ejareMoneyMatch = norm.match(ejareMoney);
    if (ejareMoneyMatch?.[1]) {
      const n = Number(ejareMoneyMatch[1].replace(/,/g, ''));
      const tail = norm.slice(
        (ejareMoneyMatch.index ?? 0) + ejareMoneyMatch[0].length,
        (ejareMoneyMatch.index ?? 0) + ejareMoneyMatch[0].length + 12
      );
      const meterTail = new RegExp(`^\\s*${METER_WORD}|^\\s*${METRI_WORD}`, 'i');
      if (n > 0 && !meterTail.test(tail)) {
        out.monthlyRent = n;
      }
    }
  }

  if (out.budgetMax == null && mentions.length === 1 && !out.rahnAmount && !out.monthlyRent) {
    out.budgetMax = mentions[0]!.tomans;
  }

  // Rent-only needs: a lone generic budget chip is usually the monthly rent.
  if (
    out.budgetMax != null &&
    out.monthlyRent == null &&
    out.rahnAmount == null &&
    norm.includes(EJARE_WORD) &&
    !norm.includes(RAHN_WORD)
  ) {
    out.monthlyRent = out.budgetMax;
    delete out.budgetMax;
  }

  // رهن‌واجاره with two money mentions but only budgetMax filled — split by order.
  if (
    out.budgetMax == null &&
    out.rahnAmount == null &&
    out.monthlyRent == null &&
    mentions.length >= 2 &&
    norm.includes(RAHN_WORD) &&
    norm.includes(EJARE_WORD)
  ) {
    out.rahnAmount = mentions[0]!.tomans;
    out.monthlyRent = mentions[1]!.tomans;
  }

  if (
    out.rahnAmount != null &&
    out.monthlyRent != null &&
    out.rahnAmount === out.monthlyRent &&
    mentions.length >= 2
  ) {
    const distinct = [...new Set(mentions.map((m) => m.tomans))];
    const alt = distinct.find((t) => t !== out.rahnAmount);
    if (alt != null) out.monthlyRent = alt;
  }

  return out;
}
