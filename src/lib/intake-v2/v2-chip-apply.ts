import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import { toAsciiDigits } from '@/lib/format/digits';
import { parseMoneyInput } from '@/lib/format/money';
import { applyLocationResolutionToParsed } from '@/lib/need-intake/location-resolution-engine';
import { getNeighborhoodCatalogForCity } from '@/lib/need-intake/neighborhood-catalog.server';
import { ALL_LOCATION_CITIES } from '@/lib/search/city-slugs';

const MILLION = 1_000_000;
const BILLION = 1_000_000_000;

function parseDepositRange(text: string): { min?: number; max?: number } | null {
  const d = toAsciiDigits(text);
  if (/زیر\s*(\d+)/.test(d)) {
    const n = Number(d.match(/زیر\s*(\d+)/)?.[1]);
    if (n) return { max: n * MILLION };
  }
  if (/(\d+)\s*تا\s*(\d+)/.test(d)) {
    const m = d.match(/(\d+)\s*تا\s*(\d+)/);
    if (m) return { min: Number(m[1]) * MILLION, max: Number(m[2]) * MILLION };
  }
  if (/بالای\s*(\d+)/.test(d)) {
    const n = Number(d.match(/بالای\s*(\d+)/)?.[1]);
    if (n) return { min: n * MILLION };
  }
  return null;
}

function parseRentRange(text: string): { min?: number; max?: number } | null {
  return parseDepositRange(text.replace(/اجاره/g, 'ودیعه'));
}

function parseBudgetRange(text: string): { min?: number; max?: number } | null {
  const d = toAsciiDigits(text);
  if (/زیر\s*(\d+)/.test(d)) {
    const n = Number(d.match(/زیر\s*(\d+)/)?.[1]);
    if (n) return { max: n * BILLION };
  }
  if (/(\d+)\s*تا\s*(\d+)/.test(d)) {
    const m = d.match(/(\d+)\s*تا\s*(\d+)/);
    if (m) return { min: Number(m[1]) * BILLION, max: Number(m[2]) * BILLION };
  }
  if (/بالای\s*(\d+)/.test(d)) {
    const n = Number(d.match(/بالای\s*(\d+)/)?.[1]);
    if (n) return { min: n * BILLION };
  }
  return null;
}

function parseAreaFromChip(text: string): number | null {
  const d = toAsciiDigits(text);
  const m = d.match(/(\d+)\s*متر/);
  if (m) return Number(m[1]);
  if (/^\d+$/.test(d.trim())) {
    const n = Number(d.trim());
    if (n >= 15 && n <= 5000) return n;
  }
  return null;
}

function parseRoomsFromChip(text: string): number | null {
  const d = toAsciiDigits(text);
  if (/تک\s*خواب|یک\s*خواب|۱\s*خواب/.test(d)) return 1;
  if (/دو\s*خواب|۲\s*خواب/.test(d)) return 2;
  if (/سه\s*خواب|۳\s*خواب/.test(d)) return 3;
  if (/چهار|۴/.test(d)) return 4;
  return null;
}

function parseFloorFromChip(text: string): number | null {
  if (/همکف|هم\s*کف/.test(text)) return 0;
  const d = toAsciiDigits(text);
  const m = d.match(/طبقه\s*(\d+)/);
  if (m) return Number(m[1]);
  if (/۲\s*\+|۲\+|بالا/.test(d)) return 2;
  return null;
}

function applyNeighborhoodChip(
  slug: string,
  city: string,
  answers: NeedDraft['answers'],
  parsed: ParsedIntent
): { answers: NeedDraft['answers']; parsed: ParsedIntent } {
  const catalog = getNeighborhoodCatalogForCity(city);
  const entry = catalog.find((n) => n.slug === slug);
  const hoodName = entry?.name ?? slug;
  const loc = city ? `${hoodName}، ${city}` : hoodName;
  return {
    answers: {
      ...answers,
      location: loc,
      _neighborhoodSlug: slug,
    },
    parsed: {
      ...parsed,
      neighborhoodSlug: slug,
      city: city || parsed.city,
      locationAmbiguous: false,
      neighborhoodCandidates: undefined,
      entities: {
        ...parsed.entities,
        area: hoodName,
      },
    },
  };
}

