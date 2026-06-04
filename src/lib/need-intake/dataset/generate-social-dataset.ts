import { generateSyntheticForVertical } from './shared/generate-synthetic';
import type { DatasetFixture } from './schema';

export function generateSocialDataset(targetCount = 500): DatasetFixture[] {
  const seen = new Set<string>();
  return generateSyntheticForVertical('social', targetCount, seen);
}
