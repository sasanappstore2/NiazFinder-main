/**
 * Common Persian typos in intake text — regexes use unicode escapes only.
 * Applied to raw text before further normalization (unified-normalizer,
 * budget-resolver, smart-field-extractor), so scale words reach the rule
 * engine in their canonical spelling.
 */

import { applyFuzzyCorrection } from '@/intake/intelligence-engine/normalizer/fuzzy-corrector';

/** Persian ی or Arabic ي — aliases run before Arabic→Persian folding. */
const YA = '(?:\\u06CC|\\u064A)';
/** Space / ZWNJ between mis-split word parts. */
const SEP = '[\\s\\u200c]+';
const MILLION = '\u0645\u06CC\u0644\u06CC\u0648\u0646';
const BILLION = '\u0645\u06CC\u0644\u06CC\u0627\u0631\u062F';

const TYPO_REPLACEMENTS: Array<[RegExp, string]> = [
  // "??????" (extra ?, missing ? before ?) -> ??????
  [/\u0645(?:\u06CC|\u064A){2,}\u0644\u0648\u0646/gu, MILLION],
  [/\u0645\u06CC{2,}\u0644(?:\u06CC|\u064A)\u0648\u0646/gu, MILLION],
  [/\u0645\u06CC{2,}\u0644(?:\u06CC|\u064A)\u0627\u0631\u062F/gu, BILLION],
  [/\u062A\u0648\u0645\u0646/gu, '\u062A\u0648\u0645\u0627\u0646'],
  [/\u067E\u0648\u0646\s*\u0635\u062F/gu, '\u067E\u0627\u0646\u0635\u062F'],
  [/\u0646\u06CC\u0627\u0648\u0631\u0648\u0646/gu, '\u0646\u06CC\u0627\u0648\u0631\u0627\u0646'],
  [/\u0646\u06CC\u0648\u0627\u0631\u0627\u0646/gu, '\u0646\u06CC\u0627\u0648\u0631\u0627\u0646'],
  [/\u0627\u067E\u0627\u0631\u062A\u0645\u0627\u0646/gu, '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646'],
  [/\u0645\u06CC\s*\u062E\u0648(?:\u0627\u0645|\u0627\u0647|\u0627\u0647\u0645)/gu, '\u0645\u06CC\u062E\u0648\u0627\u0645'],
  // میلیون family: ی جاافتاده یا جابه‌جا — میلون، ملیون، ملون (whole-word guarded)
  [
    new RegExp(`(?<![\\p{L}])\\u0645${YA}?\\u0644${YA}?\\u0648\\u0646(?![\\p{L}])`, 'gu'),
    MILLION,
  ],
  // میل یون / میل‌یون (کلمه از هم پاشیده)
  [
    new RegExp(`(?<![\\p{L}])\\u0645${YA}\\u0644${SEP}${YA}\\u0648\\u0646(?![\\p{L}])`, 'gu'),
    MILLION,
  ],
  // میلیارد family: ی جاافتاده — ملیارد (whole-word guarded; ملارد is a real city and must not match)
  [
    new RegExp(`(?<![\\p{L}])\\u0645\\u0644${YA}\\u0627\\u0631\\u062F(?![\\p{L}])`, 'gu'),
    BILLION,
  ],
  // میل یارد / میل‌یارد
  [
    new RegExp(`(?<![\\p{L}])\\u0645${YA}\\u0644${SEP}${YA}\\u0627\\u0631\\u062F(?![\\p{L}])`, 'gu'),
    BILLION,
  ],
];

export function applyTypoAliases(text: string): string {
  let out = text;
  for (const [re, rep] of TYPO_REPLACEMENTS) {
    out = out.replace(re, rep);
  }
  return applyFuzzyCorrection(out);
}
