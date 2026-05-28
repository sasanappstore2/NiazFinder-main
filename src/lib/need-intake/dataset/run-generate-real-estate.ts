import {
  exportRealEstateDataset,
  generateRealEstateDataset,
} from './generate-real-estate-dataset';

const TARGET = Number(process.env.ESTATE_DATASET_SIZE ?? 2000);

const fixtures = generateRealEstateDataset({ targetCount: TARGET });
const path = exportRealEstateDataset(fixtures);

console.log(`Generated ${fixtures.length} real-estate training rows`);
console.log(`Exported to ${path}`);

if (fixtures.length < TARGET) {
  console.error(`Expected at least ${TARGET} rows, got ${fixtures.length}`);
  process.exit(1);
}
