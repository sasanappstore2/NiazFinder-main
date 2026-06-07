#!/usr/bin/env npx tsx
/**
 * Summarize V2 conv QA batch reports + golden replay status.
 * Usage: npx tsx scripts/v2-conv-qa/analyze-all-batches.ts [--batches=10]
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { runGoldenReplay } from '@/lib/intake-v2/fixtures/run-v2-conv-golden';

function parseBatches(): number {
  const arg = process.argv.find((a) => a.startsWith('--batches='));
  return arg ? Number(arg.split('=')[1]) : 10;
}

async function main(): Promise<void> {
  const batches = parseBatches();
  const root = join(process.cwd(), 'data', 'v2-conv-qa');
  const clusterTotals = new Map<string, number>();
  let totalConvs = 0;
  let totalPublish = 0;
  let totalErrors = 0;

  for (let b = 1; b <= batches; b++) {
    const reportPath = join(root, `batch-${b}`, 'report.json');
    if (!existsSync(reportPath)) continue;
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as {
      total: number;
      publishValid: number;
      errorCount: number;
      clusters?: { ruleId: string; count: number }[];
    };
    totalConvs += report.total;
    totalPublish += report.publishValid;
    totalErrors += report.errorCount;
    for (const c of report.clusters ?? []) {
      clusterTotals.set(c.ruleId, (clusterTotals.get(c.ruleId) ?? 0) + c.count);
    }
  }

  console.log('=== Live simulation summary ===');
  console.log(`Conversations: ${totalConvs}`);
  console.log(`Publish valid: ${totalPublish}/${totalConvs}`);
  console.log(`Auditor errors: ${totalErrors}`);
  console.log('\nTop error clusters:');
  for (const [ruleId, count] of [...clusterTotals.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}\t${ruleId}`);
  }

  console.log('\n=== Golden replay (auditor-only) ===');
  const golden = await runGoldenReplay({ assertMetadata: false });
  console.log(`Pass: ${golden.passed}/${golden.passed + golden.failed.length}`);

  const goldenMeta = await runGoldenReplay({ assertMetadata: true });
  console.log(
    `With metadata: ${goldenMeta.passed}/${goldenMeta.passed + goldenMeta.failed.length} (${goldenMeta.failed.length} stale metadata)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
