/** All browse maps use the self-hosted Iran Divar-style vector template. */
export const MASHHAD_DIVAR_CITY_SLUG = 'mashhad' as const;

export type CityMapTemplateId = 'iran-divar-vector';

export function resolveCityMapTemplate(_citySlugs: string[]): CityMapTemplateId {
  return 'iran-divar-vector';
}

export function isIranDivarMapTemplate(_citySlugs?: string[]): boolean {
  return true;
}

/** @deprecated Use isIranDivarMapTemplate */
export function isMashhadDivarMapTemplate(citySlugs: string[]): boolean {
  return isIranDivarMapTemplate(citySlugs);
}
