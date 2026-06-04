import { generateSyntheticForVertical } from './shared/generate-synthetic';
import type { DatasetFixture } from './schema';

export function generateVehiclesDataset(targetCount = 1500): DatasetFixture[] {
  const seen = new Set<string>();
  return generateSyntheticForVertical('vehicles', targetCount, seen);
}
