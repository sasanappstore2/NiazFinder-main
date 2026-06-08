import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import type { BusinessMapThemeMode } from '@/lib/business/map-tiles';
import { resolveIranGlyphsUrl, resolveIranTilejsonUrl } from '@/lib/map/iran/vector-config';
import {
  type IranDivarPalette,
  resolveIranDivarPalette,
} from '@/lib/map/iran/divar-style-palette';
import { IRAN_MAP_ZOOM } from '@/lib/map/iran/zoom-tiers';
import { IRAN_VECTOR_SOURCE_BOUNDS, IRAN_VOID_MASK_GEOJSON } from '@/lib/map/iran/viewport-geo';

const Z = IRAN_MAP_ZOOM;

const STREET_NAME: ['coalesce', ['get', 'name:fa'], ['get', 'name']] = [
  'coalesce',
  ['get', 'name:fa'],
  ['get', 'name'],
];

function buildLayers(p: IranDivarPalette): LayerSpecification[] {
  const placeLabelHalo = {
    'text-halo-color': p.labelHalo,
    'text-halo-width': 1.4,
  };

  const roadLabelLayoutBase = {
    'symbol-placement': 'line' as const,
    'text-field': STREET_NAME,
    'text-font': ['Noto Sans Regular'],
    'text-keep-upright': true,
    'text-rotation-alignment': 'viewport' as const,
    'text-pitch-alignment': 'viewport' as const,
    'text-max-angle': 30,
    'text-padding': 2,
  };

  const placeLabelLayoutBase = {
    'text-field': STREET_NAME,
    'text-font': ['Noto Sans Regular'],
    'text-anchor': 'center' as const,
    'text-max-width': 8,
    'text-optional': true,
  };

  return [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': p.void },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: {
        'fill-color': p.water,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.96, 10, 0.9, 14, 0.85],
      },
    },
    {
      id: 'waterway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      minzoom: Z.PROVINCIAL,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': p.waterway,
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.35, 11, 0.85, 14, 1.5],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.45, 10, 0.75, 12, 0.85],
      },
    },
    {
      id: 'road-motorway-trunk',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: Z.REGIONAL,
      filter: ['in', 'class', 'motorway', 'trunk'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': p.roadMotorway,
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.4, 9, 1, 11, 1.8, 14, 2.6],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.3, 8, 0.45, 9, 0.65, 10, 0.85],
      },
    },
    {
      id: 'road-primary',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: Z.PROVINCIAL,
      filter: ['in', 'class', 'primary'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': p.roadPrimary,
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.35, 10, 0.9, 12, 1.6, 14, 2.2],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.25, 9, 0.45, 10, 0.7, 11, 0.85],
      },
    },
    {
      id: 'road-secondary',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: Z.URBAN,
      filter: ['==', 'class', 'secondary'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': p.roadSecondary,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 12, 1.2, 14, 2],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.4, 11, 0.65, 12, 0.8],
      },
    },
    {
      id: 'road-tertiary',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: Z.LOCAL,
      filter: ['==', 'class', 'tertiary'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': p.roadTertiary,
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.45, 13, 1, 15, 1.6],
        'line-opacity': 0.8,
      },
    },
    {
      id: 'road-service',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: Z.STREET,
      filter: [
        'all',
        ['!in', 'class', 'ferry', 'path', 'track', 'raceway', 'aerialway'],
        ['in', 'class', 'service', 'minor'],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': p.roadService,
        'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.35, 14, 0.55, 16, 0.9],
        'line-opacity': 0.85,
      },
    },
    {
      id: 'boundary-country',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      minzoom: Z.REGIONAL,
      filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
      paint: {
        'line-color': p.boundary,
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.6, 10, 1.2, 14, 1.8],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.5, 9, 0.7, 11, 0.85],
      },
    },
    {
      id: 'park',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'park',
      minzoom: Z.URBAN,
      paint: {
        'fill-color': p.park,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.35, 12, 0.5],
      },
    },
    {
      id: 'landuse-commercial',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      minzoom: Z.LOCAL,
      maxzoom: 14,
      filter: ['in', 'class', 'commercial', 'retail'],
      paint: {
        'fill-color': p.landuseCommercial,
        'fill-opacity': 0.35,
      },
    },
    {
      id: 'landuse-residential',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['==', ['get', 'class'], 'residential'],
      minzoom: Z.LOCAL,
      paint: {
        'fill-color': p.landuseResidential,
        'fill-opacity': 0.35,
      },
    },
    {
      id: 'building-outline',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: Z.STREET,
      paint: {
        'fill-color': p.buildingFill,
        'fill-opacity': 0.45,
        'fill-outline-color': p.buildingOutline,
      },
    },
    {
      id: 'place-city-major',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: Z.REGIONAL,
      maxzoom: Z.URBAN,
      filter: ['all', ['==', ['get', 'class'], 'city'], ['<=', ['get', 'rank'], 5]],
      layout: {
        ...placeLabelLayoutBase,
        'text-size': ['interpolate', ['linear'], ['zoom'], 7, 10, 9, 11],
        'symbol-sort-key': ['-', ['get', 'rank']],
      },
      paint: {
        'text-color': p.labelStrong,
        ...placeLabelHalo,
        'text-halo-width': 1.5,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.92, 9, 0.8, 10, 0],
      },
    },
    {
      id: 'place-city',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: Z.PROVINCIAL,
      maxzoom: 13,
      filter: ['==', ['get', 'class'], 'city'],
      layout: {
        ...placeLabelLayoutBase,
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 10, 12, 13, 13],
        'symbol-sort-key': ['-', ['get', 'rank']],
      },
      paint: {
        'text-color': p.labelStrong,
        ...placeLabelHalo,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.65, 9, 0.85, 10, 0.95],
      },
    },
    {
      id: 'place-town',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: Z.PROVINCIAL,
      maxzoom: 13,
      filter: ['==', ['get', 'class'], 'town'],
      layout: {
        ...placeLabelLayoutBase,
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 10, 11, 12, 12],
        'symbol-sort-key': ['-', ['get', 'rank']],
      },
      paint: {
        'text-color': p.labelSoft,
        ...placeLabelHalo,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.55, 10, 0.8, 12, 0.9],
      },
    },
    {
      id: 'place-suburb',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: Z.LOCAL,
      maxzoom: 14,
      filter: ['in', 'class', 'suburb', 'borough'],
      layout: {
        ...placeLabelLayoutBase,
        'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 13, 12],
        'symbol-sort-key': ['-', ['get', 'rank']],
      },
      paint: {
        'text-color': p.labelMid,
        ...placeLabelHalo,
      },
    },
    {
      id: 'place-neighbourhood',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: Z.STREET - 1,
      maxzoom: 14,
      filter: ['in', 'class', 'neighbourhood', 'quarter'],
      layout: {
        ...placeLabelLayoutBase,
        'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 14, 11],
        'symbol-sort-key': ['-', ['get', 'rank']],
      },
      paint: {
        'text-color': p.labelMuted,
        ...placeLabelHalo,
      },
    },
    {
      id: 'water-name',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'water_name',
      minzoom: Z.PROVINCIAL,
      maxzoom: 12,
      layout: {
        'text-field': STREET_NAME,
        'text-font': ['Noto Sans Regular'],
        'symbol-placement': 'line',
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 11, 11],
        'text-optional': true,
      },
      paint: {
        'text-color': p.waterLabel,
        ...placeLabelHalo,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 10, 0.85],
      },
    },
    {
      id: 'road-label-motorway',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: Z.URBAN,
      filter: ['in', 'class', 'motorway', 'trunk'],
      layout: {
        ...roadLabelLayoutBase,
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, 10, 13, 12],
      },
      paint: {
        'text-color': p.labelStrong,
        ...placeLabelHalo,
      },
    },
    {
      id: 'road-label-primary',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: Z.LOCAL,
      filter: ['in', 'class', 'primary'],
      layout: {
        ...roadLabelLayoutBase,
        'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 14, 12],
      },
      paint: {
        'text-color': p.labelMid,
        ...placeLabelHalo,
      },
    },
    {
      id: 'road-label-secondary',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: Z.STREET - 1,
      filter: ['in', 'class', 'secondary'],
      layout: {
        ...roadLabelLayoutBase,
        'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 14, 12],
      },
      paint: {
        'text-color': p.labelSoft,
        ...placeLabelHalo,
      },
    },
    {
      id: 'road-label-tertiary',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: Z.STREET,
      filter: ['in', 'class', 'tertiary'],
      layout: {
        ...roadLabelLayoutBase,
        'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 15, 11],
      },
      paint: {
        'text-color': p.labelMuted,
        ...placeLabelHalo,
        'text-opacity': 0.9,
      },
    },
    {
      id: 'road-label-minor',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: 14,
      filter: ['in', 'class', 'minor', 'service'],
      layout: {
        ...roadLabelLayoutBase,
        'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 16, 11],
      },
      paint: {
        'text-color': p.labelMuted,
        ...placeLabelHalo,
        'text-opacity': 0.85,
      },
    },
    {
      id: 'iran-void-mask',
      type: 'fill',
      source: 'iran-void-mask',
      paint: {
        'fill-color': p.void,
        'fill-opacity': 1,
      },
    },
  ];
}

/** Divar-inspired vector style — self-hosted Iran tiles via `/api/map/vector/iran`. */
export function buildIranDivarStyle(theme: BusinessMapThemeMode = 'dark'): StyleSpecification {
  const palette = resolveIranDivarPalette(theme);

  return {
    version: 8,
    name: theme === 'light' ? 'niazfinder-iran-divar-light' : 'niazfinder-iran-divar',
    glyphs: resolveIranGlyphsUrl(),
    sources: {
      openmaptiles: {
        type: 'vector',
        url: resolveIranTilejsonUrl(),
        bounds: IRAN_VECTOR_SOURCE_BOUNDS,
        maxzoom: 14,
      },
      'iran-void-mask': {
        type: 'geojson',
        data: IRAN_VOID_MASK_GEOJSON,
      },
    },
    layers: buildLayers(palette),
  };
}

export const IRAN_DIVAR_ATTRIBUTION =
  '\u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
