/** Pointy-top hexagon utilities (axial coordinates). */

export function hexPath(cx: number, cy: number, radius: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return pts.join(' ') + ' Z';
}

export function hexBBox(cx: number, cy: number, radius: number) {
  const w = radius * Math.sqrt(3);
  const h = radius * 2;
  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
}

/** Scale path string by translating to origin then scaling. */
export function transformPath(
  path: string,
  fromBbox: { x: number; y: number; width: number; height: number },
  toBbox: { x: number; y: number; width: number; height: number },
  padding = 4
): string {
  const nums = path.match(/-?\d+\.?\d*/g)?.map(Number);
  if (!nums?.length) return path;

  const sx = (toBbox.width - padding * 2) / (fromBbox.width || 1);
  const sy = (toBbox.height - padding * 2) / (fromBbox.height || 1);
  const s = Math.min(sx, sy);
  const tx = toBbox.x + padding + (toBbox.width - padding * 2 - fromBbox.width * s) / 2;
  const ty = toBbox.y + padding + (toBbox.height - padding * 2 - fromBbox.height * s) / 2;

  let i = 0;
  return path.replace(/-?\d+\.?\d*/g, () => {
    const n = nums[i++]!;
    if (i % 2 === 1) {
      const origX = n;
      const origY = nums[i]!;
      const nx = tx + (origX - fromBbox.x) * s;
      const ny = ty + (origY - fromBbox.y) * s;
      nums[i] = ny;
      return nx.toFixed(2);
    }
    return n.toFixed(2);
  });
}

export function parsePathBbox(path: string): { x: number; y: number; width: number; height: number } {
  const nums = path.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < nums.length; i += 2) {
    const x = nums[i]!;
    const y = nums[i + 1]!;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
