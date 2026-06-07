#!/usr/bin/env npx tsx
/**
 * Build remedial training JSONL from eval defects (oversample failures 3x).
 *
 * Run after: npm run eval:ai-10k
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DatasetFixture, DatasetLabels } from '@/lib/need-intake/dataset/schema';
import { fixturesToJsonl } from '@/lib/need-intake/dataset/export-jsonl';

const DEFECTS = join(process.cwd(), 'data', 'need-intake-training', 'ai-eval-10k-defects.jsonl');
const EVAL_PATH = join(process.cwd(), 'data', 'need-intake-training', 'ai-eval-10k.jsonl');
const INTAKE_REMEDIAL = join(process.cwd(), 'data', 'need-intake-training', 'need-intake-remedial.jsonl');
const ADVISOR_REMEDIAL = join(process.cwd(), 'data', 'need-intake-training', 'estate-advisor-remedial.jsonl');
const INTAKE_COMBINED = join(process.cwd(), 'data', 'need-intake-training', 'need-intake-retrain-v2.jsonl');
const MANIFEST = join(process.cwd(), 'data', 'need-intake-training', 'remedial-manifest.json');

type Defect = {
  id: string;
  mode: 'intake' | 'advisor';
  input: string;
  errors: string[];
  expected?: DatasetLabels;
  messages?: Array<{ role: string; content: string }>;
  expectedAnswer?: string;
};

function loadEvalById(): Map<string, Defect & { expectedAnswer?: string; messages?: Defect['messages'] }> {
  const map = new Map<string, Defect & { expectedAnswer?: string; messages?: Defect['messages'] }>();
  if (!existsSync(EVAL_PATH)) return map;
  for (const line of readFileSync(EVAL_PATH, 'utf8').split('\n').filter(Boolean)) {
    const row = JSON.parse(line) as Defect & { expectedAnswer?: string; messages?: Defect['messages'] };
    map.set(row.id, row);
  }
  return map;
}
function loadDefects(): Defect[] {
  return readFileSync(DEFECTS, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Defect);
}

function intakeFixture(d: Defect): DatasetFixture | null {
  if (!d.expected) return null;
  return {
    id: `remedial-${d.id}`,
    input: d.input,
    labels: d.expected,
    meta: { source: 'fixture', vertical: 'real-estate', tags: ['remedial', ...d.errors.slice(0, 2)] },
  };
}

function advisorRow(d: Defect, copy: number): string | null {
  if (!d.messages && !d.input) return null;
  const msgs = d.messages ?? [
    {
      role: 'system',
      content:
        'تو یک مشاور املاک خبره و باتجربه در بازار ایران هستی. به فارسی روان، دقیق و کاربردی پاسخ می‌دهی.',
    },
    { role: 'user', content: d.input },
  ];
  const assistant = d.expectedAnswer ?? msgs.find((m) => m.role === 'assistant')?.content;
  if (!assistant) return null;
  const row = {
    messages: [
      msgs.find((m) => m.role === 'system')!,
      msgs.find((m) => m.role === 'user')!,
      { role: 'assistant', content: assistant },
    ],
  };
  return JSON.stringify({ ...row, meta: { remedial: true, copy, errors: d.errors } });
}

function mergeJsonl(paths: string[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const p of paths) {
    for (const line of readFileSync(p, 'utf8').split('\n').filter(Boolean)) {
      if (seen.has(line)) continue;
      seen.add(line);
      lines.push(line);
    }
  }
  return lines.join('\n') + (lines.length ? '\n' : '');
}

function main(): void {
  const defects = loadDefects();
  const evalById = loadEvalById();
  const intakeDefects = defects.filter((d) => d.mode === 'intake');
  const advisorDefects = defects.filter((d) => d.mode === 'advisor');

  const intakeFixtures: DatasetFixture[] = [];
  for (const d of intakeDefects) {
    const f = intakeFixture(d);
    if (!f) continue;
    for (let i = 0; i < 3; i++) {
      intakeFixtures.push({ ...f, id: `${f.id}-x${i}` });
    }
  }

  mkdirSync(join(process.cwd(), 'data', 'need-intake-training'), { recursive: true });
  writeFileSync(INTAKE_REMEDIAL, fixturesToJsonl(intakeFixtures), 'utf8');

  const advisorLines: string[] = [];
  for (const d of advisorDefects) {
    const golden = evalById.get(d.id);
    const enriched = {
      ...d,
      messages: golden?.messages ?? d.messages,
      expectedAnswer:
        golden?.expectedAnswer ??
        golden?.messages?.find((m) => m.role === 'assistant')?.content,
    };
    for (let i = 0; i < 3; i++) {
      const line = advisorRow(enriched, i);
      if (line) advisorLines.push(line);
    }
  }
  writeFileSync(ADVISOR_REMEDIAL, advisorLines.join('\n') + (advisorLines.length ? '\n' : ''), 'utf8');

  const baseTrain = join(process.cwd(), 'data', 'need-intake-training', 'need-intake-real-estate-100k.jsonl');
  writeFileSync(INTAKE_COMBINED, mergeJsonl([baseTrain, INTAKE_REMEDIAL]), 'utf8');

  const manifest = {
    generatedAt: new Date().toISOString(),
    intakeDefects: intakeDefects.length,
    advisorDefects: advisorDefects.length,
    intakeRemedialRows: intakeFixtures.length,
    advisorRemedialRows: advisorLines.length,
    intakeCombinedPath: INTAKE_COMBINED,
    intakeRemedialPath: INTAKE_REMEDIAL,
    advisorRemedialPath: ADVISOR_REMEDIAL,
  };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(JSON.stringify(manifest, null, 2));
}

main();
