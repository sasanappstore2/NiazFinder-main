#!/usr/bin/env npx tsx
/**
 * Full loop: 10 batches × 100 conversations + auto-fix between batches.
 * Usage: npm run v2:conv-qa:loop -- --batches=10 --conversations-per-batch=100
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runAutoFixForBatch } from './auto-fix-agent';

function parseArgs(): { batches: number; perBatch: number; resume: boolean } {
  const args = process.argv.slice(2);
  let batches = 10;
  let perBatch = 100;
  let resume = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batches') batches = Number(args[++i]);
    else if (args[i] === '--conversations-per-batch') perBatch = Number(args[++i]);
    else if (args[i] === '--resume') resume = true;
  }
  return { batches, perBatch, resume };
}

interface BatchReport {
  batch: number;
  total: number;
  publishValid: number;
  errorCount: number;
}

async function main(): Promise<void> {
  const { batches, perBatch, resume } = parseArgs();
  const summary: BatchReport[] = [];

  for (let b = 1; b <= batches; b++) {
    console.log(`\n=== Batch ${b}/${batches} ===`);
    const cmd = `npx --yes tsx scripts/v2-conv-qa/run-batch.ts --batch=${b} --limit=${perBatch}${resume ? ' --resume' : ''}`;
    execSync(cmd, { stdio: 'inherit', cwd: process.cwd(), env: process.env });

    const fixReport = runAutoFixForBatch(b);
    console.log('Auto-fix:', fixReport);

    const reportPath = join(process.cwd(), 'data', 'v2-conv-qa', `batch-${b}`, 'report.json');
    if (existsSync(reportPath)) {
      const report = JSON.parse(readFileSync(reportPath, 'utf8')) as BatchReport;
      summary.push({
        batch: b,
        total: report.total,
        publishValid: report.publishValid,
        errorCount: report.errorCount,
      });
    }
  }

  const outDir = join(process.cwd(), 'data', 'v2-conv-qa');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'final-summary.json'), JSON.stringify({ summary, at: new Date().toISOString() }, null, 2), 'utf8');
  console.log('\nFinal summary:', summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
