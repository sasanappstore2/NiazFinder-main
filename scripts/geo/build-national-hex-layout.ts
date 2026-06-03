/**
 * Build national honeycomb layout — hex at geographic centroid positions.
 */
import path from 'node:path';
import { GEO_DIR, readJson, writeJson } from './shared';

const VIEW = { width: 800, height: 520, minLon: 44, maxLon: 63, minLat: 25, maxLat: 40 };

function lonLatToSvg(lon: number, lat: number) {
  const x = ((lon - VIEW.minLon) / (VIEW.maxLon - VIEW.minLon)) * VIEW.width;
  const y = ((VIEW.maxLat - lat) / (VIEW.maxLat - VIEW.minLat)) * VIEW.height;
  return { x, y };
}

function hexPath(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${i === 0 ? 'M' : 'L'} ${(cx + r * Math.cos(angle)).toFixed(2)} ${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(' ') + ' Z';
}

function fitPathInHex(boundaryPath: string, hexBbox: { x: number; y: number; width: number; height: number }) {
  const nums = boundaryPath.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]!);
    maxX = Math.max(maxX, nums[i]!);
    minY = Math.min(minY, nums[i + 1]!);
    maxY = Math.max(maxY, nums[i + 1]!);
  }
  const bw = maxX - minX || 1;
  const bh = maxY - minY || 1;
  const pad = 6;
  const s = Math.min((hexBbox.width - pad * 2) / bw, (hexBbox.height - pad * 2) / bh);
  const tx = hexBbox.x + pad + (hexBbox.width - pad * 2 - bw * s) / 2;
  const ty = hexBbox.y + pad + (hexBbox.height - pad * 2 - bh * s) / 2;

  let i = 0;
  return boundaryPath.replace(/-?\d+\.?\d*/g, () => {
    const n = nums[i++]!;
    if (i % 2 === 1) {
      const ox = n;
      const oy = nums[i]!;
      nums[i] = ty + (oy - minY) * s;
      return (tx + (ox - minX) * s).toFixed(2);
    }
    return n.toFixed(2);
  });
}

async function main() {
  const provinces = readJson<GeoJSON.FeatureCollection>(path.join(GEO_DIR, 'iran-provinces.json'));
  const paths = readJson<{ features: Array<{ id: string; name: string; path: string; bbox: { x: number; y: number; width: number; height: number } }> }>(
    path.join(GEO_DIR, 'iran-provinces-paths.json')
  );

  const radius = 22;
  const cells = provinces.features.map((f) => {
    const id = f.properties!.id as string;
    const name = f.properties!.name as string;
    const [lon, lat] = f.geometry.type === 'Point' ? f.geometry.coordinates : [51, 35];
    const { x: cx, y: cy } = lonLatToSvg(lon, lat);
    const hex = hexPath(cx, cy, radius);
    const hexBbox = { x: cx - radius * 0.866, y: cy - radius, width: radius * 1.732, height: radius * 2 };
    const boundary = paths.features.find((p) => p.id === id);
    const hexLocalPath = boundary ? fitPathInHex(boundary.path, hexBbox) : undefined;

    return {
      id,
      name,
      cx,
      cy,
      radius,
      hexPath: hex,
      hexLocalPath,
      boundaryPath: boundary?.path,
      bbox: hexBbox,
    };
  });

  writeJson(path.join(GEO_DIR, 'iran-national-hex-layout.json'), { viewBox: VIEW, cells });
  console.log(`Built national hex layout with ${cells.length} cells`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
