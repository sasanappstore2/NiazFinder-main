import type { AiProvider } from '@/ai/providers/base';
import type { ResolveIntakeInput, ResolveIntakeResult } from '@/ai/types';

/** Placeholder — wire Gemini when API key is configured. */
export class GeminiAiProvider implements AiProvider {
  readonly name = 'gemini' as const;

  async resolveIntake(_input: ResolveIntakeInput): Promise<ResolveIntakeResult> {
    return {
      ok: false,
      provider: 'gemini',
      extraction: null,
      validatedEntities: null,
      error: {
        code: 'UNAVAILABLE',
        message: 'Gemini provider not configured',
        retryable: false,
      },
      latencyMs: 0,
    };
  }
}
