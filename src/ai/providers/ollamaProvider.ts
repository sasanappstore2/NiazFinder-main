import type { AiProvider } from '@/ai/providers/base';
import type { ResolveIntakeInput, ResolveIntakeResult } from '@/ai/types';
import { getAiSemanticConfig } from '@/ai/config/feature-flags';
import { buildIntakeExtractionPrompt } from '@/ai/prompts/intakeExtractionPrompt';
import { safeParseConstrainedSelection } from '@/ai/schema/extractionSchema';
import {
  toAiExtractionRaw,
  validateConstrainedSelection,
} from '@/ai/schema/validationSchema';
import { computeCombinedConfidence } from '@/ai/services/candidateConfidence';

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class OllamaAiProvider implements AiProvider {
  readonly name = 'ollama' as const;

  constructor(
    private readonly baseUrl = getAiSemanticConfig().ollamaUrl,
    private readonly model = getAiSemanticConfig().ollamaModel,
    private readonly timeoutMs = getAiSemanticConfig().timeoutMs,
    private readonly maxRetries = getAiSemanticConfig().maxRetries
  ) {}

  async resolveIntake(input: ResolveIntakeInput): Promise<ResolveIntakeResult> {
    const started = performance.now();
    const prompt = buildIntakeExtractionPrompt(input.text, input.candidates);
    const url = `${this.baseUrl.replace(/\/$/, '')}/api/generate`;

    let lastError: ResolveIntakeResult['error'] = {
      code: 'UNKNOWN',
      message: 'Unknown error',
      retryable: true,
    };

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: this.model,
              prompt,
              stream: false,
              format: 'json',
              options: { temperature: 0.1 },
            }),
          },
          this.timeoutMs
        );

        if (!res.ok) {
          lastError = {
            code: res.status >= 500 ? 'UNAVAILABLE' : 'INVALID_RESPONSE',
            message: `Ollama HTTP ${res.status}`,
            retryable: res.status >= 500 || res.status === 429,
          };
          if (!lastError.retryable || attempt === this.maxRetries) break;
          continue;
        }

        const body = (await res.json()) as { response?: string };
        const raw = body.response?.trim() ?? '';
        const parsed = safeParseConstrainedSelection(raw);
        if (!parsed) {
          lastError = {
            code: 'PARSE_ERROR',
            message: 'AI response was not valid JSON',
            retryable: attempt < this.maxRetries,
          };
          if (attempt === this.maxRetries) {
            return {
              ok: false,
              provider: 'ollama',
              extraction: null,
              validatedEntities: null,
              error: lastError,
              latencyMs: Math.round(performance.now() - started),
              rawResponse: raw,
            };
          }
          continue;
        }

        const extraction = toAiExtractionRaw(parsed);
        const validation = validateConstrainedSelection(parsed, input.candidates);
        const hasAccepted =
          Object.keys(validation.patch).length > 0 ||
          validation.rejects.length === 0;

        const fieldConfidence = computeCombinedConfidence(
          extraction,
          input.candidates,
          input.ruleResult.confidence,
          validation.acceptedSlugs
        );

        return {
          ok: hasAccepted,
          provider: 'ollama',
          extraction,
          validatedEntities: validation.patch,
          validationRejects: validation.rejects,
          fieldConfidence,
          error: hasAccepted
            ? null
            : {
                code: 'INVALID_RESPONSE',
                message: 'All AI selections rejected by candidate validation',
                retryable: false,
              },
          latencyMs: Math.round(performance.now() - started),
          rawResponse: raw,
        };
      } catch (e) {
        const isAbort = e instanceof Error && e.name === 'AbortError';
        lastError = {
          code: isAbort ? 'TIMEOUT' : 'UNAVAILABLE',
          message: isAbort ? 'Ollama request timed out' : 'Ollama provider unavailable',
          retryable: attempt < this.maxRetries,
        };
        if (attempt === this.maxRetries) break;
      }
    }

    return {
      ok: false,
      provider: 'ollama',
      extraction: null,
      validatedEntities: null,
      error: lastError,
      latencyMs: Math.round(performance.now() - started),
    };
  }
}
