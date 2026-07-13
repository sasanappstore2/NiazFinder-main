import type { CrawlBlueprint, FilingFieldKey } from '@/lib/filing/ingest/crawl-blueprint';
import { analyzeCardText, analyzeCardTextFlat, guessesToFieldMap } from '@/lib/filing/ingest/intake-card-analyzer';

export type InferredListingFields = {
  title?: string;
  fileCode?: string;
  dealType?: string;
  propertyKind?: string;
  neighborhood?: string;
  location?: string;
  deposit?: string;
  monthlyRent?: string;
  price?: string;
  area?: string;
  floor?: string;
  rooms?: string;
};

/** Parse neighborhood from "شهر - محله، خیابان" using known city label. */
export function parseNeighborhoodFromLocation(
  locationLine: string,
  userCity: string
): { neighborhood?: string; location?: string } {
  const line = locationLine.trim();
  if (!line) return {};

  const city = userCity.trim();
  let rest = line;
  if (city && line.includes(city)) {
    rest = line.split(city).slice(1).join(city).replace(/^[\s\-–—]+/, '');
  }

  const dashParts = rest.split(/\s*[-–—]\s*/);
  let neighborhood: string | undefined;
  if (dashParts.length > 0 && dashParts[0]?.trim()) {
    neighborhood = dashParts[0].split(/[،,]/)[0]?.trim();
  }

  if (!neighborhood && line.includes('-')) {
    const afterCity = line.replace(city, '').replace(/^[\s\-–—]+/, '');
    neighborhood = afterCity.split(/[،,\-–—]/)[0]?.trim();
  }

  return {
    neighborhood: neighborhood && neighborhood.length >= 2 ? neighborhood : undefined,
    location: line,
  };
}

/** Heuristic parse of a Persian housing listing card (list item text). */
export function inferListingFieldsFromText(
  text: string,
  userCity: string
): InferredListingFields {
  return analyzeCardTextFlat(text, userCity) as InferredListingFields;
}

/** Build fieldMap from card sample via intake analyzer. */
export function buildAutoFieldMapFromCardSample(
  sampleText: string,
  userCity = 'مشهد'
): NonNullable<CrawlBlueprint['fieldMap']> {
  if (!sampleText?.trim()) {
    return guessesToFieldMap(analyzeCardText('رهن و اجاره آپارتمان 90 متری کد فایل 1', userCity));
  }
  return guessesToFieldMap(analyzeCardText(sampleText, userCity));
}

export const AUTO_FIELD_KEYS: FilingFieldKey[] = [
  'title',
  'fileCode',
  'dealType',
  'propertyKind',
  'neighborhood',
  'location',
  'deposit',
  'monthlyRent',
  'price',
  'area',
  'floor',
  'rooms',
];
