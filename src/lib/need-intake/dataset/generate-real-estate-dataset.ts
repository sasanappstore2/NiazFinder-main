import type { DatasetFixture } from './schema';

/** Training dataset generator removed ? returns empty for legacy eval tooling. */
export function generateRealEstateDataset(_opts?: {
  targetCount?: number;
}): DatasetFixture[] {
  return [];
}
