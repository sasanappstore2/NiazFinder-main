import type { AiProvider } from '@/ai/providers/base';
import type { ResolveIntakeInput, ResolveIntakeResult } from '@/ai/types';
import { buildIntakeExtractionPrompt } from '@/ai/prompts/intakeExtractionPrompt';
import { safeParseConstrainedSelection } from '@/ai/schema/extractionSchema';
import {
  toAiExtractionRaw,
  validateConstrainedSelection,
} from '@/ai/schema/validationSchema';
import { computeCombinedConfidence } from '@/ai/services/candidateConfidence';
import { geminiChatCompletions } from '@/lib/gemini/chat-completions';
import { isGeminiConfigured } from '@/lib/gemini/config';
import type { ChatMessage } from '@/lib/need-intake/local-chat-client';

/** Google Gemini (Generative Language API). */
export class GeminiAiProvider implements AiProvider {
  readonly name = 'gemini' as const;

  constructor(
    private readonly buildPrompt: (
      text: string,
      candidates: ResolveIntakeInput['candidates']
    ) => string = buildIntakeExtractionPrompt
  ) {}

  async resolveIntake(input: ResolveIntakeInput): Promise<ResolveIntakeResult> {
    const started = performance.now();

    if (!isGeminiConfigured()) {
      return {
        ok: false,
        provider: 'gemini',
        extraction: null,
        validatedEntities: null,
        error: {
          code: 'UNAVAILABLE',
          message: 'GEMINI_API_KEY not configured',
          retryable: false,
        },
        latencyMs: 0,
      };
    }

    const prompt = this.buildPrompt(input.text, input.candidates);
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You extract structured intake fields. JSON only.' },
      { role: 'user', content: prompt },
    ];

    const chat = await geminiChatCompletions(messages, { jsonMode: true, temperature: 0.1 });
    if (!chat) {
      return {
        ok: false,
        provider: 'gemini',
        extraction: null,
        validatedEntities: null,
        error: {
          code: 'UNAVAILABLE',
          message: 'Gemini API unreachable or returned empty response',
          retryable: true,
        },
        latencyMs: Math.round(performance.now() - started),
      };
    }

    const parsed = safeParseConstrainedSelection(chat.content);
    if (!parsed) {
      return {
        ok: false,
        provider: 'gemini',
        extraction: null,
        validatedEntities: null,
        error: {
          code: 'PARSE_ERROR',
          message: 'Gemini response was not valid JSON',
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
      provider: 'gemini',
      extraction,
      validatedEntities: validation.patch,
      validationRejects: validation.rejects,
      fieldConfidence,
      error: hasAccepted
        ? null
        : {
            code: 'INVALID_RESPONSE',
            message: 'All Gemini selections rejected by candidate validation',
            retryable: false,
          },
      latencyMs: Math.round(performance.now() - started),
      rawResponse: chat.content,
    };
  }
}
