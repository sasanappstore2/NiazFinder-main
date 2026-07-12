/** Client-safe location fragment extraction (no Node fs / catalog deps). */

import { parseCity } from '@/lib/need-intake/intent-parser';
import { CANONICAL_PROVINCES } from '@/config/locations';

const FRAGMENT_STOP_RE =
  /(?:\s+لازم\s*دار(?:م|یم)|\s+نیاز\s*دار(?:م|یم)|\s+دنبال|\s+می[\s‌]?خو(?:ام|واه|اهم)|\s+میخو(?:ام|واه|اهم)|\s+برای|\s+بودجه|\s+اجاره|\s+رهن|\s+فروش|\s+خرید|\s+زندگی\s*می|\s+اگر\s+موردی|\s+پیام\s*بدید|\s+فوری)\s*$/i;

function cleanLocationFragment(frag: string): string {
  return frag
    .trim()
    .replace(FRAGMENT_STOP_RE, '')
    .replace(/\s*(?:هست|است)$/i, '')
    .trim();
}

function normalizeDigits(text: string): string {
  return text.replace(/[۰-۹]/g, (ch) => {
    const idx = '۰۱۲۳۴۵۶۷۸۹'.indexOf(ch);
    return idx >= 0 ? String(idx) : ch;
  });
}

/** Strip common street prefixes for display / matching. */
export function normalizeHoodFragment(fragment: string): string {
  return fragment
    .replace(/^منطقه\s+/iu, '')
    .replace(/^محله\s+/iu, '')
    .replace(/^خیابان\s+/iu, '')
    .replace(/^بلوار\s+/iu, '')
    .replace(/^کوچه\s+/iu, '')
    .trim();
}

/** Primary hood token — last «در X» in a compound phrase (e.g. «مجتمع اطلس در سیدی» → سیدی). */
export function extractLocationAnchor(fragment: string): string | undefined {
  const cleaned = cleanLocationFragment(fragment);
  if (!cleaned) return undefined;
  const nested = cleaned.match(/(?:^|\s)در\s+([\u0600-\u06FF\u200c\-]+)\s*$/u);
  if (nested?.[1]) {
    const anchor = nested[1].trim();
    if (anchor.length >= 3) return anchor;
  }
  return undefined;
}

/** When catalog hood differs from user's street phrase, keep the street for display. */
export function pickStreetOrHoodDisplay(
  fragment: string | undefined,
  hoodLabel: string | undefined
): string | undefined {
  const f = fragment?.trim();
  const label = hoodLabel?.trim();
  if (!f) return label;
  if (/پاساژ|مجتمع|برج|مرکز\s*خرید|بازار/u.test(f)) return f;
  if (!label) return f;
  const compact = (s: string) => s.replace(/\u200c/g, '').replace(/\s+/g, '').toLowerCase();
  const cf = compact(f);
  const cl = compact(label);
  if (cf === cl || cf.includes(cl) || cl.includes(cf)) return label;
  return f;
}

const PROVINCE_TITLES = new Set(CANONICAL_PROVINCES.map((p) => p.title));

// Bare connector/filler words that can be left behind once a city/province name is
// stripped out of a fragment (e.g. «تو شیراز تا ۳۰ میلیون» → residue «تا»).
// These are never neighborhood names and must not be surfaced as one.
const FRAGMENT_FILLER_WORDS = new Set([
  'تا', 'را', 'رو', 'که', 'یا', 'و', 'در', 'به', 'از', 'با', 'هم', 'هست', 'است',
]);

/** Remove city-name, province-name, and filler tokens from a hood fragment,
 *  wherever they sit (leading «شیراز تا», trailing «سعادت آباد تهران», or
 *  mid-phrase «شیراز فارس تا سی»). None of these are ever a neighborhood
 *  themselves, so they must never survive into the fragment. */
function stripTrailingCityFromFragment(frag: string): string {
  const trimmed = frag.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const city = parseCity(trimmed);
  const kept = parts.filter(
    (p) => p !== city && !PROVINCE_TITLES.has(p) && !FRAGMENT_FILLER_WORDS.has(p)
  );
  return kept.join(' ').trim();
}

