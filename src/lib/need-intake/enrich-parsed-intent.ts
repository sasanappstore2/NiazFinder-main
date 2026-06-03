import type { ParsedIntent } from '@/contracts/need-intake';
import { getCategoryPath } from '@/config/categories';
import { computeMissingIntakeFields } from '@/lib/need-intake/compute-missing-fields';
import { applyPropertySlotsToParsed } from '@/lib/need-intake/apply-property-slots-to-parsed';
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
  let next: ParsedIntent = applyPropertySlotsToParsed(parsed);
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
