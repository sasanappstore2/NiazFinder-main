import type {
  AiProviderName,
  ResolveIntakeInput,
  ResolveIntakeResult,
} from '@/ai/types';

export interface AiProvider {
  readonly name: AiProviderName;
  resolveIntake(input: ResolveIntakeInput): Promise<ResolveIntakeResult>;
}