function stripTrailingAreaFromFragment(frag: string): string {
  return frag
    .replace(/\s+\d[\d۰-۹]*\s*مت(?:ر|ری)?(?:\s+.*)?$/iu, '')
    .replace(/\s+حد(?:اق|اک)ثر\s*$/iu, '')
    .trim();
}

/** Drop budget / money tails accidentally captured after a hood name. */
function stripTrailingMoneyFromFragment(frag: string): string {
  return frag
    .replace(/\s+بودجه(?:\s+.*)?$/iu, '')
    .replace(/\s+\d[\d۰-۹,\s]*\s*میلی(?:ون|ارد)(?:\s+.*)?$/iu, '')
    // Spelled-out amount before میلیون/میلیارد (e.g. «سی», «صد و بیست») — bounded to
    // a couple of words so this can't walk back over a real place name (e.g. a
    // province mentioned right before the money phrase) and delete it too.
    .replace(
      /\s+[\u0600-\u06FF\u200c\-]+(?:\s+[\u0600-\u06FF\u200c\-]+){0,2}\s*میلی(?:ون|ارد)(?:\s+.*)?$/iu,
      ''
    )
    .trim();
}

function isMeaningfulFragment(frag: string): boolean {
  if (frag.length < 2) return false;
  if (FRAGMENT_FILLER_WORDS.has(frag)) return false;
  // A single short token left after stripping is almost always noise, not a place name.
  if (!frag.includes(' ') && frag.length < 3) return false;
  return true;
}

/** Extract full location phrase after «در/تو» — avoid truncating to last token. */
export function extractLocationFragment(rawText: string): string | undefined {
  const text = rawText.trim();
  if (!text) return undefined;

  const normalized = normalizeDigits(text);
  const stopSuffix =
    '(?:\\s+لازم\\s*دار(?:م|یم)|\\s+نیاز\\s*دار(?:م|یم)|\\s+دنبال|\\s+می[\\s‌]?خو(?:ام|واه|اهم)|\\s+میخو(?:ام|واه|اهم)|\\s+برای|\\s+بودجه|\\s+اجاره|\\s+رهن|\\s+فروش|\\s+خرید|\\s+زندگی\\s*می|\\s+اگر\\s+موردی|\\s+پیام\\s*بدید)';
  const patterns = [
    new RegExp(`(?:در|تو|توی|داخل)\\s+([\\u0600-\\u06FF\\u200c\\s\\-]+?)${stopSuffix}`, 'i'),
    /(?:در|تو|توی|داخل)\s+([\u0600-\u06FF\u200c\s\-]+?)(?:،|\s+و\s+)/i,
    /(?:در|تو|توی|داخل)\s+([\u0600-\u06FF\u200c\s\-]+?)(?=\s+\d[\d۰-۹]*\s*مت|\s+حد(?:اق|اک)ثر|$)/iu,
    /(?:محله|منطقه|محدوده)\s+([\u0600-\u06FF\u200c\s\-]+?)(?:\s|$)/i,
    /(?:حاشیه|اطراف|حوالی)\s+([\u0600-\u06FF\u200c\s\-]+?)(?:\s+ده\s+|\s+صد\s+|\s+\d|$)/iu,
  ];

  for (const re of patterns) {
    const m = normalized.match(re);
    const raw = m?.[1] ? cleanLocationFragment(m[1]) : undefined;
    const frag = raw
      ? stripTrailingCityFromFragment(
          stripTrailingMoneyFromFragment(stripTrailingAreaFromFragment(raw))
        )
      : undefined;
    if (frag && isMeaningfulFragment(frag)) return frag;
  }

  const streetLead = normalized.match(
    /(?:^|\s)(?:بلوار|خیابان|کوچه)\s+([\u0600-\u06FF\u200c\s\-]+?)(?:\s|$|[،,])/iu
  );
  if (streetLead?.[1]) {
    const frag = stripTrailingCityFromFragment(
      stripTrailingMoneyFromFragment(stripTrailingAreaFromFragment(cleanLocationFragment(streetLead[1])))
    );
    if (frag && isMeaningfulFragment(frag)) return frag;
  }

  return undefined;
}