/** Apply structured slot values from chip selection or typed preset text. */
export function applyV2ChipToDraft(
  draft: NeedDraft,
  opts: {
    chipFieldKey?: string;
    chipValue?: string;
    message?: string;
  }
): { answers: NeedDraft['answers']; parsedIntent: ParsedIntent; skippedField?: boolean } {
  const fieldKey = opts.chipFieldKey;
  const value = (opts.chipValue ?? opts.message ?? '').trim();
  let answers = { ...draft.answers };
  let parsedIntent = { ...draft.parsedIntent };

  if (opts.chipValue === '__skip__' || value === '__skip__') {
    return { answers, parsedIntent, skippedField: true };
  }

  if (value.startsWith('__hood__:')) {
    const slug = value.slice('__hood__:'.length);
    const city = parsedIntent.city ?? String(answers.location ?? '').split('،').pop()?.trim() ?? '';
    const applied = applyNeighborhoodChip(slug, city, answers, parsedIntent);
    return { answers: applied.answers, parsedIntent: applied.parsed };
  }

  if (value.startsWith('__city__:')) {
    const cityId = value.slice('__city__:'.length);
    const meta = ALL_LOCATION_CITIES.find((c) => c.id === cityId);
    const cityName = meta?.name ?? cityId;
    let nextParsed: ParsedIntent = {
      ...parsedIntent,
      city: cityName,
      rejectLocationAutoConfirm: false,
      locationResolutionStatus: undefined,
      cityCandidates: undefined,
      locationAmbiguous: false,
    };
    nextParsed = applyLocationResolutionToParsed(nextParsed, { preferredCityId: cityId });
    if (nextParsed.neighborhoodSlug && nextParsed.city) {
      const hoodLabel =
        nextParsed.entities?.area ?? nextParsed.neighborhoodSlug.replace(/-/g, ' ');
      answers = {
        ...answers,
        location: `${hoodLabel}، ${nextParsed.city}`,
        _neighborhoodSlug: nextParsed.neighborhoodSlug,
      };
    } else {
      answers = { ...answers, location: cityName };
    }
    return { answers, parsedIntent: nextParsed };
  }

  if (!fieldKey || !value) {
    return { answers, parsedIntent };
  }

  switch (fieldKey) {
    case 'dealType': {
      const dealValues = new Set([
        'buy',
        'sell',
        'rent_monthly',
        'rent_rahn_full',
        'rent_rahn_ejare',
        'rent_short_term',
      ]);
      if (dealValues.has(value)) answers.dealType = value;
      else if (/رهن\s*و\s*اجاره|ودیعه\s*و\s*اجاره/.test(value)) answers.dealType = 'rent_rahn_ejare';
      else if (/رهن\s*کامل/.test(value)) answers.dealType = 'rent_rahn_full';
      else if (/خرید/.test(value)) answers.dealType = 'buy';
      else if (/فروش/.test(value)) answers.dealType = 'sell';
      else if (/اجاره/.test(value)) answers.dealType = 'rent_monthly';
      break;
    }
    case 'propertyKind': {
      const kinds = new Set(['apartment', 'villa', 'land', 'office', 'shop', 'industrial']);
      if (kinds.has(value)) answers.propertyKind = value;
      break;
    }
    case 'deposit': {
      const range = parseDepositRange(value);
      const money = parseMoneyInput(value);
      if (range?.max) answers.deposit = range.max;
      else if (range?.min) answers.deposit = range.min;
      else if (money != null) answers.deposit = money;
      break;
    }
    case 'monthlyRent': {
      const range = parseRentRange(value);
      const money = parseMoneyInput(value);
      if (range?.max) answers.monthlyRent = range.max;
      else if (range?.min) answers.monthlyRent = range.min;
      else if (money != null) answers.monthlyRent = money;
      break;
    }
    case 'budget': {
      const range = parseBudgetRange(value);
      const money = parseMoneyInput(value);
      if (range?.max) answers.budget = range.max;
      else if (range?.min) answers.budget = range.min;
      else if (money != null) answers.budget = money;
      break;
    }
    case 'areaMin':
    case 'areaMax': {
      const area = parseAreaFromChip(value);
      if (area != null) answers.areaMin = area;
      break;
    }
    case 'floorMin':
    case 'floorMax': {
      const floor = parseFloorFromChip(value);
      if (floor != null) answers.floorMin = floor;
      break;
    }
    case 'rooms': {
      const rooms = parseRoomsFromChip(value);
      if (rooms != null) answers.rooms = rooms;
      break;
    }
    case 'location': {
      if (value.startsWith('__hood__:')) {
        const slug = value.slice('__hood__:'.length);
        const city = parsedIntent.city ?? '';
        const applied = applyNeighborhoodChip(slug, city, answers, parsedIntent);
        answers = applied.answers;
        parsedIntent = applied.parsed;
      } else {
        answers.location = value;
      }
      break;
    }
    default:
      break;
  }

  return { answers, parsedIntent };
}
