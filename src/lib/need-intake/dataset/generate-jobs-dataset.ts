import { generateSyntheticForVertical } from './shared/generate-synthetic';
import type { DatasetFixture } from './schema';

export function generateJobsDataset(targetCount = 800): DatasetFixture[] {
  const seen = new Set<string>();
  return generateSyntheticForVertical('jobs', targetCount, seen);
}
