import type { AiProvider } from '@/ai/providers/base';
import type { ResolveIntakeInput, ResolveIntakeResult } from '@/ai/types';

/** Placeholder — wire OpenAI when API key is configured. */
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai' as const;

  async resolveIntake(_input: ResolveIntakeInput): Promise<ResolveIntakeResult> {
    return {
      ok: false,
      provider: 'openai',
      extraction: null,
      validatedEntities: null,
      error: {
        code: 'UNAVAILABLE',
        message: 'OpenAI provider not configured',
        retryable: false,
      },
      latencyMs: 0,
    };
  }
}
