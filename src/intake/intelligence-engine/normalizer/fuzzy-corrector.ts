/**
 * Generic fuzzy token corrector for Persian intake text.
 *
 * Constrained spell-correction: a token is rewritten ONLY when it is an
 * unambiguous OSA-distance ≤1 (≤2 for long words) variant of a known
 * intake-critical word (category synonyms, money scales, transaction and
 * attribute keywords, Iranian city names). Correct text is never touched —
 * known tokens pass through and ambiguous matches are rejected.
 *
 * Deterministic, rules-only, no AI. Kill switch: INTAKE_FUZZY_CORRECTOR=false.
 */
import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import { CATEGORY_SYNONYMS } from '@/intake/dictionaries/categoryIndex';
import { CANONICAL_CATEGORIES } from '@/config/categories';
import { getIranCities, getIranProvinces } from '@/lib/location-system';

/** Money scales, payment terms, transaction intent and property attributes the engine keys on. */
const CRITICAL_WORDS: readonly string[] = [
  // money scales & payment
  'میلیون', 'میلیارد', 'تومان', 'رهن', 'اجاره', 'ودیعه', 'بیعانه', 'بودجه', 'مبلغ',
  'قسط', 'اقساط', 'نقد', 'کامل', 'توافقی', 'تخفیف', 'کارمزد',
  // duration
  'ماهانه', 'ماهیانه', 'ماهی', 'روزانه', 'شبانه', 'ساعتی', 'هفتگی', 'سالانه', 'شبی',
  // transaction intent
  'فروش', 'خرید', 'میفروشم', 'میخرم', 'معاوضه', 'مستاجر', 'موجر', 'رنت', 'کرایه', 'کرایی',
  // property attributes
  'خواب', 'اتاق', 'متر', 'متری', 'متراژ', 'مساحت', 'طبقه', 'پارکینگ', 'آسانسور',
  'انباری', 'بالکن', 'تراس', 'حیاط', 'بام', 'آشپزخانه', 'سرویس', 'حمام', 'دستشویی',
  'شوفاژ', 'پکیج', 'رادیاتور', 'کولر', 'نوساز', 'کلنگی', 'بازسازی', 'ویلایی',
  'دوبلکس', 'سند', 'وام', 'فوری', 'برج', 'نما', 'زمین', 'دفتر', 'اداری',
];

const MIN_TOKEN_LEN = 3;
const MAX_TOKEN_LEN = 24;
const LONG_WORD_LEN = 7; // ≥ this length allows distance 2
const DIGIT_RE = /[\d\u06F0-\u06F9\u0660-\u0669]/;
const LATIN_RE = /[a-zA-Z]/;

/** Persian calendar & time words the urgency rules key on. */
const CALENDAR_PROTECTED: readonly string[] = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'بهمن', 'اسفند', 'هفته', 'امروز', 'فردا', 'امسال', 'پارسال',
];

/**
 * A ZWNJ compound («پیش‌فروش»، «لوله‌کشی») from the category dictionaries.
 * `key` is the joined form — ZWNJ/space-free — so a compound whose separator
 * was deleted or corrupted still matches; `surface` is the canonical spelling
 * a repaired token is rewritten to.
 */
interface CompoundEntry {
  key: string;
  surface: string;
}

let vocabList: string[] | null = null;
let vocabSet: Set<string> | null = null;
let protectedSet: Set<string> | null = null;
let compoundList: CompoundEntry[] | null = null;
let compoundKeySet: Set<string> | null = null;
const correctionCache = new Map<string, string>();

