import { z } from 'zod';
import { parseMoneyInput } from '@/lib/format/money';
import type { ParsedIntent } from '@/contracts/need-intake';
import { getSchemaForIntake } from '@/config/need-schemas/resolve-schema';
import { isNeedIntakeAiEnabled } from '@/lib/ai/env';
import { chatCompletion, extractJsonObject } from '@/lib/ai/openai-compatible';

function allowedKeys(intentType: ParsedIntent['intentType'], categorySlug: string): string[] {
  const schema = getSchemaForIntake(intentType, categorySlug);
  return schema.fields.map((f) => f.key);
}

function buildExtractSlotsPrompt(keys: string[]): string {
  return `You fill structured form slots for a Persian needs marketplace.
Output ONLY JSON: { "slots": { "key": "value" } }

Rules:
- Only use these keys (omit unknown keys): ${keys.join(', ')}
- Values must be strings or numbers (booleans as "true"/"false").
- Do not invent keys outside the list.
- Extract from user text + context; leave slots empty if unknown.`;
}

/** Rule-based slot hints from a single answer string. */
export function extractSlotsFromAnswer(
  fieldKey: string,
  value: string | number,
  answers: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const text = String(value).trim();
  if (!text) return out;

  if (fieldKey === 'location' && !answers.location) {
    out.location = text;
  }
  if (fieldKey === 'budget' || fieldKey === 'rahnAmount' || fieldKey === 'monthlyRent') {
    const num = parseMoneyInput(text);
    if (num !== null && num > 0) out[fieldKey] = num;
  }
  return out;
}

export async function extractSlotsWithLlm(
  parsed: ParsedIntent,
  answers: Record<string, unknown>,
  lastAnswer?: { fieldKey: string; value: string | number }
): Promise<Record<string, unknown>> {
  if (!isNeedIntakeAiEnabled()) {
    if (lastAnswer) {
      return extractSlotsFromAnswer(lastAnswer.fieldKey, lastAnswer.value, answers);
    }
    return {};
  }

  const keys = allowedKeys(parsed.intentType, parsed.categorySlug);
  const emptyKeys = keys.filter((k) => {
    const v = answers[k];
    return v === undefined || v === null || v === '';
  });
  if (emptyKeys.length === 0) return {};

  try {
    const { content } = await chatCompletion({
      messages: [
        { role: 'system', content: buildExtractSlotsPrompt(keys) },
        {
          role: 'user',
          content: JSON.stringify({
            rawText: parsed.rawText,
            intentType: parsed.intentType,
            categorySlug: parsed.categorySlug,
            entities: parsed.entities,
            currentAnswers: answers,
            lastAnswer: lastAnswer ?? null,
            fillOnlyKeys: emptyKeys,
          }),
        },
      ],
      jsonMode: true,
      temperature: 0.15,
      timeoutMs: 15000,
    });

    const json = extractJsonObject(content) as { slots?: Record<string, unknown> };
    const raw = json.slots ?? {};
    const slotsSchema = z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean()])
    );
    const parsedSlots = slotsSchema.safeParse(raw);
    if (!parsedSlots.success) return {};

    const merged: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parsedSlots.data)) {
      if (!keys.includes(k)) continue;
      if (answers[k] !== undefined && answers[k] !== '') continue;
      merged[k] = v;
    }

    if (lastAnswer) {
      Object.assign(
        merged,
        extractSlotsFromAnswer(lastAnswer.fieldKey, lastAnswer.value, {
          ...answers,
          ...merged,
        })
      );
      if (!merged[lastAnswer.fieldKey]) {
        merged[lastAnswer.fieldKey] = lastAnswer.value;
      }
    }

    return merged;
  } catch (e) {
    console.warn('[need-intake] extract-slots failed:', e instanceof Error ? e.message : e);
    if (lastAnswer) {
      return extractSlotsFromAnswer(lastAnswer.fieldKey, lastAnswer.value, answers);
    }
    return {};
  }
}
