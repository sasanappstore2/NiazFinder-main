import type { IntentType } from '@/contracts/need-intake';
import { parseAiJsonPayload } from '@/ai/schema/extractionSchema';
import { localChatCompletions } from '@/lib/need-intake/local-chat-client';
import {
  buildIntentSliceUserPrompt,
  INTENT_SLICE_SYSTEM_PROMPT,
} from '@/intake/intelligence-engine/hybrid/intent-slice-prompt';
import {
  INTENT_SLICE_INTENT_TYPES,
  INTENT_SLICE_VERTICALS,
  type IntentSliceResult,
} from '@/intake/intelligence-engine/hybrid/intent-slice-schema';
import type { ClassifierVertical } from '@/lib/need-intake/vertical-classifier';
import { isIntakeAiGloballyDisabled } from '@/intake/rules/config';

function isVertical(v: string): v is ClassifierVertical {
  return (INTENT_SLICE_VERTICALS as readonly string[]).includes(v);
}

function isIntentType(v: string): v is IntentType {
  return (INTENT_SLICE_INTENT_TYPES as readonly string[]).includes(v);
}

function parseIntentSlice(content: string): IntentSliceResult | null {
  const parsed = parseAiJsonPayload(content);
  if (!parsed || typeof parsed !== 'object') return null;

  const raw = parsed as Record<string, unknown>;
  const vertical = String(raw.vertical ?? '').trim();
  const intentType = String(raw.intentType ?? '').trim();
  if (!isVertical(vertical) || !isIntentType(intentType)) return null;

  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 5)
    : [];

  const confidence =
    typeof raw.confidence === 'number' && Number.isFinite(raw.confidence)
      ? Math.min(1, Math.max(0, raw.confidence))
      : 0.6;

  return {
    vertical,
    intentType,
    keywords,
    confidence,
    source: 'ai',
  };
}

export interface IntentSliceOptions {
  maxTokens?: number;
}

/** Stage 1: AI intent slice — vertical + intentType only, no category slugs. */
export async function runIntentSlice(
  text: string,
  opts?: IntentSliceOptions
): Promise<IntentSliceResult | null> {
  if (isIntakeAiGloballyDisabled()) return null;

  const chat = await localChatCompletions(
    [
      { role: 'system', content: INTENT_SLICE_SYSTEM_PROMPT },
      { role: 'user', content: buildIntentSliceUserPrompt(text) },
    ],
    { maxTokens: opts?.maxTokens ?? 256, temperature: 0.1 }
  );

  if (!chat?.content) return null;
  return parseIntentSlice(chat.content);
}

export async function runIntentSliceWithMeta(
  text: string,
  opts?: IntentSliceOptions
): Promise<{ slice: IntentSliceResult | null; latencyMs: number }> {
  const started = performance.now();
  const slice = await runIntentSlice(text, opts);
  return { slice, latencyMs: Math.round(performance.now() - started) };
}