function buildVocab(): {
  list: string[];
  set: Set<string>;
  protect: Set<string>;
  compounds: CompoundEntry[];
  compoundKeys: Set<string>;
} {
  const set = new Set<string>();
  const protect = new Set<string>();
  // joined key -> canonical surface (first dictionary spelling wins)
  const compounds = new Map<string, string>();
  const add = (word: string): void => {
    const key = normalizePersian(word);
    if (!key || key.includes(' ') || key.includes('\u200c')) return;
    if (key.length < MIN_TOKEN_LEN || key.length > MAX_TOKEN_LEN) return;
    set.add(key);
  };
  // ZWNJ compounds are category-critical words («پیش‌فروش» is the title of
  // pre-sale-services) that the plain vocab cannot hold — index them by their
  // joined form. Whitespace-separated phrases are skipped (they are never a
  // single token), but their ZWNJ-joined parts (کوتاه‌مدت in «اجاره کوتاه‌مدت»)
  // still are single tokens and belong in the compound vocab.
  const addCompound = (word: string): void => {
    if (!word.includes('\u200c')) return;
    for (const part of word.split(/[\s،,]+/)) {
      if (!part.includes('\u200c')) continue;
      const key = normalizePersian(part).replace(/\s+/g, '');
      if (!key || key.length < MIN_TOKEN_LEN || key.length > MAX_TOKEN_LEN) continue;
      if (!compounds.has(key)) compounds.set(key, part);
    }
  };

  for (const words of Object.values(CATEGORY_SYNONYMS)) {
    for (const word of words) {
      add(word);
      addCompound(word);
    }
  }
  for (const cat of CANONICAL_CATEGORIES) {
    add(cat.title);
    addCompound(cat.title);
    if (cat.englishTitle) add(cat.englishTitle);
  }
  for (const word of CRITICAL_WORDS) {
    add(word);
    addCompound(word);
  }

  // City & province names are PROTECTED, not correction targets: they collide
  // with street/neighborhood words (فردوسی/فردوس، کوهسنگی/کوهرنگ، کرج/برج) and
  // location typos belong to the dedicated Fuse-based location system.
  const addProtected = (name: string): void => {
    const key = normalizePersian(name);
    if (!key || key.includes(' ')) return;
    protect.add(key);
    set.delete(key);
  };
  for (const city of getIranCities()) addProtected(city.name);
  for (const province of getIranProvinces()) addProtected(province.name);
  // Calendar words drive urgency rules («تا آخر تیر») — a month name must
  // never fold into a category word (تیر → تور).
  for (const word of CALENDAR_PROTECTED) addProtected(word);

  const compoundEntries: CompoundEntry[] = Array.from(compounds.entries()).map(
    ([key, surface]) => ({ key, surface })
  );
  return {
    list: Array.from(set),
    set,
    protect,
    compounds: compoundEntries,
    compoundKeys: new Set(compounds.keys()),
  };
}

function getVocab(): {
  list: string[];
  set: Set<string>;
  protect: Set<string>;
  compounds: CompoundEntry[];
  compoundKeys: Set<string>;
} {
  if (!vocabList || !vocabSet || !protectedSet || !compoundList || !compoundKeySet) {
    const built = buildVocab();
    vocabList = built.list;
    vocabSet = built.set;
    protectedSet = built.protect;
    compoundList = built.compounds;
    compoundKeySet = built.compoundKeys;
  }
  return { list: vocabList, set: vocabSet, protect: protectedSet, compounds: compoundList, compoundKeys: compoundKeySet };
}

/** Optimal string alignment (restricted Damerau-Levenshtein) with early abandon above maxD. */
export function osaDistanceBounded(a: string, b: string, maxD: number): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > maxD) return maxD + 1;

  let prev2: number[] | null = null;
  let prev = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    const cur = new Array<number>(bl + 1);
    cur[0] = i;
    let rowMin = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, (prev2 ? prev2[j - 2]! : maxD + 1) + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > maxD) return maxD + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[bl]!;
}

function isFuzzyDisabled(): boolean {
  const raw = process.env.INTAKE_FUZZY_CORRECTOR?.trim().toLowerCase();
  return raw === 'false' || raw === '0' || raw === 'off' || raw === 'no';
}

/** Common Persian suffixes — a vocab-word + suffix token is a derived word, not a typo. */
const DERIVED_SUFFIXES = new Set([
  'ر', 'ها', 'های', 'ی', 'ای', 'ام', 'ات', 'اش', 'تر', 'ترین', 'ست', 'دار',
]);

const MAX_SUFFIX_LEN = 3;

function isDerivedForm(norm: string, set: ReadonlySet<string>): boolean {
  for (let cut = 1; cut <= MAX_SUFFIX_LEN && cut < norm.length; cut++) {
    if (set.has(norm.slice(0, norm.length - cut)) && DERIVED_SUFFIXES.has(norm.slice(norm.length - cut))) {
      return true;
    }
  }
  return false;
}

/**
 * Unique one-edit compound repair. A token is rewritten to a compound's
 * canonical surface only when exactly ONE known compound sits within OSA
 * distance ≤1 of its joined form — ambiguity rejects, known text passes.
 */
