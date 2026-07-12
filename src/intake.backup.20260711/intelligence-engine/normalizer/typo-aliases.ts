/** Common Persian typos in intake text ? unicode escapes only. */
const TYPO_REPLACEMENTS: Array<[RegExp, string]> = [
  // "??????" (extra ?, missing ? before ?) -> ??????
  [/\u0645(?:\u06CC|\u064A){2,}\u0644\u0648\u0646/gu, '\u0645\u06CC\u0644\u06CC\u0648\u0646'],
  [/\u0645\u06CC{2,}\u0644(?:\u06CC|\u064A)\u0648\u0646/gu, '\u0645\u06CC\u0644\u06CC\u0648\u0646'],
  [/\u0645\u06CC{2,}\u0644(?:\u06CC|\u064A)\u0627\u0631\u062F/gu, '\u0645\u06CC\u0644\u06CC\u0627\u0631\u062F'],
  [/\u062A\u0648\u0645\u0646/gu, '\u062A\u0648\u0645\u0627\u0646'],
  [/\u067E\u0648\u0646\s*\u0635\u062F/gu, '\u067E\u0627\u0646\u0635\u062F'],
  [/\u0646\u06CC\u0627\u0648\u0631\u0648\u0646/gu, '\u0646\u06CC\u0627\u0648\u0631\u0627\u0646'],
  [/\u0646\u06CC\u0648\u0627\u0631\u0627\u0646/gu, '\u0646\u06CC\u0627\u0648\u0631\u0627\u0646'],
  [/\u0627\u067E\u0627\u0631\u062A\u0645\u0627\u0646/gu, '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646'],
  [/\u0645\u06CC\s*\u062E\u0648(?:\u0627\u0645|\u0627\u0647|\u0627\u0647\u0645)/gu, '\u0645\u06CC\u062E\u0648\u0627\u0645'],
];

export function applyTypoAliases(text: string): string {
  let out = text;
  for (const [re, rep] of TYPO_REPLACEMENTS) {
    out = out.replace(re, rep);
  }
  return out;
}
