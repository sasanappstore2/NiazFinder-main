import type { ParsedIntent } from '@/contracts/need-intake';
import { getCategoryPath } from '@/config/categories';
import { computeMissingIntakeFields } from '@/lib/need-intake/compute-missing-fields';
import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';
import { isConstructionPartnershipText, parseCity } from '@/lib/need-intake/intent-parser';
import { buildPropertyTitle, buildRealEstateServiceTitle } from '@/lib/need-intake/property-title';
import {
  findNeighborhoodInAnyCity,
  findNeighborhoodInText,
  rankNeighborhoodCandidates,
  type NeighborhoodGlobalMatch,
} from '@/lib/need-intake/neighborhood-catalog.server';
import { parseAreaFromText } from '@/lib/need-intake/vertical-classifier';

function isPropertyParsed(parsed: ParsedIntent): boolean {
  if (parsed.intentType.startsWith('property')) return true;
  if (parsed.intentType === 'real_estate_service') return true;
  if (parsed.categorySlug === 'construction-partnership') return true;
  if (parsed.rawText && isConstructionPartnershipText(parsed.rawText)) return true;
  const root = getCategoryPath(parsed.categorySlug)[0]?.slug;
  return root === 'real-estate';
}

/** Attach neighborhood slug, slot extraction, optional disambiguation, and missingFields. */
export function enrichParsedIntent(parsed: ParsedIntent): ParsedIntent {
  let next: ParsedIntent = {
    ...parsed,
    entities: { ...parsed.entities },
  };

  if (isPropertyParsed(next) && next.rawText) {
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
  }

  const partnership = isConstructionPartnershipText(next.rawText ?? '');
  const raw = next.rawText?.trim() ?? '';

  const skipNeighborhoodAuto =
    partnership ||
    next.categorySlug === 'construction-partnership' ||
    next.intentType === 'real_estate_service';

  if (isPropertyParsed(next) && raw && !skipNeighborhoodAuto) {
    let globalMatchForCity: NeighborhoodGlobalMatch | null = null;
    let city = next.city?.trim() || parseCity(raw);
    if (!city) {
      globalMatchForCity = findNeighborhoodInAnyCity(raw);
      if (globalMatchForCity) city = globalMatchForCity.city;
    }

    if (city) {
      let fragment =
        parseAreaFromText(raw)?.trim() ||
        next.entities?.area?.trim() ||
        '';

      if (!fragment) {
        const hit = findNeighborhoodInText(city, raw);
        if (hit) fragment = (hit.matchedArea ?? hit.name).trim();
      }

      const rankingSeed =
        fragment ||
        (globalMatchForCity ? globalMatchForCity.name : '') ||
        '';

      if (rankingSeed) {
        const { candidates, ambiguous } = rankNeighborhoodCandidates(city, rankingSeed, raw, 8);
        const areaHint = fragment || globalMatchForCity?.name || rankingSeed;
        if (candidates.length === 0) {
          next = {
            ...next,
            city,
            entities: { ...next.entities, area: areaHint },
            neighborhoodSlug: undefined,
            locationAmbiguous: false,
            neighborhoodCandidates: undefined,
          };
        } else if (ambiguous) {
          next = {
            ...next,
            city,
            neighborhoodSlug: undefined,
            locationAmbiguous: true,
            neighborhoodCandidates: candidates.slice(0, 6).map((c) => ({
              slug: c.slug,
              label: c.name,
            })),
            entities: { ...next.entities, area: areaHint },
          };
        } else {
          const best = candidates[0];
          next = {
            ...next,
            city,
            neighborhoodSlug: best.slug,
            locationAmbiguous: false,
            neighborhoodCandidates: undefined,
            entities: { ...next.entities, area: best.name },
          };
        }
      } else {
        next = { ...next, city };
      }
    }
  }

  if (partnership || next.intentType === 'real_estate_service') {
    next = {
      ...next,
      title: buildRealEstateServiceTitle(next.entities, next.city),
    };
  } else if (isPropertyParsed(next)) {
    next = {
      ...next,
      title: buildPropertyTitle(
        next.intentType,
        next.entities,
        next.city,
        next.entities.area
      ),
    };
  }

  return {
    ...next,
    missingFields: computeMissingIntakeFields(next),
  };
}
