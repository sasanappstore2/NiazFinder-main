/** City slug with the production Divar-style vector map template. */
export const MASHHAD_DIVAR_CITY_SLUG = 'mashhad' as const;

export type CityMapTemplateId = 'default-raster' | 'mashhad-divar-vector';

/** Mashhad-only scope → OSM vector map (Divar-style template for other cities later). */
export function resolveCityMapTemplate(citySlugs: string[]): CityMapTemplateId {
  if (citySlugs.length === 1 && citySlugs[0] === MASHHAD_DIVAR_CITY_SLUG) {
    return 'mashhad-divar-vector';
  }
  return 'default-raster';
}

export function isMashhadDivarMapTemplate(citySlugs: string[]): boolean {
  return resolveCityMapTemplate(citySlugs) === 'mashhad-divar-vector';
}
