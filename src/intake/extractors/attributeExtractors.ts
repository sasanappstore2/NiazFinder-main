import { osaDistanceBounded } from '@/intake/intelligence-engine/normalizer/fuzzy-corrector';

const PERSIAN_WORD_NUMBERS: Record<string, number> = {
  یک: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
  ده: 10,
};

// ---------- context-anchored keyword repair ----------
//
// The upstream fuzzy corrector (fuzzy-corrector.ts) rejects corrections for
// tokens shorter than 3 chars, only allows same-length fixes for 3-letter
// tokens, and does not know the colloquial «خوابه» — so a single-edit typo
// inside «متر / خواب / خوابه / طبقه» (مت، تمر، خاب، عخوابه، طبه …) reaches the
// attribute extractors uncorrected and the rooms/area/floor rule misses it.
//
// repairAttributeKeywords() is a generic repair rule: a token that is an
// UNAMBIGUOUS OSA-distance-1 variant of one keyword family (rooms/area/floor)
// AND sits next to a number (or ordinal, for floor) is rewritten to the family
// keyword. Exact family words, calendar words (مهر) and anything ambiguous are
// never touched, so clean text passes through unchanged.

interface KeywordFamily {
  name: 'rooms' | 'area' | 'floor';
  words: string[];
}

const KEYWORD_FAMILIES: readonly KeywordFamily[] = [
  { name: 'rooms', words: ['خوابه', 'خواب'] },
  { name: 'area', words: ['مترمربع', 'متراژ', 'متری', 'متر'] },
  { name: 'floor', words: ['طبقه'] },
];

/** Words within distance 1 of a keyword that are real words — never repair. */
const NEVER_REPAIR = new Set([
  // calendar months (مهر ↔ متر, دی ↔ …) — dates like «تا 13 مهر» must survive
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]);

/** Floor context anchors — digits or ordinal/همکف neighbours. */
const FLOOR_CONTEXT_WORDS = new Set([
  'از', 'همکف',
  'اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم',
]);

const PUNCT_EDGES = /^[،,؛:;.!؟?«»()\-]+|[،,؛:;.!؟?«»()\-]+$/gu;

