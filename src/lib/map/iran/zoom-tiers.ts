/**
 * Progressive map detail by zoom — balance clarity, beauty, and utility.
 *
 * z5–6  national  : seas, province borders + names
 * z7–8  regional  : major highways (faint), major city names
 * z8–9  provincial: primary roads, rivers, more cities
 * z10–11 urban     : secondary roads, towns, parks
 * z12+  local      : neighbourhoods, tertiary roads, buildings
 */
export const IRAN_MAP_ZOOM = {
  NATIONAL_MAX: 6.5,
  REGIONAL: 7,
  PROVINCIAL: 8,
  URBAN: 10,
  LOCAL: 11,
  STREET: 13,
} as const;

/** City admin overlay starts appearing on national browse. */
export const IRAN_ADMIN_CITY_MIN_ZOOM = 8;

/** Vector tile “full detail” ramp begins (roads, all city labels). */
export const IRAN_VECTOR_DETAIL_RAMP_ZOOM = 7;
