#!/usr/bin/env npx tsx
/**
 * Build 10k labeled eval cases for intake + advisor (no overlap tricks — holdout-first).
 *
 * Run: npm run dataset:build-eval-10k
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { NEED_INTAKE_SYSTEM_PROMPT, type DatasetLabels } from '@/lib/need-intake/dataset/schema';

const OUT = join(process.cwd(), 'data', 'need-intake-training', 'ai-eval-10k.jsonl');
const MANIFEST = join(process.cwd(), 'data', 'need-intake-training', 'ai-eval-10k-manifest.json');

export type EvalCase = {
  id: string;
  mode: 'intake' | 'advisor';
  input: string;
  expected?: DatasetLabels;
  expectedAnswer?: string;
  messages?: Array<{ role: string; content: string }>;
  source: string;
};

function loadJsonl(path: string): EvalCase[] {
  if (!readFileSync(path, 'utf8').trim()) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line, i) => {
      const row = JSON.parse(line) as { messages: Array<{ role: string; content: string }> };
      const system = row.messages.find((m) => m.role === 'system')?.content ?? '';
      const user = row.messages.find((m) => m.role === 'user')?.content ?? '';
      const assistant = row.messages.find((m) => m.role === 'assistant')?.content ?? '';

      if (system === NEED_INTAKE_SYSTEM_PROMPT) {
        return {
          id: `intake-${i}`,
          mode: 'intake' as const,
          input: user,
          expected: JSON.parse(assistant) as DatasetLabels,
          source: path,
        };
      }
      return {
        id: `advisor-${i}`,
        mode: 'advisor' as const,
        input: user,
        expectedAnswer: assistant,
        messages: row.messages,
        source: path,
      };
    });
}

function seededSample<T>(items: T[], count: number, seed: string): T[] {
  if (items.length <= count) return [...items];
  const scored = items.map((item, idx) => ({
    item,
    score: createHash('sha1').update(`${seed}:${idx}`).digest('hex'),
  }));
  scored.sort((a, b) => (a.score < b.score ? -1 : 1));
  return scored.slice(0, count).map((s) => s.item);
}

function main(): void {
  const target = Number(process.env.EVAL_TARGET ?? 10_000);
  const intakeTarget = Math.floor(target * 0.9);
  const advisorTarget = target - intakeTarget;

  const root = join(process.cwd(), 'data', 'need-intake-training');
  const intakeHoldout = loadJsonl(join(root, 'need-intake-real-estate-holdout.jsonl'));
  const intakeTrain = loadJsonl(join(root, 'need-intake-real-estate-100k.jsonl'));
  const advisorHoldout = loadJsonl(join(root, 'estate-expert-synth-holdout.jsonl'));
  const advisorTrain = loadJsonl(join(root, 'estate-expert-synth.jsonl'));

  const intakePool = [...intakeHoldout, ...intakeTrain.map((c) => ({ ...c, id: `pool-${c.id}` }))];
  const advisorPool = [...advisorHoldout, ...advisorTrain.map((c) => ({ ...c, id: `pool-${c.id}` }))];

  const intakeCases = [
    ...intakeHoldout,
    ...seededSample(
      intakeTrain.filter((c) => !intakeHoldout.some((h) => h.input === c.input)),
      Math.max(0, intakeTarget - intakeHoldout.length),
      'eval-intake-v1'
    ),
  ].slice(0, intakeTarget);

  const advisorCases = [
    ...advisorHoldout,
    ...seededSample(
      advisorTrain.filter((c) => !advisorHoldout.some((h) => h.input === c.input)),
      Math.max(0, advisorTarget - advisorHoldout.length),
      'eval-advisor-v1'
    ),
  ].slice(0, advisorTarget);

  const all = [...intakeCases, ...advisorCases].map((c, i) => ({ ...c, id: `eval-${i}` }));

  mkdirSync(root, { recursive: true });
  writeFileSync(OUT, all.map((c) => JSON.stringify(c)).join('\n') + '\n', 'utf8');
  writeFileSync(
    MANIFEST,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        target,
        total: all.length,
        intake: intakeCases.length,
        advisor: advisorCases.length,
        path: OUT,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(JSON.stringify({ total: all.length, intake: intakeCases.length, advisor: advisorCases.length, path: OUT }, null, 2));
}

main();
