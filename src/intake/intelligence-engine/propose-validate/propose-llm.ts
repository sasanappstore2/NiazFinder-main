/**
 * Stage 1 of propose→validate: ask Gemma E2B to propose ranked category +
 * neighborhood candidates for a need. Returns proposal:null on any failure
 * (LLM unreachable / junk JSON) — the graceful-degradation signal the pipeline
 * uses to fall back to the deterministic resolvers.
 */
import 'server-only';

import { localChatCompletions } from '@/lib/need-intake/local-chat-client';
import {
  buildLeafCatalogLines,
  buildProposePrompt,
  PROPOSE_SYSTEM_PROMPT,
} from '@/intake/intelligence-engine/propose-validate/propose-prompt';
import { safeParsePropose, type ProposeParsed } from '@/intake/intelligence-engine/propose-validate/propose-schema';

export interface ProposeOutcome {
  proposal: ProposeParsed | null;
  latencyMs: number;
  provider: string | null;
}

export async function proposeCategoriesAndLocation(text: string): Promise<ProposeOutcome> {
  const t0 = Date.now();
  const chat = await localChatCompletions(
    [
      { role: 'system', content: PROPOSE_SYSTEM_PROMPT },
      { role: 'user', content: buildProposePrompt(text, buildLeafCatalogLines()) },
    ],
    // maxRetries:1 caps worst-case latency on the analyze critical path.
    { maxTokens: 384, temperature: 0.1, maxRetries: 1 },
  );
  const latencyMs = Date.now() - t0;
  if (!chat?.content) return { proposal: null, latencyMs, provider: null };
  const proposal = safeParsePropose(chat.content);
  return { proposal, latencyMs, provider: 'local-llm' };
}
