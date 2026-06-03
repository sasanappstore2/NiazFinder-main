import { hexBBox, hexPath, parsePathBbox, transformPath } from '@/lib/geo/hex-math';

export function fitBoundaryInHex(
  boundaryPath: string,
  cx: number,
  cy: number,
  radius: number,
  padding = 6
): string {
  const hexB = hexBBox(cx, cy, radius);
  const pathB = parsePathBbox(boundaryPath);
  if (!pathB.width || !pathB.height) return boundaryPath;
  return transformPath(boundaryPath, pathB, hexB, padding);
}

export { hexPath, hexBBox };
