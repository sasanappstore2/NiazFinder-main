import type { NeedDraft } from '@/contracts/need-intake';
import { parseMoneyInput } from '@/lib/format/money';
import { toAsciiDigits } from '@/lib/format/digits';
import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';

const DEAL_TYPE_VALUES = new Set([
  'buy',
  'sell',
  'rent_monthly',
  'rent_rahn_full',
  'rent_rahn_ejare',
  'rent_short_term',
]);

const PROPERTY_KIND_VALUES = new Set([
  'apartment',
  'villa',
  'land',
  'office',
  'shop',
  'industrial',
]);

export function isLocationConfirmed(
  draft: NeedDraft,
  confirmedFields: Set<string>
): boolean {
  if (confirmedFields.has('location')) return true;

  const parsed = draft.parsedIntent;
  if (parsed.rejectLocationAutoConfirm) return false;
  if (
    parsed.locationResolutionStatus &&
    parsed.locationResolutionStatus !== 'resolved' &&
    !confirmedFields.has('location')
  ) {
    return false;
  }
  if (parsed.neighborhoodSlug && parsed.city && !parsed.locationAmbiguous) {
    return true;
  }

  const loc = String(draft.answers.location ?? '').trim();
  if ((loc.includes('،') || loc.includes(',')) && loc.length > 4) return true;

  const area = parsed.entities?.area;
  const city = parsed.city;
  if (area && city && area !== city && loc.includes(area)) return true;

  return false;
}

/** Detect canonical dealType from free-form Persian text or chip label. */
export function detectDealTypeFromText(text: string): string | null {
  const t = text.toLowerCase();
  if (/رهن\s*کامل|رهن\s*full/.test(t)) return 'rent_rahn_full';
  if (/رهن\s*و\s*اجاره|ودیعه\s*و\s*اجاره/.test(t)) return 'rent_rahn_ejare';
  if (/اجاره|مستاجر|رنت/.test(t)) return 'rent_monthly';
  if (/فروش|می‌فروش|میفروش/.test(t)) return 'sell';
  if (/خرید|می‌خر/.test(t)) return 'buy';
  if (DEAL_TYPE_VALUES.has(text.trim())) return text.trim();
  return null;
}

function detectDealType(text: string): string | null {
  return detectDealTypeFromText(text);
}

function hasRoomsSignal(text: string): boolean {
  return /تک\s*خواب|یک\s*خواب|دو\s*خواب|سه\s*خواب|۱\s*خواب|۲\s*خواب|۳\s*خواب|\d+\s*خواب/.test(
    text
  );
}

function isAreaLikeMessage(text: string): boolean {
  const digitText = toAsciiDigits(text);
  return (
    /\d+\s*متری?|\d+\s*متر\s*مربع|متراژ\s*\d+|\d+\s*m(?:\s|$|،|\.)/i.test(digitText) ||
    /\d+\s*m\b/i.test(text.trim())
  );
}

function detectPropertyKind(text: string): string | null {
  const t = text.toLowerCase();
  if (/مزون|مغازه|غرفه|ویترین|پاساژ/.test(t)) return 'shop';
  if (/انباری/.test(t)) return 'apartment';
  if (/انبار|سوله|صنعتی/.test(t)) return 'industrial';
  if (/دفتر|اداری/.test(t)) return 'office';
  if (/ویلا|خانه|خونه/.test(t)) return 'villa';
  if (/زمین|کلنگی/.test(t)) return 'land';
  if (/آپارت|اپارت|واحد\s*مسکونی/.test(t)) return 'apartment';
  if (PROPERTY_KIND_VALUES.has(text.trim())) return text.trim();
  return null;
}

