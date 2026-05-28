import { DATASET_FIXTURES } from './dataset-cases';

/** Persian rule-parser fixtures (no LLM). Run via npm run test:intake-parser */
export interface ParserFixture {
  id: string;
  text: string;
  expectIntentPrefix?: string;
  expectCategoryIncludes?: string;
  expectDealType?: string;
  expectCity?: string;
  expectLocationAmbiguous?: boolean;
  expectMinNeighborhoodCandidates?: number;
}

/** Subset re-exported for backward-compatible parser self-test. */
export const PARSER_FIXTURES: ParserFixture[] = [
  ...DATASET_FIXTURES.map((f) => ({
    id: f.id,
    text: f.input,
    expectIntentPrefix: f.expectIntentPrefix,
    expectCategoryIncludes: f.expectCategoryIncludes,
    expectDealType: f.expectDealType,
    expectCity: f.expectCity,
  })),
  {
    id: 'mashhad-sajjad-ambiguous',
    text: 'منطقه سجاد مشهد آپارتمان میخواهم',
    expectIntentPrefix: 'property',
    expectCity: 'مشهد',
    expectLocationAmbiguous: true,
    expectMinNeighborhoodCandidates: 2,
  },
  {
    id: 'rolex-daytona-buy',
    text: 'یک ساعت رولکس دیتونا میخوام',
    expectIntentPrefix: 'product',
    expectCategoryIncludes: 'jewelry-watches',
    expectDealType: 'buy',
  },
];
