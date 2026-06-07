#!/usr/bin/env npx tsx
/**
 * Run one batch of V2 conversation QA (default 100 conversations).
 * Usage: npm run v2:conv-qa:batch -- --batch=1 --limit=100 --resume
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { personasForBatch } from '@/lib/intake-v2/sim/persona-matrix';
import { runConversation } from '@/lib/intake-v2/sim/conversation-runner';
import {
  summarizeConversation,
  toGoldenConversation,
  type ConversationRecord,
} from '@/lib/intake-v2/sim/conversation-transcript';
import { clusterFindings } from '@/lib/intake-v2/sim/conversation-auditor';
import { checkQwenIntakeHealth } from '@/lib/need-intake/qwen-intake-client';

function parseArgs(): {
  batch: number;
  limit: number;
  resume: boolean;
  workers: number;
  turns: number;
} {
  const args = process.argv.slice(2);
  let batch = 1;
  let limit = 100;
  let resume = false;
  let workers = Number(process.env.V2_CONV_QA_WORKERS ?? 4);
  let turns = Number(process.env.V2_CONV_QA_TURNS ?? 7);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith('--batch=')) batch = Number(arg.split('=')[1]);
    else if (arg === '--batch') batch = Number(args[++i]);
    else if (arg.startsWith('--limit=')) limit = Number(arg.split('=')[1]);
    else if (arg === '--limit') limit = Number(args[++i]);
    else if (arg === '--resume') resume = true;
    else if (arg.startsWith('--workers=')) workers = Number(arg.split('=')[1]);
    else if (arg === '--workers') workers = Number(args[++i]);
    else if (arg.startsWith('--turns=')) turns = Number(arg.split('=')[1]);
    else if (arg === '--turns') turns = Number(args[++i]);
  }

  return { batch, limit, resume, workers, turns };
}

function batchDir(batch: number): string {
  return join(process.cwd(), 'data', 'v2-conv-qa', `batch-${batch}`);
}

function checkpointPath(batch: number): string {
  return join(batchDir(batch), 'checkpoint.json');
}

function loadCheckpoint(batch: number): Set<string> {
  const path = checkpointPath(batch);
  if (!existsSync(path)) return new Set();
  const data = JSON.parse(readFileSync(path, 'utf8')) as { doneIds?: string[] };
  return new Set(data.doneIds ?? []);
}

function saveCheckpoint(batch: number, doneIds: Set<string>): void {
  writeFileSync(
    checkpointPath(batch),
    JSON.stringify({ doneIds: [...doneIds], updatedAt: new Date().toISOString() }, null, 2),
    'utf8'
  );
}

function saveGolden(conv: ConversationRecord): void {
  const golden = toGoldenConversation(conv);
  if (!golden) return;
  const dir = join(process.cwd(), 'src/lib/intake-v2/fixtures/v2-conv-golden');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${conv.id}.json`), JSON.stringify(golden, null, 2), 'utf8');
}

async function runBatch(): Promise<void> {
  const parsed = parseArgs();
  const { batch, limit, resume, workers, turns } = parsed;

  process.env.NEED_INTAKE_LLM_ENABLED = process.env.NEED_INTAKE_LLM_ENABLED ?? 'true';
  process.env.V2_CONV_QA_TURNS = String(turns);
  const dir = batchDir(batch);
  mkdirSync(dir, { recursive: true });

  const health = await checkQwenIntakeHealth();
  if (!health.ok && process.env.V2_CONV_QA_TEMPLATE_ONLY !== '1') {
    console.warn('MLX unavailable — using V2_CONV_QA_TEMPLATE_ONLY=1 fallback');
    process.env.V2_CONV_QA_TEMPLATE_ONLY = '1';
    process.env.V2_CONV_QA_SKIP_JUDGE = '1';
  }

  const allPersonas = personasForBatch(batch).slice(0, limit);
  const done = resume ? loadCheckpoint(batch) : new Set<string>();
  const pending = allPersonas.filter((p) => !done.has(p.id));

  console.log(`Batch ${batch}: ${pending.length}/${allPersonas.length} conversations (${workers} workers, ${turns} turns)`);

  const transcriptsPath = join(dir, 'transcripts.jsonl');
  const failuresPath = join(dir, 'failures.jsonl');
  const results: ConversationRecord[] = [];

  async function runOne(persona: (typeof pending)[0]): Promise<void> {
    const conv = await runConversation(persona, { maxTurns: turns, skipJudge: process.env.V2_CONV_QA_SKIP_JUDGE === '1' });
    results.push(conv);
    appendFileSync(transcriptsPath, JSON.stringify(conv) + '\n', 'utf8');
    for (const f of conv.findings.filter((x) => x.severity === 'error')) {
      appendFileSync(failuresPath, JSON.stringify({ ...f, convId: conv.id }) + '\n', 'utf8');
    }
    saveGolden(conv);
    done.add(persona.id);
    saveCheckpoint(batch, done);
  }

  for (let i = 0; i < pending.length; i += workers) {
    const chunk = pending.slice(i, i + workers);
    await Promise.all(chunk.map(runOne));
    console.log(`  progress: ${Math.min(i + workers, pending.length)}/${pending.length}`);
  }

  const errors = results.flatMap((c) => c.findings.filter((f) => f.severity === 'error'));
  const clusters = clusterFindings(errors);
  const publishOk = results.filter((c) => c.publishValid && c.readyToPreview).length;
  const report = {
    batch,
    total: results.length,
    readyToPreview: results.filter((c) => c.readyToPreview).length,
    publishValid: publishOk,
    errorCount: errors.length,
    clusters,
    summaries: results.map(summarizeConversation),
    finishedAt: new Date().toISOString(),
  };

  writeFileSync(join(dir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(`Batch ${batch} done: publish=${publishOk}/${results.length} errors=${errors.length}`);
}

runBatch().catch((e) => {
  console.error(e);
  process.exit(1);
});
