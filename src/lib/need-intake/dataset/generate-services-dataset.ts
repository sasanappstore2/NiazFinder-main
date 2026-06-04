import { generateSyntheticForVertical } from './shared/generate-synthetic';
import type { DatasetFixture } from './schema';

export function generateServicesDataset(targetCount = 1200): DatasetFixture[] {
  const seen = new Set<string>();
  return generateSyntheticForVertical('services', targetCount, seen);
}
