/**
 * Build void mask GeoJSON: hide all map pixels outside Iran land + Gulf + Caspian.
 * Run: npx tsx scripts/geo/build-iran-map-void-mask.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import * as turf from '@turf/turf';
import { IRAN_MAP_BOUNDS } from '../../src/lib/business/map-tile-iran';

const ROOT = path.resolve(__dirname, '../..');
const OUT_SRC = path.join(ROOT, 'src/data/geo/iran-map-void-mask.geojson');
const OUT_PUBLIC = path.join(ROOT, 'public/geo/iran-map-void-mask.geojson');
const RAW_DIR = path.join(ROOT, 'src/data/geo/raw');
const ADM0_URL =
  'https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/IRN/ADM0/geoBoundaries-IRN-ADM0.geojson';

const { west, south, east, north } = IRAN_MAP_BOUNDS;

async function loadIranLand(): Promise<turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon>> {
  const rawPath = path.join(RAW_DIR, 'geoBoundaries-IRN-ADM0.geojson');
  let raw: GeoJSON.FeatureCollection;
  if (existsSync(rawPath)) {
    raw = JSON.parse(readFileSync(rawPath, 'utf8')) as GeoJSON.FeatureCollection;
  } else {
    const res = await fetch(ADM0_URL);
    if (!res.ok) throw new Error(`ADM0 download failed: ${res.status}`);
    raw = (await res.json()) as GeoJSON.FeatureCollection;
    mkdirSync(RAW_DIR, { recursive: true });
    writeFileSync(rawPath, JSON.stringify(raw));
  }
  const land = raw.features[0] as turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon>;
  return turf.simplify(land, { tolerance: 0.02, highQuality: true });
}

function worldOutsideBbox(): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: 'Feature',
    properties: { kind: 'world' },
    geometry: {
      type: 'Polygon',
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
}

function rewindHole(ring: number[][]): number[][] {
  const closed =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, ring[0]!];
  return turf.booleanClockwise(closed) ? closed : [...closed].reverse();
}

function exteriorRings(
  feature: turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon>
): number[][][] {
  const geom = feature.geometry;
  if (geom.type === 'Polygon') return [geom.coordinates[0]!];
  return geom.coordinates.map((poly) => poly[0]!);
}

function bboxExterior(): number[][] {
  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
}

/** Bbox donut: void on neighbor countries; seas render via water layers above this mask. */
function neighborVoidMask(
  land: turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon>
): GeoJSON.Feature<GeoJSON.Polygon> {
  const holes = exteriorRings(land).map(rewindHole);
  return {
    type: 'Feature',
    properties: { kind: 'neighbor' },
    geometry: {
      type: 'Polygon',
      coordinates: [bboxExterior(), ...holes],
    },
  };
}

async function main() {
  const land = await loadIranLand();
  const collection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [neighborVoidMask(land), worldOutsideBbox()],
  };

  const json = `${JSON.stringify(collection)}\n`;
  mkdirSync(path.dirname(OUT_SRC), { recursive: true });
  mkdirSync(path.dirname(OUT_PUBLIC), { recursive: true });
  writeFileSync(OUT_SRC, json);
  writeFileSync(OUT_PUBLIC, json);
  console.log(`[ok] wrote void mask (${json.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
