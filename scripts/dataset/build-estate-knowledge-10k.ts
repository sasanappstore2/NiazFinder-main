#!/usr/bin/env npx tsx
/**
 * Build 10k Persian estate knowledge dataset via ScrapeGraphAI + Qwen.
 *
 * Prerequisites:
 *   npm run dev:intake-mlx
 *   npm run setup:estate-scrape
 *
 * Run:
 *   npm run dataset:estate-knowledge-10k
 *   npm run dataset:estate-knowledge-10k -- --target=500 --no-scrapegraph
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ESTATE_DIR = join(ROOT, 'mini-services', 'estate-scrape');
const VENV_PY = join(ESTATE_DIR, '.venv', 'bin', 'python');

function parseArgs(): string[] {
  const passthrough: string[] = [];
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--target=')) passthrough.push(arg);
    if (arg.startsWith('--holdout=')) passthrough.push(arg);
    if (arg === '--no-resume') passthrough.push('--no-resume');
    if (arg === '--no-scrapegraph') passthrough.push('--no-scrapegraph');
    if (arg.startsWith('--max-urls=')) passthrough.push(arg);
  }
  return passthrough;
}

async function main(): Promise<void> {
  if (!existsSync(VENV_PY)) {
    console.error('Missing estate-scrape venv. Run: npm run setup:estate-scrape');
    process.exit(1);
  }

  const args = ['-m', 'app.dataset_builder', ...parseArgs()];
  console.log('Estate knowledge dataset build (ScrapeGraphAI + Qwen)');
  console.log(`  python ${args.join(' ')}`);

  const result = spawnSync(VENV_PY, args, {
    cwd: ESTATE_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      PYTHONPATH: ESTATE_DIR,
      NEED_INTAKE_LLM_URL: process.env.NEED_INTAKE_LLM_URL ?? 'http://127.0.0.1:8100',
    },
  });

  process.exit(result.status ?? 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
