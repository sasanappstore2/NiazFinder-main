/**
 * Replay golden V2 conversations with auditor + metadata assertions.
 * Run: npm run test:v2-conv-golden
 * Smoke subset: npm run test:v2-conv-golden-smoke
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GoldenConversation } from '@/lib/intake-v2/sim/conversation-transcript';
import { replayGoldenConversation } from '@/lib/intake-v2/sim/conversation-runner';

process.env.NEED_INTAKE_LLM_ENABLED = 'false';

const GOLDEN_DIR = join(process.cwd(), 'src/lib/intake-v2/fixtures/v2-conv-golden');

/** One fixture per batch prefix for fast PR smoke. */
const SMOKE_PREFIXES = [
  'b1-p0001',
  'b2-p0101',
  'b3-p0201',
  'b4-p0301',
  'b5-p0401',
  'b6-p0501',
  'b7-p0601',
  'b8-p0701',
  'b9-p0801',
  'b10-p0901',
];

export interface GoldenReplayOptions {
  smokeOnly?: boolean;
  failOnAuditorErrors?: boolean;
  assertMetadata?: boolean;
}

export async function runGoldenReplay(
  opts?: GoldenReplayOptions
): Promise<{ passed: number; failed: string[] }> {
  let files: string[] = [];
  try {
    files = readdirSync(GOLDEN_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort();
  } catch {
    return { passed: 0, failed: [] };
  }

  if (opts?.smokeOnly) {
    files = files.filter((f) => SMOKE_PREFIXES.some((p) => f.startsWith(p)));
  }

  const failed: string[] = [];
  let passed = 0;

  for (const file of files) {
    const golden = JSON.parse(readFileSync(join(GOLDEN_DIR, file), 'utf8')) as GoldenConversation;
    const result = await replayGoldenConversation(golden, {
      runAuditor: opts?.failOnAuditorErrors !== false,
      assertMetadata: opts?.assertMetadata !== false,
    });
    if (result.ok) {
      passed++;
    } else {
      failed.push(`${golden.id}: ${result.error ?? 'failed'}`);
    }
  }

  return { passed, failed };
}

const isDirect = Boolean(process.argv[1]?.includes('run-v2-conv-golden'));
const smokeOnly = process.argv.includes('--smoke');

if (isDirect) {
  runGoldenReplay({ smokeOnly }).then(({ passed, failed }) => {
    const total = passed + failed.length;
    if (failed.length) {
      console.error(`Golden replay FAILED (${passed}/${total})`);
      for (const f of failed.slice(0, 20)) console.error('  -', f);
      process.exit(1);
    }
    console.log(`Golden replay OK (${passed}/${total})${smokeOnly ? ' [smoke]' : ''}`);
  });
}
