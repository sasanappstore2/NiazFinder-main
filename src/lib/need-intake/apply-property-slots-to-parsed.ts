import type { ParsedIntent } from '@/contracts/need-intake';
import { getCategoryPath } from '@/config/categories';
import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';
import { isConstructionPartnershipText } from '@/lib/need-intake/intent-parser';

function isPropertyParsed(parsed: ParsedIntent): boolean {
  if (parsed.intentType.startsWith('property')) return true;
  if (parsed.intentType === 'real_estate_service') return true;
  if (parsed.categorySlug === 'construction-partnership') return true;
  if (parsed.rawText && isConstructionPartnershipText(parsed.rawText)) return true;
  const root = getCategoryPath(parsed.categorySlug)[0]?.slug;
  return root === 'real-estate';
}

/** Client-safe: merge property slot extraction into parsed entities (no fs / catalog). */
export function applyPropertySlotsToParsed(parsed: ParsedIntent): ParsedIntent {
  const next: ParsedIntent = {
    ...parsed,
    entities: { ...parsed.entities },
  };

  if (!isPropertyParsed(next) || !next.rawText) return next;

  const slots = extractPropertySlotsFromText(next.rawText);
  if (slots.areaMin && !next.entities.areaMin) next.entities.areaMin = slots.areaMin;
  if (slots.areaMax && !next.entities.areaMax) next.entities.areaMax = slots.areaMax;
  if (slots.rooms && !next.entities.rooms) next.entities.rooms = slots.rooms;
  if (slots.plotWidth && !next.entities.plotWidth) next.entities.plotWidth = slots.plotWidth;
  if (slots.floorMin && !next.entities.floorMin) next.entities.floorMin = slots.floorMin;
  if (slots.pricePerMeterMin && !next.entities.pricePerMeterMin) {
    next.entities.pricePerMeterMin = slots.pricePerMeterMin;
  }
  if (slots.deposit && !next.entities.deposit) next.entities.deposit = slots.deposit;
  if (slots.monthlyRent && !next.entities.monthlyRent) {
    next.entities.monthlyRent = slots.monthlyRent;
  }
  if (slots.rahnAmount && !next.entities.rahnAmount) next.entities.rahnAmount = slots.rahnAmount;
  if (slots.nightlyRent && !next.entities.nightlyRent) {
    next.entities.nightlyRent = slots.nightlyRent;
  }
  if (slots.guestCount && !next.entities.guestCount) {
    next.entities.guestCount = slots.guestCount;
  }
  if (slots.nightlyRent && !next.entities.dealType) {
    next.entities.dealType = 'rent_short_term';
  }

  return next;
}
