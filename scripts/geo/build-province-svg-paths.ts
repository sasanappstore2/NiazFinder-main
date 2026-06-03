/**
 * Build SVG paths from province boundaries GeoJSON.
 */
import path from 'node:path';
import { GEO_DIR, readJson, writeJson } from './shared';

const VIEW = { width: 800, height: 520, minLon: 44, maxLon: 63, minLat: 25, maxLat: 40 };

function lonLatToSvg(lon: number, lat: number) {
  const x = ((lon - VIEW.minLon) / (VIEW.maxLon - VIEW.minLon)) * VIEW.width;
  const y = ((VIEW.maxLat - lat) / (VIEW.maxLat - VIEW.minLat)) * VIEW.height;
  return { x, y };
}

function ringToPath(ring: number[][]) {
  return (
    ring
      .map(([lon, lat], i) => {
        const { x, y } = lonLatToSvg(lon, lat);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ') + ' Z'
  );
}

function geometryToPath(geometry: GeoJSON.Geometry): string {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map((ring) => ringToPath(ring)).join(' ');
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((poly) => poly.map((ring) => ringToPath(ring))).join(' ');
  }
  return '';
}

function pathBbox(d: string) {
  const nums = d.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]!);
    maxX = Math.max(maxX, nums[i]!);
    minY = Math.min(minY, nums[i + 1]!);
    maxY = Math.max(maxY, nums[i + 1]!);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

async function main() {
  const boundaries = readJson<GeoJSON.FeatureCollection>(
    path.join(GEO_DIR, 'iran-provinces-boundaries.geojson')
  );

  const features = boundaries.features.map((f) => {
    const id = f.properties?.id as string;
    const name = f.properties?.name as string;
    const d = geometryToPath(f.geometry);
    return { id, name, path: d, bbox: pathBbox(d) };
  });

  writeJson(path.join(GEO_DIR, 'iran-provinces-paths.json'), { viewBox: VIEW, features });

  // Backward compat for old IranProvinceMap
  writeJson(path.join(GEO_DIR, 'iran-provinces-polygons.json'), { viewBox: VIEW, features });

  console.log(`Built SVG paths for ${features.length} provinces`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
