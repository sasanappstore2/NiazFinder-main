#!/usr/bin/env npx tsx
import { buildIntakeDataset10k } from './build-intake-dataset-10k';

const result = buildIntakeDataset10k();
console.log(`Pool: ${result.pool.length} | Train: ${result.train.length} | Holdout: ${result.holdout.length}`);
console.log(`Train → data/need-intake-training/need-intake-train-10k.jsonl`);
console.log(`Holdout → data/need-intake-training/need-intake-holdout-500.jsonl`);
console.log(`Manifest → data/need-intake-training/dataset-manifest.json`);

if (result.train.length < 9500) {
  console.error(`Expected ≥9500 train rows, got ${result.train.length}`);
  process.exit(1);
}
