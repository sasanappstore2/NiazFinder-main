#!/usr/bin/env npx tsx
/**
 * Run 10k AI eval against intake-mlx (intake JSON + advisor chat).
 * Saves defects + metrics; supports --resume.
 *
 * Prerequisites: dev:intake-mlx with desired adapter loaded
 *
 * Run:
 *   NEED_INTAKE_LLM_ENABLED=true npm run eval:ai-10k
 *   NEED_INTAKE_LLM_ENABLED=true npm run eval:ai-10k -- --limit=500
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DatasetLabels } from '@/lib/need-intake/dataset/schema';
import { cityToSlug } from '@/lib/need-intake/dataset/shared/normalize-city';
import {
  checkIntakeMlxHealth,
  getNeedIntakeLlmBaseUrl,
  parseIntentViaLlm,
} from '@/lib/need-intake/llm-parse-client';

type EvalCase = {
  id: string;
  mode: 'intake' | 'advisor';
  input: string;
  expected?: DatasetLabels;
  expectedAnswer?: string;
  messages?: Array<{ role: string; content: string }>;
};

type Defect = {
  id: string;
  mode: 'intake' | 'advisor';
  input: string;
  errors: string[];
  expected?: unknown;
  got?: unknown;
  raw?: string;
};

const EVAL_PATH = join(process.cwd(), 'data', 'need-intake-training', 'ai-eval-10k.jsonl');
const REPORT_PATH = join(process.cwd(), 'data', 'need-intake-training', 'ai-eval-10k-report.json');
const DEFECTS_PATH = join(process.cwd(), 'data', 'need-intake-training', 'ai-eval-10k-defects.jsonl');
const CHECKPOINT_PATH = join(process.cwd(), 'data', 'need-intake-training', 'ai-eval-10k-checkpoint.json');

function parseArgs() {
  let limit = 0;
  let resume = true;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--limit=')) limit = Number(arg.slice(8)) || 0;
    if (arg === '--no-resume') resume = false;
  }
  return { limit, resume };
}

function compareIntake(expected: DatasetLabels, got: DatasetLabels): string[] {
  const errors: string[] = [];
  if (expected.intentType && got.intentType !== expected.intentType) {
    errors.push(`intent: ${got.intentType} != ${expected.intentType}`);
  }
  if (expected.categorySlug && got.categorySlug !== expected.categorySlug) {
    errors.push(`category: ${got.categorySlug} != ${expected.categorySlug}`);
  }
  const expCity = cityToSlug(expected.city);
  const gotCity = cityToSlug(got.city);
  if (expCity && gotCity && expCity !== gotCity) {
    errors.push(`city: ${gotCity} != ${expCity}`);
  } else if (expCity && !gotCity) {
    errors.push(`city: missing (expected ${expCity})`);
  }
  if (expected.entities?.dealType && got.entities?.dealType !== expected.entities.dealType) {
    errors.push(`dealType: ${got.entities?.dealType} != ${expected.entities.dealType}`);
  }
  return errors;
}

function validateAdvisorAnswer(input: string, answer: string): string[] {
  const errors: string[] = [];
  if (!answer || answer.length < 24) errors.push('answer too short');
  if (!/[\u0600-\u06FF]/.test(answer)) errors.push('missing Persian');
  if (answer.trim().startsWith('{')) errors.push('json leak in advisor mode');
  if (/بروزرسانی|404 not found/i.test(answer)) errors.push('noise content');
  const q = input.toLowerCase();
  if (q.includes('رهن') && !/رهن|ودیعه|اجاره/.test(answer)) {
    errors.push('topic mismatch: rahn');
  }
  if (q.includes('سند') && !/سند|قولنامه|ثبت/.test(answer)) {
    errors.push('topic mismatch: deed');
  }
  return errors;
}

async function advisorChat(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  const base = getNeedIntakeLlmBaseUrl();
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3.5-2b',
      messages,
      max_tokens: 512,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(Number(process.env.NEED_INTAKE_LLM_TIMEOUT_MS ?? 30_000)),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

function loadCheckpoint(): Set<string> {
  if (!existsSync(CHECKPOINT_PATH)) return new Set();
  const data = JSON.parse(readFileSync(CHECKPOINT_PATH, 'utf8')) as { doneIds?: string[] };
  return new Set(data.doneIds ?? []);
}

function saveCheckpoint(doneIds: Set<string>): void {
  writeFileSync(
    CHECKPOINT_PATH,
    JSON.stringify({ updatedAt: new Date().toISOString(), doneIds: [...doneIds] }, null, 2),
    'utf8'
  );
}

async function main(): Promise<void> {
  process.env.NEED_INTAKE_LLM_ENABLED = 'true';
  const { limit, resume } = parseArgs();

  if (!existsSync(EVAL_PATH)) {
    console.error('Missing eval set. Run: npm run dataset:build-eval-10k');
    process.exit(1);
  }

  const health = await checkIntakeMlxHealth();
  if (!health.ok) {
    console.error('intake-mlx not healthy. Start: INTAKE_MLX_ADAPTER_PATH=models/intake-lora-v1 npm run dev:intake-mlx');
    process.exit(1);
  }
  console.log('MLX health OK', health.modelId);

  const cases: EvalCase[] = readFileSync(EVAL_PATH, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as EvalCase);

  const slice = limit > 0 ? cases.slice(0, limit) : cases;
  const doneIds = resume ? loadCheckpoint() : new Set<string>();

  let passed = 0;
  let failed = 0;
  const defects: Defect[] = existsSync(DEFECTS_PATH)
    ? readFileSync(DEFECTS_PATH, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as Defect)
    : [];
  const defectIds = new Set(defects.map((d) => d.id));

  const errorBuckets: Record<string, number> = {};
  const slugFailures: Record<string, number> = {};
  const cityFailures: Record<string, number> = {};

  for (let i = 0; i < slice.length; i++) {
    const c = slice[i]!;
    if (doneIds.has(c.id)) {
      continue;
    }

    if (i === 0 || (i + 1) % 50 === 0 || i + 1 === slice.length) {
      console.log(`[${i + 1}/${slice.length}] pass=${passed} fail=${failed}`);
    }

    try {
      if (c.mode === 'intake') {
        const result = await parseIntentViaLlm(c.input);
        if (!result || !c.expected) {
          failed += 1;
          const err = ['parse_failed_or_null'];
          err.forEach((e) => (errorBuckets[e] = (errorBuckets[e] ?? 0) + 1));
          if (!defectIds.has(c.id)) {
            defects.push({ id: c.id, mode: 'intake', input: c.input, errors: err, expected: c.expected });
            defectIds.add(c.id);
          }
        } else {
          const got: DatasetLabels = {
            intentType: result.parsed.intentType,
            categorySlug: result.parsed.categorySlug,
            subcategorySlug: result.parsed.subcategorySlug,
            entities: result.parsed.entities ?? {},
            city: result.parsed.city,
            budgetMin: result.parsed.budgetMin,
            budgetMax: result.parsed.budgetMax,
            urgency: result.parsed.urgency,
            neighborhoodSlug: result.parsed.neighborhoodSlug,
          };
          const errors = compareIntake(c.expected, got);
          if (errors.length === 0) {
            passed += 1;
          } else {
            failed += 1;
            for (const e of errors) {
              errorBuckets[e.split(':')[0] ?? e] = (errorBuckets[e.split(':')[0] ?? e] ?? 0) + 1;
            }
            if (errors.some((e) => e.startsWith('category'))) {
              slugFailures[c.expected.categorySlug] = (slugFailures[c.expected.categorySlug] ?? 0) + 1;
            }
            if (errors.some((e) => e.startsWith('city'))) {
              const cs = cityToSlug(c.expected.city) ?? 'unknown';
              cityFailures[cs] = (cityFailures[cs] ?? 0) + 1;
            }
            if (!defectIds.has(c.id)) {
              defects.push({
                id: c.id,
                mode: 'intake',
                input: c.input,
                errors,
                expected: c.expected,
                got,
                raw: result.raw,
              });
              defectIds.add(c.id);
            }
          }
        }
      } else {
        const msgs = c.messages ?? [
          { role: 'system', content: 'تو مشاور املاک ایران هستی.' },
          { role: 'user', content: c.input },
        ];
        const answer = await advisorChat(msgs);
        const errors = answer ? validateAdvisorAnswer(c.input, answer) : ['advisor_no_response'];
        if (errors.length === 0) passed += 1;
        else {
          failed += 1;
          for (const e of errors) errorBuckets[e] = (errorBuckets[e] ?? 0) + 1;
          if (!defectIds.has(c.id)) {
            defects.push({ id: c.id, mode: 'advisor', input: c.input, errors, got: answer });
            defectIds.add(c.id);
          }
        }
      }
    } catch (e) {
      failed += 1;
      errorBuckets.timeout = (errorBuckets.timeout ?? 0) + 1;
      if (!defectIds.has(c.id)) {
        defects.push({
          id: c.id,
          mode: c.mode,
          input: c.input,
          errors: [`exception: ${String(e)}`],
        });
        defectIds.add(c.id);
      }
    }

    doneIds.add(c.id);
    if ((i + 1) % 25 === 0) {
      saveCheckpoint(doneIds);
      writeFileSync(DEFECTS_PATH, defects.map((d) => JSON.stringify(d)).join('\n') + '\n', 'utf8');
    }
  }

  saveCheckpoint(doneIds);
  writeFileSync(DEFECTS_PATH, defects.map((d) => JSON.stringify(d)).join('\n') + '\n', 'utf8');

  const total = passed + failed;
  const report = {
    generatedAt: new Date().toISOString(),
    total,
    passed,
    failed,
    accuracy: total ? passed / total : 0,
    intakeAccuracy: total ? passed / total : 0,
    errorBuckets,
    topSlugFailures: Object.entries(slugFailures)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20),
    topCityFailures: Object.entries(cityFailures)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20),
    defectsPath: DEFECTS_PATH,
  };

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log('\n=== Eval report ===');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
