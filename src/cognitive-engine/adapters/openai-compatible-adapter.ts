/**
 * RFC-002 Part 11 — AI Boundary adapter. Converts a provider's raw response into the
 * platform's stable Cognitive Contract (Evidence[] + Diagnostics), so callers never see
 * provider-specific shapes (ADR-048, ADR-050). Deliberately thin: prompt formatting,
 * response parsing, error normalization — nothing else. No business logic.
 *
 * Reuses the existing `local-chat-client.ts` for the actual HTTP call, retries, timeouts,
 * and concurrency limiting rather than reimplementing any of that — this file only adds the
 * typed contract on top.
 */
import { localChatCompletions } from '@/lib/need-intake/local-chat-client';
import { parseAiJsonPayload } from '@/ai/schema/extractionSchema';
import { getLocalModelConfig } from '@/lib/need-intake/local-model-config';
import { evidenceListSchema } from '@/cognitive-engine/types/evidence';
import type { Diagnostics } from '@/cognitive-engine/types/diagnostics';
import type { CognitiveContract } from '@/cognitive-engine/types/cognitive-contract';
import {
  EVIDENCE_PROMPT_VERSION,
  EVIDENCE_SYSTEM_PROMPT,
  buildEvidencePrompt,
} from '@/cognitive-engine/evidence/evidence-prompt';

function toEvidenceId(index: number): string {
  return `E${index + 1}`;
}

/**
 * Extracts atomic Evidence from raw user text via the local LLM. This is additive: it does
 * not call, wrap, or replace `parseIntentViaLlm` — it is a sibling extraction path that
 * targets the RFC-002 Evidence contract specifically, using the same underlying chat client.
 */
export async function extractEvidenceViaAdapter(
  text: string
): Promise<CognitiveContract | null> {
  const config = getLocalModelConfig();
  const started = performance.now();

  // Production/replay execution split (Replay Determinism Audit §6, D-narrow item 2 — the ONE
  // place a legitimate production-vs-replay divergence exists): production keeps temperature 0.1
  // (deliberate sampling diversity for live-traffic robustness); replay/evaluation execution sets
  // COGNITIVE_REPLAY_DETERMINISTIC=true to pin temperature 0 + a fixed seed, making golden-replay
  // Evidence extraction reproducible rather than merely insulated at the Decision layer.
  // The divergence is itself visible: replay CLIs stamp their manifest labels, and this flag is
  // set only by those CLIs' npm scripts, never in any production path.
  const deterministic = process.env.COGNITIVE_REPLAY_DETERMINISTIC === 'true';
  const chat = await localChatCompletions(
    [
      { role: 'system', content: EVIDENCE_SYSTEM_PROMPT },
      { role: 'user', content: buildEvidencePrompt(text) },
    ],
    // Generous budget: this model reasons before answering (no explicit "no-think" control
    // exists for it like Gemmafable's chat-template-args), so truncating too early leaves
    // `content` empty with the reasoning stranded mid-thought.
    deterministic
      ? { config, maxTokens: 1800, temperature: 0, seed: 42 }
      : { config, maxTokens: 1800, temperature: 0.1 }
  );

  const latencyMs = Math.round(performance.now() - started);
  const baseDiagnostics: Omit<Diagnostics, 'parsingStatus'> = {
    provider: 'local-openai-compatible',
    model: config.model,
    promptVersion: EVIDENCE_PROMPT_VERSION,
    latencyMs,
    retryCount: 0,
  };

  if (!chat) {
    return { evidence: [], diagnostics: { ...baseDiagnostics, parsingStatus: 'empty' } };
  }

  const json = parseAiJsonPayload(chat.content);
  if (!json || typeof json !== 'object' || !Array.isArray((json as Record<string, unknown>).evidence)) {
    return { evidence: [], diagnostics: { ...baseDiagnostics, parsingStatus: 'invalid-json' } };
  }

  const now = new Date().toISOString();
  const rawItems = (json as { evidence: unknown[] }).evidence;
  const candidate = rawItems
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, index) => ({
      id: toEvidenceId(index),
      type: item.type,
      value: typeof item.value === 'string' ? item.value.trim() : '',
      sourceSpan: typeof item.sourceSpan === 'string' ? item.sourceSpan.trim() : '',
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
      extractedAt: now,
    }))
    .filter((item) => item.value && item.sourceSpan);

  const parsed = evidenceListSchema.safeParse(candidate);
  if (!parsed.success) {
    return { evidence: [], diagnostics: { ...baseDiagnostics, parsingStatus: 'schema-mismatch' } };
  }

  return { evidence: parsed.data, diagnostics: { ...baseDiagnostics, parsingStatus: 'ok' } };
}