function toAsciiDigits(s: string): string {
  return s.replace(/[\u06F0-\u06F9\u0660-\u0669]/gu, (d) => {
    const code = d.codePointAt(0)!;
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

function intDigitCount(token: string | null): number {
  if (!token) return 0;
  const ascii = toAsciiDigits(token);
  if (!/^[0-9]{1,4}(?:[.,][0-9]{1,3})*$/.test(ascii)) return 0;
  return ascii.split(/[.,]/)[0]!.length;
}

function isWordNumber(token: string | null): boolean {
  return !!token && Object.prototype.hasOwnProperty.call(PERSIAN_WORD_NUMBERS, token);
}

/** Context gate per family: keyword typos are only repaired next to a number. */
function anchorOk(family: KeywordFamily, prev: string | null, next: string | null): boolean {
  switch (family.name) {
    case 'rooms':
      // «2 خاب» / «دو خواو» — 1-2 digit or word-number neighbour
      return (
        (intDigitCount(prev) >= 1 && intDigitCount(prev) <= 2) ||
        (intDigitCount(next) >= 1 && intDigitCount(next) <= 2) ||
        isWordNumber(prev) ||
        isWordNumber(next)
      );
    case 'area':
      // «300 مت» / «90 تمر» / «مترا 120» — 2-4 digit neighbour
      return (
        (intDigitCount(prev) >= 2 && intDigitCount(prev) <= 4) ||
        (intDigitCount(next) >= 2 && intDigitCount(next) <= 4)
      );
    case 'floor':
      // «طبه 1 از 4» / «4 طبق» / «طبقه دوم»
      return (
        intDigitCount(prev) >= 1 ||
        intDigitCount(next) >= 1 ||
        FLOOR_CONTEXT_WORDS.has(prev ?? '') ||
        FLOOR_CONTEXT_WORDS.has(next ?? '')
      );
  }
}

/**
 * Repair single-edit typos of the attribute keywords (خواب/خوابه، متر family،
 * طبقه) when the token is an unambiguous distance-1 match of exactly one
 * family and the digit/ordinal anchor holds. Clean text is returned untouched.
 */
export function repairAttributeKeywords(text: string): string {
  if (!text || !/[\u0600-\u06FF]/u.test(text)) return text;

  const parts = text.split(/(\s+)/);
  const wordCount = Math.ceil(parts.length / 2);
  const coreOf = (i: number): string =>
    (parts[i] ?? '').replace(PUNCT_EDGES, '');

  let changed = false;
  for (let wi = 0; wi < wordCount; wi++) {
    const idx = wi * 2;
    const raw = parts[idx]!;
    if (!raw) continue;
    const core = coreOf(idx);
    if (!core || core.length < 2 || core.length > 9) continue;
    if (/[a-zA-Z\u200c]/u.test(core)) continue; // Latin / ZWNJ — not a keyword typo
    if (NEVER_REPAIR.has(core)) continue;

    const prevCore = wi > 0 ? coreOf(idx - 2) : null;
    const nextCore = wi < wordCount - 1 ? coreOf(idx + 2) : null;

    // Glued-digit form «2خوااب» / «90تمر»: the digits stay in place and act as
    // the anchor; only the letter run is matched against the families.
    const glued = core.match(
      /^([\d\u06F0-\u06F9\u0660-\u0669.,]*)([\u0600-\u06FF]+)([\d\u06F0-\u06F9\u0660-\u0669.,]*)$/u
    );
    if (!glued) continue; // digits inside the letter run — not a keyword typo
    const lead = glued[1] ?? '';
    const letters = glued[2]!;
    const trail = glued[3] ?? '';
    if (letters.length < 2 || letters.length > 9) continue;
    if (NEVER_REPAIR.has(letters)) continue;

    const gluedDigits = Math.max(intDigitCount(lead), intDigitCount(trail));

    // Upstream-corrector collision rescue: the fuzzy corrector folds «واب» (a
    // خواب typo with خ deleted) into the legit word «وام», because its
    // 3-letter band only allows same-length fixes. A 1-2 digit cardinal
    // directly before «وام» («2 وام») only occurs in that typo — real loan
    // phrases put the amount AFTER the word («وام 200 میلیونی») — so repair
    // it back to the rooms keyword.
    if (
      letters === 'وام' &&
      intDigitCount(prevCore) >= 1 &&
      intDigitCount(prevCore) <= 2
    ) {
      parts[idx] = raw.replace(letters, 'خواب');
      changed = true;
      continue;
    }

    let bestD = 2;
    let bestFamily: KeywordFamily | null = null;
    let bestWord: string | null = null;
    let tieAcrossFamilies = false;
    for (const family of KEYWORD_FAMILIES) {
      let famBest = 2;
      let famWord: string | null = null;
      for (const word of family.words) {
        if (Math.abs(word.length - letters.length) > 1) continue;
        const d = osaDistanceBounded(letters, word, 1);
        if (d < famBest) {
          famBest = d;
          famWord = word;
        } else if (d === famBest && famWord && word.length > famWord.length) {
          famWord = word; // prefer the longest family form on ties (متراژ over متر)
        }
      }
      if (famBest > 1 || !famWord) continue;
      if (famBest < bestD) {
        bestD = famBest;
        bestFamily = family;
        bestWord = famWord;
        tieAcrossFamilies = false;
      } else if (famBest === bestD && family !== bestFamily) {
        tieAcrossFamilies = true;
      }
    }

    // bestD === 0 → exact keyword, untouched. Ambiguous across families → skip.
    if (!bestFamily || !bestWord || bestD !== 1 || tieAcrossFamilies) continue;
    // Anchor: a number glued to the token, a number/ordinal neighbour, or
    // (rooms only) a Persian word-number neighbour.
    const anchored =
      gluedDigits >= 1 ||
      (bestFamily.name === 'rooms' && isWordNumber(prevCore)) ||
      anchorOk(bestFamily, prevCore, nextCore);
    if (!anchored) continue;
    if (!raw.includes(letters)) continue;
    parts[idx] = raw.replace(letters, bestWord);
    changed = true;
  }

  return changed ? parts.join('') : text;
}

/** Detect area in square meters from normalized text. */
export function extractArea(normalizedText: string): { value: number | null; confidence: number } {
  const text = repairAttributeKeywords(normalizedText);
  const patterns = [
    /(\d{2,4})\s*(?:متر|متری|m2|m²)/u,
    /(?:متراژ|مساحت|زیربنا)\s*[:：]?\s*(\d{2,4})/u,
    // Bare "م" shorthand for متر — require whitespace; must not swallow میلیون/میلیارد.
    /(\d{2,4})\s+م(?!ی)/u,
  ];

  // Earliest mention wins, regardless of which pattern caught it:
  // «ویلا 300 متر بنا در 500 متر زمین» → 300 (the building), not 500.
  let best: { index: number; value: number } | null = null;
  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1] || m.index === undefined) continue;
    const value = Number.parseInt(m[1], 10);
    if (!Number.isFinite(value) || value < 20 || value > 10000) continue;
    if (!best || m.index < best.index) best = { index: m.index, value };
  }
  if (best) return { value: best.value, confidence: 1 };
  return { value: null, confidence: 0 };
}

