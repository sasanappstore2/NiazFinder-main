#!/usr/bin/env npx tsx
/**
 * Estate parse-intent benchmark.
 * Usage: npm run test:estate-benchmark
 *        npm run test:estate-benchmark -- --live-llm
 *        npm run test:estate-benchmark -- --write-json --report-md
 */
import fs from 'node:fs';
import path from 'node:path';

import { ALL_ESTATE_BENCHMARK_CASES } from '@/lib/need-intake/estate/estate-benchmark-cases';
import {
  aggregateBenchmarkResults,
  scoreEstateCase,
  type CaseScoreResult,
} from '@/lib/need-intake/estate/estate-benchmark-scorer';
import { mapParsedIntentToEstateResult } from '@/lib/need-intake/estate/estate-parse-mapper';
import {
  parseFromText,
  parseFromTextAsync,
} from '@/lib/need-intake/internal-orchestrator.server';

const args = new Set(process.argv.slice(2));
const liveLlm = args.has('--live-llm');
if (!liveLlm) {
  process.env.NEED_INTAKE_LLM_ENABLED = 'false';
} else {
  process.env.NEED_INTAKE_LLM_ENABLED = 'true';
}

const ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(ROOT, 'data/estate-benchmark');
const JSON_PATH = path.join(OUT_DIR, 'estate-benchmark.json');
const REPORT_JSON = path.join(OUT_DIR, liveLlm ? 'latest-run-llm.json' : 'latest-run.json');
const REPORT_MD = path.join(ROOT, 'ESTATE_BENCHMARK_REPORT.md');

const writeJson = args.has('--write-json');
const writeReportMd = args.has('--report-md') || args.has('--all');

async function main(): Promise<number> {
  const results: CaseScoreResult[] = [];

  for (const testCase of ALL_ESTATE_BENCHMARK_CASES) {
    const parsed = liveLlm
      ? await parseFromTextAsync(testCase.input)
      : parseFromText(testCase.input);
    const actual = mapParsedIntentToEstateResult(parsed);
    results.push(scoreEstateCase(testCase, actual));
  }

  const agg = aggregateBenchmarkResults(results);
  const failed = results.filter((r) => !r.passed);

  console.log(`\n=== Estate Benchmark (${ALL_ESTATE_BENCHMARK_CASES.length} cases) ===`);
  console.log(`Mode: ${liveLlm ? 'LLM+rules reconcile' : 'rules-only'}`);
  console.log(`Overall: ${agg.overall.toFixed(1)}%  |  Failures: ${agg.failCount}`);
  console.log('\nBy group:');
  for (const g of agg.groupStats.sort((a, b) => a.group.localeCompare(b.group))) {
    console.log(`  ${g.group}: ${g.percent}% (${g.failures}/${g.count} fail)`);
  }
  console.log('\nBy field:');
  for (const f of agg.fieldStats) {
    console.log(`  ${f.field}: ${f.percent}%`);
  }

  if (failed.length) {
    console.log('\n--- Failures (first 25) ---');
    for (const f of failed.slice(0, 25)) {
      console.log(`\n[${f.id}] ${f.input.slice(0, 60)}…`);
      console.log(`  score=${f.percent}%`);
      for (const line of f.failures.slice(0, 4)) console.log(`  - ${line}`);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const runPayload = {
    timestamp: new Date().toISOString(),
    caseCount: ALL_ESTATE_BENCHMARK_CASES.length,
    llmEnabled: liveLlm,
    overallPercent: agg.overall,
    groupStats: agg.groupStats,
    fieldStats: agg.fieldStats,
    failures: failed.map((f) => ({
      id: f.id,
      group: f.group,
      input: f.input,
      percent: f.percent,
      failures: f.failures,
      actual: f.actual,
    })),
  };

  fs.writeFileSync(REPORT_JSON, JSON.stringify(runPayload, null, 2), 'utf8');
  console.log(`\nWrote ${REPORT_JSON}`);

  if (writeJson) {
    fs.writeFileSync(JSON_PATH, JSON.stringify(ALL_ESTATE_BENCHMARK_CASES, null, 2), 'utf8');
    console.log(`Wrote ${JSON_PATH}`);
  }

  if (writeReportMd) {
    writeMarkdownReport(agg, failed, results, liveLlm);
    console.log(`Wrote ${REPORT_MD}`);
  }

  return agg.overall >= 99 ? 0 : 1;
}

function writeMarkdownReport(
  agg: ReturnType<typeof aggregateBenchmarkResults>,
  failed: CaseScoreResult[],
  all: CaseScoreResult[],
  llm: boolean
) {
  const lines: string[] = [
    '# گزارش Benchmark — دسته‌بندی املاک',
    '',
    `تاریخ: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## نتیجه کلی',
    `- Benchmark: **${agg.overall.toFixed(1)}%**`,
    `- تعداد نمونه: ${all.length}`,
    `- خطا: ${agg.failCount}`,
    `- Parser: ${llm ? 'LLM + rules reconcile' : 'rules-only (\`NEED_INTAKE_LLM_ENABLED=false\`)'}`,
    '',
    '## نتایج به تفکیک دسته',
    '| دسته | تعداد | درصد | خطا |',
    '|------|-------|------|-----|',
  ];

  for (const g of agg.groupStats.sort((a, b) => a.group.localeCompare(b.group))) {
    lines.push(`| ${g.group} | ${g.count} | ${g.percent}% | ${g.failures} |`);
  }

  lines.push('', '## نتایج به تفکیک فیلد', '| فیلد | درصد |', '|------|------|');
  for (const f of agg.fieldStats) {
    lines.push(`| ${f.field} | ${f.percent}% |`);
  }

  lines.push('', '## خطاهای باقی‌مانده (نمونه)', '');
  for (const f of failed.slice(0, 40)) {
    lines.push(`### ${f.id} (${f.group}) — ${f.percent}%`);
    lines.push(`> ${f.input}`);
    lines.push('');
    for (const err of f.failures) lines.push(`- ${err}`);
    lines.push('');
  }

  fs.writeFileSync(REPORT_MD, lines.join('\n'), 'utf8');
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