function uniqueCompoundMatch(joined: string, compounds: readonly CompoundEntry[]): string | null {
  const maxD = 1; // compound typos are single-edit; distance 2 is too loose here
  let best: string | null = null;
  let bestD = maxD + 1;
  let bestCount = 0;
  for (const c of compounds) {
    if (Math.abs(c.key.length - joined.length) > maxD) continue;
    const d = osaDistanceBounded(joined, c.key, maxD);
    if (d > maxD) continue;
    if (d < bestD) {
      bestD = d;
      best = c.surface;
      bestCount = 1;
    } else if (d === bestD) {
      bestCount++;
    }
  }
  return best && bestD <= maxD && bestCount === 1 ? best : null;
}

function computeCorrection(rawToken: string): string {
  if (rawToken.length < MIN_TOKEN_LEN || rawToken.length > MAX_TOKEN_LEN) return rawToken;
  if (DIGIT_RE.test(rawToken) || LATIN_RE.test(rawToken)) return rawToken;

  const norm = normalizePersian(rawToken);
  if (!norm || norm.length < MIN_TOKEN_LEN) return rawToken;

  const { list, set, protect, compounds, compoundKeys } = getVocab();

  // ZWNJ compounds: compare on the joined (separator-free) form so an edit at
  // or across the ZWNJ boundary still matches. Known compounds and derived
  // forms («پیش‌فروشی») pass through untouched.
  if (rawToken.includes('\u200c')) {
    const joined = norm.replace(/\s+/g, '');
    if (!joined || joined.length < MIN_TOKEN_LEN) return rawToken;
    if (compoundKeys.has(joined)) return rawToken;
    if (isDerivedForm(joined, compoundKeys)) return rawToken;
    return uniqueCompoundMatch(joined, compounds) ?? rawToken;
  }

  if (set.has(norm) || protect.has(norm)) return rawToken;

  // A known compound in ZWNJ-less spelling («پیشفروش»، «برقکاری») is valid
  // text — never fold it elsewhere.
  if (compoundKeys.has(norm)) return rawToken;
  if (isDerivedForm(norm, compoundKeys)) return rawToken;

  // Unique one-edit repair for compound typos whose ZWNJ was replaced by a
  // letter («پیش‌فروش» → «پیشافروش») — must run before the plain fuzzy walk.
  const compoundHit = uniqueCompoundMatch(norm, compounds);
  if (compoundHit) return compoundHit;

  // «میلیونر» is a word in its own right — never fold derived forms into the base.
  if (isDerivedForm(norm, set)) return rawToken;

  // Length band: how much candidate length may differ from the token.
  // 3-letter tokens only ever take same-length (substitution) corrections —
  // insertion would fold «سال» into «سالن» and destroy age phrases.
  const maxD = norm.length >= LONG_WORD_LEN ? 2 : 1;
  const maxLenDelta = norm.length === MIN_TOKEN_LEN ? 0 : maxD;
  let best: string | null = null;
  let bestD = maxD + 1;
  let bestCount = 0;

  for (const word of list) {
    if (Math.abs(word.length - norm.length) > maxLenDelta) continue;
    const d = osaDistanceBounded(norm, word, maxD);
    if (d > maxD) continue;
    if (d < bestD) {
      bestD = d;
      best = word;
      bestCount = 1;
    } else if (d === bestD) {
      bestCount++;
    }
  }

  if (best && bestD <= maxD && bestCount === 1) return best;
  return rawToken;
}

function correctToken(rawToken: string): string {
  const cached = correctionCache.get(rawToken);
  if (cached !== undefined) return cached;
  const result = computeCorrection(rawToken);
  if (correctionCache.size < 10_000) correctionCache.set(rawToken, result);
  return result;
}

/** Correction counter for tests/telemetry. */
let correctionsApplied = 0;

export function getFuzzyCorrectorStats(): { corrections: number } {
  return { corrections: correctionsApplied };
}

export function resetFuzzyCorrectorStats(): void {
  correctionsApplied = 0;
}

/**
 * Token-level fuzzy correction pass. Preserves all original whitespace.
 * Runs AFTER the regex typo aliases; regex aliases win because they run first.
 */
export function applyFuzzyCorrection(text: string): string {
  if (!text || isFuzzyDisabled()) return text;

  const parts = text.split(/(\s+)/);
  let changed = false;
  for (let i = 0; i < parts.length; i += 2) {
    const token = parts[i]!;
    if (!token) continue;
    const fixed = correctToken(token);
    if (fixed !== token) {
      parts[i] = fixed;
      changed = true;
      correctionsApplied++;
    }
  }
  return changed ? parts.join('') : text;
}
