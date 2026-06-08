import type { BusinessMapBbox } from '@/lib/business/map-pins-types';
import {
  getCityMapConfigBySlug,
  resolveCityMapPinBbox,
  resolveCityMapPinCenter,
} from '@/lib/map/city-map-config';

function bboxForSlug(slug: string): BusinessMapBbox | null {
  const pinBbox = resolveCityMapPinBbox(slug);
  if (pinBbox) return pinBbox;

  const center = resolveCityMapPinCenter(slug);
  if (!center) return null;
  const cfg = getCityMapConfigBySlug(slug);
  const delta = cfg?.pinBboxDelta ?? cfg?.bboxDelta ?? { lat: 0.14, lng: 0.18 };
  return {
    south: center.lat - delta.lat,
    north: center.lat + delta.lat,
    west: center.lng - delta.lng,
    east: center.lng + delta.lng,
  };
}

/** Bounding box for a single city slug, or null when scope is country-wide. */
export function resolveBusinessMapCityBounds(citySlugs: string[]): BusinessMapBbox | null {
  if (citySlugs.length === 0) return null;

  const boxes: BusinessMapBbox[] = [];
  for (const slug of citySlugs) {
    const box = bboxForSlug(slug);
    if (box) boxes.push(box);
  }

  if (boxes.length === 0) return null;
  if (boxes.length === 1) return boxes[0]!;

  return {
    south: Math.min(...boxes.map((b) => b.south)),
    north: Math.max(...boxes.map((b) => b.north)),
    west: Math.min(...boxes.map((b) => b.west)),
    east: Math.max(...boxes.map((b) => b.east)),
  };
}

export function businessMapBboxToLeafletBounds(bbox: BusinessMapBbox): [[number, number], [number, number]] {
  return [
    [bbox.south, bbox.west],
    [bbox.north, bbox.east],
  ];
}
