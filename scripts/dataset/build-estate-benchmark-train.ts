#!/usr/bin/env npx tsx
/**
 * Build LoRA training JSONL from estate benchmark golden labels (rules teacher).
 * Oversamples benchmark rows so fine-tune prioritizes parse-intent accuracy.
 *
 * Output: data/need-intake-training/need-intake-estate-benchmark-train.jsonl
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ALL_ESTATE_BENCHMARK_CASES } from '@/lib/need-intake/estate/estate-benchmark-cases';
import { coerceParsedForEstate } from '@/lib/need-intake/estate/estate-parse-coerce';
import { buildTrainingRowFromLabels } from '@/lib/need-intake/dataset/build-training-row';
import { labelsFromParsedIntent } from '@/lib/need-intake/dataset/schema';
import { parseFromText } from '@/lib/need-intake/internal-orchestrator.server';

const ESTATE_INTAKE_SYSTEM_PROMPT =
  'تو یک دستیار طبقه‌بندی نیاز فارسی در حوزه املاک ایران هستی. از متن کاربر فقط یک JSON معتبر ' +
  'برگردان با فیلدهای: intentType, categorySlug, subcategorySlug (اختیاری), entities ' +
  '(dealType, propertyKind, rooms, areaMin, areaMax, deposit, monthlyRent, …), city, budgetMin, budgetMax, urgency. ' +
  'خونه=apartment/house, تومن=میلیون(خرید) یا هزار(اجاره), ودیعه=رهن, کلنگی=land, مشارکت=partnership, پیش‌خرید=pre_purchase. ' +
  'اگر شهر یا نوع معامله نامشخص است فیلد را خالی بگذار. بدون توضیح اضافه.';

const OUT = join(process.cwd(), 'data/need-intake-training/need-intake-estate-benchmark-train.jsonl');
const OVERSAMPLE = Number(process.env.ESTATE_BENCHMARK_OVERSAMPLE ?? 50);

function main(): void {
  const lines: string[] = [];

  for (const testCase of ALL_ESTATE_BENCHMARK_CASES) {
    const parsed = coerceParsedForEstate(parseFromText(testCase.input));
    const labels = labelsFromParsedIntent(parsed);
    const row = buildTrainingRowFromLabels(testCase.input, labels);
    row.messages[0] = { role: 'system', content: ESTATE_INTAKE_SYSTEM_PROMPT };
    const line = JSON.stringify(row);

    for (let i = 0; i < OVERSAMPLE; i++) {
      lines.push(line);
    }
  }

  mkdirSync(join(process.cwd(), 'data/need-intake-training'), { recursive: true });
  writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${lines.length} rows (${ALL_ESTATE_BENCHMARK_CASES.length} × ${OVERSAMPLE}) → ${OUT}`);
}

main();
