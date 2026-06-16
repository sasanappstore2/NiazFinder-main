import type { AiProvider } from '@/ai/providers/base';
import type { ResolveIntakeInput, ResolveIntakeResult } from '@/ai/types';
import { buildIntakeExtractionPrompt } from '@/ai/prompts/intakeExtractionPrompt';
import { safeParseConstrainedSelection } from '@/ai/schema/extractionSchema';
import {
  toAiExtractionRaw,
  validateConstrainedSelection,
} from '@/ai/schema/validationSchema';
import { computeCombinedConfidence } from '@/ai/services/candidateConfidence';
import {
  localChatCompletions,
  type ChatMessage,
} from '@/lib/need-intake/local-chat-client';
import { getLocalModelConfig } from '@/lib/need-intake/local-model-config';

/** OpenAI-compatible local server (LM Studio / llama.cpp on :1234). */
export class LocalChatAiProvider implements AiProvider {
  readonly name = 'local-llm' as const;

  constructor(
    private readonly config = getLocalModelConfig(),
    private readonly buildPrompt: (
      text: string,
      candidates: ResolveIntakeInput['candidates']
    ) => string = buildIntakeExtractionPrompt
  ) {}

  async resolveIntake(input: ResolveIntakeInput): Promise<ResolveIntakeResult> {
    const started = performance.now();
    const prompt = this.buildPrompt(input.text, input.candidates);
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You extract structured intake fields. JSON only.' },
      { role: 'user', content: prompt },
    ];

    const chat = await localChatCompletions(messages, { config: this.config });
    if (!chat) {
      return {
        ok: false,
        provider: 'local-llm',
        extraction: null,
        validatedEntities: null,
        error: {
          code: 'UNAVAILABLE',
          message: `Local LLM unreachable at ${this.config.baseUrl}`,
          retryable: true,
        },
        latencyMs: Math.round(performance.now() - started),
      };
    }

    const parsed = safeParseConstrainedSelection(chat.content);
    if (!parsed) {
      return {
        ok: false,
        provider: 'local-llm',
        extraction: null,
        validatedEntities: null,
        error: {
          code: 'PARSE_ERROR',
          message: 'Local LLM response was not valid JSON',
          retryable: false,
        },
        latencyMs: Math.round(performance.now() - started),
        rawResponse: chat.content,
      };
    }

    const extraction = toAiExtractionRaw(parsed);
    const validation = validateConstrainedSelection(parsed, input.candidates);
    const hasAccepted =
      Object.keys(validation.patch).length > 0 || validation.rejects.length === 0;

    const fieldConfidence = computeCombinedConfidence(
      extraction,
      input.candidates,
      input.ruleResult.confidence,
      validation.acceptedSlugs
    );

    return {
      ok: hasAccepted,
      provider: 'local-llm',
      extraction,
      validatedEntities: validation.patch,
      validationRejects: validation.rejects,
      fieldConfidence,
      error: hasAccepted
        ? null
        : {
            code: 'INVALID_RESPONSE',
            message: 'All local LLM selections rejected by candidate validation',
            retryable: false,
          },
      latencyMs: Math.round(performance.now() - started),
      rawResponse: chat.content,
    };
  }
}
