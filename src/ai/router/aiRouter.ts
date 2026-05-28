import type { AiProvider } from '@/ai/providers/base';
import { getAiSemanticConfig } from '@/ai/config/feature-flags';
import { GeminiAiProvider } from '@/ai/providers/geminiProvider';
import { MockAiProvider } from '@/ai/providers/mockProvider';
import { OllamaAiProvider } from '@/ai/providers/ollamaProvider';
import { OpenAiProvider } from '@/ai/providers/openaiProvider';

let cachedProvider: AiProvider | null = null;

export function createAiProvider(providerName?: string): AiProvider {
  const config = getAiSemanticConfig();
  const name = providerName ?? config.provider;

  switch (name) {
    case 'mock':
      return new MockAiProvider();
    case 'openai':
      return new OpenAiProvider();
    case 'gemini':
      return new GeminiAiProvider();
    case 'ollama':
    default:
      return new OllamaAiProvider();
  }
}

export function getAiProvider(): AiProvider {
  if (!cachedProvider) {
    cachedProvider = createAiProvider();
  }
  return cachedProvider;
}

export function resetAiProviderForTests(): void {
  cachedProvider = null;
}

export async function routeAiResolve(
  input: Parameters<AiProvider['resolveIntake']>[0],
  providerOverride?: string
): Promise<ReturnType<AiProvider['resolveIntake']>> {
  const provider = providerOverride ? createAiProvider(providerOverride) : getAiProvider();
  return provider.resolveIntake(input);
}
