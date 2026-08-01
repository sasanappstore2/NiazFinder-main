import { getAiSemanticConfig } from '@/ai/config/feature-flags';
import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';
import { tokenize } from '@/intake/tokenizer/tokenize';
import { generateNgrams } from '@/intake/ngrams/generateNgrams';
import { retrieveIntakeCandidates } from '@/ai/services/candidateRetrieval';
import { analyzeNeedText } from '@/intake/engine/intakeEngine';
import type { IntakeFieldBag, IntakeFieldKey } from '@/intake/intelligence-engine/types';
import { buildTruthVerificationPrompt } from '@/intake/intelligence-engine/ai/truth-verifier-prompt';
import { parseTruthVerificationResponse } from '@/intake/intelligence-engine/ai/truth-verifier-schema';
import { applyTruthVerdicts } from '@/intake/intelligence-engine/ai/truth-reconciler';
import { selectFieldsForVerification } from '@/intake/intelligence-engine/ai/truth-field-selector';
import { localChatCompletions } from '@/lib/need-intake/local-chat-client';
import { resolveWithAi } from '@/intake/intelligence-engine/ai/ai-resolver';

export interface TruthVerifierInput {
  text: string;
  normalizedText: string;
  fields: IntakeFieldBag;
  unresolvedFields: string[];
  categoryLockedByUser?: boolean;
}

export interface TruthVerifierResult {
  invoked: boolean;
  provider: string | null;
  latencyMs: number;
  fields: IntakeFieldBag;
  fieldsChecked: string[];
  corrected: string[];
  confirmed: string[];
  skipped: string[];
}

export function truthVerifyEnabled(): boolean {
  if (process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED === 'false') return false;
  const config = getAiSemanticConfig();
  return config.enabled || process.env.NEED_INTAKE_LLM_ENABLED === 'true';
}

export { selectFieldsForVerification };

/**
 * Truth verification: AI re-reads user text, checks intake hypotheses,
 * replaces incorrect/missing values with corrected ones.
 */
export async function runTruthVerification(
  input: TruthVerifierInput
): Promise<TruthVerifierResult> {
  const empty: TruthVerifierResult = {
    invoked: false,
    provider: null,
    latencyMs: 0,
    fields: input.fields,
    fieldsChecked: [],
    corrected: [],
    confirmed: [],
    skipped: [],
  };

  if (!truthVerifyEnabled()) return empty;

  const fieldsToVerify = selectFieldsForVerification(input.fields, input.unresolvedFields);
  if (!fieldsToVerify.length) return empty;

  const started = performance.now();
  const indexes = buildIntakeIndexesSync();
  const ruleResult = analyzeNeedText(input.text, indexes);
  const tokens = tokenize(ruleResult.normalizedText, { removeStopWords: true });
  const ngrams = generateNgrams(tokens);
  const candidates = retrieveIntakeCandidates(indexes, tokens, ngrams.all, ruleResult);

  const prompt = buildTruthVerificationPrompt(
    input.text,
    input.fields,
    fieldsToVerify,
    candidates
  );

  const chat = await localChatCompletions(
    [
      {
        role: 'system',
        content: 'Verify Persian intake fields. JSON only.',
      },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 400, temperature: 0.05, maxRetries: 0 }
  );

  if (!chat) {
    if (input.unresolvedFields.length === 0) {
      return {
        ...empty,
        invoked: true,
        provider: 'local-llm',
        latencyMs: Math.round(performance.now() - started),
        fieldsChecked: fieldsToVerify,
      };
    }
    const fallback = await resolveWithAi(
      {
        text: input.text,
        normalizedText: input.normalizedText,
        unresolvedFields: input.unresolvedFields,
      },
      input.fields
    );
    return {
      invoked: true,
      provider: fallback.provider ?? 'local-llm',
      latencyMs: Math.round(performance.now() - started),
      fields: fallback.fields,
      fieldsChecked: fieldsToVerify,
      corrected: [],
      confirmed: [],
      skipped: fieldsToVerify,
    };
  }

  const parsed = parseTruthVerificationResponse(chat.content);
  if (!parsed?.verdicts.length) {
    return {
      ...empty,
      invoked: true,
      provider: 'local-llm',
      latencyMs: Math.round(performance.now() - started),
      fieldsChecked: fieldsToVerify,
    };
  }

  const bagCopy = { ...input.fields };
  for (const key of Object.keys(bagCopy) as IntakeFieldKey[]) {
    bagCopy[key] = { ...input.fields[key] };
  }

  const reconciled = applyTruthVerdicts(bagCopy, parsed.verdicts, {
    categoryLockedByUser: input.categoryLockedByUser,
  });

  return {
    invoked: true,
    provider: 'local-llm',
    latencyMs: Math.round(performance.now() - started),
    fields: reconciled.bag,
    fieldsChecked: fieldsToVerify,
    corrected: reconciled.corrected,
    confirmed: reconciled.confirmed,
    skipped: reconciled.skipped,
  };
}