/** Merge newly confirmed field keys from user message or chip value. */
export function mergeConfirmedFromMessage(
  message: string,
  draft: NeedDraft,
  priorConfirmed: Set<string>,
  opts?: { chipFieldKey?: string; chipValue?: string }
): Set<string> {
  const next = new Set(priorConfirmed);
  const trimmed = message.trim();
  if (!trimmed) return next;

  if (opts?.chipValue === '__skip__') {
    return next;
  }

  if (opts?.chipFieldKey && opts.chipFieldKey !== '__skip__') {
    const field = opts.chipFieldKey;
    const conflicts =
      (field === 'areaMin' && /ودیعه|رهن|اجاره|ماهانه/.test(trimmed) && !/متر/.test(trimmed)) ||
      (field === 'deposit' && /\d+\s*متر|متری/.test(trimmed)) ||
      (field === 'monthlyRent' && /ودیعه|رهن/.test(trimmed) && !/اجاره|ماهانه/.test(trimmed));
    if (!conflicts) {
      next.add(field);
    }
    if (opts.chipValue && DEAL_TYPE_VALUES.has(opts.chipValue)) {
      next.add('dealType');
    }
    if (opts.chipValue && PROPERTY_KIND_VALUES.has(opts.chipValue)) {
      next.add('propertyKind');
    }
  }

  const deal = detectDealType(trimmed);
  if (deal) next.add('dealType');

  const kind = detectPropertyKind(trimmed);
  if (kind) next.add('propertyKind');

  if (/همکف|طبقه\s*۰|طبقه\s*0|زیرین|هم\s*کف/.test(trimmed)) {
    next.add('floorMin');
  }

  const money = parseMoneyInput(trimmed);
  const digitText = toAsciiDigits(trimmed);
  const isAreaContext = isAreaLikeMessage(trimmed);
  if (money !== null && !isAreaContext) {
    if (/ودیعه|رهن|deposit/.test(trimmed.toLowerCase())) next.add('deposit');
    else if (/اجاره|ماهانه|rent/.test(trimmed.toLowerCase())) next.add('monthlyRent');
    else if (
      !next.has('deposit') &&
      draft.parsedIntent.categorySlug.includes('rent') &&
      /میلیون|میلیارد|تومان|ودیعه|رهن|اجاره/.test(trimmed)
    ) {
      next.add('deposit');
    }
  }

  if (isAreaLikeMessage(trimmed)) {
    next.add('areaMin');
  }
  if (/بودجه|میلیارد|میلیون\s*تومان/.test(trimmed) && /بودجه|میلیارد/.test(trimmed)) {
    next.add('budget');
  }
  if (/^\d+$/.test(digitText.trim()) && Number(digitText) >= 15 && Number(digitText) <= 5000) {
    next.add('areaMin');
  }

  if (/تک\s*خواب|یک\s*خواب|دو\s*خواب|سه\s*خواب|۱\s*خواب|۲\s*خواب|۳\s*خواب|\d+\s*خواب/.test(trimmed)) {
    if (!priorConfirmed.has('rooms')) {
      next.add('rooms');
    } else if (draft.answers.rooms != null) {
      const m = trimmed.match(/(\d)\s*خواب/) ?? trimmed.match(/(یک|دو|سه|تک)\s*خواب/);
      const wordMap: Record<string, number> = { یک: 1, دو: 2, سه: 3, تک: 1 };
      const parsed = m ? (wordMap[m[1]] ?? Number(m[1])) : null;
      if (parsed == null || parsed === Number(draft.answers.rooms)) {
        next.add('rooms');
      }
    }
  }

  if (opts?.chipValue?.startsWith('__hood__:') || opts?.chipValue?.startsWith('__city__:')) {
    next.add('location');
  }

  if (
    draft.parsedIntent.neighborhoodSlug &&
    draft.parsedIntent.city &&
    !draft.parsedIntent.locationAmbiguous &&
    !draft.parsedIntent.rejectLocationAutoConfirm &&
    !/نمی\s*خو(?:ام|واه)|نمیخو(?:ام|واه)|اشتباه|غلط|مد\s*نظرم/.test(trimmed) &&
    isLocationConfirmed(draft, next)
  ) {
    next.add('location');
  }

  if (DEAL_TYPE_VALUES.has(trimmed)) next.add('dealType');
  if (PROPERTY_KIND_VALUES.has(trimmed)) next.add('propertyKind');

  const sourceText = draft.sourceText ?? draft.parsedIntent.rawText ?? '';
  if (draft.answers.rooms != null && hasRoomsSignal(sourceText)) {
    next.add('rooms');
  }
  const slots = extractPropertySlotsFromText(sourceText);
  if (slots.rooms && draft.answers.rooms != null) {
    next.add('rooms');
  }
  if (slots.areaMin && draft.answers.areaMin != null) {
    next.add('areaMin');
  }

  return next;
}

/** Field keys inferred from parse this turn (not yet confirmed by user). */
export function inferInferredFieldKeys(draft: NeedDraft, confirmed: Set<string>): string[] {
  const inferred: string[] = [];
  const { parsedIntent, answers } = draft;

  if (answers.dealType && !confirmed.has('dealType')) inferred.push('dealType');
  if (answers.propertyKind && !confirmed.has('propertyKind')) inferred.push('propertyKind');
  if (
    (answers.location || parsedIntent.city) &&
    !isLocationConfirmed(draft, confirmed)
  ) {
    inferred.push('location');
  }
  if (answers.areaMin && !confirmed.has('areaMin')) inferred.push('areaMin');
  if (answers.floorMin != null && !confirmed.has('floorMin')) inferred.push('floorMin');
  if (answers.deposit && !confirmed.has('deposit')) inferred.push('deposit');
  if (answers.monthlyRent && !confirmed.has('monthlyRent')) inferred.push('monthlyRent');
  if (answers.budget && !confirmed.has('budget')) inferred.push('budget');
  if (answers.rooms != null && !confirmed.has('rooms')) inferred.push('rooms');

  return inferred;
}
