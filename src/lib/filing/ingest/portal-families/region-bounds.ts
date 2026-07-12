import type { ScanRegion } from '@/lib/filing/ingest/portal-families/scan-regions';

export type RegionBoundsRequestItem = {
  id: string;
  mode?: 'single' | 'listCluster' | 'cardField';
  selector?: string;
  containerSelector?: string;
  innerSelector?: string;
};

/** Map scan region to estate-scrape region-bounds payload. */
export function scanRegionToBoundsItem(region: ScanRegion): RegionBoundsRequestItem | null {
  if (region.kind === 'list' && region.selector) {
    return { id: region.id, mode: 'listCluster', selector: region.selector };
  }
  if (region.containerSelector && region.innerSelector) {
    return {
      id: region.id,
      mode: 'cardField',
      containerSelector: region.containerSelector,
      innerSelector: region.innerSelector,
    };
  }
  if (region.selector) {
    return { id: region.id, mode: 'single', selector: region.selector };
  }
  if (region.containerSelector) {
    return { id: region.id, mode: 'listCluster', selector: region.containerSelector };
  }
  return null;
}

export function scanRegionsToBoundsPayload(regions: ScanRegion[]): RegionBoundsRequestItem[] {
  const out: RegionBoundsRequestItem[] = [];
  for (const r of regions) {
    const item = scanRegionToBoundsItem(r);
    if (item) out.push(item);
  }
  return out;
}

export type RegionBoundsMap = Record<
  string,
  { x: number; y: number; width: number; height: number } | null
>;

export function boundsToHighlights(
  regions: ScanRegion[],
  bounds: RegionBoundsMap
): Array<{
  id: string;
  label: string;
  status: ScanRegion['status'];
  boundingBox: { x: number; y: number; width: number; height: number };
}> {
  const highlights: Array<{
    id: string;
    label: string;
    status: ScanRegion['status'];
    boundingBox: { x: number; y: number; width: number; height: number };
  }> = [];
  for (const r of regions) {
    const box = bounds[r.id];
    if (!box || box.width <= 0 || box.height <= 0) continue;
    highlights.push({
      id: r.id,
      label: r.label,
      status: r.status,
      boundingBox: box,
    });
  }
  return highlights;
}
