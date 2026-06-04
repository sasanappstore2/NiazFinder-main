import { generateSyntheticForVertical } from './shared/generate-synthetic';
import type { DatasetFixture } from './schema';

/** Electronics + home appliances + personal + entertainment products. */
export function generateElectronicsDataset(targetCount = 1200): DatasetFixture[] {
  const seen = new Set<string>();
  return generateSyntheticForVertical('products', targetCount, seen);
}
