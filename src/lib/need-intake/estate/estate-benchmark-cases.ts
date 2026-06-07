import { ESTATE_BENCHMARK_CASES } from '@/lib/need-intake/estate/estate-benchmark-cases-part1';
import { ESTATE_BENCHMARK_CASES_PART2 } from '@/lib/need-intake/estate/estate-benchmark-cases-part2';
import type { EstateBenchmarkCase } from '@/lib/need-intake/estate/estate-parse-result';

export const ALL_ESTATE_BENCHMARK_CASES: EstateBenchmarkCase[] = [
  ...ESTATE_BENCHMARK_CASES,
  ...ESTATE_BENCHMARK_CASES_PART2,
];

export { ESTATE_BENCHMARK_CASES } from '@/lib/need-intake/estate/estate-benchmark-cases-part1';
export { ESTATE_BENCHMARK_CASES_PART2 } from '@/lib/need-intake/estate/estate-benchmark-cases-part2';
