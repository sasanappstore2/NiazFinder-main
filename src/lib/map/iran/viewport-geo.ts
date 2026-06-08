import { IRAN_MAP_BOUNDS } from '@/lib/business/map-tile-iran';

const { west, south, east, north } = IRAN_MAP_BOUNDS;

/** MapLibre pan limits — Iran bbox (includes Persian Gulf + Caspian coast). */
export const IRAN_VIEW_BOUNDS_LNG_LAT: [[number, number], [number, number]] = [
  [west, south],
  [east, north],
];

export const IRAN_VIEW_FIT_BOUNDS: [[number, number], [number, number]] = IRAN_VIEW_BOUNDS_LNG_LAT;

export const IRAN_VIEW_FIT_PADDING = 12;

/** World shell with Iran-shaped hole — paints void outside the view. */
export const IRAN_VOID_MASK_GEOJSON = {
  type: 'Feature' as const,
  properties: {},
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      [
        [-180, -85],
        [-180, 85],
        [180, 85],
        [180, -85],
        [-180, -85],
      ],
      [
        [west, south],
        [west, north],
        [east, north],
        [east, south],
        [west, south],
      ],
    ],
  },
};

/** @deprecated Use `resolveIranDivarVoidColor(theme)` from `divar-style-palette`. */
export const IRAN_VOID_COLOR = '#181b22';

export const IRAN_VECTOR_SOURCE_BOUNDS: [number, number, number, number] = [
  west,
  south,
  east,
  north,
];

/** Persian Gulf label text — «خلیج همیشگی فارس». */
export const PERSIAN_GULF_LABEL_TEXT = '\u062e\u0644\u06cc\u062c \u0647\u0645\u06cc\u0634\u06af\u06cc \u0641\u0627\u0631\u0633';

/**
 * Persian Gulf label axis — user-specified endpoints in open water.
 * Stored as GeoJSON `[lng, lat]` (start → end).
 */
export const PERSIAN_GULF_LABEL_LINE_LNG_LAT: [[number, number], [number, number]] = [
  [53.728723, 25.698256],
  [49.756239, 28.585781],
];

export const PERSIAN_GULF_LABEL_MIN_ZOOM = 5;
export const PERSIAN_GULF_LABEL_MAX_ZOOM = 10;
