import type { AiProvider } from '@/ai/providers/base';
import { getAiSemanticConfig } from '@/ai/config/feature-flags';
import { GeminiAiProvider } from '@/ai/providers/geminiProvider';
import { MockAiProvider } from '@/ai/providers/mockProvider';
import { OllamaAiProvider } from '@/ai/providers/ollamaProvider';
import { LocalChatAiProvider } from '@/ai/providers/localChatProvider';
import { OpenAiProvider } from '@/ai/providers/openaiProvider';
import { isLocalLlmOnly } from '@/lib/local-llm/config';

let cachedProvider: AiProvider | null = null;

function resolveProviderName(providerName?: string): string {
  const config = getAiSemanticConfig();
  const requested = providerName ?? config.provider;
  if (isLocalLlmOnly() && requested !== 'local-llm') {
    if (providerName && providerName !== 'local-llm') {
      console.warn(
        `[aiRouter] LOCAL_LLM_ONLY=true — ignoring provider "${providerName}", using local-llm`,
      );
    }
    return 'local-llm';
  }
  return requested;
}

export function createAiProvider(providerName?: string): AiProvider {
  const name = resolveProviderName(providerName);

  switch (name) {
    case 'mock':
      return new MockAiProvider();
    case 'openai':
      return new OpenAiProvider();
    case 'gemini':
      return new GeminiAiProvider();
    case 'local-llm':
      return new LocalChatAiProvider();
    case 'ollama':
      return new OllamaAiProvider();
    default:
      return new LocalChatAiProvider();
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
  providerOverride?: string | AiProvider
): Promise<ReturnType<AiProvider['resolveIntake']>> {
  const provider =
    typeof providerOverride === 'object' && providerOverride
      ? providerOverride
      : providerOverride
        ? createAiProvider(providerOverride)
        : getAiProvider();
  return provider.resolveIntake(input);
}