/** Detect bedroom count. */
export function extractRooms(normalizedText: string): { value: number | null; confidence: number } {
  const text = repairAttributeKeywords(normalizedText);
  const digitMatch = text.match(/(\d)\s*خواب/u);
  if (digitMatch?.[1]) {
    const n = Number.parseInt(digitMatch[1], 10);
    if (n >= 1 && n <= 10) return { value: n, confidence: 0.95 };
  }

  for (const [word, num] of Object.entries(PERSIAN_WORD_NUMBERS)) {
    if (text.includes(`${word} خواب`) || text.includes(`${word}خواب`)) {
      return { value: num, confidence: 0.9 };
    }
  }
  return { value: null, confidence: 0 };
}

/** Parse Persian budget phrases to Toman-scale integers (approximate). */
export function extractBudget(normalizedText: string): {
  min: number | null;
  max: number | null;
  confidence: number;
} {
  // Ranges must be checked before single-amount patterns: "2 تا 3 میلیون" would
  // otherwise let the bare "3 میلیون" match first and silently drop the "2".
  const billionRangeMatch = normalizedText.match(
    /(?:بین\s+)?(\d+(?:\.\d+)?)\s*(?:تا|-)\s*(\d+(?:\.\d+)?)\s*میلیارد/u
  );
  if (billionRangeMatch?.[1] && billionRangeMatch[2]) {
    const min = Math.round(Number.parseFloat(billionRangeMatch[1]) * 1_000_000_000);
    const max = Math.round(Number.parseFloat(billionRangeMatch[2]) * 1_000_000_000);
    return { min, max, confidence: 0.9 };
  }

  const millionRangeMatch = normalizedText.match(
    /(?:بین\s+)?(\d+(?:\.\d+)?)\s*(?:تا|-)\s*(\d+(?:\.\d+)?)\s*میلیون/u
  );
  if (millionRangeMatch?.[1] && millionRangeMatch[2]) {
    const min = Math.round(Number.parseFloat(millionRangeMatch[1]) * 1_000_000);
    const max = Math.round(Number.parseFloat(millionRangeMatch[2]) * 1_000_000);
    return { min, max, confidence: 0.9 };
  }

  // Floor-only: «بالای ۳۰۰ میلیون» / «بیشتر از ۵۰۰ میلیون»
  const millionFloor = normalizedText.match(
    /(?:بالای|بیشتر\s*از)\s*(\d+(?:\.\d+)?)\s*میلیون/u
  );
  if (millionFloor?.[1]) {
    const min = Math.round(Number.parseFloat(millionFloor[1]) * 1_000_000);
    return { min, max: null, confidence: 0.9 };
  }
  const billionFloor = normalizedText.match(
    /(?:بالای|بیشتر\s*از)\s*(\d+(?:\.\d+)?)\s*میلیارد/u
  );
  if (billionFloor?.[1]) {
    const min = Math.round(Number.parseFloat(billionFloor[1]) * 1_000_000_000);
    return { min, max: null, confidence: 0.9 };
  }

  // Ceiling-only: «زیر ۵۰۰ میلیون» / «کمتر از …»
  const millionUnder = normalizedText.match(
    /(?:زیر|کمتر\s*از)\s*(\d+(?:\.\d+)?)\s*میلیون/u
  );
  if (millionUnder?.[1]) {
    const max = Math.round(Number.parseFloat(millionUnder[1]) * 1_000_000);
    return { min: null, max, confidence: 0.9 };
  }
  const billionUnder = normalizedText.match(
    /(?:زیر|کمتر\s*از)\s*(\d+(?:\.\d+)?)\s*میلیارد/u
  );
  if (billionUnder?.[1]) {
    const max = Math.round(Number.parseFloat(billionUnder[1]) * 1_000_000_000);
    return { min: null, max, confidence: 0.9 };
  }

  // Compound: «۲ میلیارد و ۵۰۰» / «تا ۲ میلیارد و ۵۰۰ میلیون» → 2.5B تومان
  // (colloquial: trailing hundreds after میلیارد are میلیون)
  const compoundCeiling = normalizedText.match(
    /(?:تا|حداکثر)\s*(\d+(?:\.\d+)?)\s*میلیارد\s*و\s*(\d{1,3})(?:\s*میلیون)?\b/u
  );
  if (compoundCeiling?.[1] && compoundCeiling[2]) {
    const billions = Number.parseFloat(compoundCeiling[1]);
    const millions = Number.parseFloat(compoundCeiling[2]);
    if (Number.isFinite(billions) && Number.isFinite(millions) && millions < 1000) {
      const max = Math.round(billions * 1_000_000_000 + millions * 1_000_000);
      return { min: null, max, confidence: 0.93 };
    }
  }
  const compoundExact = normalizedText.match(
    /(\d+(?:\.\d+)?)\s*میلیارد\s*و\s*(\d{1,3})(?:\s*میلیون)?\b/u
  );
  if (compoundExact?.[1] && compoundExact[2]) {
    const billions = Number.parseFloat(compoundExact[1]);
    const millions = Number.parseFloat(compoundExact[2]);
    if (Number.isFinite(billions) && Number.isFinite(millions) && millions < 1000) {
      const value = Math.round(billions * 1_000_000_000 + millions * 1_000_000);
      return { min: value, max: value, confidence: 0.93 };
    }
  }

  // "تا 30 میلیون" / "حداکثر 30 میلیون" — ceiling only, no implied floor.
  const billionCeilingMatch = normalizedText.match(/(?:تا|حداکثر)\s*(\d+(?:\.\d+)?)\s*میلیارد/u);
  if (billionCeilingMatch?.[1]) {
    const max = Math.round(Number.parseFloat(billionCeilingMatch[1]) * 1_000_000_000);
    return { min: null, max, confidence: 0.9 };
  }

  const millionCeilingMatch = normalizedText.match(/(?:تا|حداکثر)\s*(\d+(?:\.\d+)?)\s*میلیون/u);
  if (millionCeilingMatch?.[1]) {
    const max = Math.round(Number.parseFloat(millionCeilingMatch[1]) * 1_000_000);
    return { min: null, max, confidence: 0.9 };
  }

  const billionMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*میلیارد/u);
  if (billionMatch?.[1]) {
    const n = Number.parseFloat(billionMatch[1]);
    const value = Math.round(n * 1_000_000_000);
    return { min: value, max: value, confidence: 0.95 };
  }

  const millionMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*میلیون/u);
  if (millionMatch?.[1]) {
    const n = Number.parseFloat(millionMatch[1]);
    const value = Math.round(n * 1_000_000);
    return { min: value, max: value, confidence: 0.92 };
  }

  return { min: null, max: null, confidence: 0 };
}
