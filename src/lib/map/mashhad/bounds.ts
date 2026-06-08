import { resolveBusinessMapCityBounds } from '@/lib/business/map-city-bounds';
import { resolveBusinessMapCenter } from '@/lib/business/map-default-center';

/** Mashhad urban bbox for the Divar-style test map. */
export const MASHHAD_MAP_BBOX = resolveBusinessMapCityBounds(['mashhad'])!;

export const MASHHAD_MAP_CENTER = resolveBusinessMapCenter(['mashhad']);

/** Lng/lat bounds with slight padding — keeps pan inside greater Mashhad. */
export const MASHHAD_MAX_BOUNDS: [[number, number], [number, number]] = [
  [MASHHAD_MAP_BBOX.west - 0.04, MASHHAD_MAP_BBOX.south - 0.03],
  [MASHHAD_MAP_BBOX.east + 0.04, MASHHAD_MAP_BBOX.north + 0.03],
];

export const MASHHAD_DIVAR_MIN_ZOOM = 11;
/** +1 zoom vs initial test (15 ? 16); vector tiles overzoom from z14. */
export const MASHHAD_DIVAR_MAX_ZOOM = 16;
export const MASHHAD_DIVAR_CLUSTER_MAX_ZOOM = MASHHAD_DIVAR_MAX_ZOOM;
