import { generateAllSyntheticDataset } from './shared/generate-synthetic';
import type { DatasetFixture } from './schema';

/** Alias for mixed product vertical generation. */
export function generateProductsDataset(targetCount = 800): DatasetFixture[] {
  return generateAllSyntheticDataset({ vertical: 'products', targetCount });
}
