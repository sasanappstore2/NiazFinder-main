import type { StyleSpecification } from 'maplibre-gl';

const OFM_TILES = 'https://tiles.openfreemap.org/planet';
const OFM_GLYPHS = 'https://tiles.openfreemap.org/font/{fontstack}/{range}.pbf';

/** Persian street label — prefer OSM `name:fa`, then `name`. */
const STREET_NAME = ['coalesce', ['get', 'name:fa'], ['get', 'name']] as const;

const ROAD_CASE = ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 2, 1] as const;

/**
 * Divar-inspired dark vector style for Mashhad test.
 * OSM via OpenFreeMap — minimal POI, alley-level roads, Persian labels.
 */
export function buildMashhadDivarStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'niazfinder-mashhad-divar-test',
    glyphs: OFM_GLYPHS,
    sources: {
      openmaptiles: {
        type: 'vector',
        url: OFM_TILES,
        maxzoom: 14,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#181b22' },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: {
          'fill-color': '#1a2838',
          'fill-opacity': 0.9,
        },
      },
      {
        id: 'park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'park',
        minzoom: 10,
        paint: {
          'fill-color': '#1c3328',
          'fill-opacity': 0.55,
        },
      },
      {
        id: 'landuse-residential',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        filter: ['==', ['get', 'class'], 'residential'],
        minzoom: 11,
        paint: {
          'fill-color': '#1c1f27',
          'fill-opacity': 0.35,
        },
      },
      {
        id: 'building-outline',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 13,
        paint: {
          'fill-color': '#252932',
          'fill-opacity': 0.45,
          'fill-outline-color': '#2e333d',
        },
      },
      {
        id: 'road-service',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 13,
        filter: [
          'all',
          ['!in', 'class', 'ferry', 'path', 'track', 'raceway', 'aerialway'],
          ['in', 'class', 'service', 'minor'],
        ],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#3d4654',
          'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.35, 14, 0.55, 15, 0.75],
          'line-opacity': 0.85,
        },
      },
      {
        id: 'road-tertiary',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 11,
        filter: ['==', 'class', 'tertiary'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#4f5d6e',
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.5, 13, 1.1, 15, 1.6],
        },
      },
      {
        id: 'road-secondary',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 10,
        filter: ['==', 'class', 'secondary'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#6a7a8f',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 12, 1.4, 15, 2.2],
        },
      },
      {
        id: 'road-primary',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 9,
        filter: ['in', 'class', 'primary'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#8a9bb0',
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.9, 12, 1.8, 15, 2.8],
        },
      },
      {
        id: 'road-trunk-motorway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 8,
        filter: ['in', 'class', 'trunk', 'motorway'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#9eb0c4',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 2.4, 15, 3.4],
        },
      },
      {
        id: 'road-label-minor',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        minzoom: 14,
        filter: ['in', 'class', 'minor', 'service', 'tertiary'],
        layout: {
          'symbol-placement': 'line',
          'text-field': STREET_NAME,
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 15, 11],
          'text-max-angle': 30,
          'text-padding': 2,
        },
        paint: {
          'text-color': '#c5cdd8',
          'text-halo-color': '#181b22',
          'text-halo-width': 1.2,
          'text-opacity': 0.92,
        },
      },
      {
        id: 'road-label-major',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        minzoom: 12,
        filter: ['!in', 'class', 'minor', 'service', 'path', 'track'],
        layout: {
          'symbol-placement': 'line',
          'text-field': STREET_NAME,
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 11, 14, 13, 15, 14],
          'text-max-angle': 30,
          'text-padding': 2,
        },
        paint: {
          'text-color': '#e8edf3',
          'text-halo-color': '#181b22',
          'text-halo-width': 1.4,
        },
      },
    ],
  };
}

export const MASHHAD_DIVAR_ATTRIBUTION =
  '\u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> \u00b7 <a href="https://openfreemap.org">OpenFreeMap</a>';
