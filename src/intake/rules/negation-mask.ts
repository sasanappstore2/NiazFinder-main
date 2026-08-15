/**
 * Strip rejected category cues so contrastive Persian («نه ویلا»، «سوله نمی‌خوام»)
 * does not score as a positive leaf match.
 */
import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';

/** Longest-first so «مشارکت در ساخت» wins over «مشارکت». */
const NEGATABLE_CUES = [
  'مشارکت در ساخت',
  'خانه ویلایی',
  'باغ ویلا',
  'اجاره روزانه',
  'کوتاه مدت',
  'دفتر کار',
  'پیش فروش',
  'آپارتمان',
  'اپارتمان',
  'سوئیت',
  'سوییت',
  'ویلایی',
  'ویلای',
  'ویلا',
  'کلنگی',
  'زمین',
  'مغازه',
  'غرفه',
  'سوله',
  'کارگاه',
  'دفتر',
  'آفیس',
  'مسافری',
  'روزانه',
  'مشارکت',
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

const CUE_ALT = NEGATABLE_CUES.map(escapeRe).join('|');

const REJECT_VERB =
  /نمی\s*خواه(?:م|یم|ی|د|ند)?|نمی\s*خوام|نمیخواهم|نمیخوام/u;

function blank(span: string): string {
  return span.replace(/[^\s]/g, ' ');
}

/**
 * Replace negated property/deal cues with spaces (length-preserving enough
 * for later bounded scans; callers should re-normalize).
 */
export function maskNegatedCategoryCues(text: string): string {
  let t = normalizeIntakeText(text);
  if (!t) return t;

  // «نه ویلا» must not fire inside «روزانه ویلا» (suffix نه).
  const neChain = new RegExp(
    `(?<![\\u0600-\\u06FFa-zA-Z0-9])نه\\s+(?:${CUE_ALT})(?:\\s+(?:و\\s+)?(?:نه\\s+)?(?:${CUE_ALT}))*`,
    'gu'
  );
  t = t.replace(neChain, (m) => blank(m));

  // Clause immediately before «نمی‌خوام / نمیخوام»: mask cues in that clause only.
  const verbGlobal = new RegExp(REJECT_VERB.source, 'gu');
  let m: RegExpExecArray | null;
  const masked = t.split('');
  while ((m = verbGlobal.exec(t)) !== null) {
    const verbAt = m.index;
    const window = t.slice(Math.max(0, verbAt - 96), verbAt);
    const parts = window.split(/[.؟!؛!\n،,]/u);
    const clause = parts[parts.length - 1] ?? window;
    const clauseAt = verbAt - clause.length;
    const cueRe = new RegExp(CUE_ALT, 'gu');
    let cm: RegExpExecArray | null;
    while ((cm = cueRe.exec(clause)) !== null) {
      const from = clauseAt + cm.index;
      const to = from + cm[0].length;
      for (let i = from; i < to && i < masked.length; i++) masked[i] = ' ';
    }
    for (let i = verbAt; i < verbAt + m[0].length && i < masked.length; i++) masked[i] = ' ';
  }
  t = masked.join('');

  // «مشارکت در ساخت نیست»
  t = t.replace(/مشارکت(?:\s+در)?\s+ساخت\s+نیست/gu, (s) => blank(s));

  return t.replace(/\s+/g, ' ').trim();
}
